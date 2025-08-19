import { useState, useRef, useEffect } from 'react';
import { useAIModel } from '../contexts/AIModelContext';

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
  const { modelStatus, generateText, loadedModelName, retryLoading } = useAIModel();
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
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  // Rough token counting (approximation: ~4 characters per token)
  const estimateTokens = (text: string): number => {
    return Math.ceil(text.length / 4);
  };

  // Create conversation history for context (rolling window)
  const createConversationContext = (currentQuestion: string): string => {
    const maxContextTokens = 4000; // Reserve ~4000 tokens for conversation history
    const systemPromptTokens = 200; // Reserve for system prompt
    const responseTokens = 150; // Reserve for response
    const availableTokens = maxContextTokens - systemPromptTokens - responseTokens - estimateTokens(currentQuestion);
    
    let conversationHistory = '';
    let totalTokens = 0;
    
    // Start from most recent messages and work backwards
    for (let i = messages.length - 1; i >= 1; i--) { // Skip the initial greeting message
      const message = messages[i];
      const messageText = `${message.isUser ? 'Human' : 'Assistant'}: ${message.text}`;
      const messageTokens = estimateTokens(messageText);
      
      if (totalTokens + messageTokens > availableTokens) {
        break; // Stop if adding this message would exceed our token limit
      }
      
      // Prepend to conversation history (since we're going backwards)
      conversationHistory = messageText + '\n\n' + conversationHistory;
      totalTokens += messageTokens;
    }
    
    return conversationHistory.trim();
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
      const conversationHistory = createConversationContext(currentInput);
      let aiResponse = "";

      // Try AI model first if available
      if (modelStatus === 'loaded') {
        try {
          console.log(`🧠 Using AI model: ${loadedModelName}`);
          console.log(`📝 Context tokens: ~${estimateTokens(conversationHistory)} for conversation history`);
          
          // Format the prompt for Gemma 3 with conversation context
          let prompt = `<start_of_turn>user
You are a helpful AI assistant specialized in linear regression and statistics. You help users understand statistical concepts, analyze their data, and explain mathematical relationships. Be concise but informative, and maintain context from the conversation.

Current user's data context: ${dataContext}`;

          // Add conversation history if we have any
          if (conversationHistory) {
            prompt += `

Previous conversation:
${conversationHistory}`;
          }

          prompt += `

Current question: ${currentInput}

Provide a helpful, accurate response about linear regression, statistics, or the user's data. Reference previous parts of our conversation when relevant. Keep responses under 150 words.
<end_of_turn>
<start_of_turn>model
`;

          const result = await generateText(prompt, {
            max_new_tokens: 150,
            temperature: 0.7,
            do_sample: true,
            top_p: 0.9,
            repetition_penalty: 1.1
          });
          
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
        aiResponse = getSimpleResponse(currentInput, dataContext, conversationHistory);
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
  const getSimpleResponse = (question: string, dataContext: string, conversationHistory?: string): string => {
    const q = question.toLowerCase();
    
    // Check for context-dependent follow-up questions
    const isFollowUp = conversationHistory && (
      q.includes('what about') || 
      q.includes('and') || 
      q.includes('also') || 
      q.includes('how about') ||
      q.includes('explain that') ||
      q.includes('tell me more')
    );
    
    if (q.includes('correlation') || q.includes('r')) {
      const match = dataContext.match(/Correlation coefficient: ([-\d.]+)/);
      if (match) {
        const r = parseFloat(match[1]);
        let response = `Your correlation coefficient is ${r.toFixed(3)}, which indicates a ${Math.abs(r) > 0.8 ? 'strong' : Math.abs(r) > 0.5 ? 'moderate' : 'weak'} ${r > 0 ? 'positive' : 'negative'} linear relationship between your variables.`;
        
        if (isFollowUp && conversationHistory?.includes('slope')) {
          response += " This correlation relates to the slope we discussed - stronger correlations typically have steeper slopes.";
        }
        
        return response;
      }
    }
    
    if (q.includes('slope') || q.includes('intercept')) {
      const slopeMatch = dataContext.match(/y = ([-\d.]+)x \+ ([-\d.]+)/);
      if (slopeMatch) {
        let response = `Your regression line is y = ${slopeMatch[1]}x + ${slopeMatch[2]}. The slope (${slopeMatch[1]}) tells you how much Y changes for each unit increase in X.`;
        
        if (isFollowUp && conversationHistory?.includes('correlation')) {
          response += " This slope is related to the correlation we discussed earlier.";
        }
        
        return response;
      }
    }
    
    if (q.includes('regression') || q.includes('line')) {
      return "Linear regression finds the best-fitting straight line through your data points. It helps predict Y values based on X values and shows the relationship strength between variables.";
    }
    
    if (q.includes('r-squared') || q.includes('r²')) {
      let response = "R-squared measures how well your regression line fits the data. Values closer to 1.0 indicate a better fit, meaning the line explains more of the variation in your data.";
      
      if (isFollowUp && conversationHistory?.includes('correlation')) {
        response += " R-squared is actually the square of the correlation coefficient we discussed!";
      }
      
      return response;
    }
    
    if (isFollowUp && conversationHistory) {
      return "I understand you're asking a follow-up question, but I need my full AI capabilities to maintain context properly. Please try again when the AI model is loaded, or rephrase your question more specifically.";
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
      {/* Floating Chat Button - only show when model is ready */}
      {modelStatus === 'loaded' && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="ai-chat-toggle"
          title="Open Gemma AI Assistant"
        >
          🤖
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="ai-chat-window">
          <div className="ai-chat-header">
            <div>
              <h3>Gemma AI Assistant</h3>
              {modelStatus === 'loading' && <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>🔄 Loading Gemma 3...</div>}
              {modelStatus === 'loaded' && <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>🤖 Gemma 3 Ready</div>}
              {modelStatus === 'failed' && <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>📊 Smart Fallback Active</div>}
            </div>
            <button onClick={() => setIsOpen(false)} className="close-button">×</button>
          </div>

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
              disabled={isLoading || modelStatus === 'loading'}
              rows={2}
            />
            {modelStatus === 'failed' && (
              <button 
                onClick={retryLoading}
                className="retry-button"
                title="Retry loading Gemma 3 model"
              >
                🔄
              </button>
            )}
            <button 
              onClick={handleSendMessage} 
              disabled={isLoading || modelStatus === 'loading' || !inputText.trim()}
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