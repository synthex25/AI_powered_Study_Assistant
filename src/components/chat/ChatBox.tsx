import { useState, useRef, useCallback, useEffect, type FC } from 'react';
import { IoSend } from 'react-icons/io5';
import { FaRobot, FaUser, FaTrash } from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi';
import { motion } from 'framer-motion';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

// ============================================================================
// Types
// ============================================================================

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatBoxProps {
  documentIds: string[];
}

// ============================================================================
// Constants
// ============================================================================

const FASTAPI_URL = import.meta.env.VITE_FASTAPI_URL || 'http://localhost:8000';

const QUICK_PROMPTS = [
  'Summarize the key points',
  'What is the main topic?',
  'Explain this simply',
  'Create a study plan',
];

// ============================================================================
// Markdown Message Component
// ============================================================================

interface MessageContentProps {
  content: string;
  isUser: boolean;
}

const MessageContent: FC<MessageContentProps> = ({ content, isUser }) => {
  if (isUser) {
    return <span>{content}</span>;
  }

  return (
    <div className="markdown-content overflow-hidden w-full">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          // Headings
          h1: ({ children }) => <h1 className="text-lg font-bold text-white mt-3 mb-2">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-bold text-white mt-3 mb-2">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-bold text-white mt-2 mb-1">{children}</h3>,
          
          // Paragraph
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          
          // Lists
          ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="text-gray-200">{children}</li>,
          
          // Inline
          strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
          em: ({ children }) => <em className="italic text-indigo-300">{children}</em>,
          
          // Code
          code: ({ className, children }) => {
            const isInline = !className;
            if (isInline) {
              return <code className="bg-gray-100 px-1 py-0.5 rounded text-indigo-500 text-xs">{children}</code>;
            }
            return (
              <pre className="bg-gray-100 p-2 rounded my-2 overflow-x-auto">
                <code className="text-xs text-gray-300">{children}</code>
              </pre>
            );
          },
          
          // Links
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
              {children}
            </a>
          ),
          
          // Blockquote
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-indigo-500 pl-3 my-2 text-gray-400 italic">
              {children}
            </blockquote>
          ),
          
          // Tables
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-lg border border-gray-300 shadow-lg">
              <table className="min-w-full divide-y divide-gray-300 text-xs">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-gray-100/80">{children}</thead>,
          th: ({ children }) => <th className="px-3 py-2 text-left font-semibold text-gray-900 border-b border-gray-300">{children}</th>,
          td: ({ children }) => <td className="px-3 py-2 text-gray-900 border-b border-gray-300 last:border-0">{children}</td>,
          tr: ({ children }) => <tr className="hover:bg-gray-200/50 transition-colors last:bg-transparent">{children}</tr>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

