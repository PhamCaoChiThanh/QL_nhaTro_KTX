import React, { useState, useEffect } from 'react';
import axios from 'axios';

const UtilitiesGrid = () => {
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    axios.get('http://localhost:5000/api/Rooms', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setRooms(res.data))
      .catch(err => console.error("Error", err));
  }, []);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Chốt chỉ số Điện Nước</h1>
        <p className="text-sm text-gray-500 mt-1 font-medium">Giao diện Grid lưới tốc độ cao để nhập chỉ số tiêu thụ cho từng phòng vào cuối tháng</p>
      </div>

      <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/40 border border-gray-100 p-8">
        {/* Bộ lọc trên cùng */}
        <div className="flex justify-between items-end mb-8 bg-gray-50 p-4 rounded-2xl border border-gray-100">
          <div className="flex space-x-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tháng chốt sổ</label>
              <input type="month" defaultValue="2026-04" className="border-none shadow-sm rounded-xl px-4 py-2.5 text-sm font-bold text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Loại dịch vụ</label>
              <select className="border-none shadow-sm rounded-xl px-4 py-2.5 text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer">
                <option>⚡ Điện năng (kWh)</option>
                <option>💧 Nước sinh hoạt (m³)</option>
              </select>
            </div>
          </div>
          <button className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white px-8 py-3 rounded-xl shadow-lg shadow-green-200 font-bold transition-all transform hover:-translate-y-0.5 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
            Lưu toàn bộ
          </button>
        </div>

        {/* Excel-like Grid siêu đẹp */}
        <div className="overflow-x-auto border border-gray-200 rounded-2xl shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider w-32 border-r bg-white">Phòng</th>
                <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider border-r text-right bg-slate-50">Chỉ số cũ (Tháng trước)</th>
                <th className="px-6 py-4 text-xs font-extrabold text-indigo-600 uppercase tracking-wider border-r bg-indigo-50/50">Chỉ số mới (Nhập)</th>
                <th className="px-6 py-4 text-xs font-extrabold text-gray-500 uppercase tracking-wider text-right bg-white">Mức tiêu thụ</th>
              </tr>
            </thead>
            <tbody>
              {rooms.length === 0 ? (
                <tr><td colSpan="4" className="px-6 py-4 text-center">Đang tải dữ liệu...</td></tr>
              ) : rooms.map((roomData, idx) => {
                const room = roomData.roomNumber;
                const oldVal = 0;
                return (
                  <tr key={room} className="border-b border-gray-100 hover:bg-gray-50 transition-colors group">
                    <td translate="no" className="px-6 py-4 font-black text-gray-800 border-r text-lg">{room}</td>
                    <td className="px-6 py-4 text-right text-gray-500 border-r bg-slate-50 font-medium">{oldVal}</td>
                    <td className="px-0 py-0 border-r bg-indigo-50/10 group-hover:bg-indigo-50/50 transition-colors">
                      <input type="number" 
                        placeholder="Nhập số mới..." 
                        className="w-full h-full min-h-[60px] px-6 outline-none focus:ring-inset focus:ring-4 focus:ring-indigo-500/30 focus:bg-white bg-transparent text-indigo-700 font-extrabold text-lg transition-all" 
                      />
                    </td>
                    <td className="px-6 py-4 text-right text-gray-300 font-bold text-lg group-hover:text-gray-400">--</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-4 text-right font-medium">* Hệ thống sẽ tự động bắt lỗi nếu "Chỉ số mới" nhỏ hơn "Chỉ số cũ".</p>
      </div>
    </div>
  );
};
export default UtilitiesGrid;
