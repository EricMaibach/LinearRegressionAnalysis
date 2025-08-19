import { pipeline } from '@huggingface/transformers';

let generator = null;
let isInitializing = false;

// Progressive loading with longer yields to keep UI responsive
const progressiveYield = async (iterations = 5) => {
  for (let i = 0; i < iterations; i++) {
    await new Promise(resolve => setTimeout(resolve, 50)); // 50ms yield
  }
};

// Handle messages from the main thread
self.onmessage = async (event) => {
  const { id, type, payload } = event.data;

  try {
    switch (type) {
      case 'INITIALIZE_MODEL':
        if (generator || isInitializing) {
          self.postMessage({
            id,
            type: 'MODEL_READY',
            payload: { success: true, modelName: generator ? 'Already loaded' : 'Already initializing' }
          });
          return;
        }

        isInitializing = true;
        
        // Send progress update
        self.postMessage({
          id,
          type: 'PROGRESS',
          payload: { status: 'Starting model initialization...', progress: 0 }
        });

        try {
          console.log('🤖 [Worker] Loading Gemma 3 270M-Instruct model with WebGPU...');
          
          // Send progress update
          self.postMessage({
            id,
            type: 'PROGRESS',
            payload: { status: 'Downloading model weights...', progress: 25 }
          });

          // Progressive yield to keep UI responsive during model download
          await progressiveYield(3);

          // Try WebGPU first with more conservative settings
          generator = await pipeline(
            'text-generation',
            'onnx-community/gemma-3-270m-it-ONNX',
            { 
              dtype: 'fp32',
              // More conservative resource usage
              progress_callback: async (progress) => {
                // Yield during model loading to keep UI responsive
                if (progress && progress.status === 'loading') {
                  await new Promise(resolve => setTimeout(resolve, 16)); // 16ms yield (1 frame)
                }
              }
            }
          );

          // Send progress update
          self.postMessage({
            id,
            type: 'PROGRESS',
            payload: { status: 'Model loaded with WebGPU', progress: 90 }
          });

          console.log('✅ [Worker] Successfully loaded Gemma 3 model with WebGPU');
          
          // Test the model
          const testResult = await generator('Hello', { max_new_tokens: 5 });
          console.log('✅ [Worker] Model test successful:', testResult);

          self.postMessage({
            id,
            type: 'MODEL_READY',
            payload: { success: true, modelName: 'Gemma 3 270M-Instruct (WebGPU)' }
          });

        } catch (webgpuError) {
          console.warn('❌ [Worker] WebGPU failed, trying WASM fallback:', webgpuError);
          
          // Send progress update
          self.postMessage({
            id,
            type: 'PROGRESS',
            payload: { status: 'WebGPU failed, trying WASM...', progress: 50 }
          });

          try {
            // Progressive yield before WASM loading
            await progressiveYield(5);
            
            generator = await pipeline(
              'text-generation',
              'onnx-community/gemma-3-270m-it-ONNX',
              { 
                device: 'wasm',
                dtype: 'q8' // Use quantized model for faster loading
              }
            );

            console.log('✅ [Worker] Successfully loaded Gemma 3 model with WASM');

            self.postMessage({
              id,
              type: 'MODEL_READY',
              payload: { success: true, modelName: 'Gemma 3 270M-Instruct (WASM)' }
            });

          } catch (wasmError) {
            console.error('❌ [Worker] Model initialization failed completely:', wasmError);
            throw wasmError;
          }
        } finally {
          isInitializing = false;
        }
        break;

      case 'GENERATE_TEXT':
        if (!generator) {
          throw new Error('Model not initialized');
        }

        const { prompt, options = {} } = payload;
        
        // Default generation options
        const generationOptions = {
          max_new_tokens: 150,
          temperature: 0.7,
          do_sample: true,
          top_p: 0.9,
          repetition_penalty: 1.1,
          ...options
        };

        console.log('🧠 [Worker] Generating text...');
        const result = await generator(prompt, generationOptions);

        self.postMessage({
          id,
          type: 'TEXT_GENERATED',
          payload: { result }
        });
        break;

      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    console.error(`❌ [Worker] Error handling ${type}:`, error);
    self.postMessage({
      id,
      type: 'ERROR',
      payload: { error: error instanceof Error ? error.message : String(error) }
    });
  }
};