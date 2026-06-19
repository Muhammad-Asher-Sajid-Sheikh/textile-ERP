# TextileERP Auth API - Frontend Integration Guide

## Quick Reference for Frontend Developers

This guide helps you integrate the TextileERP authentication system with your frontend application.

---

## Authentication Flow

### 1. User Registration

```javascript
// POST /api/auth/register
const registerUser = async (formData) => {
    const response = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            confirmPassword: formData.confirmPassword,
            name: formData.name,
            role: formData.role // 'PRODUCTION', 'MERCHANDISE', 'MARKETING'
        }),
        credentials: 'include' // For cookies
    });
    
    return await response.json();
};

// Response on success (201):
{
    "success": true,
    "message": "Registration successful!",
    "user": {
        "id": "uuid",
        "email": "user@example.com",
        "name": "John Doe",
        "role": "PRODUCTION",
        "status": "PENDING"
    }
}
```

### 2. User Login

```javascript
// POST /api/auth/login
const loginUser = async (email, password) => {
    const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include' // Important: This saves refresh token in cookie
    });
    
    const data = await response.json();
    
    if (data.success) {
        // Save access token (not in cookie - keep in memory or secure storage)
        localStorage.setItem('accessToken', data.accesstoken);
        return data.user;
    }
    
    throw new Error(data.message);
};

// Response on success (200):
{
    "success": true,
    "message": "Login successful!",
    "accesstoken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
        "id": "uuid",
        "name": "John Doe",
        "email": "user@example.com",
        "role": "PRODUCTION"
    }
}

// Response if not approved (403):
{
    "success": false,
    "status": "PENDING",
    "message": "Your account is pending. Please contact management."
}
```

### 3. Making Authenticated Requests

```javascript
// All protected endpoints require Authorization header
const authenticatedRequest = async (endpoint, options = {}) => {
    const accessToken = localStorage.getItem('accessToken');
    
    const response = await fetch(`http://localhost:3000${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            ...options.headers
        },
        credentials: 'include' // For cookies (refresh token)
    });
    
    // If token expired, refresh it
    if (response.status === 401) {
        await refreshAccessToken();
        // Retry the request
        return authenticatedRequest(endpoint, options);
    }
    
    return await response.json();
};

// Usage:
const profile = await authenticatedRequest('/api/auth/profile');
console.log(profile.user);
```

### 4. Refresh Token

```javascript
// POST /api/auth/refresh
const refreshAccessToken = async () => {
    const response = await fetch('http://localhost:3000/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include' // Sends refresh token cookie
    });
    
    if (response.ok) {
        const data = await response.json();
        localStorage.setItem('accessToken', data.accesstoken);
        return true;
    }
    
    // Token refresh failed - redirect to login
    localStorage.removeItem('accessToken');
    window.location.href = '/login';
    return false;
};

