using Microsoft.EntityFrameworkCore;
using QL_nhaTro_KTX.Backend.Models;

namespace QL_nhaTro_KTX.Backend.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<Tenant> Tenants { get; set; }
        public DbSet<Room> Rooms { get; set; }
        public DbSet<Contract> Contracts { get; set; }
        public DbSet<Deposit> Deposits { get; set; }
        public DbSet<DepositTransaction> DepositTransactions { get; set; }
        public DbSet<ElectricUsage> ElectricUsages { get; set; }
        public DbSet<WaterUsage> WaterUsages { get; set; }
        public DbSet<Invoice> Invoices { get; set; }
        public DbSet<Payment> Payments { get; set; }
        public DbSet<Maintenance> Maintenances { get; set; }
        public DbSet<AppUser> Users { get; set; }
        public DbSet<RefreshToken> RefreshTokens { get; set; }
        public DbSet<ChatbotKnowledge> ChatbotKnowledges { get; set; }
        public DbSet<UnansweredQuestion> UnansweredQuestions { get; set; }
        public DbSet<RoomRequest> RoomRequests { get; set; }
        public DbSet<Asset> Assets { get; set; }
        public DbSet<HandoverRecord> HandoverRecords { get; set; }
        public DbSet<Announcement> Announcements { get; set; }
        public DbSet<Visitor> Visitors { get; set; }
        public DbSet<Vehicle> Vehicles { get; set; }
        public DbSet<BuildingMeterReading> BuildingMeterReadings { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Cấu hình Precision cho tất cả các kiểu decimal (tránh warning)
            foreach (var property in modelBuilder.Model.GetEntityTypes()
                .SelectMany(t => t.GetProperties())
                .Where(p => p.ClrType == typeof(decimal) || p.ClrType == typeof(decimal?)))
            {
                property.SetColumnType("decimal(18,2)");
            }

            // Ràng buộc duy nhất cho CCCD
            modelBuilder.Entity<Tenant>()
                .HasIndex(t => t.Cccd)
                .IsUnique();

            // Ràng buộc duy nhất cho Số phòng
            modelBuilder.Entity<Room>()
                .HasIndex(r => r.RoomNumber)
                .IsUnique();

            // Cấu hình quan hệ 1-1 giữa Contract và Deposit
            modelBuilder.Entity<Contract>()
                .HasOne(c => c.Deposit)
                .WithOne(d => d.Contract)
                .HasForeignKey<Deposit>(d => d.ContractId);
                
            // Tránh lỗi cascade delete vòng lặp
            modelBuilder.Entity<Contract>()
                .HasOne(c => c.Room)
                .WithMany(r => r.Contracts)
                .HasForeignKey(c => c.RoomId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Maintenance>()
                .HasOne(m => m.ReportedBy)
                .WithMany(t => t.MaintenanceRequests)
                .HasForeignKey(m => m.ReportedById)
                .OnDelete(DeleteBehavior.Restrict);

            // RefreshToken: Index unique trên TokenHash để lookup nhanh
            modelBuilder.Entity<RefreshToken>()
                .HasIndex(r => r.TokenHash)
                .IsUnique();

            // RefreshToken có quan hệ N-1 với AppUser
            modelBuilder.Entity<RefreshToken>()
                .HasOne(r => r.User)
                .WithMany(u => u.RefreshTokens)
                .HasForeignKey(r => r.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
