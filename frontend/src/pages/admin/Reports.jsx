import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Cell, PieChart, Pie } from 'recharts';
import axiosClient from '../../api/axiosClient';

const Reports = () => {
    const [revenueData, setRevenueData] = useState([]);
    const [leakageData, setLeakageData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [resRev, resLeak] = await Promise.all([
                axiosClient.get('/Reports/revenue'),
                axiosClient.get('/Reports/utility-leakage')
            ]);
            setRevenueData(resRev.data.map(d => ({ ...d, name: `Tháng ${d.month}/${d.year}` })));
            setLeakageData(resLeak.data.map(d => ({ ...d, name: `T${d.month}` })));
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    if (loading) return <div className="flex justify-center py-20"><div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;

    const totalRevenue = revenueData.reduce((acc, curr) => acc + curr.total, 0);

    return (
        <div className="space-y-10 animate-in fade-in duration-700">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">📊 Phân tích & Báo cáo</h1>
                    <p className="text-gray-500 font-medium mt-1">Trực quan hóa hoạt động kinh doanh và vận hành</p>
                </div>
                <div className="flex gap-3">
                    <button className="px-6 py-3 bg-white border border-gray-100 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-600 hover:bg-gray-50 transition-all shadow-sm">Xuất Excel</button>
                    <button className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">Tải Báo cáo PDF</button>
                </div>
            </div>

            {/* Thống kê nhanh */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-200">
                    <p className="text-xs font-black uppercase tracking-widest opacity-70 mb-2">Tổng doanh thu</p>
                    <h3 className="text-3xl font-black mb-4">{totalRevenue.toLocaleString()} đ</h3>
                    <div className="flex items-center gap-2 text-xs font-bold bg-white/10 w-fit px-3 py-1.5 rounded-full">
                        <span>📈 +12% so với tháng trước</span>
                    </div>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Tỷ lệ lấp đầy</p>
                    <h3 className="text-3xl font-black text-gray-900 mb-4">92%</h3>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-indigo-600 h-full w-[92%]"></div>
                    </div>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Hóa đơn chưa thanh toán</p>
                    <h3 className="text-3xl font-black text-rose-600 mb-4">08</h3>
                    <p className="text-xs font-bold text-gray-400">Cần nhắc nhở thanh toán ngay</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Biểu đồ doanh thu */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-black text-gray-900 mb-8 flex items-center justify-between">
                        Dòng tiền doanh thu
                        <select className="text-xs font-bold border-none bg-gray-50 rounded-lg px-2 py-1 outline-none">
                            <option>Năm 2026</option>
                        </select>
                    </h3>
                    <div className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={revenueData}>
                                <defs>
                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#9ca3af'}} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#9ca3af'}} tickFormatter={(v) => `${v/1000000}M`} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', padding: '15px' }}
                                    itemStyle={{ fontSize: '12px', fontWeight: '900', color: '#4f46e5' }}
                                />
                                <Area type="monotone" dataKey="total" stroke="#4f46e5" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Biểu đồ thất thoát điện nước */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-black text-gray-900 mb-8 flex items-center justify-between">
                        Cảnh báo rò rỉ & Thất thoát
                        <span className="text-[10px] font-black text-rose-500 bg-rose-50 px-2 py-1 rounded-lg uppercase">Phát hiện bất thường ⚠️</span>
                    </h3>
                    <div className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={leakageData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#9ca3af'}} />
                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#9ca3af'}} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', padding: '15px' }}
                                />
                                <Bar dataKey="elecLeak" name="Thất thoát Điện (kWh)" fill="#f59e0b" radius={[10, 10, 0, 0]} />
                                <Bar dataKey="waterLeak" name="Thất thoát Nước (khối)" fill="#3b82f6" radius={[10, 10, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-6 p-4 bg-gray-50 rounded-2xl">
                        <p className="text-[10px] font-bold text-gray-500 leading-relaxed uppercase tracking-widest mb-1">Giải trình</p>
                        <p className="text-xs font-bold text-gray-700">Chênh lệch giữa <span className="text-indigo-600 font-black">Công tơ tổng</span> và <span className="text-indigo-600 font-black">Tổng công tơ phòng</span>. Nếu con số này quá lớn, vui lòng kiểm tra rò rỉ ống nước hoặc câu trộm điện.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Reports;
