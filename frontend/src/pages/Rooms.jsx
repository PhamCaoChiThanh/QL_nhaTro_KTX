import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Rooms = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [newRoom, setNewRoom] = useState({ roomNumber: '', capacity: 2, basePrice: 3000000, status: 0 });

  const fetchRooms = () => {
    const token = localStorage.getItem('accessToken');
    axios.get('http://localhost:5000/api/Rooms', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(response => {
        setRooms(response.data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching rooms:', error);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleEditClick = (room) => {
    setSelectedRoom({ ...room });
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    const token = localStorage.getItem('accessToken');
    axios.put(`http://localhost:5000/api/Rooms/${selectedRoom.id}`, selectedRoom, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
        setShowEditModal(false);
        fetchRooms();
    })
    .catch(err => {
        console.error(err);
        alert("Lỗi khi cập nhật phòng!\n" + (err.response?.data ? JSON.stringify(err.response.data) : err.message));
    });
  };

  const handleCreateRoom = () => {
    const token = localStorage.getItem('accessToken');
    axios.post('http://localhost:5000/api/Rooms', newRoom, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
        setShowCreateModal(false);
        setNewRoom({ roomNumber: '', capacity: 2, basePrice: 3000000, status: 0 });
        fetchRooms();
    })
    .catch(err => {
        console.error(err);
        alert("Lỗi khi thêm phòng mới!\n" + (err.response?.data ? JSON.stringify(err.response.data) : err.message));
    });
  };

  const handleDeleteRoom = (roomId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa phòng này?")) return;
    
    const token = localStorage.getItem('accessToken');
    axios.delete(`http://localhost:5000/api/Rooms/${roomId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
        alert("Xóa phòng thành công!");
        fetchRooms();
    })
    .catch(err => {
        console.error(err);
        alert("Không thể xóa phòng!\n" + (err.response?.data ? err.response.data : err.message));
    });
  };

  const handleRoomClick = (room) => {
    if (room.status === 1 && room.tenant) {
      setSelectedTenant(room.tenant);
      setShowTenantModal(true);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Quản lý phòng</h1>
          <p className="text-gray-500 mt-1 font-medium">Theo dõi tình trạng trống và thông tin của các phòng</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-6 py-3 rounded-xl shadow-lg shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-0.5 transition-all font-bold">
          + Thêm phòng mới
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : rooms.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-gray-100">
           <p className="text-gray-500 text-lg font-medium">Chưa có dữ liệu phòng nào trong hệ thống.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {rooms.map((room) => {
             const isAvailable = room.status === 0;
             const isRented = room.status === 1;
             
             return (
              <div key={room.id} onClick={() => handleRoomClick(room)} className={`bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 group relative overflow-hidden ${isRented ? 'cursor-pointer border-indigo-200' : ''}`}>
                <div className={`absolute top-0 left-0 w-full h-1.5 ${isAvailable ? 'bg-green-500' : isRented ? 'bg-indigo-500' : 'bg-red-500'}`}></div>
                
                <div className="flex justify-between items-start mb-4 mt-2">
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shadow-inner
                      ${isAvailable ? 'bg-green-50 text-green-600' : isRented ? 'bg-indigo-50 text-indigo-600' : 'bg-red-50 text-red-600'}`}>
                      🏠
                    </div>
                    <div>
                      <h3 translate="no" className="text-xl font-black text-gray-800">{room.roomNumber}</h3>
                      <p className="text-sm font-semibold text-gray-400">{room.capacity} người / phòng</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide
                    ${isAvailable ? 'bg-green-100 text-green-700 border border-green-200' : 
                      isRented ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 
                      'bg-red-100 text-red-700 border border-red-200'}`}>
                    {isAvailable ? 'Còn trống' : isRented ? 'Đã có người thuê' : 'Đang bảo trì'}
                  </span>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-50 flex justify-between items-end">
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase mb-1">Giá thuê cơ bản</p>
                    <p className="text-xl font-black text-gray-900">{room.basePrice.toLocaleString()} <span className="text-sm font-semibold text-gray-500">VNĐ/tháng</span></p>
                  </div>
                  <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); handleEditClick(room); }} className="p-2.5 bg-gray-50 hover:bg-indigo-50 text-gray-500 hover:text-indigo-600 rounded-lg transition-colors border border-gray-100 hover:border-indigo-200 shadow-sm">✏️</button>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteRoom(room.id); }} disabled={isRented} className={`p-2.5 bg-gray-50 rounded-lg transition-colors border border-gray-100 shadow-sm ${isRented ? 'opacity-50 cursor-not-allowed text-gray-300' : 'hover:bg-red-50 text-gray-500 hover:text-red-600 hover:border-red-200'}`} title={isRented ? "Phòng đang có người thuê không thể xóa" : "Xóa phòng"}>🗑️</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL THÊM PHÒNG */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden transform transition-all p-8">
             <h2 className="text-2xl font-black text-gray-800 mb-6">Thêm phòng mới</h2>
             
             <div className="space-y-4">
                <div>
                   <label className="block text-sm font-bold text-gray-700 mb-2">Số phòng</label>
                   <input 
                      type="text" 
                      placeholder="Ví dụ: P101"
                      value={newRoom.roomNumber}
                      onChange={(e) => setNewRoom({...newRoom, roomNumber: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-500" 
                   />
                </div>
                <div>
                   <label className="block text-sm font-bold text-gray-700 mb-2">Sức chứa (người)</label>
                   <input 
                      type="number" 
                      value={newRoom.capacity}
                      onChange={(e) => setNewRoom({...newRoom, capacity: parseInt(e.target.value) || 0})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-500" 
                   />
                </div>
                <div>
                   <label className="block text-sm font-bold text-gray-700 mb-2">Giá thuê (VNĐ)</label>
                   <input 
                      type="number" 
                      value={newRoom.basePrice}
                      onChange={(e) => setNewRoom({...newRoom, basePrice: parseInt(e.target.value) || 0})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-500" 
                   />
                </div>
             </div>

             <div className="mt-8 flex justify-end space-x-4">
                <button onClick={() => setShowCreateModal(false)} className="px-6 py-3 rounded-xl text-gray-600 font-bold hover:bg-gray-100 transition">Hủy bỏ</button>
                <button onClick={handleCreateRoom} className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200">Thêm mới</button>
             </div>
          </div>
        </div>
      )}

      {/* MODAL SỬA PHÒNG */}
      {showEditModal && selectedRoom && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden transform transition-all p-8">
             <h2 className="text-2xl font-black text-gray-800 mb-6" translate="no">Chỉnh sửa Phòng {selectedRoom.roomNumber}</h2>
             
             <div className="space-y-4">
                <div>
                   <label className="block text-sm font-bold text-gray-700 mb-2">Giá thuê (VNĐ)</label>
                   <input 
                      type="number" 
                      value={selectedRoom.basePrice}
                      onChange={(e) => setSelectedRoom({...selectedRoom, basePrice: parseInt(e.target.value) || 0})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-500" 
                   />
                </div>
                <div>
                   <label className="block text-sm font-bold text-gray-700 mb-2">Trạng thái phòng</label>
                   <select 
                      value={selectedRoom.status}
                      onChange={(e) => setSelectedRoom({...selectedRoom, status: parseInt(e.target.value)})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                   >
                      <option value={0}>Còn trống</option>
                      <option value={1}>Đã có người thuê</option>
                      <option value={2}>Đang bảo trì</option>
                   </select>
                </div>
                
                <div className="pt-2 border-t border-gray-100">
                   <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">Cấu hình giá dịch vụ</h3>
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Tiền rác (VNĐ)</label>
                        <input 
                           type="number" 
                           value={selectedRoom.garbageFee || 50000}
                           onChange={(e) => setSelectedRoom({...selectedRoom, garbageFee: parseInt(e.target.value) || 0})}
                           className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-bold outline-none focus:ring-2 focus:ring-indigo-500" 
                        />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Điện (VNĐ/kWh)</label>
                        <input 
                           type="number" 
                           value={selectedRoom.electricityPrice || 3500}
                           onChange={(e) => setSelectedRoom({...selectedRoom, electricityPrice: parseInt(e.target.value) || 0})}
                           className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-bold outline-none focus:ring-2 focus:ring-indigo-500" 
                        />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Nước (VNĐ/khối)</label>
                        <input 
                           type="number" 
                           value={selectedRoom.waterPrice || 15000}
                           onChange={(e) => setSelectedRoom({...selectedRoom, waterPrice: parseInt(e.target.value) || 0})}
                           className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-bold outline-none focus:ring-2 focus:ring-indigo-500" 
                        />
                     </div>
                   </div>
                </div>
             </div>

             <div className="mt-8 flex justify-end space-x-4">
                <button onClick={() => setShowEditModal(false)} className="px-6 py-3 rounded-xl text-gray-600 font-bold hover:bg-gray-100 transition">Hủy bỏ</button>
                <button onClick={handleSaveEdit} className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200">Lưu thay đổi</button>
             </div>
          </div>
        </div>
      )}

      {/* MODAL THÔNG TIN NGƯỜI THUÊ */}
      {showTenantModal && selectedTenant && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden transform transition-all p-8 border-t-8 border-indigo-600">
             <div className="text-center mb-6">
                <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-3 shadow-inner">
                   👤
                </div>
                <h2 className="text-2xl font-black text-gray-800">{selectedTenant.fullName}</h2>
                <p className="text-sm font-bold text-indigo-600">Chỉnh sửa hồ sơ người thuê</p>
             </div>
             
             <form onSubmit={(e) => {
                e.preventDefault();
                const token = localStorage.getItem('accessToken');
                axios.put(`http://localhost:5000/api/Tenants/${selectedTenant.id}`, selectedTenant, {
                  headers: { Authorization: `Bearer ${token}` }
                })
                .then(() => {
                  alert("Cập nhật thông tin khách trọ thành công!");
                  setShowTenantModal(false);
                  fetchRooms();
                })
                .catch(err => {
                  alert("Lỗi khi cập nhật!\n" + (typeof err.response?.data === 'string' ? err.response.data : JSON.stringify(err.response?.data) || err.message));
                });
             }} className="space-y-4 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <div>
                   <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Họ và tên</label>
                   <input 
                      type="text" 
                      required
                      value={selectedTenant.fullName || ''}
                      onChange={(e) => setSelectedTenant({...selectedTenant, fullName: e.target.value})}
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500" 
                   />
                </div>
                <div>
                   <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Số điện thoại</label>
                   <input 
                      type="text" 
                      required
                      value={selectedTenant.phone || ''}
                      onChange={(e) => setSelectedTenant({...selectedTenant, phone: e.target.value})}
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500" 
                   />
                </div>
                <div>
                   <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Email</label>
                   <input 
                      type="email" 
                      value={selectedTenant.email || ''}
                      onChange={(e) => setSelectedTenant({...selectedTenant, email: e.target.value})}
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500" 
                   />
                </div>
                <div>
                   <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Số CCCD</label>
                   <input 
                      type="text" 
                      required
                      value={selectedTenant.cccd || ''}
                      onChange={(e) => setSelectedTenant({...selectedTenant, cccd: e.target.value})}
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500 font-mono tracking-wider" 
                   />
                </div>

                <div className="mt-6 flex justify-end gap-3 pt-2 border-t border-gray-100">
                   <button type="button" onClick={() => setShowTenantModal(false)} className="px-5 py-2.5 rounded-xl text-gray-600 text-sm font-bold hover:bg-gray-200/80 transition">Hủy bỏ</button>
                   <button type="submit" className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200">Lưu</button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Rooms;
