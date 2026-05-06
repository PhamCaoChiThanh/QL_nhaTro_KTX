# ─── BƯỚC 1: Build static files ────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

# Copy package.json và cài node_modules
COPY package*.json ./
RUN npm ci

# Copy toàn bộ source code frontend
COPY . .
RUN npm run build

# ─── BƯỚC 2: Cài đặt Nginx phục vụ client ──────────────────────
FROM nginx:stable-alpine AS final
WORKDIR /usr/share/nginx/html

# Xóa các file mặc định của Nginx
RUN rm -rf ./*

# Copy file build từ Giai đoạn 1 sang
COPY --from=build /app/dist .

# Copy cấu hình định tuyến Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
