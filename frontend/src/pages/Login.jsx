import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axiosClient, { tokenStorage } from '../api/axiosClient';
import AIChatbot from '../components/AIChatbot';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axiosClient.post('/auth/login', { username, password });
      const { accessToken, refreshToken, role, tenantId } = res.data;

      // Lưu cả 2 token (access ngắn hạn + refresh dài hạn)
      tokenStorage.setTokens(accessToken, refreshToken);

      // Lưu thông tin user để hiển thị trên header
      localStorage.setItem('user', JSON.stringify({ username, role, tenantId }));

      // Phân luồng theo Role
      if (role === 'Admin' || role === 'Staff') {
        navigate('/');
      } else {
        navigate('/tenant');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Sảy ra lỗi, vui lòng thử lại.';
      setError(msg);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 p-4">
      <div className="max-w-md w-full bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-blue-500 rounded-2xl flex items-center justify-center text-white font-black text-3xl mx-auto shadow-lg shadow-indigo-500/30 mb-4">S</div>
          <h2 className="text-3xl font-black text-gray-800 tracking-tight">SmartDorm</h2>
          <p className="text-sm font-semibold text-gray-500 mt-2">Hệ thống quản lý KTX & Nhà trọ</p>
        </div>
        
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 text-sm font-bold rounded-xl text-center">{error}</div>}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Tên đăng nhập</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} required className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-gray-700" placeholder="Nhập 'admin' hoặc 'tenant'" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Mật khẩu</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-gray-700" placeholder="••••••••" />
          </div>
          <button type="submit" className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-indigo-500/30 transform hover:-translate-y-0.5 transition-all">
            Đăng nhập
          </button>
        </form>
        <p className="mt-6 text-center text-sm font-semibold text-gray-600">
            Chưa có tài khoản? <Link to="/register" className="text-indigo-600 hover:underline">Đăng ký ngay</Link>
        </p>
      </div>
      
      <AIChatbot />
    </div>
  );
}
