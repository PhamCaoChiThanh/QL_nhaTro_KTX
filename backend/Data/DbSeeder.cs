using Microsoft.EntityFrameworkCore;
using QL_nhaTro_KTX.Backend.Models;

namespace QL_nhaTro_KTX.Backend.Data
{
    /// <summary>
    /// Seed dữ liệu mẫu vào DB khi lần đầu khởi tạo.
    /// Chỉ chạy khi bảng trống — an toàn khi restart nhiều lần.
    /// </summary>
    public static class DbSeeder
    {
        public static async Task SeedAsync(AppDbContext context, ILogger logger)
        {
            logger.LogInformation("Bắt đầu dọn dẹp và kiểm tra dữ liệu...");

            await CleanupMockDataAsync(context, logger);
            await SeedUsersAsync(context, logger);
            await SeedRoomsAsync(context, logger);

            // Fix lỗi các URL hợp đồng cũ (nếu có)
            var oldContracts = await context.Contracts
                .Where(c => c.ScannedContractUrl != null && c.ScannedContractUrl.Contains("storage.qlnhatro.com"))
                .ToListAsync();
            if (oldContracts.Any())
            {
                foreach (var c in oldContracts)
                {
                    c.ScannedContractUrl = $"/api/Contracts/{c.Id}/download";
                }
                await context.SaveChangesAsync();
                logger.LogInformation($"✅ Đã cập nhật {oldContracts.Count} link hợp đồng cũ về hệ thống nội bộ.");
            }

            logger.LogInformation("Hoàn tất xử lý dữ liệu.");
        }

        private static async Task CleanupMockDataAsync(AppDbContext context, ILogger logger)
        {
            logger.LogInformation("Đang dọn dẹp dữ liệu mẫu...");

            // Tìm Khách Hàng Ảo
            var mockTenant = await context.Tenants.FirstOrDefaultAsync(t => t.FullName == "Khách Hàng Ảo");
            if (mockTenant != null)
            {
                // Xóa Contracts liên quan
                var contracts = await context.Contracts.Where(c => c.TenantId == mockTenant.Id).ToListAsync();
                foreach (var contract in contracts)
                {
                    // Xóa Deposits liên quan
                    var deposits = await context.Deposits.Where(d => d.ContractId == contract.Id).ToListAsync();
                    context.Deposits.RemoveRange(deposits);
                }
                context.Contracts.RemoveRange(contracts);

                // Xóa Users liên quan (tenant user)
                var mockUsers = await context.Users.Where(u => u.TenantId == mockTenant.Id).ToListAsync();
                context.Users.RemoveRange(mockUsers);

                // Xóa Tenant
                context.Tenants.Remove(mockTenant);
                
                await context.SaveChangesAsync();
                logger.LogInformation("Đã xóa Khách Hàng Ảo và các dữ liệu liên quan.");
            }
        }

        private static async Task SeedUsersAsync(AppDbContext context, ILogger logger)
        {
            if (await context.Users.AnyAsync(u => u.Username == "admin")) return;

            logger.LogInformation("Seeding: Admin User...");
            context.Users.Add(
                new AppUser
                {
                    Username = "admin",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
                    Role = Role.Admin
                }
            );
            await context.SaveChangesAsync();
        }

        private static async Task SeedRoomsAsync(AppDbContext context, ILogger logger)
        {
            if (await context.Rooms.AnyAsync()) return;

            logger.LogInformation("Seeding: 50 phòng...");
            var random = new Random(123);
            var rooms = new List<Room>();

            for (int i = 1; i <= 50; i++)
            {
                int floor = (i - 1) / 10 + 1;
                int number = (i - 1) % 10 + 1;
                string roomNumber = $"P{floor}{number:D2}";

                rooms.Add(new Room
                {
                    RoomNumber = roomNumber,
                    Capacity = random.Next(0, 2) == 0 ? 2 : 4,
                    BasePrice = random.Next(0, 2) == 0 ? 3_000_000 : 4_500_000,
                    Status = RoomStatus.Available
                });
            }
            context.Rooms.AddRange(rooms);
            await context.SaveChangesAsync();
        }
    }
}
