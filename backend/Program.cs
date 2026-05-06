using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using QL_nhaTro_KTX.Backend.Data;
using QL_nhaTro_KTX.Backend.Middlewares;
using Serilog;
using System.Text;
using System.Text.Json.Serialization;

// ═══════════════════════════════════════════════════════════════
// BƯỚC 1: Cấu hình Serilog TRƯỚC KHI tạo builder
// (Bootstrap logger bắt lỗi ngay cả khi startup thất bại)
// ═══════════════════════════════════════════════════════════════
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

Log.Information("═══════════════════════════════════════════════");
Log.Information("   QL NhàTrọ / KTX — Khởi động hệ thống...");
Log.Information("═══════════════════════════════════════════════");

try
{
    // ─── Tải biến môi trường từ .env ─────────────────────────────
    try
    {
        string envPath = Path.Combine(Directory.GetCurrentDirectory(), ".env");
        if (!File.Exists(envPath))
            envPath = Path.Combine(Directory.GetCurrentDirectory(), "Services", ".env");

        if (File.Exists(envPath))
        {
            foreach (var line in File.ReadAllLines(envPath))
            {
                if (string.IsNullOrWhiteSpace(line) || line.StartsWith("#")) continue;
                var parts = line.Split('=', 2);
                if (parts.Length == 2)
                    Environment.SetEnvironmentVariable(parts[0].Trim(), parts[1].Trim());
            }
        }
    }
    catch (Exception ex)
    {
        Log.Warning($"⚠️ Lỗi khi tải .env trong Program.cs: {ex.Message}");
    }

    var builder = WebApplication.CreateBuilder(args);

    // ─── Serilog: đọc config từ appsettings.json ───────────────
    builder.Host.UseSerilog((context, services, configuration) =>
        configuration
            .ReadFrom.Configuration(context.Configuration)
            .ReadFrom.Services(services)
            .Enrich.FromLogContext()
    );

    // ─── Controllers & JSON ────────────────────────────────────
    builder.Services.AddControllers().AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    });

    // ─── SignalR Real-time ─────────────────────────────────────
    builder.Services.AddSignalR();

    // ─── Database (SQL Server + Migration) ────────────────────
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseSqlServer(
            builder.Configuration.GetConnectionString("DefaultConnection"),
            sqlOptions => sqlOptions.EnableRetryOnFailure(
                maxRetryCount: 5,
                maxRetryDelay: TimeSpan.FromSeconds(10),
                errorNumbersToAdd: null)
        )
    );

    // ─── CORS ─────────────────────────────────────────────────
    builder.Services.AddCors(options =>
    {
        options.AddPolicy("AllowAll",
            policy => policy
                .WithOrigins("http://localhost:5173", "http://localhost:3000") // CORS an toàn hơn cho SignalR
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials()); // Cho phép credentials/cookie/token khi handshake SignalR
    });

    // ─── JWT Authentication ────────────────────────────────────
    var jwtSettings = builder.Configuration.GetSection("Jwt");
    var key = Encoding.ASCII.GetBytes(jwtSettings["Key"] ?? throw new InvalidOperationException("JWT Key chưa được cấu hình!"));

    builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = false;
        options.SaveToken = true;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(key),
            ValidateIssuer = true,
            ValidIssuer = jwtSettings["Issuer"],
            ValidateAudience = true,
            ValidAudience = jwtSettings["Audience"],
            ClockSkew = TimeSpan.Zero
        };

        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                {
                    context.Token = accessToken;
                }
                return Task.CompletedTask;
            }
        };
    });

    // ─── Application Services ─────────────────────────────────
    builder.Services.AddHostedService<QL_nhaTro_KTX.Backend.Services.InvoiceCronJob>();
    builder.Services.AddHostedService<QL_nhaTro_KTX.Backend.Services.TelegramPollingService>();
    builder.Services.AddScoped<QL_nhaTro_KTX.Backend.Services.IEmailService,
                               QL_nhaTro_KTX.Backend.Services.EmailService>();
    builder.Services.AddScoped<QL_nhaTro_KTX.Backend.Services.ITokenService,
                               QL_nhaTro_KTX.Backend.Services.TokenService>();
    builder.Services.AddHttpClient("Telegram");
    builder.Services.AddScoped<QL_nhaTro_KTX.Backend.Services.ITelegramBotService,
                               QL_nhaTro_KTX.Backend.Services.TelegramBotService>();

    // ─── Swagger ──────────────────────────────────────────────
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen(c =>
    {
        c.SwaggerDoc("v1", new() { Title = "QL NhàTrọ / KTX API", Version = "v1" });
        // Cho phép nhập Bearer token trong Swagger UI
        c.AddSecurityDefinition("Bearer", new()
        {
            Name = "Authorization",
            Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            In = Microsoft.OpenApi.Models.ParameterLocation.Header,
            Description = "Nhập JWT token. Ví dụ: eyJhbGci..."
        });
        c.AddSecurityRequirement(new()
        {
            {
                new() { Reference = new() { Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme, Id = "Bearer" } },
                Array.Empty<string>()
            }
        });
    });

    // ═══════════════════════════════════════════════════════════
    var app = builder.Build();
    // ═══════════════════════════════════════════════════════════

    // ─── BƯỚC 2: Chạy DB Migration + Seed ─────────────────────
    using (var scope = app.Services.CreateScope())
    {
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var dbLogger = scope.ServiceProvider.GetRequiredService<ILogger<AppDbContext>>();

        try
        {
            dbLogger.LogInformation("Đang áp dụng DB Migration...");
            // PRODUCTION-READY: Migrate() thay vì EnsureCreated()
            // - Track lịch sử thay đổi schema
            // - Cho phép rollback migration
            // - Không xóa dữ liệu khi schema thay đổi
            await context.Database.MigrateAsync();
            dbLogger.LogInformation("DB Migration hoàn tất.");

            await context.Database.ExecuteSqlRawAsync(@"
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Visitors')
BEGIN
    CREATE TABLE [dbo].[Visitors] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [TenantId] INT NOT NULL,
        [FullName] NVARCHAR(255) NOT NULL,
        [Cccd] NVARCHAR(20) NULL,
        [PhoneNumber] NVARCHAR(20) NULL,
        [VisitTime] DATETIME2 NOT NULL,
        [LeaveTime] DATETIME2 NULL,
        [Reason] NVARCHAR(MAX) NULL,
        [IsOvernight] BIT NOT NULL DEFAULT 0,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT [FK_Visitors_Tenants] FOREIGN KEY ([TenantId]) REFERENCES [dbo].[Tenants] ([Id]) ON DELETE CASCADE
    );
END
ELSE
BEGIN
    -- Vá bảng nếu đã tồn tại nhưng thiếu cột
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Visitors]') AND name = 'LeaveTime')
        ALTER TABLE [dbo].[Visitors] ADD [LeaveTime] DATETIME2 NULL;
    
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Visitors]') AND name = 'CreatedAt')
        ALTER TABLE [dbo].[Visitors] ADD [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE();
END

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Vehicles')
BEGIN
    CREATE TABLE [dbo].[Vehicles] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [TenantId] INT NOT NULL,
        [LicensePlate] NVARCHAR(20) NOT NULL,
        [VehicleType] NVARCHAR(50) NOT NULL,
        [ParkingTagNumber] NVARCHAR(50) NULL,
        [SlotNumber] NVARCHAR(20) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT [FK_Vehicles_Tenants] FOREIGN KEY ([TenantId]) REFERENCES [dbo].[Tenants] ([Id]) ON DELETE CASCADE
    );
