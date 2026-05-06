import React, { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';

const Dashboard = () => {
  const [stats, setStats] = useState({ total: 0, rented: 0, available: 0, maintenance: 0, revenue: 0, pending: 0, occupancyRate: 0 });
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roomRequests, setRoomRequests] = useState([]);
  const [actionNote, setActionNote] = useState({});
  const [actionMsg, setActionMsg] = useState('');

  useEffect(() => {
    // Fetch dữ liệu từ Reports API
    axiosClient.get('/Reports/dashboard')
      .then(res => {
        const data = res.data;
        setStats({
          total: data.totalRooms || 0,
          rented: data.rentedRooms || 0,
          available: data.availableRooms || 0,
          maintenance: (data.totalRooms || 0) - (data.rentedRooms || 0) - (data.availableRooms || 0),
          revenue: data.monthlyRevenue || 0,
          pending: data.monthlyPendingRevenue || 0,
          occupancyRate: data.occupancyRate || 0
        });
        setChartData(data.revenueChartData || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    axiosClient.get('/RoomRequests')
      .then(res => setRoomRequests(res.data))
      .catch(() => {});
  }, []);

  const handleAction = async (id, action) => {
    try {
      await axiosClient.put(`/RoomRequests/${id}/${action}`, { adminNote: actionNote[id] || '' });
      setRoomRequests(prev => prev.map(r => r.id === id ? { ...r, status: action === 'approve' ? 'Approved' : 'Rejected', adminNote: actionNote[id] || '' } : r));
      setActionMsg(action === 'approve' ? '✅ Đã chấp thuận yêu cầu!' : '❌ Đã từ chối yêu cầu.');
      setTimeout(() => setActionMsg(''), 3000);
    } catch (err) {
      setActionMsg('Lỗi: ' + (err.response?.data?.message || 'Thao tác thất bại.'));
    }
  };

  const pendingRequests = roomRequests.filter(r => r.status === 'Pending' || r.status === 0);
  const processedRequests = roomRequests.filter(r => r.status !== 'Pending' && r.status !== 0);

  const formatCurrency = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  const statCards = [
    { label: 'Tổng số phòng', value: stats.total, color: 'text-indigo-600', bg: 'from-indigo-50 to-blue-50', icon: '🏢' },
    { label: 'Doanh thu tháng', value: formatCurrency(stats.revenue), color: 'text-green-600', bg: 'from-green-50 to-emerald-50', icon: '💰', sub: `Công nợ: ${formatCurrency(stats.pending)}` },
    { label: 'Tỷ lệ lấp đầy', value: `${stats.occupancyRate}%`, color: 'text-yellow-600', bg: 'from-yellow-50 to-orange-50', icon: '📈', sub: `${stats.rented} phòng đã thuê` },
    { label: 'Phòng trống', value: stats.available, color: 'text-red-500', bg: 'from-red-50 to-rose-50', icon: '🔑', sub: `${stats.maintenance} phòng bảo trì` },
  ];

  const pieData = [
    { name: 'Đang cho thuê', value: stats.rented },
    { name: 'Phòng trống', value: stats.available },
    { name: 'Đang bảo trì', value: stats.maintenance },
  ];
  const COLORS = ['#10b981', '#f59e0b', '#ef4444'];

  return (
    <div>
      <h1 className="text-3xl font-black mb-8 text-gray-800 tracking-tight">Tổng quan hệ thống</h1>

      {loading ? (
        <div className="flex justify-center items-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            {statCards.map(card => (
              <div key={card.label} className={`bg-gradient-to-br ${card.bg} p-6 rounded-2xl shadow-sm border border-white hover:-translate-y-1 hover:shadow-lg transition-all duration-300`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider">{card.label}</h3>
                  <span className="text-xl">{card.icon}</span>
                </div>
                <p className={`text-3xl lg:text-4xl font-black ${card.color} drop-shadow-sm`}>{card.value}</p>
                {card.sub && <p className="text-xs text-gray-500 mt-2 font-semibold">{card.sub}</p>}
              </div>
            ))}
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-extrabold text-gray-800 mb-6">📊 Biểu đồ Doanh Thu (6 tháng)</h2>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dy={10} />
                    <YAxis tickFormatter={(val) => `${val / 1000000}M`} axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                    <Tooltip 
                      formatter={(value) => formatCurrency(value)}
                      cursor={{fill: '#f3f4f6'}}
                      contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}} 
                    />
                    <Bar dataKey="revenue" name="Doanh thu" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
              <h2 className="text-xl font-extrabold text-gray-800 mb-6">Trạng thái phòng</h2>
              <div className="flex-1 h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Panel: Yêu cầu thuê phòng */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-extrabold text-gray-800">📋 Yêu cầu thuê phòng</h2>
            {pendingRequests.length > 0 && (
              <span className="bg-red-500 text-white text-xs font-black px-2.5 py-0.5 rounded-full animate-pulse">{pendingRequests.length} mới</span>
            )}
          </div>
        </div>

        {actionMsg && (
          <div className={`mx-6 mt-4 p-3 rounded-xl text-sm font-bold ${actionMsg.startsWith('✅') ? 'bg-green-50 text-green-700' : actionMsg.startsWith('❌') ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'}`}>
            {actionMsg}
          </div>
        )}

        {roomRequests.length === 0 ? (
          <div className="p-12 text-center text-gray-400 font-medium">
            <p className="text-3xl mb-3">📭</p>
            <p>Chưa có yêu cầu thuê phòng nào.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {pendingRequests.length > 0 && (
              <>
                <div className="px-6 py-3 bg-yellow-50">
                  <p className="text-xs font-bold text-yellow-700 uppercase tracking-widest">⏳ Đang chờ xử lý ({pendingRequests.length})</p>
                </div>
                {pendingRequests.map(req => (
                  <div key={req.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                          <span className="font-extrabold text-gray-900" translate="no">{req.room?.roomNumber}</span>
                          <span className="text-indigo-600 font-bold text-sm">{req.room?.basePrice?.toLocaleString()} đ/th</span>
                          <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2.5 py-0.5 rounded-full">Đang chờ</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-700">👤 {req.tenant?.fullName} — 📞 {req.tenant?.phone}</p>
                        {req.moveInDate && <p className="text-green-700 text-sm font-semibold">📅 Dự kiến vào: {new Date(req.moveInDate).toLocaleDateString('vi-VN')}</p>}
                        {req.note && <p className="text-gray-500 text-sm mt-1">Ghi chú: {req.note}</p>}
                        <p className="text-gray-400 text-xs mt-1">{new Date(req.createdAt).toLocaleString('vi-VN')}</p>
                      </div>
                      <div className="flex flex-col gap-2 min-w-[220px]">
                        <input
                          type="text"
                          placeholder="Ghi chú phản hồi (tuỳ chọn)..."
                          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-300"
                          value={actionNote[req.id] || ''}
                          onChange={e => setActionNote(prev => ({ ...prev, [req.id]: e.target.value }))}
                        />
                        <div className="flex gap-2">
                          <button onClick={() => handleAction(req.id, 'approve')} className="flex-1 bg-green-500 hover:bg-green-600 text-white text-xs font-bold py-2 rounded-lg transition-all">
                            ✓ Duyệt
                          </button>
                          <button onClick={() => handleAction(req.id, 'reject')} className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold py-2 rounded-lg transition-all">
                            ✗ Từ chối
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
            {processedRequests.length > 0 && (
              <>
                <div className="px-6 py-3 bg-gray-50">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Lịch sử xử lý ({processedRequests.length})</p>
                </div>
                {processedRequests.slice(0, 5).map(req => (
                  <div key={req.id} className="px-6 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-bold text-gray-700 text-sm" translate="no">{req.room?.roomNumber}</span>
                      <span className="text-gray-500 text-sm">— {req.tenant?.fullName}</span>
                      {req.status === 'Approved' || req.status === 1
                        ? <span className="bg-green-100 text-green-700 text-xs font-bold px-2.5 py-0.5 rounded-full">Đã duyệt</span>
                        : <span className="bg-red-100 text-red-700 text-xs font-bold px-2.5 py-0.5 rounded-full">Đã từ chối</span>}
                      {req.adminNote && <span className="text-gray-400 text-xs">"{req.adminNote}"</span>}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
