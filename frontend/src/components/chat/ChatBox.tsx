import { useState, useRef, useCallback, useEffect, type FC } from 'react';
import { IoSend } from 'react-icons/io5';
import { FaRobot, FaUser, FaTrash } from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi';
import { motion } from 'framer-motion';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatBoxProps {
  documentIds: string[];
}

const FASTAPI_URL =
  import.meta.env.VITE_AI_URL ||
  import.meta.env.VITE_FASTAPI_URL;

const QUICK_PROMPTS = [
  'Summarize the key points',
  'What is the main topic?',
  'Explain this simply',
  'Create a study plan',
];

const MessageContent: FC<{ content: string; isUser: boolean }> = ({ content, isUser }) => {
  if (isUser) return <span className="font-medium">{content}</span>;

  return (
    <div className="markdown-content overflow-hidden w-full leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          h1: ({ children }) => <h1 className="text-xl font-semibold text-blue-900 mt-4 mb-3 border-b border-blue-200 pb-2">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-semibold text-blue-900 mt-4 mb-2 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-600" />{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-semibold text-blue-800 mt-3 mb-1">{children}</h3>,
          p: ({ children }) => <p className="mb-3 last:mb-0 text-blue-800 font-medium">{children}</p>,
          ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1.5 text-blue-800">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1.5 text-blue-800">{children}</ol>,
          li: ({ children }) => <li className="marker:text-blue-600">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-blue-900">{children}</strong>,
          em: ({ children }) => <em className="italic text-blue-700 font-medium">{children}</em>,
          code: ({ className, children }) => {
            const isInline = !className;
            if (isInline) {
              return <code className="bg-blue-50 px-1.5 py-0.5 rounded text-blue-800 text-xs font-mono border border-blue-200">{children}</code>;
            }
            return (
              <pre className="bg-blue-50 p-4 rounded-xl my-4 overflow-x-auto border border-blue-200">
                <code className="text-xs font-mono text-blue-900 leading-relaxed">{children}</code>
              </pre>
            );
          },
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:text-blue-900 underline decoration-blue-200 underline-offset-4 transition-colors">
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-blue-500 bg-blue-50 px-4 py-3 rounded-r-xl my-4 text-blue-800 italic font-medium">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto rounded-2xl border border-blue-200 bg-white">
              <table className="min-w-full divide-y divide-blue-200 text-xs text-left">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-blue-50 uppercase tracking-widest font-semibold text-[10px] text-blue-700">{children}</thead>,
          th: ({ children }) => <th className="px-4 py-3 font-semibold">{children}</th>,
          td: ({ children }) => <td className="px-4 py-3 text-blue-800 border-t border-blue-200">{children}</td>,
          tr: ({ children }) => <tr className="hover:bg-blue-50 transition-colors">{children}</tr>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

const ChatBox: FC<ChatBoxProps> = ({ documentIds }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const storageKey = `chat_history_${documentIds.sort().join('_').substring(0, 50)}`;

  useEffect(() => {
    if (documentIds.length > 0) {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) setMessages(parsed);
        }
      } catch (e) {
        console.warn('[ChatBox] Failed to load chat history:', e);
      }
    } else {
      setMessages([]);
    }
  }, [storageKey, documentIds.length]);

  useEffect(() => {
    if (messages.length > 0 && documentIds.length > 0) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(messages.slice(-50)));
      } catch (e) {
        console.warn('[ChatBox] Failed to save chat history:', e);
      }
    }
  }, [messages, storageKey, documentIds.length]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
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
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: '### Action Required\n\n**Please upload and process study materials first!** I need source content to provide accurate insights.',
      }]);
      return;
    }

    setMessages((prev) => [...prev, { role: 'user', content: query }]);
    setInput('');
    setIsLoading(true);

    try {
      const chatHistory = messages.slice(-10).map((m) => ({ role: m.role, content: m.content }));
      const token = localStorage.getItem('accessToken');
      const response = await axios.post(
        `${FASTAPI_URL}/api/chat`,
        { query, document_ids: documentIds, chat_history: chatHistory },
        { headers: { Authorization: token ? `Bearer ${token}` : '', 'Content-Type': 'application/json' } }
      );

      setMessages((prev) => [...prev, { role: 'assistant', content: response.data.answer }]);
    } catch (error: any) {
      console.error('[ChatBox] Error:', error);
      const detail = error.response?.data?.detail || error.message;
      const lowered = String(detail || '').toLowerCase();
      const friendlyDetail = lowered.includes('402') || lowered.includes('payment required') || lowered.includes('billing')
        ? 'DeepInfra billing/quota issue (402). Add credits or switch provider to Gemini/OpenAI/Ollama.'
        : detail;
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: `### Connection Error\n\n**Details:** ${friendlyDetail}\n\nPlease verify your connection and try again.`,
      }]);
    } finally {
      setIsLoading(false);
      setTimeout(scrollToBottom, 100);
    }
  }, [input, documentIds, messages, scrollToBottom]);

  return (
    <div className="w-full h-full flex flex-col bg-white border border-blue-200 rounded-xl shadow-sm overflow-hidden">
      <div className="flex-shrink-0 px-6 py-4 border-b border-blue-200 bg-blue-50">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-sm ring-1 ring-blue-200">
            <HiSparkles className="text-white text-xl animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-blue-900 font-semibold text-lg tracking-tight">AI Scholar</h2>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
              <p className="text-blue-700 text-[10px] font-semibold uppercase tracking-widest">Active Reasoning</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={clearChat}
                className="p-2.5 rounded-xl text-blue-700 hover:text-blue-900 transition-all border border-transparent hover:border-blue-200 hover:bg-blue-50"
                title="Clear history"
              >
                <FaTrash size={14} />
              </motion.button>
            )}
          </div>
        </div>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto overflow-x-hidden p-4 flex flex-col gap-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <div className="mb-2">
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} className="relative w-36 h-36">
                <div className="absolute inset-0 rounded-full bg-blue-100" />
                <div className="absolute inset-4 rounded-full bg-white border border-blue-200" />
                <FaRobot className="absolute inset-0 m-auto text-blue-600 text-5xl" />
              </motion.div>
            </div>
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Knowledge Interface</h3>
            <p className="text-sm text-blue-800 mb-4 max-w-xs leading-6">
              Ask me anything about your uploaded study materials.
            </p>
            <div className="flex flex-col gap-2 w-full max-w-sm">
              {QUICK_PROMPTS.map((prompt) => (
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="bg-white text-blue-900 border-2 border-blue-600 font-semibold rounded-full px-6 py-2 shadow-sm hover:bg-blue-50 hover:text-blue-700 hover:border-blue-700 transition text-left flex items-center gap-2"
                >
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  {prompt}
                </motion.button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center shadow-sm ${msg.role === 'user' ? 'bg-blue-100 ring-1 ring-blue-200' : 'bg-blue-600 ring-1 ring-blue-200'}`}>
                {msg.role === 'user' ? <FaUser className="text-blue-900 text-[10px]" /> : <FaRobot className="text-white text-[10px]" />}
              </div>
              <div className={`max-w-[85%] px-5 py-4 rounded-2xl text-sm overflow-hidden break-words shadow-sm relative ${msg.role === 'user' ? 'bg-blue-100 text-blue-900 rounded-tr-none border border-blue-200' : 'bg-white border border-blue-200 text-blue-800 rounded-tl-none font-medium'}`}>
                {msg.role === 'assistant' && (
                  <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none">
                    <FaRobot size={40} className="rotate-12" />
                  </div>
                )}
                <MessageContent content={msg.content} isUser={msg.role === 'user'} />
              </div>
            </motion.div>
          ))
        )}

        {isLoading && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex-shrink-0 flex items-center justify-center ring-1 ring-blue-200">
              <FaRobot className="text-white text-[10px]" />
            </div>
            <div className="bg-white border border-blue-200 rounded-2xl rounded-tl-none px-5 py-4 flex flex-col gap-2 min-w-[120px]">
              <div className="flex items-center gap-2">
                <span className="text-blue-700 text-[10px] font-semibold uppercase tracking-[0.2em] animate-pulse">Analyzing Nodes</span>
                <div className="flex gap-1">
                  <motion.span animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1, times: [0, 0.5, 1] }} className="w-1 h-1 bg-blue-600 rounded-full" />
                  <motion.span animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1, times: [0, 0.5, 1], delay: 0.2 }} className="w-1 h-1 bg-blue-600 rounded-full" />
                  <motion.span animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1, times: [0, 0.5, 1], delay: 0.4 }} className="w-1 h-1 bg-blue-600 rounded-full" />
                </div>
              </div>
              <div className="h-1 bg-blue-100 rounded-full overflow-hidden w-full">
                <motion.div
                  animate={{ x: [-100, 200] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                  className="h-full w-24 bg-blue-600"
                />
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="flex-shrink-0 p-6 border-t border-blue-200 bg-blue-50">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim() && !isLoading) sendMessage();
          }}
          className="relative flex items-center gap-3"
        >
          <div className="flex-1 relative group">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Query your knowledge hub..."
              disabled={isLoading}
              className="w-full bg-white border border-blue-300 rounded-2xl px-6 py-4.5 pr-14 text-blue-900 text-sm placeholder:text-blue-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all disabled:opacity-50 font-medium shadow-sm"
              autoComplete="off"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-blue-700 bg-white px-1.5 py-0.5 rounded border border-blue-200 pointer-events-none group-focus-within:opacity-0 transition-opacity">
              ↵
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={!input.trim() || isLoading}
            className="btn-primary w-14 h-14 flex-shrink-0 disabled:opacity-20 disabled:grayscale rounded-[1.25rem] flex items-center justify-center transition-all shadow-sm px-0"
          >
            <IoSend className="text-xl" />
          </motion.button>
        </form>
        <div className="flex items-center justify-center gap-2 mt-4">
          <div className="w-1 h-1 rounded-full bg-blue-600" />
          <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-widest">
            Neural Network Inference Enabled
          </p>
          <div className="w-1 h-1 rounded-full bg-blue-600" />
        </div>
      </div>
    </div>
  );
};

export default ChatBox;
