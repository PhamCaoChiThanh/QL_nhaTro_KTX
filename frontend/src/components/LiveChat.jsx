import React, { useState, useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { tokenStorage } from '../api/axiosClient';

export default function LiveChat() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [connection, setConnection] = useState(null);
    const messagesEndRef = useRef(null);

    // Lấy info user hiện tại
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = user.role === 'Admin' || user.role === 'Staff';

    useEffect(() => {
        if (!isOpen) return;
        if (connection) return;

        const token = tokenStorage.getAccessToken();
        if (!token) return;

        const newConnection = new signalR.HubConnectionBuilder()
            .withUrl('http://localhost:5000/hubs/chat', {
                accessTokenFactory: () => token
            })
            .withAutomaticReconnect()
            .build();

        setConnection(newConnection);
    }, [isOpen, connection]);

    useEffect(() => {
        if (!connection) return;

        connection.start()
            .then(() => console.log('Connected to LiveChat Hub'))
            .catch(err => console.error('LiveChat connection error: ', err));

        connection.on("ReceiveMessage", (msg) => {
            setMessages(prev => [...prev, msg]);
        });

        return () => {
            connection.off("ReceiveMessage");
        };
    }, [connection]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim() || !connection) return;

        try {
            await connection.invoke("SendMessageToAdmin", input);
            setInput('');
        } catch (err) {
            console.error("Send message error:", err);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {/* Nút bong bóng chat */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110"
            >
                {isOpen ? <span className="text-2xl">❌</span> : <span className="text-2xl">💬</span>}
            </button>

            {/* Khung Chat */}
            {isOpen && (
                <div className="absolute bottom-16 right-0 w-80 h-96 bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-fade-in">
                    <div className="p-4 bg-indigo-600 text-white font-bold flex justify-between items-center text-sm shadow-md">
                        <span>Hỗ trợ trực tuyến ({isAdmin ? 'Kênh Quản lý' : 'Nhắn với Admin'})</span>
                    </div>

                    {/* Danh sách Message */}
                    <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-50 text-xs">
                        {messages.length === 0 && (
                            <p className="text-center text-gray-400 mt-10">Bắt đầu cuộc trò chuyện...</p>
                        )}
                        {messages.map((m, i) => {
                            // Logic xác định tin nhắn là của bản thân hay đối phương
                            const isMe = (!isAdmin && m.isFromTenant) || (isAdmin && !m.isFromTenant);
                            return (
                                <div key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                    <span className="text-[10px] text-gray-400 mb-0.5">{m.senderName}</span>
                                    <div className={`px-3 py-2 rounded-xl max-w-[80%] break-words ${isMe ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-800'}`}>
                                        {m.message}
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-100 flex gap-2">
                        <input 
                            type="text" 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Nhập tin nhắn..."
                            className="flex-1 px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-indigo-500 bg-gray-50"
                        />
                        <button type="submit" className="px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors">
                            Gửi
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
