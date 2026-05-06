import React, { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';

const Security = () => {
    const [visitors, setVisitors] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('visitors');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [resVis, resVeh] = await Promise.all([
                axiosClient.get('/Visitors'),
                axiosClient.get('/Vehicles')
            ]);
            setVisitors(resVis.data);
            setVehicles(resVeh.data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    return (
        <div className="animate-in fade-in duration-700">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">🛡️ An ninh & Bãi xe</h1>
                    <p className="text-gray-500 font-medium mt-1">Giám sát khách ra vào và quản lý phương tiện cư dân</p>
                </div>
                <div className="flex gap-2 bg-white p-1 rounded-2xl shadow-sm border border-gray-100">
                    <button onClick={() => setActiveTab('visitors')} className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'visitors' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-gray-500'}`}>👥 Khách ra vào</button>
                    <button onClick={() => setActiveTab('vehicles')} className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'vehicles' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-gray-500'}`}>🏍️ Quản lý xe</button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : activeTab === 'visitors' ? (
                <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/80 border-b border-gray-100">
                            <tr>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Thời gian</th>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Khách ghé thăm</th>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Người bảo lãnh</th>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Ghi chú</th>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Loại</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {visitors.map(v => (
                                <tr key={v.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-8 py-5">
                                        <p className="font-bold text-gray-800 text-sm">{new Date(v.visitTime).toLocaleDateString('vi-VN')}</p>
                                        <p className="text-[10px] text-gray-400 font-bold">{new Date(v.visitTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                                    </td>
                                    <td className="px-8 py-5">
                                        <p className="font-black text-gray-900">{v.fullName}</p>
                                        <p className="text-xs text-indigo-500 font-bold">{v.cccd}</p>
                                    </td>
                                    <td className="px-8 py-5">
                                        <p className="font-bold text-gray-800 text-sm">{v.tenant?.fullName}</p>
                                        <p className="text-[10px] text-gray-400 font-bold">Phòng {v.tenant?.roomNumber || '?'}</p>
                                    </td>
                                    <td className="px-8 py-5 text-sm text-gray-500 italic">"{v.reason || '...'}"</td>
                                    <td className="px-8 py-5">
                                        {v.isOvernight ? 
                                            <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-lg text-[10px] font-black uppercase">Qua đêm 🌙</span> : 
                                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-black uppercase">Trong ngày</span>
                                        }
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="p-8 bg-indigo-50/30 border-t border-indigo-100 flex justify-between items-center">
                        <p className="text-xs font-bold text-indigo-600">💡 Dữ liệu này dùng để xuất tờ khai tạm trú cho Công an phường.</p>
                        <button className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">Xuất báo cáo Tạm Trú (.csv)</button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {vehicles.map(v => (
                        <div key={v.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:border-indigo-200 transition-all relative group overflow-hidden">
                            <div className="absolute top-0 right-0 p-4">
                                <span className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">{v.vehicleType}</span>
                            </div>
                            <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                                {v.vehicleType.toLowerCase().includes('ô tô') ? '🚗' : '🏍️'}
                            </div>
                            <h4 className="text-2xl font-black text-gray-900 tracking-tighter mb-1">{v.licensePlate}</h4>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Thẻ: {v.parkingTagNumber || 'N/A'}</p>
                            
                            <div className="pt-4 border-t border-gray-50 flex items-center gap-3">
                                <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[10px] font-black">
                                    {v.tenant?.fullName?.substring(0,1)}
                                </div>
                                <div>
                                    <p className="text-xs font-black text-gray-800 leading-none">{v.tenant?.fullName}</p>
                                    <p className="text-[10px] text-gray-400 font-bold mt-1">Phòng {v.tenant?.roomNumber}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                    <button className="bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 p-6 flex flex-col items-center justify-center text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-all gap-2">
                        <span className="text-3xl">+</span>
                        <span className="text-xs font-black uppercase tracking-widest">Thêm xe mới</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default Security;
