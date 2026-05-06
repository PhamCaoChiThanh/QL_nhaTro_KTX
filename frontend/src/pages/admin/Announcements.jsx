import React, { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';

const Announcements = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const res = await axiosClient.get('/Announcements');
            setAnnouncements(res.data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) return;
        try {
            await axiosClient.post('/Announcements', { title, content });
            setTitle('');
            setContent('');
            fetchData();
            alert("Đã gửi thông báo thành công!");
        } catch (err) {
            alert("Lỗi khi gửi thông báo!");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Xóa thông báo này?")) return;
        try {
            await axiosClient.delete(`/Announcements/${id}`);
            fetchData();
        } catch (err) {
            alert("Lỗi khi xóa!");
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 animate-in fade-in duration-700">
            <div className="lg:col-span-1">
                <div className="sticky top-28 bg-white rounded-[2.5rem] p-8 shadow-xl shadow-indigo-500/5 border border-gray-100">
                    <h2 className="text-2xl font-black text-gray-900 mb-2">📢 Gửi thông báo</h2>
                    <p className="text-gray-400 text-sm font-medium mb-8">Thông báo sẽ được gửi qua Telegram cho tất cả khách thuê.</p>
                    
                    <form onSubmit={handleSend} className="space-y-6">
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Tiêu đề</label>
                            <input required type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ví dụ: Thông báo cắt điện" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 font-bold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500/20" />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Nội dung chi tiết</label>
                            <textarea required rows={6} value={content} onChange={e => setContent(e.target.value)} placeholder="Nội dung thông báo..." className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 font-bold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none" />
                        </div>
                        <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2">
                            <span>🚀 Gửi thông báo ngay</span>
                        </button>
                    </form>
                </div>
            </div>

            <div className="lg:col-span-2">
                <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                    Lịch sử thông báo
                    <span className="bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-lg text-xs">{announcements.length}</span>
                </h3>
                
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {announcements.map((a) => (
                            <div key={a.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:border-indigo-100 transition-all relative group">
                                <button onClick={() => handleDelete(a.id)} className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity p-2 text-gray-400 hover:text-red-500 bg-gray-50 rounded-xl">🗑️</button>
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="text-xs font-black text-indigo-500 uppercase tracking-widest">{new Date(a.createdAt).toLocaleDateString('vi-VN')} {new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <h4 className="text-lg font-black text-gray-900 mb-2">{a.title}</h4>
                                <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">{a.content}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Announcements;
