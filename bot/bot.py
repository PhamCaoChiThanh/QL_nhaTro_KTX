import requests

TOKEN = "8692651498:AAGuWWnbqSCJjbbpBKdHaB4CLUPh9gneX5A"
chat_id = "5556860729"  # Đã sửa tên biến cho đồng nhất
message = "xin chào bạn"  # Đã sửa tên biến cho đồng nhất

# URL cơ bản cho phương thức sendMessage
base_url = f"https://api.telegram.org/bot{TOKEN}/sendMessage"

# Truyền các tham số vào dictionary (requests sẽ tự động xử lý khoảng trắng và dấu tiếng Việt)
parameters = {
    "chat_id": chat_id,
    "text": message
}

# Sử dụng requests.post (hoặc get) kèm theo parameters
r = requests.post(base_url, data=parameters)

# In ra phản hồi từ Telegram để xem tin nhắn đã gửi thành công chưa
print(r.json())