import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle, Clock, ShieldAlert } from 'lucide-react';

export const LoginPage = () => {
  const { login, error, loading } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [pendingStatus, setPendingStatus] = useState(false);
  const [suspendedStatus, setSuspendedStatus] = useState(false);

  // Clear states when component mounts
  useEffect(() => {
    setLocalError(null);
    setPendingStatus(false);
    setSuspendedStatus(false);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setLocalError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    setPendingStatus(false);
    setSuspendedStatus(false);

    try {
      const user = await login(formData.email, formData.password);
      if (user) {
        navigate('/dashboard');
      }
    } catch (err) {
      const status = err.response?.data?.status;
      const message = err.response?.data?.message || err.message;
      
      if (status === 'PENDING') {
        setPendingStatus(true);
      } else if (status === 'SUSPENDED') {
        setSuspendedStatus(true);
      } else {
        setLocalError(message || 'Failed to sign in. Please verify your credentials.');
      }
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <div className="logo-container">
            <LogIn size={28} />
          </div>
          <h1 className="auth-title">TextileERP</h1>
          <p className="auth-subtitle">Sign in to access your manufacturing portal</p>
        </div>

        {/* Pending Account State */}
        {pendingStatus && (
          <div className="alert alert-info">
            <Clock size={20} className="alert-icon" />
            <div>
              <strong>Account Pending Approval</strong>
              <p style={{ marginTop: '4px', fontSize: '13px' }}>
                Your account is currently in pending status. A system administrator needs to approve your registration before you can log in.
              </p>
            </div>
          </div>
        )}

        {/* Suspended Account State */}
        {suspendedStatus && (
          <div className="alert alert-danger">
            <ShieldAlert size={20} className="alert-icon" />
            <div>
              <strong>Account Suspended</strong>
              <p style={{ marginTop: '4px', fontSize: '13px' }}>
                This account has been suspended by management. Please reach out to your administrator to resolve this block.
              </p>
            </div>
          </div>
        )}

        {/* Generic Error state */}
        {localError && !pendingStatus && !suspendedStatus && (
          <div className="alert alert-danger">
            <AlertCircle size={20} className="alert-icon" />
            <div>{localError}</div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Corporate Email</label>
            <div className="input-wrapper">
              <input
                type="email"
                id="email"
                name="email"
                className="form-input"
                placeholder="name@textileerp.com"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading}
              />
              <span className="input-icon">
                <Mail size={18} />
              </span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <div className="input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                className="form-input"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={loading}
              />
              <span className="input-icon">
                <Lock size={18} />
              </span>
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
                disabled={loading}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner"></span>
                <span>Signing you in...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRightIcon />
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account?{' '}
          <Link to="/register" className="auth-link">
            Request Access
          </Link>
        </div>
      </div>
    </div>
  );
};

// Inline helper icon for clean design
const ArrowRightIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="5" y1="12" x2="19" y2="12"></line>
    <polyline points="12 5 19 12 12 19"></polyline>
  </svg>
);