const ChatBox: FC<ChatBoxProps> = ({ documentIds }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Generate a storage key based on document IDs
  const storageKey = `chat_history_${documentIds.sort().join('_').substring(0, 50)}`;

  // Load chat history from localStorage on mount or when documents change
  useEffect(() => {
    if (documentIds.length > 0) {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setMessages(parsed);
          }
        }
      } catch (e) {
        console.warn('[ChatBox] Failed to load chat history:', e);
      }
    } else {
      setMessages([]);
    }
  }, [storageKey, documentIds.length]);

  // Save chat history to localStorage when messages change
  useEffect(() => {
    if (messages.length > 0 && documentIds.length > 0) {
      try {
        // Keep only last 50 messages to avoid storage limits
        const toStore = messages.slice(-50);
        localStorage.setItem(storageKey, JSON.stringify(toStore));
      } catch (e) {
        console.warn('[ChatBox] Failed to save chat history:', e);
      }
    }
  }, [messages, storageKey, documentIds.length]);

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  }, [messages]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    try {
      localStorage.removeItem(storageKey);
    } catch (e) {
      console.warn('[ChatBox] Failed to clear chat history:', e);
    }
  }, [storageKey]);

  const sendMessage = useCallback(async (messageText?: string) => {
    const query = messageText || input.trim();
    if (!query) return;

    if (documentIds.length === 0) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "**Please upload and process study materials first!** 📚\n\nI need content to help you with."
      }]);
      return;
    }

    setMessages(prev => [...prev, { role: 'user', content: query }]);
    setInput('');
    setIsLoading(true);

    try {
      const chatHistory = messages.slice(-10).map(m => ({
        role: m.role,
        content: m.content
      }));

      console.log('[ChatBox] Sending to:', `${FASTAPI_URL}/api/chat`);
      console.log('[ChatBox] Document IDs:', documentIds);

      // Get JWT token from localStorage
      const token = localStorage.getItem('accessToken');
      
      const response = await axios.post(`${FASTAPI_URL}/api/chat`, {
        query,
        document_ids: documentIds,
        chat_history: chatHistory
      }, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });

      console.log('[ChatBox] Response received');

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.data.answer
      }]);
    } catch (error: any) {
      console.error('[ChatBox] Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `**Error:** ${error.response?.data?.detail || error.message}\n\nPlease try again.`
      }]);
    } finally {
      setIsLoading(false);
      setTimeout(scrollToBottom, 100);
    }
  }, [input, documentIds, messages, scrollToBottom]);

  return (
    <div className="w-full lg:w-[450px] h-full flex flex-col bg-white border border-gray-300 rounded-2xl overflow-hidden shadow-lg relative">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 bg-gray-100 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <HiSparkles className="text-white text-lg" />
          </div>
          <div>
            <h2 className="text-gray-900 font-semibold text-base">AI Study Tutor</h2>
            <p className="text-gray-600 text-xs">Ask about your materials</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors"
                title="Clear chat history"
              >
                <FaTrash size={12} />
              </button>
            )}
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span className="text-gray-400 text-xs">Ready</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 relative">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
              <FaRobot className="text-3xl text-gray-500" />
            </div>
            <h3 className="text-gray-900 font-semibold mb-2">Welcome!</h3>
            <p className="text-gray-400 text-sm mb-6 max-w-xs">
              I'm your AI study assistant. Ask me anything about your uploaded content.
            </p>
            <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg text-xs text-gray-700 text-left transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-start gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center ${
                msg.role === 'user' ? 'bg-gray-600' : 'bg-indigo-600'
              }`}>
                {msg.role === 'user' ? (
                  <FaUser className="text-white text-xs" />
                ) : (
                  <FaRobot className="text-white text-xs" />
                )}
              </div>
              <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm overflow-hidden break-words ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                  : 'bg-gray-100 text-gray-900 border border-gray-300 shadow' 
              } chat-message-content`}>
                <MessageContent content={msg.content} isUser={msg.role === 'user'} />
              </div>
            </motion.div>
          ))
        )}
        
        {/* Custom Styling for Chat Messages */}
        <style>{`
          .chat-message-content h1, .chat-message-content h2, .chat-message-content h3 {
            border-bottom: 1px solid rgba(255,255,255,0.1);
            padding-bottom: 4px;
            margin-bottom: 12px;
          }
          
          .chat-message-content table tr:nth-child(even) {
            background: rgba(255,255,255,0.02);
          }
          
          .chat-message-content p {
            line-height: 1.6;
          }
          
          /* Custom Section Colors for RAG Synthesis */
          .chat-message-content h2:contains("Fit Together"), 
          .chat-message-content h3:contains("Fit Together") {
            color: #818cf8;
          }
          
          .chat-message-content h2:contains("Matter"), 
          .chat-message-content h3:contains("Matter") {
            color: #fbbf24;
          }
          
          .chat-message-content h2:contains("Summary"), 
          .chat-message-content h3:contains("Summary") {
            color: #34d399;
          }
        `}</style>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-start gap-2"
          >
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex-shrink-0 flex items-center justify-center">
              <FaRobot className="text-white text-xs" />
            </div>
            <div className="bg-gray-100 border border-gray-300 rounded-xl px-3 py-2 flex items-center gap-2">
              <span className="text-gray-400 text-xs">Thinking</span>
              <div className="flex gap-0.5">
                <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-3 bg-gray-100 border-t border-gray-200">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim() && !isLoading) {
              sendMessage();
            }
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your question..."
            disabled={isLoading}
            className="flex-1 bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-blue-500 disabled:opacity-50"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="w-10 h-10 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 rounded-xl flex items-center justify-center transition-colors"
          >
            <IoSend className="text-white" />
          </button>
        </form>
        <p className="text-center text-[10px] text-gray-500 mt-2">
          🔒 Answers based on your uploaded materials
        </p>
      </div>
    </div>
  );
};

export default ChatBox;
