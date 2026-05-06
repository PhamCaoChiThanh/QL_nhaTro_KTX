import React, { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const loadInvoices = async () => {
    try {
      const res = await axiosClient.get('/Invoices');
      setInvoices(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    setMsg('');
    try {
      const res = await axiosClient.post(`/Invoices/generate-monthly?month=${month}&year=${year}`);
      setMsg(`✅ ${res.data.message}`);
      loadInvoices();
    } catch (err) {
      setMsg(`❌ Lỗi: ${err.response?.data || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (id) => {
    try {
      await axiosClient.post(`/Invoices/${id}/send`);
      alert("✅ Đã gửi thông báo hóa đơn thành công!");
    } catch (err) {
      alert(`❌ Lỗi khi gửi: ${err.response?.data || err.message}`);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Paid': return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase tracking-wider">Đã thanh toán</span>;
      case 'Unpaid': return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold uppercase tracking-wider">Chưa thanh toán</span>;
      default: return <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold uppercase tracking-wider">Một phần</span>;
    }
  };

  return (
    <div className="animate-premium">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">💳 Lập Hóa Đơn & Gửi Bill</h2>
          <p className="text-gray-500 font-medium mt-1">Quản lý và thông báo tiền phòng hàng tháng cho khách thuê</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
           <div className="flex items-center gap-2">
             <label className="text-xs font-bold text-gray-400 uppercase">Tháng</label>
             <input type="number" value={month} onChange={e => setMonth(e.target.value)} className="w-16 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-400/30" />
           </div>
           <div className="flex items-center gap-2">
             <label className="text-xs font-bold text-gray-400 uppercase">Năm</label>
             <input type="number" value={year} onChange={e => setYear(e.target.value)} className="w-24 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-400/30" />
           </div>
           <button 
             onClick={handleGenerate}
             disabled={loading}
             className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl font-bold transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
           >
             {loading ? 'Đang tạo...' : '🔄 Tạo hóa đơn tháng này'}
           </button>
        </div>
      </div>

      {msg && <div className={`p-4 rounded-xl mb-6 font-bold text-sm ${msg.includes('✅') ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>{msg}</div>}

      <div className="bg-white rounded-[2rem] shadow-xl shadow-indigo-100/30 border border-gray-50 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="px-8 py-5 text-xs font-extrabold text-gray-400 uppercase tracking-widest">Phòng</th>
              <th className="px-8 py-5 text-xs font-extrabold text-gray-400 uppercase tracking-widest">Khách thuê</th>
              <th className="px-8 py-5 text-xs font-extrabold text-gray-400 uppercase tracking-widest">Tháng/Năm</th>
              <th className="px-8 py-5 text-xs font-extrabold text-gray-400 uppercase tracking-widest text-right">Tổng tiền</th>
              <th className="px-8 py-5 text-xs font-extrabold text-gray-400 uppercase tracking-widest text-center">Trạng thái</th>
              <th className="px-8 py-5 text-xs font-extrabold text-gray-400 uppercase tracking-widest text-center">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {invoices.map((inv) => (
              <tr key={inv.id} className="hover:bg-indigo-50/20 transition-colors group">
                <td className="px-8 py-5">
                  <span className="font-black text-gray-900 group-hover:text-indigo-600 transition-colors">{inv.roomNumber}</span>
                </td>
                <td className="px-8 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                      {inv.tenantName.charAt(0)}
                    </div>
                    <span className="font-bold text-gray-700">{inv.tenantName}</span>
                  </div>
                </td>
                <td className="px-8 py-5">
                   <span className="text-sm font-bold text-gray-500">{inv.month}/{inv.year}</span>
                </td>
                <td className="px-8 py-5 text-right">
                  <span className="font-black text-indigo-600">{inv.total.toLocaleString()}đ</span>
                </td>
                <td className="px-8 py-5 text-center">
                  {getStatusBadge(inv.status)}
                </td>
                <td className="px-8 py-5 text-center">
                  <button 
                    onClick={() => handleSend(inv.id)}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-200 hover:scale-105 transition-all active:scale-95 flex items-center gap-2 mx-auto"
                  >
                    <span>✈️</span> Gửi Bill
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {invoices.length === 0 && (
          <div className="p-20 text-center">
            <span className="text-6xl mb-4 block opacity-20">🧾</span>
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Chưa có hóa đơn nào được lập</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Invoices;
