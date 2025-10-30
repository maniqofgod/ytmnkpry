import axios from 'axios';

const API_URL = 'https://yt.1337.edu.pl/api';

const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const api = axios.create({
    baseURL: API_URL,
});

api.interceptors.request.use(config => {
    if (!(config.data instanceof FormData)) {
        config.headers['Content-Type'] = 'application/json';
    }
    config.headers = { ...config.headers, ...getAuthHeaders() };
    return config;
});

// --- Fungsi Admin ---
export const getUsers = () => api.get('/admin/users');
export const addUser = (userData) => api.post('/admin/users', userData);
export const updateUser = (userId, userData) => api.put(`/admin/users/${userId}`, userData);
export const deleteUser = (userId) => api.delete(`/admin/users/${userId}`);
export const getClientSecrets = () => api.get('/admin/client-secrets');
export const addClientSecret = (secretData) => api.post('/admin/client-secrets', secretData);
export const deleteClientSecret = (secretId) => api.delete(`/admin/client-secrets/${secretId}`);

// --- Fungsi Secret Pengguna ---
export const getMyManualSecrets = () => api.get('/secrets');
export const addMyManualSecret = (secretData) => api.post('/secrets', secretData);
export const updateMyManualSecret = (secretId, secretData) => api.put(`/secrets/${secretId}`, secretData);
export const deleteMyManualSecret = (secretId) => api.delete(`/secrets/${secretId}`);

// --- Fungsi Auth ---
export const login = (credentials) => api.post('/auth/login', credentials);
export const register = (userData) => api.post('/auth/register', userData);
export const generateGoogleAuthUrl = (authData) => api.post('/auth/google/generate-url', authData);

// --- Fungsi Akun & Playlist ---
export const getAccounts = () => api.get('/account/all');
export const getPlaylists = (accountId) => api.get(`/account/${accountId}/playlists`);
export const deleteToken = (accountId) => api.delete(`/account/${accountId}/token`);
export const deleteAllTokens = () => api.delete('/account/all-tokens');

// --- Fungsi Video ---
// Modifikasi untuk menerima AbortSignal
export const uploadVideo = (formData, onUploadProgress, signal) => {
    return api.post('/videos/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
        onUploadProgress,
        signal, // Teruskan signal ke axios
    });
};

export const updateVideoDetails = (videoId, details) => {
    return api.post('/videos/details', { videoId, details });
};

// --- Fungsi Riwayat ---
export const getUploadHistory = (params) => api.get('/videos/history', { params });

// --- Fungsi Gemini AI ---
export const generateContent = (fileName, options = {}) => api.post('/videos/generate-content', { fileName, options });

// --- Fungsi Admin Gemini ---
export const getGeminiApis = () => api.get('/admin/gemini-apis');
export const addGeminiApi = (apiData) => api.post('/admin/gemini-apis', apiData);
export const verifyGeminiApi = (apiId) => api.post(`/admin/gemini-apis/${apiId}/verify`);
export const deleteGeminiApi = (apiId) => api.delete(`/admin/gemini-apis/${apiId}`);
export const getGeminiStats = () => api.get('/admin/gemini-stats');
export const getGeminiUsage = () => api.get('/admin/gemini-usage');
export const getGeminiInfo = () => api.get('/admin/gemini-info');

export default api;
