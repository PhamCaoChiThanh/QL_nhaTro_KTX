import React, { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import AIChatbot from '../../components/AIChatbot';

const TenantPortal = () => {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('home');
  const [availableRooms, setAvailableRooms] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [requestNote, setRequestNote] = useState('');
  const [moveInDate, setMoveInDate] = useState('');
  const [requestMsg, setRequestMsg] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [announcements, setAnnouncements] = useState([]);
  const [visitors, setVisitors] = useState([]);

  const loadVisitors = () => {
    axiosClient.get('/Visitors')
      .then(res => setVisitors(res.data))
      .catch(() => {});
  };

  useEffect(() => {
    axiosClient.get('/Tenants/me')
      .then(res => setProfile(res.data))
      .catch(err => {
        console.error("Lỗi lấy thông tin:", err);
        setError("Tài khoản chưa được liên kết hồ sơ người thuê. Vui lòng đăng xuất và tạo tài khoản mới!");
      });
    // Lấy phòng trống (không cần auth)
    axiosClient.get('/Rooms')
      .then(res => setAvailableRooms(res.data.filter(r => r.status === 0)))
      .catch(() => {});
    
    // Lấy thông báo
    axiosClient.get('/Announcements')
      .then(res => setAnnouncements(res.data))
      .catch(() => {});

    loadVisitors();
  }, []);

  const loadMyRequests = () => {
    axiosClient.get('/RoomRequests/my')
      .then(res => setMyRequests(res.data))
      .catch(() => {});
  };

  useEffect(() => {
    if (activeTab === 'requests') loadMyRequests();
    if (activeTab === 'visitors') loadVisitors();
  }, [activeTab]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  const handleSendRequest = async () => {
    if (!selectedRoom) return;
    if (!moveInDate) { setRequestMsg('❌ Vui lòng chọn ngày dự kiến vào ở.'); return; }
    setRequestMsg('');
    try {
      await axiosClient.post('/RoomRequests', { roomId: selectedRoom.id, note: requestNote, moveInDate: moveInDate });
      setRequestMsg('✅ Đã gửi yêu cầu thành công! Ban quản lý sẽ liên hệ bạn sớm nhất.');
      setSelectedRoom(null);
      setRequestNote('');
      setMoveInDate('');
    } catch (err) {
      setRequestMsg('❌ ' + (err.response?.data?.message || err.message));
    }
  };

  const handleLogoutFromError = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert("❌ Mật khẩu mới và xác nhận mật khẩu không trùng khớp!");
      return;
    }
    try {
      await axiosClient.post('/auth/change-password', { oldPassword, newPassword });
      alert("✅ Đổi mật khẩu thành công!");
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      alert("❌ Lỗi khi đổi mật khẩu!\n" + (err.response?.data?.message || err.message));
    }
  };

  const [maintenanceDesc, setMaintenanceDesc] = useState('');
  const [maintenanceMsg, setMaintenanceMsg] = useState('');

  const handleMaintenanceSubmit = async () => {
    if (!maintenanceDesc.trim()) {
      alert("Vui lòng mô tả sự cố!");
      return;
    }
    try {
      await axiosClient.post('/Maintenances', {
        roomId: profile.roomId,
        description: maintenanceDesc,
        status: 0 // Pending
      });
      setMaintenanceMsg('✅ Đã gửi yêu cầu bảo trì thành công!');
      setMaintenanceDesc('');
      setTimeout(() => setMaintenanceMsg(''), 5000);
    } catch (err) {
      alert("❌ Gửi yêu cầu thất bại: " + (err.response?.data?.message || err.message));
    }
  };

  const handlePayment = async (invoiceId) => {
    try {
      const res = await axiosClient.post(`/Invoices/${invoiceId}/pay-simulation`);
      const { paymentUrl, message } = res.data;
      
      alert(message + "\n(Mở liên kết giả lập: " + paymentUrl + ")");
      
      // Giả lập webhook gọi sau 3s thành công
      setTimeout(async () => {
        try {
          await axiosClient.post('/Invoices/webhook/vnpay', { invoiceId });
          alert("✅ Thanh toán thành công! Đang cập nhật dữ liệu...");
          // Tải lại dữ liệu
          const resProfile = await axiosClient.get('/Tenants/me');
          setProfile(resProfile.data);
        } catch (err) {
          console.error("Lỗi cập nhật sau thanh toán:", err);
        }
      }, 3000);

    } catch (err) {
      alert("❌ Lỗi khởi tạo thanh toán!");
    }
  };

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-red-50 to-orange-50">
      <span className="text-6xl mb-6">⚠️</span>
      <h2 className="text-xl font-bold text-red-600 mb-2">{error}</h2>
      <button onClick={handleLogoutFromError} className="mt-6 px-8 py-3 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 transition-all font-bold">
        Đăng xuất & Đăng nhập lại
      </button>
    </div>
  );

  if (!profile) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-semibold">Đang tải thông tin...</p>
      </div>
    </div>
  );

  const tabs = [
    { id: 'notifications', label: '🔔 Thông báo' },
    { id: 'visitors', label: '👥 Đăng ký khách' },
    { id: 'rooms', label: '🔑 Xem phòng trống' },
    { id: 'requests', label: '📋 Yêu cầu của tôi' },
    { id: 'rules', label: '📜 Nội quy' },
    { id: 'profile', label: '👤 Thông tin cá nhân' },
  ];

  const statusBadge = (status) => {
    if (status === 0) return <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full">Đang chờ</span>;
    if (status === 1) return <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">Đã duyệt ✓</span>;
    if (status === 2) return <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">Từ chối</span>;
    // String fallback
    if (status === 'Pending') return <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full">Đang chờ</span>;
    if (status === 'Approved') return <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">Đã duyệt ✓</span>;
    if (status === 'Rejected') return <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">Từ chối</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white px-6 py-5 shadow-lg">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-xl font-black">
              {profile.fullName?.substring(0, 2).toUpperCase() || 'NA'}
            </div>
            <div>
              <p className="text-white/70 text-xs font-medium uppercase tracking-widest">SmartDorm Portal</p>
              <h1 className="text-xl font-extrabold">{profile.fullName}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                {profile.hasContract
                  ? <><span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">🏠 Phòng {profile.roomNumber}</span><span className="text-xs bg-green-500/30 text-green-100 px-2 py-0.5 rounded-full">Còn hợp đồng</span></>
                  : <span className="text-xs bg-rose-500/30 text-rose-100 px-2 py-0.5 rounded-full">Chưa có phòng</span>
                }
              </div>
            </div>
          </div>
          <button onClick={handleLogout} className="bg-white/10 hover:bg-white/25 border border-white/30 px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Đăng xuất
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-5xl mx-auto flex gap-1 mt-5">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-white text-indigo-700 shadow' : 'text-white/70 hover:text-white hover:bg-white/10'}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 md:p-8">

        {/* Tab: Tổng quan */}
        {activeTab === 'home' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {profile.hasContract ? (
              <div className="md:col-span-2 bg-white rounded-2xl shadow p-6 border border-gray-100">
                <h2 className="text-xl font-extrabold text-gray-800 mb-4 flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-lg">💳</span>
                  Hóa đơn mới nhất
                </h2>
                {!profile.latestInvoice ? (
                  <div className="text-center py-8 text-gray-400 font-medium">Chưa có hóa đơn nào.</div>
                ) : (
                  <>
                    <div className="flex justify-between items-center mb-4 pb-3 border-b border-dashed border-gray-200">
                      <span className="text-sm font-bold text-gray-500">Tháng {profile.latestInvoice.billingMonth}/{profile.latestInvoice.billingYear}</span>
                      {profile.latestInvoice.status === 0 ? <span className="bg-red-100 text-red-600 text-xs font-bold px-3 py-1 rounded-full animate-pulse">Chưa thanh toán</span> : <span className="bg-green-100 text-green-600 text-xs font-bold px-3 py-1 rounded-full">Đã thanh toán</span>}
                    </div>
                    <div className="bg-indigo-600 text-white rounded-xl p-5 flex justify-between items-center">
                      <div>
                        <p className="text-indigo-200 text-xs mb-1 font-medium">TỔNG TIỀN CẦN THANH TOÁN</p>
                        <p className="text-3xl font-black">{profile.latestInvoice.totalAmount.toLocaleString()} đ</p>
                      </div>
                    </div>
                    {profile.latestInvoice.status === 0 && (
                      <button 
                        onClick={() => handlePayment(profile.latestInvoice.id)}
                        className="w-full mt-4 bg-gray-900 hover:bg-black text-white font-bold py-3 rounded-xl transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2">
                        <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Thanh toán qua VNPay
                      </button>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="md:col-span-2 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl shadow p-8 border border-indigo-100 flex flex-col items-center justify-center text-center">
                <span className="text-5xl mb-4">🏠</span>
                <h2 className="text-xl font-extrabold text-gray-800 mb-2">Chưa có hợp đồng thuê phòng</h2>
                <p className="text-gray-500 font-medium text-sm mb-5">Hãy xem danh sách phòng trống và gửi yêu cầu thuê phòng ngay nhé!</p>
                <button onClick={() => setActiveTab('rooms')} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow hover:bg-indigo-700 transition-all transform hover:-translate-y-0.5">
                  Xem phòng trống ngay →
                </button>
              </div>
            )}

            {/* Card: Báo sự cố */}
            <div className="bg-white p-6 rounded-2xl shadow border border-gray-100 flex flex-col">
              <h2 className="text-xl font-extrabold text-gray-800 mb-4 flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center text-lg">🔧</span>
                Báo sự cố
              </h2>
              {maintenanceMsg && (
                <div className="mb-3 p-2 bg-green-50 text-green-700 text-xs font-bold rounded-lg border border-green-100">
                  {maintenanceMsg}
                </div>
              )}
              <p className="text-xs text-gray-400 font-medium mb-3">Điện, nước, nội thất, an ninh...</p>
              <textarea 
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-orange-400/30 transition-all resize-none flex-1 text-sm font-medium text-gray-700" 
                rows={4} 
                placeholder="Mô tả sự cố..." 
                value={maintenanceDesc}
                onChange={e => setMaintenanceDesc(e.target.value)}
              />
              <button 
                onClick={handleMaintenanceSubmit}
                disabled={!profile.hasContract}
                className={`w-full mt-4 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold py-3 rounded-xl shadow hover:opacity-90 transition-all text-sm ${!profile.hasContract ? 'opacity-50 cursor-not-allowed' : ''}`}>
                Gửi yêu cầu sửa chữa
              </button>
            </div>
          </div>
        )}

        {/* Tab: Thông báo */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-extrabold text-gray-800 mb-6">🔔 Thông báo từ Ban quản lý</h2>
            {announcements.length === 0 ? (
              <div className="bg-white rounded-2xl shadow p-12 text-center text-gray-400 font-medium border border-gray-100">
                <p>Chưa có thông báo nào.</p>
              </div>
            ) : (
              announcements.map(a => (
                <div key={a.id} className="bg-white rounded-3xl p-6 shadow-sm border-l-4 border-l-indigo-600 border border-gray-100">
                  <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest block mb-2">{new Date(a.createdAt).toLocaleDateString('vi-VN')}</span>
                  <h4 className="text-lg font-black text-gray-900 mb-2">{a.title}</h4>
                  <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">{a.content}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab: Đăng ký khách */}
        {activeTab === 'visitors' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in duration-700">
            <div className="md:col-span-1">
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 sticky top-28">
                    <h3 className="text-xl font-black text-gray-800 mb-6">📝 Đăng ký khách</h3>
                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        const form = e.target;
                        const data = {
                            fullName: form.fullName.value,
                            cccd: form.cccd.value,
                            phoneNumber: form.phone.value,
                            reason: form.reason.value,
                            isOvernight: form.isOvernight.checked,
                            visitTime: new Date().toISOString()
                        };
                        try {
                            await axiosClient.post('/Visitors', data);
                            alert("✅ Đăng ký khách thành công!");
                            form.reset();
                            // Load lại danh sách
                            loadVisitors();
                        } catch (err) { 
                            const msg = err.response?.data?.message || err.response?.data || "Lỗi khi đăng ký!";
                            alert("❌ " + msg); 
                        }
                    }} className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1">Họ tên khách</label>
                            <input name="fullName" required className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1">Số CCCD</label>
                            <input name="cccd" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1">SĐT liên hệ</label>
                            <input name="phone" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1">Lý do/Ghi chú</label>
                            <textarea name="reason" rows={2} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none" />
                        </div>
                        <div className="flex items-center gap-2 py-2">
                            <input type="checkbox" name="isOvernight" id="isOvernight" className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                            <label htmlFor="isOvernight" className="text-sm font-bold text-gray-700">Ở lại qua đêm</label>
                        </div>
                        <button type="submit" className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-black shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all transform hover:-translate-y-0.5">
                            Gửi đăng ký
                        </button>
                    </form>
                </div>
            </div>
            <div className="md:col-span-2">
                <h3 className="text-xl font-black text-gray-800 mb-6">Lịch sử khách ghé thăm</h3>
                <div className="space-y-4">
                    {visitors.length === 0 ? (
                        <div className="bg-white rounded-2xl p-10 text-center text-gray-400 font-medium">Chưa có khách nào ghé thăm.</div>
                    ) : (
                        visitors.map(v => (
                            <div key={v.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex justify-between items-center">
                                <div>
                                    <h4 className="font-black text-gray-800">{v.fullName}</h4>
                                    <p className="text-xs text-gray-500 font-medium">{new Date(v.visitTime).toLocaleString('vi-VN')} {v.isOvernight && <span className="text-orange-600 font-bold ml-2">🌙 Qua đêm</span>}</p>
                                    <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest">{v.cccd ? `CCCD: ${v.cccd}` : 'Không có CCCD'}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded-lg">Đã ghi nhận</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
          </div>
        )}

        {/* Tab: Nội quy */}
        {activeTab === 'rules' && (
          <div className="bg-white rounded-[2.5rem] shadow-xl p-10 border border-gray-100 max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <span className="text-5xl mb-4 block">📜</span>
              <h2 className="text-3xl font-black text-gray-900 tracking-tight">Nội quy Nhà trọ / KTX</h2>
              <p className="text-gray-500 font-medium mt-2">Vui lòng đọc kỹ và tuân thủ để đảm bảo môi trường sống tốt nhất</p>
            </div>
            
            <div className="space-y-8">
              <section>
                <h3 className="text-lg font-black text-indigo-600 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center text-xs">1</span>
                  An ninh & Trật tự
                </h3>
                <ul className="list-disc list-inside text-gray-600 text-sm space-y-2 font-medium ml-4">
                  <li>Không gây tiếng ồn lớn sau 22h00.</li>
                  <li>Khách ghé thăm phải đăng ký với Ban quản lý và ra về trước 23h00.</li>
                  <li>Tự bảo quản tài sản cá nhân, khóa cửa khi ra khỏi phòng.</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-black text-indigo-600 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center text-xs">2</span>
                  Vệ sinh chung
                </h3>
                <ul className="list-disc list-inside text-gray-600 text-sm space-y-2 font-medium ml-4">
                  <li>Giữ gìn vệ sinh chung, bỏ rác đúng nơi quy định.</li>
                  <li>Không để đồ đạc cá nhân ở hành lang, lối đi chung.</li>
                  <li>Dọn dẹp khu vực nấu ăn sạch sẽ sau khi sử dụng.</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-black text-indigo-600 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center text-xs">3</span>
                  Sử dụng Điện & Nước
                </h3>
                <ul className="list-disc list-inside text-gray-600 text-sm space-y-2 font-medium ml-4">
                  <li>Sử dụng điện, nước tiết kiệm, tắt các thiết bị khi không sử dụng.</li>
                  <li>Không tự ý thay đổi hệ thống điện, nước trong phòng.</li>
                </ul>
              </section>
            </div>

            <div className="mt-12 p-6 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-4">
              <span className="text-xl">⚠️</span>
              <p className="text-xs text-amber-800 font-bold leading-relaxed">
                Các trường hợp vi phạm nội quy tùy theo mức độ sẽ bị nhắc nhở, phạt hành chính hoặc đơn phương chấm dứt hợp đồng thuê phòng.
              </p>
            </div>
          </div>
        )}

        {/* Tab: Phòng trống */}
        {activeTab === 'rooms' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-extrabold text-gray-800">🔑 Danh sách phòng còn trống</h2>
              <span className="bg-green-100 text-green-700 font-bold text-sm px-4 py-1.5 rounded-full">{availableRooms.length} phòng có sẵn</span>
            </div>

            {requestMsg && (
              <div className={`mb-4 p-4 rounded-xl font-semibold text-sm ${requestMsg.startsWith('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {requestMsg}
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {availableRooms.map(room => (
                <div key={room.id}
                  onClick={() => setSelectedRoom(selectedRoom?.id === room.id ? null : room)}
                  className={`cursor-pointer rounded-2xl border-2 p-4 transition-all ${selectedRoom?.id === room.id ? 'border-indigo-500 bg-indigo-50 shadow-lg shadow-indigo-200' : 'border-gray-200 bg-white hover:border-indigo-300 hover:shadow'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-gray-800 text-lg" translate="no">{room.roomNumber}</span>
                    <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">Trống</span>
                  </div>
                  <p className="text-indigo-600 font-extrabold text-sm">{room.basePrice.toLocaleString()} đ/th</p>
                  <p className="text-gray-400 text-xs mt-1">Sức chứa: {room.capacity} người</p>
                  {selectedRoom?.id === room.id && <div className="mt-2 text-xs text-indigo-600 font-bold">✓ Đã chọn phòng này</div>}
                </div>
              ))}
            </div>

            {/* Form gửi yêu cầu */}
            {selectedRoom && (
              <div className="mt-6 bg-white rounded-2xl shadow-xl border border-indigo-200 p-6">
                <h3 className="text-lg font-extrabold text-gray-800 mb-1">Gửi yêu cầu thuê phòng <span className="text-indigo-600" translate="no">{selectedRoom.roomNumber}</span></h3>
                <p className="text-gray-500 text-sm mb-4">Giá thuê: <strong className="text-indigo-600">{selectedRoom.basePrice.toLocaleString()} đ/tháng</strong> · Điện: {selectedRoom.electricityPrice.toLocaleString()} đ/kWh · Nước: {selectedRoom.waterPrice.toLocaleString()} đ/m³ · Rác: {selectedRoom.garbageFee.toLocaleString()} đ</p>
                <div className="mb-4">
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">📅 Ngày dự kiến vào ở <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={moveInDate}
                    onChange={e => setMoveInDate(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-400/30 text-sm font-medium text-gray-700"
                  />
                </div>
                <textarea
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 outline-none focus:ring-2 focus:ring-indigo-400/30 transition-all resize-none text-sm font-medium text-gray-700 mb-4"
                  rows={2}
                  placeholder="Ghi chú thêm (số người ở, yêu cầu đặc biệt)..."
                  value={requestNote}
                  onChange={e => setRequestNote(e.target.value)}
                />
                <div className="flex gap-3">
                  <button onClick={handleSendRequest} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    Gửi yêu cầu
                  </button>
                  <button onClick={() => setSelectedRoom(null)} className="px-4 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-all">
                    Hủy
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Yêu cầu của tôi */}
        {activeTab === 'requests' && (
          <div>
            <h2 className="text-2xl font-extrabold text-gray-800 mb-6">📋 Yêu cầu của tôi</h2>
            {myRequests.length === 0 ? (
              <div className="bg-white rounded-2xl shadow p-12 text-center text-gray-400 font-medium border border-gray-100">
                <p className="text-4xl mb-3">📭</p>
                <p>Bạn chưa có yêu cầu nào. Hãy xem phòng trống và gửi yêu cầu!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {myRequests.map(req => (
                  <div key={req.id} className="bg-white rounded-2xl shadow p-5 border border-gray-100 flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-extrabold text-lg text-gray-800" translate="no">{req.room?.roomNumber}</span>
                        {statusBadge(req.status)}
                      </div>
                      <p className="text-indigo-600 font-bold text-sm">{req.room?.basePrice.toLocaleString()} đ/tháng</p>
                      {req.note && <p className="text-gray-500 text-sm mt-1">Ghi chú: {req.note}</p>}
                      {req.moveInDate && <p className="text-green-700 text-sm mt-1 font-semibold">📅 Ngày vào ở: {new Date(req.moveInDate).toLocaleDateString('vi-VN')}</p>}
                      {req.adminNote && <p className="text-blue-600 text-sm mt-1 font-semibold">💬 BQL: {req.adminNote}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-3">
                      <span className="text-xs text-gray-400 font-medium">
                        {new Date(req.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                      <button
                        onClick={() => {
                          if (!window.confirm("Bạn có chắc muốn xoá yêu cầu này?")) return;
                          axiosClient.delete(`/RoomRequests/${req.id}`)
                            .then(() => {
                              alert("Đã xoá yêu cầu thành công!");
                              loadMyRequests();
                            })
                            .catch(err => alert("Lỗi khi xoá!\n" + (typeof err.response?.data === 'string' ? err.response.data : JSON.stringify(err.response?.data))));
                        }}
                        className="px-3.5 py-2 bg-rose-50 text-rose-600 border border-rose-200/50 hover:bg-rose-100 hover:text-rose-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
                      >
                        🗑️ Huỷ/Xoá
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {/* Tab: Thông tin cá nhân */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-2xl shadow p-6 border border-gray-100 max-w-xl mx-auto">
            {/* Thẻ trạng thái cư trú */}
            <div className="mb-6 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-5 border border-indigo-100/50 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest block mb-1">Trạng thái cư trú</span>
                <span className="text-lg font-black text-gray-800">
                  {profile.hasContract ? `Đang ở phòng ${profile.roomNumber}` : 'Chưa có phòng'}
                </span>
                {profile.contractStartDate && (
                  <p className="text-xs text-gray-500 mt-1 font-medium">
                    Hợp đồng: {new Date(profile.contractStartDate).toLocaleDateString('vi-VN')}
                    {profile.contractEndDate && ` — ${new Date(profile.contractEndDate).toLocaleDateString('vi-VN')}`}
                  </p>
                )}
                {profile.hasContract && (
                  <div className="mt-3 pt-3 border-t border-indigo-200/30 flex flex-col gap-2">
                    {profile.scannedContractUrl && (
                      <button 
                        onClick={async () => {
                          try {
                            const response = await axiosClient.get(profile.scannedContractUrl, { responseType: 'blob' });
                            const url = window.URL.createObjectURL(new Blob([response.data]));
                            const link = document.createElement('a');
                            link.href = url;
                            link.setAttribute('download', `HopDong_HD${profile.contractId}.pdf`);
                            document.body.appendChild(link);
                            link.click();
                            link.remove();
                          } catch (err) {
                            alert("❌ Không thể tải hợp đồng. Vui lòng thử lại sau!");
                          }
                        }}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md transition-all self-start flex items-center gap-1.5"
                      >
                        📄 Xem & Tải Hợp Đồng
                      </button>
                    )}
                    {profile.isCancelRequested ? (
                      <div className="bg-amber-100 border border-amber-200 text-amber-800 text-xs px-3 py-2 rounded-xl font-bold flex items-center gap-1.5">
                        ⏳ Đang chờ duyệt hủy HĐ (Lý do: {profile.cancelReason})
                      </div>
                    ) : (
                      <button 
                        onClick={() => {
                          const reason = prompt("Vui lòng nhập lý do hủy hợp đồng:");
                          if (reason === null) return;
                          if (!reason.trim()) { alert("❌ Bạn phải nhập lý do hủy!"); return; }
                          axiosClient.post(`/Contracts/${profile.contractId}/request-cancel`, { reason })
                            .then(() => {
                              alert("✅ Đã gửi yêu cầu hủy hợp đồng!");
                              window.location.reload();
                            })
                            .catch(err => alert("Lỗi!\n" + (err.response?.data || err.message)));
                        }}
                        className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl text-xs shadow-md transition-all self-start flex items-center gap-1.5"
                      >
                        ⚠️ Yêu cầu hủy hợp đồng
                      </button>
                    )}
                  </div>
                )}
              </div>
              <span className="text-3xl">{profile.hasContract ? '🛋️' : '🏠'}</span>
            </div>

            <h2 className="text-xl font-extrabold text-gray-800 mb-6 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center text-lg">👤</span>
              Hồ sơ Khách trọ
            </h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              axiosClient.put(`/Tenants/${profile.id}`, profile)
                .then(() => alert("Cập nhật thông tin cá nhân thành công!"))
                .catch(err => alert("Lỗi khi cập nhật!\n" + (typeof err.response?.data === 'string' ? err.response.data : JSON.stringify(err.response?.data) || err.message)));
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Họ và tên</label>
                <input
                  type="text"
                  required
                  value={profile.fullName || ''}
                  onChange={e => setProfile({ ...profile, fullName: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-400/30 text-sm font-semibold text-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Số CCCD</label>
                <input
                  type="text"
                  required
                  value={profile.cccd || ''}
                  onChange={e => setProfile({ ...profile, cccd: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-400/30 text-sm font-semibold text-gray-800 font-mono tracking-widest"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Số điện thoại</label>
                <input
                  type="text"
                  required
                  value={profile.phone || ''}
                  onChange={e => setProfile({ ...profile, phone: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-400/30 text-sm font-semibold text-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={profile.email || ''}
                  onChange={e => setProfile({ ...profile, email: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-400/30 text-sm font-semibold text-gray-800"
                />
              </div>
              <button type="submit" className="w-full mt-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-purple-200 hover:opacity-95 transition-all transform hover:-translate-y-0.5">
                💾 Lưu thay đổi
              </button>
            </form>

            {/* Đổi mật khẩu */}
            <div className="mt-10 pt-6 border-t border-gray-100">
              <h2 className="text-xl font-extrabold text-gray-800 mb-6 flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-lg">🔒</span>
                Đổi mật khẩu
              </h2>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Mật khẩu cũ</label>
                  <input
                    type="password"
                    required
                    value={oldPassword}
                    onChange={e => setOldPassword(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-400/30 text-sm font-semibold text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Mật khẩu mới</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-400/30 text-sm font-semibold text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Xác nhận mật khẩu mới</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-400/30 text-sm font-semibold text-gray-800"
                  />
                </div>
                <button type="submit" className="w-full mt-6 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-200 hover:opacity-95 transition-all transform hover:-translate-y-0.5">
                  🔒 Đổi mật khẩu
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      <AIChatbot />
    </div>
  );
};
export default TenantPortal;
