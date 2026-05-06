import React, { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';

const Maintenance = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');

    const fetchRequests = async () => {
        try {
            const res = await axiosClient.get('/Maintenances');
            setRequests(res.data);
            setLoading(false);
        } catch (err) {
            console.error("Lỗi lấy danh sách bảo trì:", err);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleUpdateStatus = async (id, status) => {
        try {
            await axiosClient.put(`/Maintenances/${id}/status`, status, {
                headers: { 'Content-Type': 'application/json' }
            });
            fetchRequests();
            alert("Cập nhật trạng thái thành công!");
        } catch (err) {
            alert("Lỗi: " + (err.response?.data || err.message));
        }
    };

    const statusMap = {
        0: { label: 'Đang chờ', color: 'bg-amber-100 text-amber-700 border-amber-200' },
        1: { label: 'Đang xử lý', color: 'bg-blue-100 text-blue-700 border-blue-200' },
        2: { label: 'Đã hoàn thành', color: 'bg-green-100 text-green-700 border-green-200' }
    };

    const filteredRequests = requests.filter(req => {
        if (filterStatus === 'all') return true;
        return req.status.toString() === filterStatus;
    });

    return (
        <div className="animate-in fade-in duration-700">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">🔧 Quản lý Bảo trì</h1>
                    <p className="text-gray-500 font-medium mt-1">Tiếp nhận và xử lý các sự cố từ khách thuê</p>
                </div>
                <div className="flex gap-2 bg-white p-1 rounded-2xl shadow-sm border border-gray-100">
                    {['all', '0', '1', '2'].map((s) => (
                        <button
                            key={s}
                            onClick={() => setFilterStatus(s)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filterStatus === s ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            {s === 'all' ? 'Tất cả' : statusMap[s].label}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : filteredRequests.length === 0 ? (
                <div className="bg-white rounded-3xl p-20 text-center border border-dashed border-gray-200">
                    <span className="text-6xl mb-4 block">✨</span>
                    <h3 className="text-xl font-bold text-gray-800">Không có yêu cầu nào</h3>
                    <p className="text-gray-400 mt-2">Mọi thứ đều đang hoạt động tốt!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredRequests.map((req) => (
                        <div key={req.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 hover:shadow-xl hover:shadow-indigo-500/5 transition-all group overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-4">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusMap[req.status]?.color || ''}`}>
                                    {statusMap[req.status]?.label}
                                </span>
                            </div>
                            
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-xl">
                                    🏠
                                </div>
                                <div>
                                    <h4 className="font-black text-gray-900 text-lg">Phòng {req.room?.roomNumber || req.roomId}</h4>
                                    <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest">{new Date(req.createdAt).toLocaleDateString('vi-VN')}</p>
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-2xl p-4 mb-6 min-h-[100px]">
                                <p className="text-sm text-gray-700 font-medium leading-relaxed italic">
                                    "{req.description}"
                                </p>
                            </div>

                            <div className="flex flex-col gap-2">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Cập nhật trạng thái</span>
                                <div className="grid grid-cols-2 gap-2">
                                    {req.status !== 1 && (
                                        <button 
                                            onClick={() => handleUpdateStatus(req.id, 1)}
                                            className="px-4 py-2.5 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                                        >
                                            🚀 Xử lý
                                        </button>
                                    )}
                                    {req.status !== 2 && (
                                        <button 
                                            onClick={() => handleUpdateStatus(req.id, 2)}
                                            className="px-4 py-2.5 bg-green-50 text-green-700 rounded-xl text-xs font-bold hover:bg-green-100 transition-colors flex items-center justify-center gap-2"
                                        >
                                            ✅ Hoàn thành
                                        </button>
                                    )}
                                    {req.status !== 0 && (
                                        <button 
                                            onClick={() => handleUpdateStatus(req.id, 0)}
                                            className="px-4 py-2.5 bg-amber-50 text-amber-700 rounded-xl text-xs font-bold hover:bg-amber-100 transition-colors flex items-center justify-center gap-2"
                                        >
                                            ⏳ Chờ lại
                                        </button>
                                    )}
                                </div>
                            </div>

                            {req.assignedTo && (
                                <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Người phụ trách:</span>
                                    <span className="text-xs font-bold text-gray-800 bg-gray-100 px-2 py-1 rounded-lg">{req.assignedTo}</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Maintenance;
