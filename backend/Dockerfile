# ─── BƯỚC 1: Build Image ───────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy file csproj và restore
COPY ["Backend.csproj", "./"]
RUN dotnet restore "./Backend.csproj"

# Copy toàn bộ source code và build
COPY . .
RUN dotnet publish "./Backend.csproj" -c Release -o /app/publish /p:UseAppHost=false

# ─── BƯỚC 2: Runtime Image ─────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
EXPOSE 8080
EXPOSE 8081

# Copy build kết quả
COPY --from=build /app/publish .

# Tạo thư mục Logs sẵn trong container
RUN mkdir -p /app/Logs

# Lệnh khởi chạy
ENTRYPOINT ["dotnet", "Backend.dll"]
