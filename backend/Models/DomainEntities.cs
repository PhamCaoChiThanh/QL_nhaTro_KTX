using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace QL_nhaTro_KTX.Backend.Models
{
    public enum RoomStatus { Available, Rented, Maintenance }
    public enum ContractStatus { Active, Expired, Terminated }
    public enum DepositStatus { Active, Returned, Deducted }
    public enum TransactionType { Add, Deduct, Refund }
    public enum InvoiceStatus { Unpaid, Partial, Paid }
    public enum PaymentMethod { Cash, Transfer }
    public enum MaintenanceStatus { Pending, InProgress, Resolved }
    public enum Role { Admin, Staff, TenantUser, Accountant, Technician }
    public enum RoomRequestStatus { Pending, Approved, Rejected }

    public class AppUser
    {
        public int Id { get; set; }
        [Required, MaxLength(50)] public string Username { get; set; }
        [Required] public string PasswordHash { get; set; }
        public Role Role { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Tùy chọn: Link với bảng Tenant nếu User này là người thuê
        public int? TenantId { get; set; }
        public Tenant? Tenant { get; set; }

        // Navigation: danh sách refresh tokens của user
        public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
    }

    /// <summary>
    /// Lưu Refresh Token để duy trì phiên đăng nhập dài hạn (30 ngày).
    /// Hỗ trợ Refresh Token Rotation: mỗi lần dùng sẽ tạo token mới, token cũ bị revoke.
    /// </summary>
    public class RefreshToken
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public AppUser User { get; set; }

        [Required, MaxLength(256)] public string Token { get; set; }    // SHA-256 hash để lưu an toàn
        [Required, MaxLength(512)] public string TokenHash { get; set; } // Hash của token để lookup

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime ExpiresAt { get; set; }
        public bool IsRevoked { get; set; } = false;
        public bool IsUsed { get; set; } = false;

        // Audit: theo dõi từ đâu tạo / dùng
        [MaxLength(64)] public string? CreatedByIp { get; set; }
        [MaxLength(64)] public string? RevokedByIp { get; set; }
        public DateTime? RevokedAt { get; set; }
        [MaxLength(256)] public string? ReplacedByToken { get; set; }  // Token mới thay thế (rotation)

        // Computed: token còn hiệu lực?
        public bool IsActive => !IsRevoked && !IsUsed && DateTime.UtcNow < ExpiresAt;
    }

    public class Tenant
    {
        public int Id { get; set; }
        [Required, MaxLength(255)] public string FullName { get; set; }
        [Required, MaxLength(20)] public string Cccd { get; set; }
        [Required, MaxLength(20)] public string Phone { get; set; }
        [MaxLength(255)] public string? Email { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Hình ảnh
        [MaxLength(500)] public string? AvatarUrl { get; set; }
        [MaxLength(500)] public string? CccdFrontImageUrl { get; set; }
        [MaxLength(500)] public string? CccdBackImageUrl { get; set; }

        // Navigation properties
        public ICollection<Contract> Contracts { get; set; }
        public ICollection<Maintenance> MaintenanceRequests { get; set; }

        // Telegram link
        [MaxLength(50)] public string? TelegramChatId { get; set; }
    }

    public class Room
    {
        public int Id { get; set; }
        [Required, MaxLength(50)] public string RoomNumber { get; set; }
        public int Capacity { get; set; }
        public RoomStatus Status { get; set; } = RoomStatus.Available;
        public decimal BasePrice { get; set; }
        
        public decimal GarbageFee { get; set; } = 50000;
        public decimal ElectricityPrice { get; set; } = 3500;
        public decimal WaterPrice { get; set; } = 15000;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Hình ảnh
        [MaxLength(500)] public string? ImageUrl { get; set; }

        public ICollection<Contract> Contracts { get; set; }
    }

    public class Contract
    {
        public int Id { get; set; }
        public int TenantId { get; set; }
        public Tenant Tenant { get; set; }
        public int RoomId { get; set; }
        public Room Room { get; set; }

        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public ContractStatus Status { get; set; } = ContractStatus.Active;
        
        public bool IsCancelRequested { get; set; } = false;
        public string? CancelReason { get; set; }
        public string? ViolationReason { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Hình ảnh hợp đồng đã ký
        [MaxLength(500)] public string? ScannedContractUrl { get; set; }

        public Deposit Deposit { get; set; }
        public ICollection<Invoice> Invoices { get; set; }
    }

    public class Deposit
    {
        public int Id { get; set; }
        public int ContractId { get; set; }
        public Contract Contract { get; set; }
        
        public decimal TotalAmount { get; set; }
        public decimal CurrentBalance { get; set; }
        public DepositStatus Status { get; set; } = DepositStatus.Active;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<DepositTransaction> Transactions { get; set; }
    }

    public class DepositTransaction
    {
        public int Id { get; set; }
        public int DepositId { get; set; }
        public Deposit Deposit { get; set; }
        
        public decimal Amount { get; set; }
        public TransactionType TransactionType { get; set; }
        public string Reason { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class ElectricUsage
    {
        public int Id { get; set; }
        public int RoomId { get; set; }
        public Room Room { get; set; }
        
        public int BillingMonth { get; set; }
        public int BillingYear { get; set; }
        public int OldIndex { get; set; }
        public int NewIndex { get; set; }
        public int UsageAmount => NewIndex - OldIndex;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class WaterUsage
    {
        public int Id { get; set; }
        public int RoomId { get; set; }
        public Room Room { get; set; }
        
        public int BillingMonth { get; set; }
        public int BillingYear { get; set; }
        public int OldIndex { get; set; }
        public int NewIndex { get; set; }
        public int UsageAmount => NewIndex - OldIndex;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class Invoice
    {
        public int Id { get; set; }
        public int ContractId { get; set; }
        public Contract? Contract { get; set; }
        
        public int BillingMonth { get; set; }
        public int BillingYear { get; set; }
        public int ElectricityUsage { get; set; }
        public int WaterUsage { get; set; }
        public decimal RoomFee { get; set; }
        public decimal ElectricFee { get; set; }
        public decimal WaterFee { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal PaidAmount { get; set; } = 0;
        public InvoiceStatus Status { get; set; } = InvoiceStatus.Unpaid;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<Payment> Payments { get; set; }
    }

    public class Payment
    {
        public int Id { get; set; }
        public int InvoiceId { get; set; }
        public Invoice Invoice { get; set; }
        
        public decimal Amount { get; set; }
        public PaymentMethod PaymentMethod { get; set; }
        public DateTime PaymentDate { get; set; } = DateTime.UtcNow;
    }

    public class Maintenance
    {
        public int Id { get; set; }
        public int RoomId { get; set; }
        public Room Room { get; set; }
        
        public int ReportedById { get; set; }
        public Tenant ReportedBy { get; set; }
        
        [Required] public string Description { get; set; }
        public MaintenanceStatus Status { get; set; } = MaintenanceStatus.Pending;
        public string AssignedTo { get; set; }
        
        // Hình ảnh sự cố
        [MaxLength(500)] public string? ImageUrl { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    public class RoomRequest
    {
        public int Id { get; set; }
        public int TenantId { get; set; }
        public Tenant Tenant { get; set; }
        public int RoomId { get; set; }
        public Room Room { get; set; }
        public string? Note { get; set; }
        public DateTime? MoveInDate { get; set; }
        public RoomRequestStatus Status { get; set; } = RoomRequestStatus.Pending;
        public string? AdminNote { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    public enum AssetStatus { Good, Warning, Broken, Lost }

    public class Asset
    {
        public int Id { get; set; }
        public int RoomId { get; set; }
        public Room Room { get; set; }

        [Required, MaxLength(255)] public string Name { get; set; }
        public string? Description { get; set; }
        public AssetStatus Status { get; set; } = AssetStatus.Good;
        public decimal? Value { get; set; }
        
        [MaxLength(500)] public string? ImageUrl { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    public enum HandoverType { CheckIn, CheckOut }

    public class HandoverRecord
    {
        public int Id { get; set; }
        public int ContractId { get; set; }
        public Contract Contract { get; set; }

        public HandoverType Type { get; set; }
        public string? Note { get; set; }
        public DateTime HandoverDate { get; set; } = DateTime.UtcNow;

        // Lưu trữ danh sách tài sản kèm trạng thái lúc bàn giao (dưới dạng JSON string cho đơn giản hoặc bảng phụ)
        // Ở đây ta dùng JSON string để demo nhanh
        public string AssetSnapshotsJson { get; set; }
        
        [MaxLength(500)] public string? SignatureImageUrl { get; set; }
    }

    public class Announcement
    {
        public int Id { get; set; }
        [Required] public string Title { get; set; }
        [Required] public string Content { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public bool IsActive { get; set; } = true;
    }

    public class Visitor
    {
        public int Id { get; set; }
        public int TenantId { get; set; }
        public Tenant? Tenant { get; set; } = null;
        
        [Required, MaxLength(255)] public string FullName { get; set; }
        [MaxLength(20)] public string? Cccd { get; set; }
        public string? PhoneNumber { get; set; }
        public string? Reason { get; set; }
        public DateTime VisitTime { get; set; } = DateTime.UtcNow;
        public DateTime? LeaveTime { get; set; }
        public bool IsOvernight { get; set; } = false;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class Vehicle
    {
        public int Id { get; set; }
        public int TenantId { get; set; }
        public Tenant? Tenant { get; set; } = null;

        [Required, MaxLength(20)] public string LicensePlate { get; set; }
        [MaxLength(50)] public string VehicleType { get; set; } // Xe máy, Ô tô, Xe đạp
        [MaxLength(20)] public string? ParkingTagNumber { get; set; }
        [MaxLength(20)] public string? SlotNumber { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class BuildingMeterReading
    {
        public int Id { get; set; }
        public int Month { get; set; }
        public int Year { get; set; }
        public int ElectricityTotal { get; set; }
        public int WaterTotal { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
