import React, { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';

const Assets = () => {
    const [assets, setAssets] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [formData, setFormData] = useState({ name: '', roomId: '', description: '', status: 0, value: 0 });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [resAssets, resRooms] = await Promise.all([
                axiosClient.get('/Assets'),
                axiosClient.get('/Rooms')
            ]);
            setAssets(resAssets.data);
            setRooms(resRooms.data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (selectedAsset) {
                await axiosClient.put(`/Assets/${selectedAsset.id}`, { ...formData, id: selectedAsset.id });
            } else {
                await axiosClient.post('/Assets', formData);
            }
            setShowModal(false);
            fetchData();
        } catch (err) {
            alert("Lỗi: " + (err.response?.data || err.message));
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Bạn có chắc muốn xóa tài sản này?")) return;
        try {
            await axiosClient.delete(`/Assets/${id}`);
            fetchData();
        } catch (err) {
            alert("Lỗi khi xóa!");
        }
    };

    const statusMap = {
        0: { label: 'Tốt', color: 'bg-green-100 text-green-700' },
        1: { label: 'Cảnh báo', color: 'bg-yellow-100 text-yellow-700' },
        2: { label: 'Hỏng', color: 'bg-red-100 text-red-700' },
        3: { label: 'Mất', color: 'bg-gray-100 text-gray-700' }
    };

    return (
        <div className="animate-in fade-in duration-700">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">🛋️ Quản lý Tài sản</h1>
                    <p className="text-gray-500 font-medium mt-1">Quản lý trang thiết bị nội thất trong từng phòng</p>
                </div>
                <button 
                    onClick={() => { setSelectedAsset(null); setFormData({ name: '', roomId: '', description: '', status: 0, value: 0 }); setShowModal(true); }}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all transform hover:-translate-y-0.5"
                >
                    + Thêm tài sản
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {assets.map((asset) => (
                        <div key={asset.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-xl transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-2xl">
                                    {asset.name.toLowerCase().includes('điều hòa') ? '❄️' : asset.name.toLowerCase().includes('giường') ? '🛏️' : asset.name.toLowerCase().includes('tủ') ? '🗄️' : '📦'}
                                </div>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${statusMap[asset.status]?.color}`}>
                                    {statusMap[asset.status]?.label}
                                </span>
                            </div>
                            <h4 className="font-black text-gray-900 text-lg leading-tight mb-1">{asset.name}</h4>
                            <p className="text-xs font-bold text-indigo-600 uppercase mb-3">Phòng {asset.room?.roomNumber}</p>
                            <p className="text-sm text-gray-500 line-clamp-2 mb-4 min-h-[40px]">{asset.description || 'Không có mô tả'}</p>
                            
                            <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                                <span className="text-sm font-black text-gray-900">{asset.value?.toLocaleString()} đ</span>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => { setSelectedAsset(asset); setFormData({ ...asset }); setShowModal(true); }} className="p-2 bg-gray-50 text-gray-400 hover:text-indigo-600 rounded-lg transition-colors">✏️</button>
                                    <button onClick={() => handleDelete(asset.id)} className="p-2 bg-gray-50 text-gray-400 hover:text-red-600 rounded-lg transition-colors">🗑️</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <form onSubmit={handleSave} className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 animate-in zoom-in duration-300">
                        <h2 className="text-2xl font-black text-gray-900 mb-6">{selectedAsset ? 'Sửa tài sản' : 'Thêm tài sản mới'}</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Tên tài sản</label>
                                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 font-bold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500/20" />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Gán vào phòng</label>
                                <select required value={formData.roomId} onChange={e => setFormData({...formData, roomId: parseInt(e.target.value)})} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 font-bold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500/20">
                                    <option value="">-- Chọn phòng --</option>
                                    {rooms.map(r => <option key={r.id} value={r.id}>{r.roomNumber}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Trạng thái</label>
                                    <select value={formData.status} onChange={e => setFormData({...formData, status: parseInt(e.target.value)})} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 font-bold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500/20">
                                        <option value={0}>Tốt</option>
                                        <option value={1}>Cảnh báo</option>
                                        <option value={2}>Hỏng</option>
                                        <option value={3}>Mất</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Giá trị (đ)</label>
                                    <input type="number" value={formData.value} onChange={e => setFormData({...formData, value: parseInt(e.target.value)})} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 font-bold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500/20" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Mô tả chi tiết</label>
                                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 font-bold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500/20" rows={3} />
                            </div>
                        </div>
                        <div className="flex gap-4 mt-8">
                            <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-6 py-4 rounded-2xl font-bold text-gray-500 hover:bg-gray-50 transition">Hủy</button>
                            <button type="submit" className="flex-1 px-6 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition">Lưu lại</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default Assets;
