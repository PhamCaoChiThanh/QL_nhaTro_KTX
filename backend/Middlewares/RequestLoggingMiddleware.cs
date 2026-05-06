using System.Diagnostics;

namespace QL_nhaTro_KTX.Backend.Middlewares
{
    /// <summary>
    /// Middleware ghi log mọi HTTP request/response với thông tin:
    /// Method, Path, QueryString, StatusCode, Duration, IP.
    /// Ghi WARNING nếu request chậm hơn 1 giây, ERROR nếu status >= 500.
    /// </summary>
    public class RequestLoggingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<RequestLoggingMiddleware> _logger;

        // Ngưỡng cảnh báo: request chậm hơn 1000ms sẽ log WARNING
        private const int SlowRequestThresholdMs = 1000;

        // Bỏ qua log cho các path ít quan trọng
        private static readonly HashSet<string> _ignoredPaths = new(StringComparer.OrdinalIgnoreCase)
        {
            "/swagger",
            "/favicon.ico",
            "/health"
        };

        public RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            var path = context.Request.Path.Value ?? string.Empty;

            // Bỏ qua Swagger UI và health check
            if (_ignoredPaths.Any(p => path.StartsWith(p, StringComparison.OrdinalIgnoreCase)))
            {
                await _next(context);
                return;
            }

            var sw = Stopwatch.StartNew();

            // Lấy thông tin request
            var method = context.Request.Method;
            var queryString = context.Request.QueryString.HasValue ? context.Request.QueryString.Value : string.Empty;
            var clientIp = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var userAgent = context.Request.Headers.UserAgent.FirstOrDefault() ?? "unknown";
            var username = context.User?.Identity?.Name ?? "anonymous";

            _logger.LogInformation(
                "→ [{Method}] {Path}{Query} | IP: {Ip} | User: {Username}",
                method, path, queryString, clientIp, username);

            try
            {
                await _next(context);
            }
            finally
            {
                sw.Stop();
                var elapsed = sw.ElapsedMilliseconds;
                var statusCode = context.Response.StatusCode;

                // Chọn log level theo status code và thời gian
                if (statusCode >= 500)
                {
                    _logger.LogError(
                        "← [{Method}] {Path} | {StatusCode} | {Elapsed}ms | User: {Username}",
                        method, path, statusCode, elapsed, username);
                }
                else if (statusCode >= 400)
                {
                    _logger.LogWarning(
                        "← [{Method}] {Path} | {StatusCode} | {Elapsed}ms | User: {Username}",
                        method, path, statusCode, elapsed, username);
                }
                else if (elapsed > SlowRequestThresholdMs)
                {
                    _logger.LogWarning(
                        "⚠ SLOW REQUEST [{Method}] {Path} | {StatusCode} | {Elapsed}ms (>{Threshold}ms) | User: {Username}",
                        method, path, statusCode, elapsed, SlowRequestThresholdMs, username);
                }
                else
                {
                    _logger.LogInformation(
                        "← [{Method}] {Path} | {StatusCode} | {Elapsed}ms",
                        method, path, statusCode, elapsed);
                }
            }
        }
    }
}
