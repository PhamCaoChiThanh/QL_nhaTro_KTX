using System.Net;
using System.Text.Json;

namespace QL_nhaTro_KTX.Backend.Middlewares
{
    /// <summary>
    /// Middleware bắt toàn bộ unhandled exception, log chi tiết và
    /// trả về JSON response chuẩn. Ẩn stack trace ở Production.
    /// </summary>
    public class ExceptionMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<ExceptionMiddleware> _logger;
        private readonly IHostEnvironment _env;

        public ExceptionMiddleware(
            RequestDelegate next,
            ILogger<ExceptionMiddleware> logger,
            IHostEnvironment env)
        {
            _next = next;
            _logger = logger;
            _env = env;
        }

        public async Task InvokeAsync(HttpContext httpContext)
        {
            try
            {
                await _next(httpContext);
            }
            catch (Exception ex)
            {
                await HandleExceptionAsync(httpContext, ex);
            }
        }

        private async Task HandleExceptionAsync(HttpContext context, Exception exception)
        {
            var traceId = context.TraceIdentifier;

            // Log đầy đủ thông tin để debug
            _logger.LogError(
                exception,
                "Unhandled exception. TraceId: {TraceId} | Path: {Path} | Method: {Method}",
                traceId,
                context.Request.Path,
                context.Request.Method);

            context.Response.ContentType = "application/json";
            context.Response.StatusCode = exception switch
            {
                UnauthorizedAccessException => (int)HttpStatusCode.Unauthorized,
                KeyNotFoundException        => (int)HttpStatusCode.NotFound,
                ArgumentException          => (int)HttpStatusCode.BadRequest,
                _                          => (int)HttpStatusCode.InternalServerError
            };

            var response = new
            {
                statusCode = context.Response.StatusCode,
                message = GetUserFriendlyMessage(exception),
                traceId,
                // Chỉ trả về detail ở Development để không lộ thông tin nội bộ
                detail = _env.IsDevelopment() ? exception.ToString() : null
            };

            var options = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
            await context.Response.WriteAsync(JsonSerializer.Serialize(response, options));
        }

        private static string GetUserFriendlyMessage(Exception ex) => ex switch
        {
            UnauthorizedAccessException => "Bạn không có quyền thực hiện thao tác này.",
            KeyNotFoundException        => "Không tìm thấy tài nguyên yêu cầu.",
            ArgumentException           => ex.Message,
            _                           => "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau."
        };
    }
}