// Response on success (200):
{
    "success": true,
    "message": "Token refreshed successfully",
    "accesstoken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 5. Logout

```javascript
// POST /api/auth/logout
const logoutUser = async () => {
    const accessToken = localStorage.getItem('accessToken');
    
    await fetch('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`
        },
        credentials: 'include'
    });
    
    // Clear local storage
    localStorage.removeItem('accessToken');
    
    // Redirect to login
    window.location.href = '/login';
};
```

---

## React Implementation Example

### Auth Context

```javascript
// contexts/AuthContext.js
import React, { createContext, useState, useCallback } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const register = useCallback(async (userData) => {
        setLoading(true);
        setError(null);
        
        try {
            const response = await fetch('http://localhost:3000/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData),
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message);
            }
            
            return data;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const login = useCallback(async (email, password) => {
        setLoading(true);
        setError(null);
        
        try {
            const response = await fetch('http://localhost:3000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message);
            }
            
            localStorage.setItem('accessToken', data.accesstoken);
            setUser(data.user);
            return data.user;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const logout = useCallback(async () => {
        try {
            const accessToken = localStorage.getItem('accessToken');
            
            await fetch('http://localhost:3000/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                },
                credentials: 'include'
            });
            
            localStorage.removeItem('accessToken');
            setUser(null);
        } catch (err) {
            console.error('Logout error:', err);
        }
    }, []);

    const getProfile = useCallback(async () => {
        try {
            const accessToken = localStorage.getItem('accessToken');
            
            const response = await fetch('http://localhost:3000/api/auth/profile', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                },
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (data.success) {
                setUser(data.user);
            }
            
            return data;
        } catch (err) {
            console.error('Get profile error:', err);
        }
    }, []);

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            error,
            register,
            login,
            logout,
            getProfile
        }}>
            {children}
        </AuthContext.Provider>
    );
};
```

### Protected Route Component

```javascript
// components/ProtectedRoute.js
import React, { useContext, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

export const ProtectedRoute = ({ children, requiredRole = null }) => {
    const { user } = useContext(AuthContext);
    const [isAuthorized, setIsAuthorized] = useState(null);

    useEffect(() => {
        if (!user) {
            setIsAuthorized(false);
            return;
        }

        if (user.status !== 'APPROVED') {
            setIsAuthorized(false);
            return;
        }

        if (requiredRole && user.role !== requiredRole) {
            setIsAuthorized(false);
            return;
        }

        setIsAuthorized(true);
    }, [user, requiredRole]);

    if (isAuthorized === null) {
        return <div>Loading...</div>;
    }

    if (!isAuthorized) {
        return <Navigate to="/login" replace />;
    }

    return children;
};
```

### Login Form Component

```javascript
// components/LoginForm.js
import React, { useState, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const LoginForm = () => {
    const { login, loading, error } = useContext(AuthContext);
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [localError, setLocalError] = useState(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError(null);

        try {
            await login(formData.email, formData.password);
            navigate('/dashboard');
        } catch (err) {
            setLocalError(err.message);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            {(error || localError) && (
                <div className="error-message">
                    {error || localError}
                </div>
            )}

            <div className="form-group">
                <label>Email:</label>
                <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                />
            </div>

            <div className="form-group">
                <label>Password:</label>
                <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                />
            </div>

            <button type="submit" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
            </button>
        </form>
    );
};
```

---

## API Endpoints Reference

### Public Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login with credentials |
| POST | `/api/auth/refresh` | Refresh access token |

### Protected Endpoints

| Method | Endpoint | Required Role | Purpose |
|--------|----------|---------------|---------|
| POST | `/api/auth/logout` | All | Logout |
| GET | `/api/auth/profile` | All | Get current user profile |
| POST | `/api/auth/change-password` | All | Change password |
| GET | `/api/auth/admin/pending-users` | MANAGEMENT | List pending users |
| PATCH | `/api/auth/admin/users/:id/approve` | MANAGEMENT | Approve user |
| PATCH | `/api/auth/admin/users/:id/reject` | MANAGEMENT | Reject user |
| PATCH | `/api/auth/admin/users/:id/role` | MANAGEMENT | Change user role |
| PATCH | `/api/auth/admin/users/:id/suspend` | MANAGEMENT | Suspend user |

---

## Error Handling

```javascript
// Common error responses

// 400 - Bad Request
{ "success": false, "message": "All fields are required." }

// 401 - Unauthorized (Invalid/Missing token)
{ "success": false, "message": "Access token required" }

// 403 - Forbidden (Not approved/insufficient permissions)
{
    "success": false,
    "message": "Your account is pending. Please contact management.",
    "status": "PENDING"
}

// 404 - Not Found
{ "success": false, "message": "User not found." }

// 409 - Conflict (Email already exists)
{ "success": false, "message": "Email is already registered." }

// 500 - Server Error
{ "success": false, "message": "Internal server error." }
```

---

## Security Best Practices

1. ✅ **Use HTTPS in production**
2. ✅ **Store access token securely** - use localStorage (or better, in-memory for SPAs)
3. ✅ **Never expose refresh token** - keep it in httpOnly cookie
4. ✅ **Validate input** on both frontend and backend
5. ✅ **Handle token expiration gracefully** - auto-refresh or redirect to login
6. ✅ **Clear auth data on logout**
7. ✅ **Use secure password requirements**
8. ✅ **Implement CSRF protection** if needed

---

## Testing the API

### Using cURL

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "confirmPassword": "SecurePass123!",
    "name": "John Doe",
    "role": "PRODUCTION"
  }'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "SecurePass123!"}'

# Get Profile (replace TOKEN with actual access token)
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer TOKEN"
```

### Using Postman

1. Create new Collection "TextileERP"
2. Add requests for each endpoint
3. Set up environment variables:
   - `base_url`: http://localhost:3000
   - `access_token`: (set after login)
4. Use pre-request scripts to automatically refresh token

---

## CORS Configuration

The backend is configured with CORS for cross-origin requests:

```javascript
// Allowed origin
origin: process.env.FRONTEND_URL || 'http://localhost:3000'

// Credentials allowed
credentials: true

// Methods
methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

// Headers
allowedHeaders: ['Content-Type', 'Authorization']
```

---

## Environment Variables (Frontend)

```javascript
// .env.example
REACT_APP_API_URL=http://localhost:3000
REACT_APP_LOGIN_REDIRECT=/dashboard
REACT_APP_UNAUTHORIZED_REDIRECT=/login
```

---

**Last Updated:** June 18, 2026
**Version:** 1.0.0
