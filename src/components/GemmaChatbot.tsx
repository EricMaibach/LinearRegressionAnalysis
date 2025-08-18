import { useState, useRef, useEffect } from 'react';
import { pipeline } from "@huggingface/transformers";

// // Configure Transformers.js for proper CDN usage
// env.allowRemoteModels = true;
// env.allowLocalModels = false;
// env.remoteHost = 'https://huggingface.co';
// env.remotePathTemplate = '{model}/resolve/main/onnx/';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface GemmaChatbotProps {
  dataPoints: Array<{x: number; y: number}>;
}

export function GemmaChatbot({ dataPoints }: GemmaChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hi! I'm your AI assistant powered by Gemma 3. I can help explain linear regression concepts, analyze your data, or answer questions about statistics. What would you like to know?",
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [modelStatus, setModelStatus] = useState<'none' | 'loading' | 'loaded' | 'failed'>('none');
  const [loadedModelName, setLoadedModelName] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const generatorRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-load model when chatbot is opened
  useEffect(() => {
    if (isOpen && modelStatus === 'none') {
      initializeModel();
    }
  }, [isOpen]);

  const initializeModel = async () => {
    if (generatorRef.current) return;
    
    setIsModelLoading(true);
    setModelStatus('loading');
    
    try {
      console.log('🤖 Loading Gemma 3 270M-Instruct model with WebGPU...');
      
      // Add timeout for model loading
      const loadTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Model loading timeout after 60 seconds')), 60000);
      });
      
      const loadPromise = pipeline(
        "text-generation",
        "onnx-community/gemma-3-270m-it-ONNX",
        { dtype: "fp32" },
      );
 
      generatorRef.current = await Promise.race([loadPromise, loadTimeout]);
      
      console.log('✅ Successfully loaded Gemma 3 model with WebGPU');
      setModelStatus('loaded');
      setLoadedModelName('Gemma 3 270M-Instruct (WebGPU)');
      
      // Test the model with a simple generation
      try {
        const testResult = await generatorRef.current('Hello', { max_new_tokens: 5 });
        console.log('✅ Model test successful:', testResult);
      } catch (testError) {
        console.warn('⚠️ Model loaded but test generation failed:', testError);
      }
      
    } catch (error) {
      console.warn('❌ WebGPU failed, trying WASM fallback:', error);
      
      try {
        console.log('🤖 Falling back to WASM...');
        // Add timeout for model loading
        const loadTimeout = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Model loading timeout after 60 seconds')), 60000);
        });
        const wasmLoadPromise = pipeline(
          'text-generation',
          'onnx-community/gemma-3-270m-it-ONNX',
          {
            device: 'wasm' as const,
            // dtype: 'q4' as const
          }
        );

        generatorRef.current = await Promise.race([wasmLoadPromise, loadTimeout]);
        console.log('✅ Successfully loaded Gemma 3 model with WASM');
        setModelStatus('loaded');
        setLoadedModelName('Gemma 3 270M-Instruct (WASM)');
        
      } catch (wasmError) {
        console.error('❌ Model initialization failed completely:', wasmError);
        setModelStatus('failed');
      }
    }
    
    setIsModelLoading(false);
  };

  const generateDataContext = () => {
    if (dataPoints.length === 0) return "No data points have been entered yet.";
    
    const n = dataPoints.length;
    const meanX = dataPoints.reduce((sum, p) => sum + p.x, 0) / n;
    const meanY = dataPoints.reduce((sum, p) => sum + p.y, 0) / n;
    
    // Calculate correlation coefficient
    const sumXY = dataPoints.reduce((acc, p) => acc + p.x * p.y, 0);
    const sumXX = dataPoints.reduce((acc, p) => acc + p.x * p.x, 0);
    const sumYY = dataPoints.reduce((acc, p) => acc + p.y * p.y, 0);
    const sumX = dataPoints.reduce((acc, p) => acc + p.x, 0);
    const sumY = dataPoints.reduce((acc, p) => acc + p.y, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
    const correlation = denominator !== 0 ? numerator / denominator : 0;
    
    // Calculate slope and intercept
    const sxx = sumXX - (sumX * sumX) / n;
    const scp = sumXY - (sumX * sumY) / n;
    const slope = sxx !== 0 ? scp / sxx : 0;
    const intercept = meanY - slope * meanX;
    
    return `Current dataset: ${n} data points. Mean X: ${meanX.toFixed(2)}, Mean Y: ${meanY.toFixed(2)}. Linear regression: y = ${slope.toFixed(3)}x + ${intercept.toFixed(3)}. Correlation coefficient: ${correlation.toFixed(3)}.`;
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputText;
    setInputText('');
    setIsLoading(true);

    try {
      const dataContext = generateDataContext();
      let aiResponse = "";

      // Try AI model first if available
      if (generatorRef.current && modelStatus === 'loaded') {
        try {
          console.log(`🧠 Using AI model: ${loadedModelName}`);
          
          // Create a timeout promise
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Response timeout')), 30000); // 30 second timeout
          });

          // Format the prompt for Gemma 3
          const prompt = `<start_of_turn>user
You are a helpful AI assistant specialized in linear regression and statistics. You help users understand statistical concepts, analyze their data, and explain mathematical relationships. Be concise but informative.

Current user's data context: ${dataContext}

User question: ${currentInput}

Provide a helpful, accurate response about linear regression, statistics, or the user's data. Keep responses under 150 words.
<end_of_turn>
<start_of_turn>model
`;

          // Race between generation and timeout
          const generationPromise = generatorRef.current(prompt, {
            max_new_tokens: 150,
            temperature: 0.7,
            do_sample: true,
            top_p: 0.9,
            repetition_penalty: 1.1
          });

          const result = await Promise.race([generationPromise, timeoutPromise]);
          
          console.log('🤖 AI Raw result:', result);
          
          if (result && Array.isArray(result) && result[0]?.generated_text) {
            // Clean up the response - the model returns the full text including our prompt
            let cleanResponse = result[0].generated_text;
            
            console.log('🔍 Raw response before cleaning:', cleanResponse);
            
            // The response format appears to be: "user [prompt text] model [actual response]"
            // Find where "model " appears and extract everything after it
            const modelIndex = cleanResponse.indexOf(' model ');
            if (modelIndex !== -1) {
              // Extract everything after " model "
              cleanResponse = cleanResponse.substring(modelIndex + 7); // 7 = length of " model "
            } else {
              // Alternative: try to find just "model" at word boundary
              const modelMatch = cleanResponse.match(/\bmodel\s+(.*)$/s);
              if (modelMatch) {
                cleanResponse = modelMatch[1];
              }
            }
            
            // Clean up any remaining template tokens and whitespace
            cleanResponse = cleanResponse.replace(/<end_of_turn>.*$/s, '').trim();
            cleanResponse = cleanResponse.replace(/^<start_of_turn>.*$/gm, '').trim();
            
            if (cleanResponse && cleanResponse.length > 5) {
              aiResponse = cleanResponse;
              console.log('✅ Using cleaned AI response:', aiResponse);
            } else {
              console.warn('⚠️ Response too short after cleaning:', cleanResponse);
            }
          }
        } catch (error) {
          console.warn('❌ AI generation failed:', error);
        }
      }

      // Use simple fallback if AI didn't work or model not loaded
      if (!aiResponse) {
        if (modelStatus === 'none') {
          // Try to load model in background for next time
          initializeModel().catch(console.warn);
        }
        aiResponse = getSimpleResponse(currentInput, dataContext);
        console.log('📊 Using fallback response');
      }

      const aiMessage: Message = {
        id: Date.now().toString() + '_ai',
        text: aiResponse,
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      
      const errorMessage: Message = {
        id: Date.now().toString() + '_error',
        text: "I'm experiencing technical difficulties. Please try again or ask a different question.",
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }

    setIsLoading(false);
  };

  // Simple fallback responses for common questions
  const getSimpleResponse = (question: string, dataContext: string): string => {
    const q = question.toLowerCase();
    
    if (q.includes('correlation') || q.includes('r')) {
      const match = dataContext.match(/Correlation coefficient: ([-\d.]+)/);
      if (match) {
        const r = parseFloat(match[1]);
        if (Math.abs(r) > 0.8) return `Your correlation coefficient is ${r.toFixed(3)}, which indicates a strong ${r > 0 ? 'positive' : 'negative'} linear relationship between your variables.`;
        if (Math.abs(r) > 0.5) return `Your correlation coefficient is ${r.toFixed(3)}, which indicates a moderate ${r > 0 ? 'positive' : 'negative'} linear relationship.`;
        return `Your correlation coefficient is ${r.toFixed(3)}, which indicates a weak linear relationship between your variables.`;
      }
    }
    
    if (q.includes('slope') || q.includes('intercept')) {
      const slopeMatch = dataContext.match(/y = ([-\d.]+)x \+ ([-\d.]+)/);
      if (slopeMatch) {
        return `Your regression line is y = ${slopeMatch[1]}x + ${slopeMatch[2]}. The slope (${slopeMatch[1]}) tells you how much Y changes for each unit increase in X.`;
      }
    }
    
    if (q.includes('regression') || q.includes('line')) {
      return "Linear regression finds the best-fitting straight line through your data points. It helps predict Y values based on X values and shows the relationship strength between variables.";
    }
    
    if (q.includes('r-squared') || q.includes('r²')) {
      return "R-squared measures how well your regression line fits the data. Values closer to 1.0 indicate a better fit, meaning the line explains more of the variation in your data.";
    }
    
    return "I can help explain linear regression concepts like correlation, slope, intercept, and R-squared. Try asking about these specific topics!";
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="ai-chat-toggle"
        title="Open Gemma AI Assistant"
      >
        🤖
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="ai-chat-window">
          <div className="ai-chat-header">
            <div>
              <h3>Gemma AI Assistant</h3>
              {modelStatus === 'loading' && <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>🔄 Loading Gemma 3...</div>}
              {modelStatus === 'loaded' && <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>🤖 Gemma 3 Ready</div>}
              {modelStatus === 'failed' && <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>📊 Smart Fallback Active</div>}
              {modelStatus === 'none' && <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>📊 Smart Assistant</div>}
            </div>
            <button onClick={() => setIsOpen(false)} className="close-button">×</button>
          </div>

          {isModelLoading && (
            <div className="ai-chat-loading">
              <p>Loading Gemma 3 270M-Instruct model...</p>
              <p style={{ fontSize: '0.8rem', color: '#666' }}>
                This may take a moment. The model runs entirely in your browser!
              </p>
              <div className="loading-spinner"></div>
            </div>
          )}

          <div className="ai-chat-messages">
            {messages.map(message => (
              <div key={message.id} className={`message ${message.isUser ? 'user' : 'ai'}`}>
                <div className="message-content">
                  {message.text}
                </div>
                <div className="message-time">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="message ai">
                <div className="message-content typing">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="ai-chat-input">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask about linear regression, statistics, or your data..."
              disabled={isLoading || isModelLoading}
              rows={2}
            />
            {modelStatus === 'failed' && (
              <button 
                onClick={() => {
                  generatorRef.current = null;
                  setModelStatus('none');
                  initializeModel();
                }}
                className="retry-button"
                title="Retry loading Gemma 3 model"
              >
                🔄
              </button>
            )}
            <button 
              onClick={handleSendMessage} 
              disabled={isLoading || isModelLoading || !inputText.trim()}
              className="send-button"
            >
              {isLoading ? '...' : '→'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}