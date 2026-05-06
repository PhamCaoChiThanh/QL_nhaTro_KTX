import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Contracts = () => {
  const [showModal, setShowModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [viewingContract, setViewingContract] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [contracts, setContracts] = useState([]);
  const [newContract, setNewContract] = useState({ tenantId: '', roomId: '', startDate: '', endDate: '', depositAmount: '' });

  const HandoverModal = ({ contract, onClose }) => {
    const [assets, setAssets] = useState([]);
    const [snapshots, setSnapshots] = useState({});
    const [type, setType] = useState(0); // 0: CheckIn, 1: CheckOut
    const [note, setNote] = useState('');

    useEffect(() => {
        // Lấy room id từ contract (giả định Backend trả về RoomId)
        axios.get(`http://localhost:5000/api/Assets?roomId=${contract.roomId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
        }).then(res => {
            setAssets(res.data);
            const initial = {};
            res.data.forEach(a => initial[a.id] = 'Good');
            setSnapshots(initial);
        });
    }, [contract]);

    const handleSave = async () => {
        try {
            await axios.post('http://localhost:5000/api/HandoverRecords', {
                contractId: contract.id,
                type: type,
                note: note,
                assetSnapshotsJson: JSON.stringify(snapshots)
            }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
            });
            alert("✅ Đã lưu biên bản bàn giao thành công!");
            onClose();
        } catch (err) {
            alert("Lỗi: " + (err.response?.data || err.message));
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-8 max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center text-lg">📦</span>
                    Biên bản bàn giao tài sản
                </h2>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gray-50 p-4 rounded-2xl">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Hợp đồng</p>
                        <p className="font-bold text-gray-800">{contract.contractNumber}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Phòng</p>
                        <p className="font-bold text-gray-800">{contract.room}</p>
                    </div>
                </div>

                <div className="mb-6">
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Loại biên bản</label>
                    <div className="flex gap-2">
                        <button onClick={() => setType(0)} className={`flex-1 py-3 rounded-xl font-bold transition-all ${type === 0 ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>Nhận phòng (Check-in)</button>
                        <button onClick={() => setType(1)} className={`flex-1 py-3 rounded-xl font-bold transition-all ${type === 1 ? 'bg-rose-600 text-white shadow-lg shadow-rose-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>Trả phòng (Check-out)</button>
                    </div>
                </div>

                <div className="mb-6">
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Tình trạng thiết bị hiện tại</label>
                    <div className="space-y-3">
                        {assets.map(a => (
                            <div key={a.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <div>
                                    <p className="font-bold text-gray-800">{a.name}</p>
                                    <p className="text-[10px] text-gray-400">{a.description}</p>
                                </div>
                                <select 
                                    value={snapshots[a.id]} 
                                    onChange={e => setSnapshots({...snapshots, [a.id]: e.target.value})}
                                    className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
                                >
                                    <option value="Good">Tốt</option>
                                    <option value="Broken">Hỏng</option>
                                    <option value="Missing">Mất</option>
                                    <option value="Scratched">Trầy xước</option>
                                </select>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mb-8">
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Ghi chú thêm</label>
                    <textarea value={note} onChange={e => setNote(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 font-bold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none" rows={3} placeholder="Mô tả thêm tình trạng phòng..." />
                </div>

                <div className="flex gap-4">
                    <button onClick={onClose} className="flex-1 py-4 rounded-2xl font-bold text-gray-500 hover:bg-gray-50 transition">Hủy</button>
                    <button onClick={handleSave} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition">💾 Lưu biên bản</button>
                </div>
            </div>
        </div>
    );
  };

  const fetchContracts = () => {
    const token = localStorage.getItem('accessToken');
    axios.get('http://localhost:5000/api/Contracts', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setContracts(res.data))
      .catch(err => console.error("Lỗi lấy hợp đồng", err));
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  const handleCreateContract = (e) => {
    e.preventDefault();
    const token = localStorage.getItem('accessToken');
    axios.post('http://localhost:5000/api/Contracts', {
      tenantId: parseInt(newContract.tenantId),
      roomId: parseInt(newContract.roomId),
      startDate: newContract.startDate,
      endDate: newContract.endDate,
      depositAmount: parseFloat(newContract.depositAmount)
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        setShowModal(false);
        setNewContract({ tenantId: '', roomId: '', startDate: '', endDate: '', depositAmount: '' });
        fetchContracts();
      })
      .catch(err => {
        alert("Lỗi khi tạo hợp đồng!\n" + (err.response?.data || err.message));
      });
  };

  const handleDeleteContract = (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa hợp đồng này không?")) return;
    const token = localStorage.getItem('accessToken');
    axios.delete(`http://localhost:5000/api/Contracts/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(() => {
        fetchContracts();
      })
      .catch(err => {
        alert("Không thể xóa hợp đồng!\n" + (err.response?.data || err.message));
      });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Quản lý Hợp đồng & Cọc</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">Thiết lập hợp đồng và quản lý dòng tiền cọc của người thuê</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all font-semibold flex items-center transform hover:-translate-y-0.5">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
          Tạo hợp đồng mới
        </button>
      </div>

      {/* Thanh công cụ tìm kiếm */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center">
        <div className="bg-gray-50 p-2 rounded-lg mr-3"><svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg></div>
        <input 
          type="text" 
          placeholder="Tìm kiếm theo mã hợp đồng, tên người thuê hoặc mã phòng..." 
          className="w-full outline-none text-gray-700 bg-transparent font-medium placeholder-gray-400"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Bảng dữ liệu */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50/80">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Mã HĐ</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Người thuê</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Phòng</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Thời hạn</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Trạng thái</th>
              <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {contracts.map(c => (
              <tr key={c.id} className="hover:bg-indigo-50/50 transition-colors cursor-pointer group">
                <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900">{c.contractNumber}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                  <div className="font-medium">{c.tenant}</div>
                  <div className="text-xs text-gray-400">{c.tenantEmail}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-indigo-600 font-bold bg-indigo-50/30">{c.room}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm font-medium">{c.start} <span className="mx-2 text-gray-300">➔</span> {c.end}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-3 py-1.5 text-xs font-bold rounded-lg ${c.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    {c.status === 'Active' ? 'Còn hiệu lực' : 'Đã chấm dứt'}
                  </span>
                  {c.isCancelRequested && <div className="text-[10px] text-amber-600 font-bold mt-1">⏳ Muốn hủy HĐ</div>}
                  {c.violationReason && <div className="text-[10px] text-red-600 font-bold mt-1">⚠️ Vi phạm: {c.violationReason}</div>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  {!c.scannedContractUrl ? (
                    <button 
                      onClick={async () => {
                        try {
                          const token = localStorage.getItem('accessToken');
                          const res = await axios.post(`http://localhost:5000/api/Contracts/${c.id}/sign`, {}, { headers: { Authorization: `Bearer ${token}` }});
                          alert('Ký thành công! Đã gửi Email thông báo tới khách hàng.');
                          // Cập nhật state
                          setContracts(contracts.map(contract => contract.id === c.id ? { ...contract, scannedContractUrl: res.data.url } : contract));
                        } catch (err) {
                          alert('Lỗi khi ký hợp đồng!');
                        }
                      }}
                      className="bg-indigo-100 text-indigo-700 hover:bg-indigo-600 hover:text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors shadow-sm"
                    >
                      ✒️ Ký điện tử & Gửi Mail
                    </button>
                  ) : (
                    <button 
                      onClick={() => {
                        setViewingContract(c);
                        setShowPdfModal(true);
                      }}
                      className="bg-emerald-100 text-emerald-700 hover:bg-emerald-600 hover:text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors shadow-sm inline-flex items-center"
                    >
                      📄 Xem PDF
                    </button>
                  )}
                  {c.status === 'Active' && c.isCancelRequested && (
                    <button 
                      onClick={async () => {
                        if (!window.confirm(`Bạn có chắc muốn DUYỆT yêu cầu hủy hợp đồng của ${c.tenant}?`)) return;
                        try {
                          const token = localStorage.getItem('accessToken');
                          await axios.post(`http://localhost:5000/api/Contracts/${c.id}/approve-cancel`, {}, { headers: { Authorization: `Bearer ${token}` }});
                          alert('✅ Đã duyệt hủy hợp đồng!');
                          fetchContracts();
                        } catch (err) {
                          alert('❌ Lỗi khi duyệt hủy!');
                        }
                      }}
                      className="ml-2 bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 rounded-lg font-bold text-xs transition-colors shadow-sm"
                      title={`Lý do khách xin hủy: ${c.cancelReason}`}
                    >
                      🔔 Duyệt Hủy
                    </button>
                  )}
                  {c.status === 'Active' && (
                    <button 
                      onClick={async () => {
                        const reason = prompt(`Đơn phương chấm dứt hợp đồng của ${c.tenant}.\nVui lòng nhập lý do vi phạm (Ví dụ: Không đóng tiền phòng, Gây rối trật tự...):`);
                        if (reason === null) return;
                        if (!reason.trim()) { alert("❌ Phải nhập lý do vi phạm để chấm dứt!"); return; }
                        try {
                          const token = localStorage.getItem('accessToken');
                          await axios.post(`http://localhost:5000/api/Contracts/${c.id}/terminate`, { violationReason: reason }, { headers: { Authorization: `Bearer ${token}` }});
                          alert('✅ Đã chấm dứt hợp đồng thành công!');
                          fetchContracts();
                        } catch (err) {
                          alert('❌ Lỗi khi chấm dứt hợp đồng!');
                        }
                      }}
                      className="ml-2 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg font-bold text-xs transition-colors shadow-sm"
                    >
                      🚫 Chấm dứt
                    </button>
                  )}
                  <button 
                    onClick={() => {
                        setViewingContract(c);
                        setShowHandoverModal(true);
                    }}
                    className="ml-2 bg-purple-100 text-purple-700 hover:bg-purple-600 hover:text-white px-3 py-2 rounded-lg font-bold text-xs transition-colors shadow-sm"
                  >
                    📦 Bàn giao
                  </button>
                  <button 
                    onClick={() => handleDeleteContract(c.id)} 
                    className="ml-2 bg-rose-100 text-rose-700 hover:bg-rose-600 hover:text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors shadow-sm"
                  >
                    🗑️ Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL BÀN GIAO TÀI SẢN */}
      {showHandoverModal && viewingContract && (
        <HandoverModal 
            contract={viewingContract} 
            onClose={() => setShowHandoverModal(false)} 
        />
      )}

      {/* Modal Popup: Giao diện trực quan Tạo Hợp Đồng */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">
            <div className="bg-indigo-600 p-6 text-white flex justify-between items-center">
                <h2 className="text-xl font-bold">Tạo Hợp đồng Mới</h2>
                <button onClick={() => setShowModal(false)} className="text-indigo-200 hover:text-white transition">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            
            <form className="p-8 space-y-6" onSubmit={handleCreateContract}>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Mã Người thuê (Tenant ID)</label>
                  <input type="number" required value={newContract.tenantId} onChange={e => setNewContract({...newContract, tenantId: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition shadow-sm" placeholder="VD: 1" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Mã Phòng (Room ID)</label>
                  <input type="number" required value={newContract.roomId} onChange={e => setNewContract({...newContract, roomId: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition shadow-sm" placeholder="VD: 1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Ngày bắt đầu thuê</label>
                  <input type="date" required value={newContract.startDate} onChange={e => setNewContract({...newContract, startDate: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition shadow-sm text-gray-700" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Ngày kết thúc dự kiến</label>
                  <input type="date" required value={newContract.endDate} onChange={e => setNewContract({...newContract, endDate: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition shadow-sm text-gray-700" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Tiền cọc ban đầu (VNĐ)</label>
                <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-500 font-bold">₫</span>
                    <input type="number" required value={newContract.depositAmount} onChange={e => setNewContract({...newContract, depositAmount: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition shadow-sm font-bold text-indigo-700 text-lg" placeholder="5000000" />
                </div>
                <p className="text-xs text-gray-400 mt-2">Tiền cọc sẽ tự động được đưa vào quỹ `Deposit` liên kết với hợp đồng này.</p>
              </div>
              <div className="pt-4 flex justify-end space-x-4 border-t border-gray-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-3 rounded-xl text-gray-600 hover:bg-gray-100 font-bold transition">Hủy bỏ</button>
                <button type="submit" className="px-6 py-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-200 font-bold transition">Phê duyệt Hợp đồng</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Popup: Xem PDF hợp đồng */}
      {showPdfModal && viewingContract && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-3xl rounded-[2rem] shadow-2xl overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200 flex flex-col h-[90vh]">
            <div className="bg-emerald-600 p-6 text-white flex justify-between items-center flex-shrink-0">
                <h2 className="text-xl font-bold">Xem Hợp đồng: {viewingContract.contractNumber}</h2>
                <button onClick={() => setShowPdfModal(false)} className="text-emerald-100 hover:text-white transition">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            
            <div className="p-10 overflow-y-auto flex-1 bg-gray-100 flex justify-center">
              <div className="bg-white w-full max-w-2xl p-12 shadow-md border border-gray-200 rounded-sm text-gray-800 font-serif leading-relaxed text-sm">
                <h1 className="text-center text-xl font-bold uppercase mb-6">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h1>
                <p className="text-center font-bold mb-8">Độc lập - Tự do - Hạnh phúc</p>
                
                <h2 className="text-center text-lg font-bold uppercase mb-8">HỢP ĐỒNG THUÊ PHÒNG TRỌ</h2>
                <p className="text-center italic mb-8">Số: {viewingContract.contractNumber}/HĐTP</p>
                
                <p className="mb-4">Hôm nay, ngày {viewingContract.start}, tại Hệ thống SmartDorm, chúng tôi gồm có:</p>
                
                <div className="mb-6">
                  <p className="font-bold mb-2">BÊN CHO THUÊ (Bên A):</p>
                  <p>Đại diện: Ban Quản Lý SmartDorm</p>
                  <p>Địa chỉ: Khu Công Nghệ Cao, Quận 9, TP. HCM</p>
                </div>

                <div className="mb-6">
                  <p className="font-bold mb-2">BÊN THUÊ (Bên B):</p>
                  <p>Họ và tên: <span className="font-bold">{viewingContract.tenant}</span></p>
                  <p>Email: {viewingContract.tenantEmail}</p>
                </div>

                <div className="mb-6">
                  <p className="font-bold mb-2">ĐIỀU 1: NỘI DUNG HỢP ĐỒNG</p>
                  <p>- Bên A đồng ý cho Bên B thuê phòng số: <span className="font-bold">{viewingContract.room}</span>.</p>
                  <p>- Thời hạn thuê từ <span className="font-bold">{viewingContract.start}</span> đến <span className="font-bold">{viewingContract.end}</span>.</p>
                  <p>- Số tiền đặt cọc: <span className="font-bold text-emerald-600">{viewingContract.deposit?.toLocaleString()} VNĐ</span>.</p>
                </div>

                <div className="mb-6">
                  <p className="font-bold mb-2">ĐIỀU 2: TRÁCH NHIỆM HAI BÊN</p>
                  <p>- Bên B cam kết thanh toán tiền phòng, điện nước đúng thời hạn quy định.</p>
                  <p>- Bên B tuân thủ nội quy chung của Nhà trọ/KTX.</p>
                </div>

                <div className="mt-12 flex justify-between">
                  <div className="text-center">
                    <p className="font-bold mb-16">ĐẠI DIỆN BÊN A</p>
                    <p className="italic text-gray-400">Đã ký điện tử</p>
                    <p className="font-bold text-indigo-600 mt-2">SmartDorm</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold mb-16">ĐẠI DIỆN BÊN B</p>
                    <p className="italic text-gray-400">Đã ký điện tử</p>
                    <p className="font-bold text-emerald-600 mt-2">{viewingContract.tenant}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end flex-shrink-0">
              <button onClick={() => setShowPdfModal(false)} className="px-6 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-bold shadow-md transition">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Contracts;
