import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import React, { useState } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import { tokenStorage } from './api/axiosClient';
import { useSignalR } from './hooks/useSignalR';
import LiveChat from './components/LiveChat';

const ProtectedRoute = ({ children }) => {
  // Kiểm tra accessToken mới (thay cho 'token' cũ)
  const token = tokenStorage.getAccessToken();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};
import Dashboard from './pages/Dashboard';
import Rooms from './pages/Rooms';
import Contracts from './pages/admin/Contracts';
import UtilitiesGrid from './pages/admin/UtilitiesGrid';
import TenantPortal from './pages/tenant/TenantPortal';
import Tenants from './pages/admin/Tenants';
import Invoices from './pages/admin/Invoices';
import Maintenance from './pages/admin/Maintenance';
import Assets from './pages/admin/Assets';
import Announcements from './pages/admin/Announcements';
import Security from './pages/admin/Security';
import Reports from './pages/admin/Reports';

function App() {
  const { notifications } = useSignalR();
  const [showNotif, setShowNotif] = useState(false);

  return (
    <BrowserRouter>
      <Routes>
        {/* Route Đăng nhập / Đăng ký */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Route dành riêng cho Khách (Tenant Portal) */}
        <Route path="/tenant" element={<ProtectedRoute><TenantPortal /></ProtectedRoute>} />
        
        {/* Route Dành cho Quản trị viên (Admin/Staff) */}
        <Route path="/*" element={
          <ProtectedRoute>
          <div className="flex h-screen bg-[#f8fafc] font-sans selection:bg-indigo-100">
            {/* Sidebar */}
            <div className="w-72 bg-white shadow-2xl shadow-indigo-100/50 border-r border-gray-100 z-10 flex flex-col relative">
              <div className="p-8 border-b border-gray-50">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-blue-500 rounded-xl flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-indigo-500/30">S</div>
                  <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">SmartDorm</h1>
                    <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest">Admin Panel</span>
                  </div>
                </div>
              </div>
              <nav className="p-6 space-y-2 flex-1 overflow-y-auto">
                <Link to="/" className="flex items-center px-4 py-3.5 rounded-xl text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 font-bold transition-all">
                  <span className="mr-3 text-lg">📊</span> Tổng quan
                </Link>
                <Link to="/rooms" className="flex items-center px-4 py-3.5 rounded-xl text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 font-bold transition-all">
                  <span className="mr-3 text-lg">🚪</span> Quản lý Phòng
                </Link>
                <Link to="/tenants" className="flex items-center px-4 py-3.5 rounded-xl text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 font-bold transition-all">
                  <span className="mr-3 text-lg">👥</span> Quản lý Khách trọ
                </Link>
                <Link to="/contracts" className="flex items-center px-4 py-3.5 rounded-xl text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 font-bold transition-all">
                  <span className="mr-3 text-lg">📝</span> Hợp đồng & Cọc
                </Link>
                <Link to="/utilities" className="flex items-center px-4 py-3.5 rounded-xl text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 font-bold transition-all">
                  <span className="mr-3 text-lg">⚡</span> Chốt Điện Nước
                </Link>
                <Link to="/invoices" className="flex items-center px-4 py-3.5 rounded-xl text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 font-bold transition-all">
                  <span className="mr-3 text-lg">💳</span> Lập Hóa đơn
                </Link>
                <Link to="/maintenance" className="flex items-center px-4 py-3.5 rounded-xl text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 font-bold transition-all">
                  <span className="mr-3 text-lg">🔧</span> Quản lý Bảo trì
                </Link>
                <Link to="/assets" className="flex items-center px-4 py-3.5 rounded-xl text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 font-bold transition-all">
                  <span className="mr-3 text-lg">🛋️</span> Tài sản & TB
                </Link>
                <Link to="/announcements" className="flex items-center px-4 py-3.5 rounded-xl text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 font-bold transition-all">
                  <span className="mr-3 text-lg">📢</span> Gửi Thông báo
                </Link>
                <Link to="/security" className="flex items-center px-4 py-3.5 rounded-xl text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 font-bold transition-all">
                  <span className="mr-3 text-lg">🛡️</span> An ninh & Xe
                </Link>
                <div className="pt-4 mt-2 border-t border-gray-100">
                  <Link to="/reports" className="flex items-center px-4 py-3.5 rounded-xl text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 font-bold transition-all">
                    <span className="mr-3 text-lg">📈</span> Báo cáo KPI
                  </Link>
                </div>
              </nav>
              <div className="p-6 border-t border-gray-50">
                <button
                  onClick={() => { tokenStorage.clearTokens(); window.location.href='/login'; }}
                  className="w-full flex items-center justify-center px-4 py-3 rounded-xl bg-gray-50 text-gray-600 hover:bg-red-50 hover:text-red-600 font-bold transition-all border border-gray-200 hover:border-red-200 shadow-sm"
                >
                   Đăng xuất
                </button>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-auto flex flex-col relative bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed">
              <header className="bg-white/70 backdrop-blur-xl sticky top-0 z-20 border-b border-gray-200 px-10 py-5 flex justify-between items-center shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)]">
                <h2 className="text-xl font-extrabold text-gray-800">Cổng Quản Trị Hệ Thống</h2>
                
                <div className="flex items-center space-x-6">
                  {/* Real-time Notification Bell */}
                  <div className="relative">
                    <button 
                      onClick={() => setShowNotif(!showNotif)}
                      className="p-3 bg-white border border-gray-200 rounded-xl text-gray-600 hover:text-indigo-600 hover:border-indigo-200 shadow-sm transition-all relative"
                    >
                      <span className="text-xl">🔔</span>
                      {notifications.length > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                      )}
                    </button>

                    {/* Dropdown thông báo */}
                    {showNotif && (
                      <div className="absolute right-0 mt-3 w-80 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                        <div className="p-4 bg-indigo-50 border-b border-indigo-100/50 flex justify-between items-center">
                          <span className="font-bold text-indigo-900 text-sm">Thông báo ({notifications.length})</span>
                        </div>
                        <div className="max-h-60 overflow-y-auto divide-y divide-gray-50">
                          {notifications.length === 0 ? (
                            <div className="p-6 text-center text-xs text-gray-400 font-semibold">Chưa có thông báo mới</div>
                          ) : (
                            notifications.map((n, i) => (
                              <div key={i} className="p-4 hover:bg-gray-50 transition-colors">
                                <p className="font-bold text-gray-800 text-xs">{n.title}</p>
                                <p className="text-gray-600 text-xs mt-1 leading-relaxed">{n.message}</p>
                                <span className="text-[9px] font-bold text-indigo-400 mt-2 block">
                                  {new Date(n.createdAt).toLocaleTimeString()}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-4 cursor-pointer p-1.5 pr-5 rounded-full border border-gray-200 bg-white hover:shadow-md hover:border-indigo-200 transition-all group">
                    <div className="w-9 h-9 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full text-white flex items-center justify-center font-bold text-sm shadow-inner group-hover:scale-105 transition-transform">A</div>
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-800 leading-none">Admin_QTV</span>
                        <span className="text-[10px] font-bold text-indigo-500 mt-1 uppercase tracking-wider">Quản lý</span>
                    </div>
                  </div>
                </div>
              </header>
              <main className="p-10 flex-1">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/rooms" element={<Rooms />} />
                  <Route path="/tenants" element={<Tenants />} />
                  <Route path="/contracts" element={<Contracts />} />
                  <Route path="/utilities" element={<UtilitiesGrid />} />
                  <Route path="/invoices" element={<Invoices />} />
                  <Route path="/maintenance" element={<Maintenance />} />
                  <Route path="/assets" element={<Assets />} />
                  <Route path="/announcements" element={<Announcements />} />
                  <Route path="/security" element={<Security />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
            </div>
          </div>
          </ProtectedRoute>
        } />
      </Routes>
      <LiveChat />
    </BrowserRouter>
  );
}
export default App;
