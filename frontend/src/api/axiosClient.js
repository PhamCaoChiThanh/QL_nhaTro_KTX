import axios from 'axios';

// ─── Axios instance chuẩn hóa cho toàn dự án ──────────────────────────────
const axiosClient = axios.create({
    baseURL: 'http://localhost:5000/api',
    headers: { 'Content-Type': 'application/json' },
});

// ─── Helpers: quản lý token trong localStorage ─────────────────────────────
export const tokenStorage = {
    getAccessToken:  ()        => localStorage.getItem('accessToken'),
    getRefreshToken: ()        => localStorage.getItem('refreshToken'),
    setTokens: (access, refresh) => {
        localStorage.setItem('accessToken',  access);
        localStorage.setItem('refreshToken', refresh);
    },
    clearTokens: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user'); // Xóa thông tin user
    },
};

// ─── Flag và queue để tránh gọi /refresh nhiều lần cùng lúc ───────────────
let isRefreshing = false;
let failedQueue  = [];  // { resolve, reject }[]

const processQueue = (error, token = null) => {
    failedQueue.forEach(({ resolve, reject }) =>
        error ? reject(error) : resolve(token)
    );
    failedQueue = [];
};

// ─── REQUEST Interceptor: tự động thêm Authorization header ───────────────
axiosClient.interceptors.request.use(
    (config) => {
        const token = tokenStorage.getAccessToken();
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    },
    (error) => Promise.reject(error)
);

// ─── RESPONSE Interceptor: tự động refresh khi nhận 401 ───────────────────
axiosClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Chỉ xử lý 401 và không phải đang retry (tránh vòng lặp)
        if (error.response?.status !== 401 || originalRequest._retry) {
            return Promise.reject(error);
        }

        // Bỏ qua retry cho endpoint login/refresh (tránh vòng lặp vô hạn)
        if (originalRequest.url?.includes('/auth/login') ||
            originalRequest.url?.includes('/auth/refresh')) {
            tokenStorage.clearTokens();
            window.location.href = '/login';
            return Promise.reject(error);
        }

        // Nếu đang refresh → xếp request vào queue chờ
        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                failedQueue.push({ resolve, reject });
            }).then((token) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return axiosClient(originalRequest);
            });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        const refreshToken = tokenStorage.getRefreshToken();
        if (!refreshToken) {
            // Không có refresh token → redirect login
            tokenStorage.clearTokens();
            window.location.href = '/login';
            return Promise.reject(error);
        }

        try {
            // Gọi API refresh — dùng axios gốc để tránh interceptor loop
            const { data } = await axios.post(
                `${axiosClient.defaults.baseURL}/auth/refresh`,
                { refreshToken }
            );

            // Lưu token mới
            tokenStorage.setTokens(data.accessToken, data.refreshToken);

            // Cập nhật header cho request gốc và retry
            originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
            axiosClient.defaults.headers.common.Authorization = `Bearer ${data.accessToken}`;

            processQueue(null, data.accessToken);
            return axiosClient(originalRequest);

        } catch (refreshError) {
            // Refresh thất bại → logout, chuyển về trang login
            processQueue(refreshError, null);
            tokenStorage.clearTokens();
            window.location.href = '/login';
            return Promise.reject(refreshError);
        } finally {
            isRefreshing = false;
        }
    }
);

export default axiosClient;