END
ELSE
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Vehicles]') AND name = 'CreatedAt')
        ALTER TABLE [dbo].[Vehicles] ADD [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE();
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Invoices]') AND name = 'ElectricityUsage')
BEGIN
    ALTER TABLE [dbo].[Invoices] ADD ElectricityUsage INT NOT NULL DEFAULT 0;
    ALTER TABLE [dbo].[Invoices] ADD WaterUsage INT NOT NULL DEFAULT 0;
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Contracts]') AND name = 'IsCancelRequested')
BEGIN
    ALTER TABLE [dbo].[Contracts] ADD IsCancelRequested BIT NOT NULL DEFAULT 0;
    ALTER TABLE [dbo].[Contracts] ADD CancelReason NVARCHAR(MAX) NULL;
    ALTER TABLE [dbo].[Contracts] ADD ViolationReason NVARCHAR(MAX) NULL;
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Tenants]') AND name = 'TelegramChatId')
BEGIN
    ALTER TABLE [dbo].[Tenants] ADD TelegramChatId NVARCHAR(50) NULL;
END");

            // Seed dữ liệu mẫu (chỉ chạy khi DB trống)
            await DbSeeder.SeedAsync(context, dbLogger);
        }
        catch (Exception ex)
        {
            dbLogger.LogCritical(ex, "Lỗi nghiêm trọng khi migrate/seed database. Ứng dụng sẽ dừng.");
            throw; // Dừng startup nếu DB không thể kết nối
        }
    }

    // ─── Middleware Pipeline (thứ tự quan trọng!) ──────────────
    // 1. Log request (phải đứng đầu để bắt tất cả)
    app.UseMiddleware<RequestLoggingMiddleware>();

    // 2. Bắt exception toàn cục
    app.UseMiddleware<ExceptionMiddleware>();

    // 3. Serilog HTTP request logging (built-in của Serilog.AspNetCore)
    app.UseSerilogRequestLogging(opts =>
    {
        opts.MessageTemplate = "HTTP {RequestMethod} {RequestPath} → {StatusCode} ({Elapsed:0.0000} ms)";
        opts.EnrichDiagnosticContext = (diagnosticContext, httpContext) =>
        {
            diagnosticContext.Set("RequestHost", httpContext.Request.Host.Value);
            diagnosticContext.Set("UserAgent", httpContext.Request.Headers.UserAgent);
            diagnosticContext.Set("Username", httpContext.User?.Identity?.Name ?? "anonymous");
        };
    });

    // 4. Swagger (chỉ ở non-Production)
    if (!app.Environment.IsProduction())
    {
        app.UseSwagger();
        app.UseSwaggerUI(c =>
        {
            c.SwaggerEndpoint("/swagger/v1/swagger.json", "QL NhàTrọ / KTX API v1");
            c.DisplayRequestDuration(); // Hiển thị thời gian response trong Swagger UI
        });
    }

    // 5. CORS → Auth → Controllers → Hubs
    app.UseCors("AllowAll");
    app.UseAuthentication();
    app.UseAuthorization();
    
    app.MapControllers();
    app.MapHub<QL_nhaTro_KTX.Backend.Hubs.NotificationHub>("/hubs/notification");
    app.MapHub<QL_nhaTro_KTX.Backend.Hubs.ChatHub>("/hubs/chat");

    Log.Information("Hệ thống đã sẵn sàng! Swagger: http://localhost:5000/swagger");
    await app.RunAsync();
}
catch (Exception ex) when (ex is not HostAbortedException)
{
    // Bắt lỗi nghiêm trọng trong quá trình startup
    Log.Fatal(ex, "Ứng dụng dừng do lỗi nghiêm trọng khi khởi động.");
    throw;
}
finally
{
    // Đảm bảo flush toàn bộ log buffer trước khi thoát
    Log.CloseAndFlush();
}
