import React, { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';

const Tenants = () => {
  const [tenants, setTenants] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [newTenant, setNewTenant] = useState({ fullName: '', cccd: '', phone: '', email: '' });

  const fetchTenants = () => {
    setLoading(true);
    axiosClient.get('/Tenants')
      .then(res => {
        setTenants(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Lỗi lấy danh sách khách trọ", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const handleCreateTenant = () => {
    if (newTenant.cccd.length !== 12 || !/^\d+$/.test(newTenant.cccd)) {
      alert("❌ Số CCCD phải bao gồm đúng 12 chữ số.");
      return;
    }
    if (newTenant.phone.length !== 10 || !/^\d+$/.test(newTenant.phone)) {
      alert("❌ Số điện thoại phải bao gồm đúng 10 chữ số.");
      return;
    }
    if (newTenant.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(newTenant.email)) {
      alert("❌ Email không đúng định dạng.");
      return;
    }

    axiosClient.post('/Tenants', newTenant)
      .then(res => {
        setShowCreateModal(false);
        setNewTenant({ fullName: '', cccd: '', phone: '', email: '' });
        fetchTenants();
      })
      .catch(err => {
        alert("Lỗi khi thêm khách trọ!\n" + (err.response?.data?.message || err.message));
      });
  };

  const handleEditClick = (tenant) => {
    setSelectedTenant({ ...tenant });
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    if (selectedTenant.cccd.length !== 12 || !/^\d+$/.test(selectedTenant.cccd)) {
      alert("❌ Số CCCD phải bao gồm đúng 12 chữ số.");
      return;
    }
    if (selectedTenant.phone.length !== 10 || !/^\d+$/.test(selectedTenant.phone)) {
      alert("❌ Số điện thoại phải bao gồm đúng 10 chữ số.");
      return;
    }
    if (selectedTenant.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(selectedTenant.email)) {
      alert("❌ Email không đúng định dạng.");
      return;
    }

    axiosClient.put(`/Tenants/${selectedTenant.id}`, selectedTenant)
      .then(res => {
        setShowEditModal(false);
        fetchTenants();
      })
      .catch(err => {
        alert("Lỗi khi cập nhật!\n" + (typeof err.response?.data === 'string' ? err.response.data : JSON.stringify(err.response?.data) || err.message));
      });
  };

  const handleDeleteTenant = (tenantId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa khách trọ này không?")) return;
    axiosClient.delete(`/Tenants/${tenantId}`)
      .then(res => {
        fetchTenants();
      })
      .catch(err => {
        alert("Không thể xóa!\n" + (typeof err.response?.data === 'string' ? err.response.data : JSON.stringify(err.response?.data) || err.message));
      });
  };

  const filteredTenants = tenants.filter(t => 
    t.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.cccd.includes(searchTerm) ||
    t.roomNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportToCSV = () => {
    // Xuất file theo định dạng báo cáo cho Công an
    const headers = ['STT', 'Họ và tên', 'Số CMND/CCCD', 'Số điện thoại', 'Phòng đang thuê', 'Ngày tạo hồ sơ'];
    const csvContent = [
      headers.join(','),
      ...filteredTenants.map((t, i) => 
        [i + 1, `"${t.fullName}"`, `"${t.cccd}"`, `"${t.phone}"`, `"${t.roomNumber}"`, `"${new Date(t.createdAt).toLocaleDateString('vi-VN')}"`].join(',')
      )
    ].join('\n');

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `DanhSachTamTru_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Quản lý Khách Trọ (Tạm Trú)</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">Lưu trữ hồ sơ, quản lý nhân khẩu và xuất danh sách khai báo tạm trú</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowCreateModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all font-bold flex items-center transform hover:-translate-y-0.5">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
            Thêm khách trọ mới
          </button>
          <button onClick={exportToCSV} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-200 hover:shadow-emerald-300 transition-all font-bold flex items-center transform hover:-translate-y-0.5">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            Xuất File Tạm Trú (CSV)
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center">
        <div className="bg-gray-50 p-2 rounded-lg mr-3"><svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg></div>
        <input 
          type="text" 
          placeholder="Tìm kiếm theo Tên, CCCD, hoặc Số phòng..." 
          className="w-full outline-none text-gray-700 bg-transparent font-medium placeholder-gray-400"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div></div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Họ và tên</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">CCCD</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Liên hệ</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Phòng</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Hồ sơ</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500 font-medium">Không tìm thấy khách trọ nào.</td>
                </tr>
              ) : (
                filteredTenants.map(t => (
                  <tr key={t.id} className="hover:bg-indigo-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 bg-gradient-to-tr from-indigo-100 to-purple-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-lg shadow-inner">
                          {t.fullName.charAt(0)}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-bold text-gray-900">{t.fullName}</div>
                          <div className="text-xs text-gray-400">Đăng ký: {new Date(t.createdAt).toLocaleDateString('vi-VN')}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-700 font-mono tracking-widest">{t.cccd}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-700">{t.phone}</div>
                      <div className="text-xs text-gray-500">{t.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1.5 text-xs font-bold rounded-lg ${t.roomNumber !== 'Chưa phân phòng' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>
                        {t.roomNumber}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                       <button className="text-indigo-600 hover:text-indigo-900 font-bold">📄 Xem</button>
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button onClick={() => handleEditClick(t)} className="bg-amber-100 text-amber-700 hover:bg-amber-600 hover:text-white px-3 py-1.5 rounded-lg font-bold transition-colors">
                          ✏️ Sửa
                        </button>
                        <button onClick={() => handleDeleteTenant(t.id)} className="bg-rose-100 text-rose-700 hover:bg-rose-600 hover:text-white px-3 py-1.5 rounded-lg font-bold transition-colors">
                          🗑️ Xóa
                        </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL THÊM KHÁCH TRỌ */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">
            <div className="bg-indigo-600 p-6 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold">Thêm Khách Trọ Mới</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-indigo-200 hover:text-white transition">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form className="p-8 space-y-4" onSubmit={(e) => { e.preventDefault(); handleCreateTenant(); }}>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Họ và tên</label>
                <input type="text" required value={newTenant.fullName} onChange={e => setNewTenant({...newTenant, fullName: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Số CCCD</label>
                <input type="text" required value={newTenant.cccd} onChange={e => setNewTenant({...newTenant, cccd: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Số điện thoại</label>
                <input type="text" required value={newTenant.phone} onChange={e => setNewTenant({...newTenant, phone: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Email</label>
                <input type="email" value={newTenant.email} onChange={e => setNewTenant({...newTenant, email: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition" />
              </div>
              <div className="pt-4 flex justify-end space-x-3 border-t border-gray-100">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-6 py-3 rounded-xl text-gray-600 hover:bg-gray-100 font-bold transition">Hủy bỏ</button>
                <button type="submit" className="px-6 py-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 font-bold transition shadow-xl shadow-indigo-200">Lưu thông tin</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SỬA KHÁCH TRỌ */}
      {showEditModal && selectedTenant && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">
            <div className="bg-amber-600 p-6 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold">Cập Nhật Khách Trọ</h2>
              <button onClick={() => setShowEditModal(false)} className="text-amber-100 hover:text-white transition">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form className="p-8 space-y-4" onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }}>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Họ và tên</label>
                <input type="text" required value={selectedTenant.fullName} onChange={e => setSelectedTenant({...selectedTenant, fullName: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-amber-500 outline-none transition" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Số CCCD</label>
                <input type="text" required value={selectedTenant.cccd} onChange={e => setSelectedTenant({...selectedTenant, cccd: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-amber-500 outline-none transition" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Số điện thoại</label>
                <input type="text" required value={selectedTenant.phone} onChange={e => setSelectedTenant({...selectedTenant, phone: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-amber-500 outline-none transition" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Email</label>
                <input type="email" value={selectedTenant.email} onChange={e => setSelectedTenant({...selectedTenant, email: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-amber-500 outline-none transition" />
              </div>
              <div className="pt-4 flex justify-end space-x-3 border-t border-gray-100">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-6 py-3 rounded-xl text-gray-600 hover:bg-gray-100 font-bold transition">Hủy bỏ</button>
                <button type="submit" className="px-6 py-3 rounded-xl bg-amber-600 text-white hover:bg-amber-700 font-bold transition shadow-xl shadow-amber-200">Lưu thay đổi</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Tenants;
