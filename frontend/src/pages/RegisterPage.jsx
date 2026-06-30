import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ClipboardList, 
  Factory, 
  Package, 
  Megaphone, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle,
  Clock,
  ArrowLeft
} from 'lucide-react';

export const RegisterPage = () => {
  const { register, loading } = useContext(AuthContext);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'PRODUCTION', // Default selection
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Password Validation State
  const [validationChecks, setValidationChecks] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });

  const [passwordStrength, setPasswordStrength] = useState(0);

  // Monitor password changes to update strength meter
  useEffect(() => {
    const pw = formData.password;
    const checks = {
      length: pw.length >= 8,
      uppercase: /[A-Z]/.test(pw),
      lowercase: /[a-z]/.test(pw),
      number: /\d/.test(pw),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(pw),
    };

    setValidationChecks(checks);

    // Calculate score (0 to 5)
    const score = Object.values(checks).filter(Boolean).length;
    setPasswordStrength(score);
  }, [formData.password]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setLocalError(null);
  };

  const handleRoleSelect = (roleName) => {
    setFormData((prev) => ({
      ...prev,
      role: roleName,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);

    // Frontend validations
    if (formData.password !== formData.confirmPassword) {
      setLocalError("Passwords do not match.");
      return;
    }

    if (passwordStrength < 5) {
      setLocalError("Please satisfy all password security requirements.");
      return;
    }

    try {
      const response = await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        role: formData.role,
      });

      if (response && response.success) {
        setIsSuccess(true);
        setSuccessMsg(response.message || 'Registration successful!');
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message;
      setLocalError(errMsg || 'Failed to complete registration.');
    }
  };

  // Get color for password strength progress
  const getStrengthColor = () => {
    switch (passwordStrength) {
      case 0:
      case 1:
      case 2:
        return '#ef4444'; // Red
      case 3:
      case 4:
        return '#f59e0b'; // Amber
      case 5:
        return '#10b981'; // Emerald
      default:
        return 'rgba(255,255,255,0.08)';
    }
  };

  const getStrengthText = () => {
    switch (passwordStrength) {
      case 0:
        return 'None';
      case 1:
      case 2:
        return 'Weak';
      case 3:
      case 4:
        return 'Medium';
      case 5:
        return 'Strong (Perfect)';
      default:
        return '';
    }
  };

  // Render Success Screen
  if (isSuccess) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div className="logo-container" style={{ background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }}>
            <CheckCircle size={28} />
          </div>
          <h1 className="auth-title">Request Submitted</h1>
          
          <div className="alert alert-success" style={{ marginTop: '24px' }}>
            <Clock size={20} className="alert-icon" />
            <div>
              <strong>Pending Approval</strong>
              <p style={{ marginTop: '6px', fontSize: '13px', lineHeight: '1.4' }}>
                {successMsg}
              </p>
            </div>
          </div>

          <div style={{ marginTop: '32px', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            <p>Your registration is now pending review. The management team has been notified and you will receive an automated email confirmation once your profile gets approved.</p>
          </div>

          <div style={{ marginTop: '40px' }}>
            <Link to="/login" className="btn btn-primary" style={{ textDecoration: 'none' }}>
              <span>Return to Sign In</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card" style={{ maxWidth: '540px' }}>
        <div className="auth-header">
          <div className="logo-container">
            <ClipboardList size={28} />
          </div>
          <h1 className="auth-title">Register Account</h1>
          <p className="auth-subtitle">Request authorization for the TextileERP suite</p>
        </div>

        {localError && (
          <div className="alert alert-danger">
            <AlertCircle size={20} className="alert-icon" />
            <div>{localError}</div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="name">Full Name</label>
            <div className="input-wrapper">
              <input
                type="text"
                id="name"
                name="name"
                className="form-input"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                required
                disabled={loading}
              />
              <span className="input-icon">
                <User size={18} />
              </span>
            </div>
          </div>

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

          {/* Department / Role Selector Grid */}
          <div className="form-group">
            <label className="form-label">Select Department / Role</label>
            <div className="role-grid">
              <div 
                className={`role-card ${formData.role === 'PRODUCTION' ? 'selected' : ''}`}
                onClick={() => !loading && handleRoleSelect('PRODUCTION')}
              >
                <div className="role-card-icon">
                  <Factory size={16} />
                </div>
                <span className="role-card-title">Production</span>
                <span className="role-card-desc">Manufacturing line & mills tracking.</span>
              </div>

              <div 
                className={`role-card ${formData.role === 'MERCHANDISE' ? 'selected' : ''}`}
                onClick={() => !loading && handleRoleSelect('MERCHANDISE')}
              >
                <div className="role-card-icon">
                  <Package size={16} />
                </div>
                <span className="role-card-title">Merchandise</span>
                <span className="role-card-desc">Yarn supplies & product catalog.</span>
              </div>

              <div 
                className={`role-card ${formData.role === 'MARKETING' ? 'selected' : ''}`}
                onClick={() => !loading && handleRoleSelect('MARKETING')}
              >
                <div className="role-card-icon">
                  <Megaphone size={16} />
                </div>
                <span className="role-card-title">Marketing</span>
                <span className="role-card-desc">Campaign analytics & sales pipelines.</span>
              </div>

              <div 
                className={`role-card ${formData.role === 'MANAGEMENT' ? 'selected' : ''}`}
                onClick={() => !loading && handleRoleSelect('MANAGEMENT')}
              >
                <div className="role-card-icon">
                  <ShieldCheck size={16} />
                </div>
                <span className="role-card-title">Management</span>
                <span className="role-card-desc">Staff approvals & system configurations.</span>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Security Password</label>
            <div className="input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                className="form-input"
                placeholder="Minimum 8 characters"
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

            {/* Real-time Password Strength Criteria Checklist */}
            <div className="strength-meter">
              <div className="strength-bar">
                <div 
                  className="strength-progress" 
                  style={{ 
                    width: `${(passwordStrength / 5) * 100}%`,
                    backgroundColor: getStrengthColor()
                  }}
                ></div>
              </div>
              <div className="strength-text">
                <span>Security Level: <strong>{getStrengthText()}</strong></span>
                <span>{passwordStrength}/5 requirements</span>
              </div>
            </div>
            
            <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: validationChecks.length ? 'var(--color-success)' : 'var(--text-muted)' }}>
                <CheckDot active={validationChecks.length} /> At least 8 characters
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: validationChecks.uppercase ? 'var(--color-success)' : 'var(--text-muted)' }}>
                <CheckDot active={validationChecks.uppercase} /> Uppercase letter (A-Z)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: validationChecks.lowercase ? 'var(--color-success)' : 'var(--text-muted)' }}>
                <CheckDot active={validationChecks.lowercase} /> Lowercase letter (a-z)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: validationChecks.number ? 'var(--color-success)' : 'var(--text-muted)' }}>
                <CheckDot active={validationChecks.number} /> Number digit (0-9)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: validationChecks.special ? 'var(--color-success)' : 'var(--text-muted)' }}>
                <CheckDot active={validationChecks.special} /> Special character (!@#$)
              </div>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '16px' }}>
            <label className="form-label" htmlFor="confirmPassword">Confirm Password</label>
            <div className="input-wrapper">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                className="form-input"
                placeholder="Re-enter password"
                value={formData.confirmPassword}
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
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex="-1"
                disabled={loading}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {formData.confirmPassword && (
              <span style={{ 
                fontSize: '11px', 
                marginTop: '4px', 
                display: 'block', 
                fontWeight: 600,
                color: formData.password === formData.confirmPassword ? 'var(--color-success)' : 'var(--color-danger)'
              }}>
                {formData.password === formData.confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
              </span>
            )}
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }} disabled={loading}>
            {loading ? (
              <>
                <span className="spinner"></span>
                <span>Submitting request...</span>
              </>
            ) : (
              'Submit Request'
            )}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account?{' '}
          <Link to="/login" className="auth-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <ArrowLeft size={14} /> Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

// Check indicator dot helper component
const CheckDot = ({ active }) => (
  <span style={{
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    display: 'inline-block',
    background: active ? 'var(--color-success)' : 'rgba(255,255,255,0.15)',
    transition: 'background var(--transition-fast)'
  }}></span>
);
