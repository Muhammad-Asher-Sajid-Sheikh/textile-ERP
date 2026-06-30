import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import api, { setAccessToken, getAccessToken, registerApiCallbacks } from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);
  
  const refreshIntervalRef = useRef(null);

  // Helper to append logs to visual terminal console
  const addLog = useCallback((log) => {
    setLogs((prev) => [...prev.slice(-49), log]); // Keep last 50 logs
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  // Stop proactive silent refresh timer
  const stopRefreshTimer = useCallback(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
      addLog({
        timestamp: new Date().toLocaleTimeString(),
        message: '⏰ Proactive refresh timer stopped.',
        type: 'info',
      });
    }
  }, [addLog]);

  // Handle logout state cleanup
  const handleLocalLogout = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem('accessToken');
    stopRefreshTimer();
  }, [stopRefreshTimer]);

  // Start proactive silent refresh timer (runs every 14 minutes)
  const startRefreshTimer = useCallback(() => {
    stopRefreshTimer();
    
    // 14 minutes = 14 * 60 * 1000 milliseconds
    const FOURTEEN_MINUTES = 14 * 60 * 1000;
    
    addLog({
      timestamp: new Date().toLocaleTimeString(),
      message: '⏰ Proactive refresh timer scheduled (runs every 14 mins).',
      type: 'info',
    });

    refreshIntervalRef.current = setInterval(async () => {
      addLog({
        timestamp: new Date().toLocaleTimeString(),
        message: '⏰ Timer triggered: Proactive silent token refresh...',
        type: 'warning',
      });
      
      try {
        const storedToken = localStorage.getItem('accessToken');
        const response = await api.post('/api/auth/refresh', {}, {
          headers: {
            Authorization: `Bearer ${storedToken}`
          }
        });
        
        if (response.data && response.data.accesstoken) {
          const newToken = response.data.accesstoken;
          setAccessToken(newToken);
          localStorage.setItem('accessToken', newToken);
        }
      } catch (err) {
        addLog({
          timestamp: new Date().toLocaleTimeString(),
          message: '❌ Proactive token refresh failed. User logged out.',
          type: 'error',
        });
        handleLocalLogout();
      }
    }, FOURTEEN_MINUTES);
  }, [addLog, stopRefreshTimer, handleLocalLogout]);

  // Get current user profile details
  const getProfile = useCallback(async (token) => {
    try {
      const response = await api.get('/api/auth/profile', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (response.data && response.data.success) {
        setUser(response.data.user);
        return response.data.user;
      }
    } catch (err) {
      addLog({
        timestamp: new Date().toLocaleTimeString(),
        message: `❌ Failed to fetch user profile: ${err.response?.data?.message || err.message}`,
        type: 'error',
      });
      throw err;
    }
  }, [addLog]);

  // Register API callbacks on mount
  useEffect(() => {
    registerApiCallbacks({
      onLog: addLog,
      onLogout: handleLocalLogout,
      onTokenChange: (newToken) => {
        if (newToken) {
          localStorage.setItem('accessToken', newToken);
        } else {
          localStorage.removeItem('accessToken');
        }
      }
    });
  }, [addLog, handleLocalLogout]);

  // Silent session restore on app load
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('accessToken');
      
      // If we don't have an access token in localStorage, we can't refresh safely 
      // due to the backend's strict verification of the current access token.
      if (!storedToken) {
        addLog({
          timestamp: new Date().toLocaleTimeString(),
          message: 'ℹ No session token found in storage. Ready.',
          type: 'info',
        });
        setLoading(false);
        return;
      }

      setAccessToken(storedToken);
      addLog({
        timestamp: new Date().toLocaleTimeString(),
        message: '🔄 Restoring session from stored token...',
        type: 'info',
      });

      try {
        // Attempt to fetch profile. If token is expired, the response interceptor 
        // will automatically refresh it!
        const userProfile = await getProfile(storedToken);
        if (userProfile) {
          startRefreshTimer();
        }
      } catch (err) {
        // Interceptor handles logout if refresh fails, but safety cleanup here
        addLog({
          timestamp: new Date().toLocaleTimeString(),
          message: '❌ Session restore failed.',
          type: 'error',
        });
        handleLocalLogout();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      stopRefreshTimer();
    };
  }, [getProfile, startRefreshTimer, handleLocalLogout, stopRefreshTimer, addLog]);

  // Login handler
  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    addLog({
      timestamp: new Date().toLocaleTimeString(),
      message: `🔐 Authenticating ${email}...`,
      type: 'info',
    });

    try {
      const response = await api.post('/api/auth/login', { email, password });
      
      if (response.data && response.data.success) {
        const token = response.data.accesstoken;
        const loggedUser = response.data.user;
        
        setAccessToken(token);
        localStorage.setItem('accessToken', token);
        setUser(loggedUser);
        
        addLog({
          timestamp: new Date().toLocaleTimeString(),
          message: `🎉 Login successful! Welcome ${loggedUser.name}.`,
          type: 'success',
        });
        
        startRefreshTimer();
        return loggedUser;
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message;
      setError(errMsg);
      addLog({
        timestamp: new Date().toLocaleTimeString(),
        message: `❌ Login failed: ${errMsg}`,
        type: 'error',
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [addLog, startRefreshTimer]);

  // Registration handler
  const register = useCallback(async (userData) => {
    setLoading(true);
    setError(null);
    addLog({
      timestamp: new Date().toLocaleTimeString(),
      message: `📝 Registering new user: ${userData.email}...`,
      type: 'info',
    });

    try {
      const response = await api.post('/api/auth/register', userData);
      addLog({
        timestamp: new Date().toLocaleTimeString(),
        message: `✅ Registration successful for ${userData.name}!`,
        type: 'success',
      });
      return response.data;
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message;
      setError(errMsg);
      addLog({
        timestamp: new Date().toLocaleTimeString(),
        message: `❌ Registration failed: ${errMsg}`,
        type: 'error',
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [addLog]);

  // Logout handler
  const logout = useCallback(async () => {
    addLog({
      timestamp: new Date().toLocaleTimeString(),
      message: '🚪 Logging out from server...',
      type: 'info',
    });
    
    try {
      await api.post('/api/auth/logout');
      addLog({
        timestamp: new Date().toLocaleTimeString(),
        message: '👋 Logged out successfully.',
        type: 'success',
      });
    } catch (err) {
      addLog({
        timestamp: new Date().toLocaleTimeString(),
        message: '⚠ Server logout request failed, clearing local session.',
        type: 'warning',
      });
    } finally {
      handleLocalLogout();
    }
  }, [addLog, handleLocalLogout]);

  // Change password handler
  const changePassword = useCallback(async (currentPassword, newPassword, confirmPassword) => {
    addLog({
      timestamp: new Date().toLocaleTimeString(),
      message: '🔑 Requesting password change...',
      type: 'info',
    });

    try {
      const response = await api.post('/api/auth/change-password', {
        currentPassword,
        newPassword,
        confirmPassword,
      });
      addLog({
        timestamp: new Date().toLocaleTimeString(),
        message: '✅ Password changed successfully!',
        type: 'success',
      });
      return response.data;
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message;
      addLog({
        timestamp: new Date().toLocaleTimeString(),
        message: `❌ Password change failed: ${errMsg}`,
        type: 'error',
      });
      throw err;
    }
  }, [addLog]);

  // Trigger manual refresh for demonstration/testing
  const refreshSession = useCallback(async () => {
    addLog({
      timestamp: new Date().toLocaleTimeString(),
      message: '🔄 Triggering manual token refresh...',
      type: 'info',
    });
    
    try {
      const storedToken = localStorage.getItem('accessToken');
      // If we don't have a token, we pass an empty string to trigger 401 gracefully 
      // instead of a 500 on backend
      const response = await api.post('/api/auth/refresh', {}, {
        headers: {
          Authorization: `Bearer ${storedToken || ''}`
        }
      });
      
      if (response.data && response.data.accesstoken) {
        const newToken = response.data.accesstoken;
        setAccessToken(newToken);
        localStorage.setItem('accessToken', newToken);
        addLog({
          timestamp: new Date().toLocaleTimeString(),
          message: '✅ Session refreshed successfully!',
          type: 'success',
        });
        return newToken;
      }
    } catch (err) {
      addLog({
        timestamp: new Date().toLocaleTimeString(),
        message: `❌ Manual refresh failed: ${err.response?.data?.message || err.message}`,
        type: 'error',
      });
      throw err;
    }
  }, [addLog]);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      error,
      logs,
      login,
      register,
      logout,
      changePassword,
      refreshSession,
      clearLogs,
      setUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
