import React, { useState, useRef, useEffect } from 'react';
import axiosClient from '../api/axiosClient';

const AIChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { text: "Xin chào! Mình là Trợ lý AI của SmartDorm. Bạn có câu hỏi gì về nội quy, giờ giấc hay hóa đơn không?", isBot: true }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { scrollToBottom(); }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setMessages(prev => [...prev, { text: userMsg, isBot: false }]);
    setInput('');
    setIsTyping(true);

    try {
      const res = await axiosClient.post('/AIChatbot/ask', { message: userMsg });
      setMessages(prev => [...prev, { text: res.data.answer, isBot: true }]);
    } catch (err) {
      setMessages(prev => [...prev, { text: "Xin lỗi, AI đang gặp sự cố kết nối. Vui lòng thử lại sau.", isBot: true }]);
    }
    setIsTyping(false);
  };

  return (
    <div className="fixed bottom-6 right-24 z-50">
      {/* Nút mở Chatbot */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="w-16 h-16 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-full shadow-[0_0_20px_rgba(168,85,247,0.5)] flex items-center justify-center text-white transform hover:scale-110 hover:shadow-[0_0_30px_rgba(168,85,247,0.7)] transition-all duration-300 relative group overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/20 group-hover:scale-150 rounded-full transition-transform duration-500 ease-out"></div>
          <span className="text-3xl relative z-10 animate-pulse">✨</span>
          <span className="absolute right-full mr-4 bg-gray-900/90 backdrop-blur text-white text-xs font-bold px-3 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity shadow-lg">SmartDorm AI</span>
        </button>
      )}

      {/* Cửa sổ Chatbot (Glassmorphism) */}
      {isOpen && (
        <div className="w-[360px] h-[540px] bg-white/80 backdrop-blur-2xl rounded-[2rem] shadow-[0_20px_60px_-10px_rgba(0,0,0,0.2)] border border-white/50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 fade-in zoom-in-95 duration-300">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-5 flex justify-between items-center text-white relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30"></div>
            <div className="flex items-center relative z-10">
              <div className="w-11 h-11 bg-white/20 rounded-full flex items-center justify-center mr-3 backdrop-blur-md font-bold text-2xl shadow-inner border border-white/10">🤖</div>
              <div>
                <h3 className="font-extrabold text-lg tracking-tight">SmartDorm AI</h3>
                <p className="text-xs text-indigo-100 flex items-center"><span className="w-2 h-2 bg-green-400 rounded-full mr-1.5 shadow-[0_0_8px_rgba(74,222,128,1)] animate-pulse"></span> Hoạt động với Gemini 2.0</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="relative z-10 text-white/70 hover:text-white transition bg-white/10 hover:bg-white/20 p-2 rounded-full backdrop-blur-md">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 p-5 overflow-y-auto bg-gradient-to-b from-gray-50/50 to-white/50 space-y-5 custom-scrollbar">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'}`}>
                {msg.isBot && <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-sm mr-2 shadow-md flex-shrink-0 mt-1">🤖</div>}
                <div className={`max-w-[80%] whitespace-pre-wrap rounded-[1.25rem] px-4 py-3 text-sm leading-relaxed shadow-sm ${msg.isBot ? 'bg-white text-gray-800 border border-gray-100 rounded-tl-none font-medium' : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-tr-none font-medium'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-sm mr-2 shadow-md flex-shrink-0 mt-1">🤖</div>
                <div className="bg-white border border-gray-100 px-4 py-4 rounded-[1.25rem] rounded-tl-none shadow-sm flex space-x-1.5 items-center h-[44px]">
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Footer (Input) */}
          <div className="p-4 bg-white/60 backdrop-blur-xl border-t border-gray-100 z-10">
            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex relative items-center">
              <input 
                type="text" 
                value={input} 
                onChange={e => setInput(e.target.value)}
                placeholder="Hỏi AI về nội quy, wifi, sửa chữa..." 
                className="w-full bg-white/80 rounded-2xl pl-5 pr-14 py-3.5 text-sm font-medium outline-none focus:ring-2 focus:ring-purple-500/50 transition-all border border-gray-200 shadow-inner"
              />
              <button type="submit" disabled={!input.trim()} className="absolute right-2 w-10 h-10 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 text-white rounded-xl flex items-center justify-center disabled:opacity-50 disabled:grayscale transition-all shadow-md transform hover:scale-105 active:scale-95">
                <svg className="w-4 h-4 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
              </button>
            </form>
            <div className="text-center mt-2">
               <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Powered by Google Gemini 2.0</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIChatbot;
