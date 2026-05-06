# 🏠 SmartDorm - Hệ thống Quản lý Nhà trọ & Ký túc xá Thông minh

**SmartDorm** là một giải pháp quản lý toàn diện dành cho các chủ nhà trọ, quản lý ký túc xá và tòa nhà căn hộ dịch vụ. Hệ thống được thiết kế hiện đại, tối ưu hóa quy trình vận hành từ khâu đăng ký khách trọ, quản lý hợp đồng, hóa đơn đến việc tương tác với cư dân qua AI Chatbot và thông báo thời gian thực.

---

## ✨ Tính năng nổi bật

### 🔐 Quản trị & Bảo mật
- **Xác thực JWT:** Phân quyền chi tiết giữa Admin (Quản trị), Staff (Nhân viên) và Tenant (Khách trọ).
- **Dashboard tổng quan:** Biểu đồ doanh thu, thống kê phòng trống và KPI vận hành (sử dụng Recharts).

### 📝 Quản lý Vận hành
- **Quản lý Phòng:** Theo dõi tình trạng phòng, loại phòng và giá thuê.
- **Hợp đồng & Cọc:** Quản lý vòng đời hợp đồng, hỗ trợ yêu cầu hủy hợp đồng và vi phạm.
- **Chốt Điện Nước:** Giao diện nhập chỉ số nhanh chóng, tính toán hóa đơn tự động.
- **Hóa đơn & Thanh toán:** Tự động lập hóa đơn hàng tháng qua Cron Job, theo dõi trạng thái thanh toán.

### 🛠️ Bảo trì & Tài sản
- **Quản lý Tài sản:** Theo dõi danh mục trang thiết bị trong từng phòng.
- **Yêu cầu Bảo trì:** Tiếp nhận và xử lý các sự cố kỹ thuật từ khách trọ.

### 🤖 Tương tác Thông minh & Real-time
- **Thông báo Real-time:** Gửi thông báo tức thời qua SignalR (Thông báo hóa đơn, nhắc nợ, tin nhắn mới).
- **AI Chatbot (Gemini):** Tích hợp Google Gemini AI hỗ trợ giải đáp thắc mắc tự động cho khách trọ.
- **Telegram Bot:** Tích hợp nhận thông báo và tương tác trực tiếp qua Telegram.
- **Live Chat:** Hỗ trợ trực tuyến giữa khách trọ và ban quản lý.

### 🛡️ An ninh & Tiện ích
- **Quản lý Xe:** Lưu trữ thông tin biển số, loại xe và vị trí đỗ.
- **Đăng ký Khách:** Quản lý thông tin khách đến thăm và khách ở lại qua đêm.

---

## 🛠️ Công nghệ sử dụng

### Backend
- **Framework:** .NET 8.0 (ASP.NET Core Web API)
- **Database:** Microsoft SQL Server
- **ORM:** Entity Framework Core
- **Real-time:** ASP.NET Core SignalR
- **Logging:** Serilog (Console & File)
- **AI Integration:** Google Gemini AI API
- **Scheduling:** Quartz.NET / Background Tasks (Invoice Cron Job)

### Frontend
- **Framework:** React 18 (Vite)
- **Styling:** Tailwind CSS
- **State Management:** React Hooks
- **Charts:** Recharts
- **HTTP Client:** Axios
- **Icons/UI:** Lucide React, Headless UI

### Tools & Others
- **Bot:** Telegram Bot API
- **Containerization:** Docker & Docker Compose
- **API Documentation:** Swagger/OpenAPI

---

## 📂 Cấu trúc thư mục

- `/backend`: Mã nguồn server ASP.NET Core.
- `/frontend`: Mã nguồn ứng dụng React.
- `/bot`: Script Python/NodeJS xử lý Telegram Bot (nếu có riêng).
- `/docs`: Tài liệu phân tích và thiết kế hệ thống (PDF/DOCX).

---

## 🚀 Hướng dẫn cài đặt nhanh

### 1. Yêu cầu hệ thống
- .NET 8.0 SDK
- Node.js (v18+)
- SQL Server (LocalDB hoặc Express)

### 2. Cấu hình Backend
Vào thư mục `backend/`, tạo file `.env` hoặc cập nhật `appsettings.json`:
```json
"ConnectionStrings": {
  "DefaultConnection": "Server=YOUR_SERVER;Database=QL_nhaTro_KTX_DB;..."
},
"Gemini": {
  "ApiKey": "YOUR_GEMINI_API_KEY"
}
```

### 3. Cấu hình Frontend
Vào thư mục `frontend/`, chạy lệnh:
```bash
npm install
npm run dev
```

### 4. Chạy với Docker
```bash
docker-compose up --build
```

---

## 📜 Tài liệu dự án
Hệ thống đi kèm với bộ hồ sơ phân tích chi tiết:
- [Báo cáo Phân tích & Thiết kế hệ thống (PDF)](./docs/BAO_CAO_PHAN_TICH.pdf)
- [Hướng dẫn phát triển tính năng mới](./huongphatrien.txt)

---
**Phát triển bởi:** [Phạm Cao Chí Thanh](https://github.com/PhamCaoChiThanh)