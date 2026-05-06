import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import AIChatbot from '../components/AIChatbot';

export default function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [cccd, setCccd] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const getPasswordStrength = (pwd) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) score++;
    return score;
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    // Kiểm tra dữ liệu nhập
    if (cccd.length !== 12 || !/^\d+$/.test(cccd)) {
      setError("❌ Số CCCD phải bao gồm đúng 12 chữ số.");
      return;
    }
    if (phone.length !== 10 || !/^\d+$/.test(phone)) {
      setError("❌ Số điện thoại phải bao gồm đúng 10 chữ số.");
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError("❌ Email không đúng định dạng.");
      return;
    }

    if (username.toLowerCase().trim() === 'admin') {
      setError("❌ Tên đăng nhập không được đặt là 'admin'.");
      return;
    }
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
    if (!passwordRegex.test(password)) {
      setError("❌ Mật khẩu phải đủ 8 ký tự, có chữ hoa, có số và ký tự đặc biệt.");
      return;
    }

    setError('');
    try {
      await axiosClient.post('/Auth/register', {
        username,
        password,
        role: 2, // 2 = TenantUser
        fullName,
        cccd,
        phone,
        email
      });

      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.response?.data || "Đăng ký thất bại. CCCD hoặc Username có thể đã tồn tại.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 p-4 relative">
      <div className="max-w-md w-full bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-blue-500 rounded-2xl flex items-center justify-center text-white font-black text-3xl mx-auto shadow-lg shadow-indigo-500/30 mb-4">S</div>
          <h2 className="text-3xl font-black text-gray-800 tracking-tight">Đăng ký mới</h2>
          <p className="text-sm font-semibold text-gray-500 mt-2">Dành cho Khách thuê tương lai</p>
        </div>

        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 text-sm font-bold rounded-xl">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-100 text-green-700 text-sm font-bold rounded-xl">Đăng ký thành công! Đang chuyển hướng...</div>}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Họ và Tên</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-gray-700" placeholder="VD: Nguyễn Văn A" />
          </div>
          <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">CCCD</label>
                <input type="text" value={cccd} onChange={e => setCccd(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-gray-700" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Số ĐT</label>
                <input type="text" value={phone} onChange={e => setPhone(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-gray-700" />
              </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-gray-700" placeholder="VD: email@example.com" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Tên đăng nhập</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-gray-700" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Mật khẩu</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-gray-700" placeholder="••••••••" />
            {password && (
              <div className="mt-1">
                <div className="flex gap-1 h-1.5 mt-1.5">
                  {[1, 2, 3, 4].map((level) => {
                    const score = getPasswordStrength(password);
                    let bgColor = 'bg-gray-200';
                    if (score >= level) {
                      if (score === 1) bgColor = 'bg-red-500';
                      else if (score === 2) bgColor = 'bg-orange-500';
                      else if (score === 3) bgColor = 'bg-yellow-500';
                      else if (score === 4) bgColor = 'bg-green-500';
                    }
                    return <div key={level} className={`h-full flex-1 rounded-full ${bgColor} transition-all duration-300`}></div>;
                  })}
                </div>
                <p className="text-[10px] font-bold mt-1 text-right">
                  {(() => {
                    const score = getPasswordStrength(password);
                    if (score === 1) return <span className="text-red-500">Quá yếu (Cần đủ 8 ký tự, chữ hoa, số, ký tự đặc biệt)</span>;
                    if (score === 2) return <span className="text-orange-500">Yếu</span>;
                    if (score === 3) return <span className="text-yellow-600">Trung bình</span>;
                    if (score === 4) return <span className="text-green-600">Mạnh</span>;
                    return null;
                  })()}
                </p>
              </div>
            )}
          </div>
          <button type="submit" className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-indigo-500/30 transform hover:-translate-y-0.5 transition-all mt-2">
            Đăng ký
          </button>
        </form>
        <p className="mt-6 text-center text-sm font-semibold text-gray-600">
            Đã có tài khoản? <Link to="/login" className="text-indigo-600 hover:underline">Đăng nhập</Link>
        </p>
      </div>

      <AIChatbot />
    </div>
  );
}
