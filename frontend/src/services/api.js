import axios from 'axios';

// Global callbacks for auth state events
let logCallback = null;
let logoutCallback = null;
let tokenChangeCallback = null;
let inMemoryToken = null;

// Helper to log actions to our visual console
const logToConsole = (message, type = 'info') => {
  const timestamp = new Date().toLocaleTimeString();
  if (logCallback) {
    logCallback({ timestamp, message, type });
  }
  console.log(`[API LOG ${type.toUpperCase()}] ${message}`);
};

// Configure the default Axios instance
const api = axios.create({
  baseURL: 'http://localhost:3000',
  withCredentials: true, // Crucial: forces browser to include cookies (refresh token)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Getter and Setter for the in-memory access token
export const getAccessToken = () => inMemoryToken;

export const setAccessToken = (token) => {
  inMemoryToken = token;
  if (tokenChangeCallback) {
    tokenChangeCallback(token);
  }
};

// Register events
export const registerApiCallbacks = ({ onLog, onLogout, onTokenChange }) => {
  if (onLog) logCallback = onLog;
  if (onLogout) logoutCallback = onLogout;
  if (onTokenChange) tokenChangeCallback = onTokenChange;
};

// Request Interceptor: Attach bearer token to outgoing requests if available
api.interceptors.request.use(
  (config) => {
    // Exclude refresh endpoint from carrying the old access token if desired, 
    // although it doesn't hurt.
    if (inMemoryToken) {
      config.headers.Authorization = `Bearer ${inMemoryToken}`;
    }
    
    // Log outbound request
    logToConsole(`🌐 OUTGOING: ${config.method.toUpperCase()} ${config.url}`, 'info');
    return config;
  },
  (error) => {
    logToConsole(`❌ REQUEST ERROR: ${error.message}`, 'error');
    return Promise.reject(error);
  }
);

// Flag to prevent infinite retry loops
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response Interceptor: Catch 401s and rotate tokens
api.interceptors.response.use(
  (response) => {
    logToConsole(`✅ SUCCESS [${response.status}]: ${response.config.method.toUpperCase()} ${response.config.url}`, 'success');
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Check if the error is 401 Unauthorized and we haven't retried yet
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      logToConsole(`⚠ UNAUTHORIZED [401]: ${originalRequest.method.toUpperCase()} ${originalRequest.url}`, 'warning');
      
      // If the error was from the refresh endpoint itself, logout immediately
      if (originalRequest.url === '/api/auth/refresh') {
        logToConsole('❌ Refresh token expired or invalid. Requiring full re-login.', 'error');
        setAccessToken(null);
        if (logoutCallback) logoutCallback();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        logToConsole('⏳ Token refresh already in progress, queuing request...', 'info');
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;
      logToConsole('🔄 Starting silent token rotation (POST /api/auth/refresh)...', 'warning');

      try {
        const response = await axios.post(
          'http://localhost:3000/api/auth/refresh',
          {},
          {
            withCredentials: true,
            headers: {
              'Content-Type': 'application/json',
              // The backend checktoken middleware requires Authorization header on refresh as well
              ...(inMemoryToken && { Authorization: `Bearer ${inMemoryToken}` })
            }
          }
        );

        if (response.data && response.data.accesstoken) {
          const newToken = response.data.accesstoken;
          logToConsole('✅ Token refreshed successfully!', 'success');
          setAccessToken(newToken);
          processQueue(null, newToken);
          isRefreshing = false;
          
          // Retry original request with the new token
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        } else {
          throw new Error('No access token in refresh response');
        }
      } catch (refreshError) {
        logToConsole(`❌ Silent refresh failed: ${refreshError.response?.data?.message || refreshError.message}`, 'error');
        processQueue(refreshError, null);
        isRefreshing = false;
        setAccessToken(null);
        if (logoutCallback) logoutCallback();
        return Promise.reject(refreshError);
      }
    }

    // Pass standard API errors through
    const errMsg = error.response?.data?.message || error.message;
    logToConsole(`❌ FAILED [${error.response?.status || 'network'}]: ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url} - ${errMsg}`, 'error');
    return Promise.reject(error);
  }
);

export default api;
