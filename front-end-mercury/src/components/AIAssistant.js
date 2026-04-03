import React, { useState, useRef, useEffect } from 'react';
import { XMarkIcon, PaperAirplaneIcon, ChatBubbleLeftRightIcon, TrashIcon, ClockIcon } from '@heroicons/react/24/outline';
import { SparklesIcon } from '@heroicons/react/24/solid';
import axios from 'axios';
import { useSession } from '../providers/SessionProvider';
import BASE_URL from '../config';

export default function AIAssistant() {
  const { session, refreshAccessToken } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const headers = { 'Authorization': `Bearer ${session.accessToken}` };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/ai/chat/history/`, { headers });
      setConversations(res.data);
    } catch (err) {
      if (err.response?.status === 401) await refreshAccessToken();
    }
  };

  const loadConversation = async (convId) => {
    try {
      const res = await axios.get(`${BASE_URL}/api/ai/chat/${convId}/`, { headers });
      setMessages(res.data.messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.created_at,
      })));
      setConversationId(convId);
      setShowHistory(false);
    } catch (err) {
      if (err.response?.status === 401) await refreshAccessToken();
    }
  };

  const deleteConversation = async (convId, e) => {
    e.stopPropagation();
    try {
      await axios.delete(`${BASE_URL}/api/ai/chat/${convId}/delete/`, { headers });
      setConversations(prev => prev.filter(c => c.id !== convId));
      if (conversationId === convId) {
        setConversationId(null);
        setMessages([]);
      }
    } catch (err) {
      if (err.response?.status === 401) await refreshAccessToken();
    }
  };

  const startNewChat = () => {
    setConversationId(null);
    setMessages([]);
    setShowHistory(false);
  };

  const sendMessage = async () => {
    const text = message.trim();
    if (!text || loading) return;

    setMessage('');
    setMessages(prev => [...prev, { role: 'user', content: text, timestamp: new Date().toISOString() }]);
    setLoading(true);

    try {
      const res = await axios.post(`${BASE_URL}/api/ai/chat/`, {
        message: text,
        conversation_id: conversationId,
      }, { headers });

      setConversationId(res.data.conversation_id);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.data.response,
        timestamp: new Date().toISOString(),
        processing_time_ms: res.data.processing_time_ms,
      }]);
    } catch (err) {
      if (err.response?.status === 401) {
        await refreshAccessToken();
      }
      const errorMsg = err.response?.data?.error || 'Failed to get response. Please try again.';
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `⚠️ ${errorMsg}`,
        timestamp: new Date().toISOString(),
        isError: true,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatContent = (content) => {
    // Basic markdown-like formatting for bullet points and bold
    return content.split('\n').map((line, i) => {
      const formatted = line
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');
      
      if (line.startsWith('- ') || line.startsWith('• ')) {
        return <li key={i} className="ml-4" dangerouslySetInnerHTML={{ __html: formatted.substring(2) }} />;
      }
      return <p key={i} className={line === '' ? 'h-2' : ''} dangerouslySetInnerHTML={{ __html: formatted }} />;
    });
  };

  const suggestedQuestions = [
    "How many loads are in transit right now?",
    "What's my revenue for the last 30 days?",
    "Which drivers have the most active loads?",
    "Show me my fleet summary",
    "What open maintenance items do we have?",
    "How many invoices are outstanding?",
  ];

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={() => { setIsOpen(true); fetchHistory(); }}
          className="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all hover:scale-105 flex items-center gap-2"
          title="AI Fleet Assistant"
        >
          <SparklesIcon className="h-6 w-6" />
          <span className="hidden sm:inline text-sm font-medium">AI Assistant</span>
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[420px] h-[600px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SparklesIcon className="h-5 w-5 text-white" />
              <span className="text-white font-semibold text-sm">Fleetly AI</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setShowHistory(!showHistory); if (!showHistory) fetchHistory(); }}
                className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition"
                title="Chat history"
              >
                <ClockIcon className="h-4 w-4" />
              </button>
              <button
                onClick={startNewChat}
                className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition"
                title="New chat"
              >
                <ChatBubbleLeftRightIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* History panel */}
          {showHistory && (
            <div className="absolute top-12 left-0 right-0 bottom-0 z-10 bg-white overflow-y-auto">
              <div className="p-3">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Recent Conversations</h3>
                {conversations.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">No conversations yet</p>
                ) : (
                  <div className="space-y-1">
                    {conversations.map(conv => (
                      <div
                        key={conv.id}
                        onClick={() => loadConversation(conv.id)}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-gray-50 transition ${
                          conversationId === conv.id ? 'bg-blue-50 border border-blue-200' : ''
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{conv.title}</p>
                          <p className="text-xs text-gray-400">{new Date(conv.updated_at).toLocaleDateString()}</p>
                        </div>
                        <button
                          onClick={(e) => deleteConversation(conv.id, e)}
                          className="ml-2 p-1 text-gray-300 hover:text-red-500 transition"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => setShowHistory(false)}
                  className="w-full mt-3 text-xs text-blue-600 hover:text-blue-800 py-1"
                >
                  Back to chat
                </button>
              </div>
            </div>
          )}

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-6">
                <SparklesIcon className="h-10 w-10 text-blue-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700">Hi! I'm your fleet assistant</p>
                <p className="text-xs text-gray-400 mt-1 mb-4">Ask me anything about your fleet, loads, drivers, or revenue</p>
                <div className="space-y-1.5">
                  {suggestedQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => { setMessage(q); }}
                      className="block w-full text-left text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg px-3 py-2 transition"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : msg.isError
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <div className="space-y-1 leading-relaxed">
                    {msg.role === 'assistant' ? formatContent(msg.content) : msg.content}
                  </div>
                  {msg.processing_time_ms && (
                    <p className="text-[10px] text-gray-400 mt-1 text-right">
                      {(msg.processing_time_ms / 1000).toFixed(1)}s
                    </p>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-xl px-4 py-3">
                  <div className="flex space-x-1.5">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="border-t border-gray-200 p-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your fleet..."
                className="flex-1 resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent max-h-24"
                rows={1}
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={!message.trim() || loading}
                className="p-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
              >
                <PaperAirplaneIcon className="h-4 w-4" />
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1 text-center">
              AI may make mistakes. Verify important data.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
