import React, { useContext, useState, useEffect, useCallback } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import api from '../services/api';
import { 
  LogOut, 
  Terminal, 
  User, 
  Settings, 
  Lock, 
  Activity, 
  Check, 
  X, 
  Users, 
  Trash2, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2,
  Factory
} from 'lucide-react';

export const DashboardPage = () => {
  const { 
    user, 
    logout, 
    changePassword, 
    refreshSession, 
    logs, 
    clearLogs 
  } = useContext(AuthContext);

  // Password change states
  const [pwdData, setPwdData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState(null);
  const [pwdSuccess, setPwdSuccess] = useState(null);

  // Admin pending users states
  const [pendingUsers, setPendingUsers] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState(null);

  // Fetch pending users for Management
  const fetchPendingUsers = useCallback(async () => {
    if (user?.role !== 'MANAGEMENT') return;
    setAdminLoading(true);
    setAdminError(null);
    try {
      const response = await api.get('/api/auth/admin/pending-users');
      if (response.data && response.data.success) {
        setPendingUsers(response.data.users);
      }
    } catch (err) {
      setAdminError(err.response?.data?.message || 'Failed to fetch pending users.');
    } finally {
      setAdminLoading(false);
    }
  }, [user]);

  // Load pending users on mount
  useEffect(() => {
    fetchPendingUsers();
  }, [fetchPendingUsers]);

  // Approve a user
  const handleApprove = async (userId, name) => {
    setAdminError(null);
    try {
      const response = await api.patch(`/api/auth/admin/users/${userId}/approve`);
      if (response.data && response.data.success) {
        setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
        // Force refresh pending users list just in case
        fetchPendingUsers();
      }
    } catch (err) {
      setAdminError(`Failed to approve ${name}: ${err.response?.data?.message || err.message}`);
    }
  };

  // Reject a user
  const handleReject = async (userId, name) => {
    const reason = window.prompt(`Please enter the rejection reason for ${name}:`, 'Credentials not verified');
    if (reason === null) return; // cancelled

    setAdminError(null);
    try {
      const response = await api.patch(`/api/auth/admin/users/${userId}/reject`, { reason });
      if (response.data && response.data.success) {
        setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
        fetchPendingUsers();
      }
    } catch (err) {
      setAdminError(`Failed to reject ${name}: ${err.response?.data?.message || err.message}`);
    }
  };

  // Handle password form submission
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPwdError(null);
    setPwdSuccess(null);

    if (pwdData.newPassword !== pwdData.confirmPassword) {
      setPwdError('New passwords do not match.');
      return;
    }

    setPwdLoading(true);
    try {
      const res = await changePassword(
        pwdData.currentPassword,
        pwdData.newPassword,
        pwdData.confirmPassword
      );
      setPwdSuccess(res.message || 'Password updated successfully!');
      setPwdData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err) {
      setPwdError(err.response?.data?.message || err.message || 'Failed to change password.');
    } finally {
      setPwdLoading(false);
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPwdData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setPwdError(null);
  };

  // Trigger test API call
  const triggerProtectedCall = async () => {
    try {
      await api.get('/api/auth/profile');
    } catch (err) {
      // Handled by logging interceptor
    }
  };

  // Auto-scroll terminal output to bottom
  useEffect(() => {
    const consoleElem = document.getElementById('console-terminal');
    if (consoleElem) {
      consoleElem.scrollTop = consoleElem.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="dashboard-container">
      {/* Navigation bar */}
      <nav className="dashboard-nav">
        <div className="container nav-content">
          <div className="brand">
            <Factory size={22} className="brand-icon" />
            <span>TextileERP Portal</span>
          </div>
          <div className="user-badge">
            <span className="badge-role management">{user?.role}</span>
            <span style={{ fontSize: '14px', fontWeight: 600 }}>{user?.name}</span>
            <button className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: '13px', width: 'auto' }} onClick={logout}>
              <LogOut size={14} style={{ marginRight: '6px' }} /> Log Out
            </button>
          </div>
        </div>
      </nav>

      {/* Main dashboard body */}
      <main className="dashboard-main">
        <div className="container">
          <div className="dashboard-grid">
            
            {/* Left side content */}
            <div>
              {/* Profile Card */}
              <div className="card">
                <h2 className="card-title">
                  <User size={18} />
                  <span>UserProfile Details</span>
                </h2>
                <div className="info-list">
                  <div className="info-item">
                    <span className="info-label">Full Name</span>
                    <span className="info-value">{user?.name}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Corporate Email</span>
                    <span className="info-value">{user?.email}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Role Assignment</span>
                    <span className="info-value" style={{ textTransform: 'capitalize' }}>{user?.role?.toLowerCase()}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Authorization Status</span>
                    <span className="info-value">
                      <span className="badge-status approved" style={{ fontSize: '12px' }}>
                        {user?.status || 'APPROVED'}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Management Admin panel (Conditional) */}
              {user?.role === 'MANAGEMENT' && (
                <div className="card">
                  <h2 className="card-title">
                    <Users size={18} />
                    <span>Management Console - Pending Access Requests</span>
                  </h2>

                  {adminError && (
                    <div className="alert alert-danger" style={{ marginBottom: '16px' }}>
                      <AlertCircle size={20} className="alert-icon" />
                      <div>{adminError}</div>
                    </div>
                  )}

                  {adminLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '16px 0', color: 'var(--text-secondary)' }}>
                      <span className="spinner" style={{ borderColor: 'var(--text-secondary)', borderTopColor: 'transparent' }}></span>
                      <span>Loading pending requests...</span>
                    </div>
                  ) : pendingUsers.length === 0 ? (
                    <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '15px' }}>
                      ✓ No pending account authorization requests at this time.
                    </div>
                  ) : (
                    <div className="table-wrapper">
                      <table className="user-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role Request</th>
                            <th>Date Requested</th>
                            <th style={{ textAlign: 'center' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pendingUsers.map((pUser) => (
                            <tr key={pUser.id}>
                              <td style={{ fontWeight: 600 }}>{pUser.name}</td>
                              <td>{pUser.email}</td>
                              <td>
                                <span className={`badge-role ${pUser.role.toLowerCase()}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                                  {pUser.role}
                                </span>
                              </td>
                              <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                {new Date(pUser.createdAt).toLocaleDateString()}
                              </td>
                              <td>
                                <div className="action-buttons" style={{ justifyContent: 'center' }}>
                                  <button 
                                    className="btn-icon approve" 
                                    title="Approve User" 
                                    onClick={() => handleApprove(pUser.id, pUser.name)}
                                  >
                                    <Check size={16} />
                                  </button>
                                  <button 
                                    className="btn-icon reject" 
                                    title="Reject User" 
                                    onClick={() => handleReject(pUser.id, pUser.name)}
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Password update settings */}
              <div className="card">
                <h2 className="card-title">
                  <Settings size={18} />
                  <span>Update Account Password</span>
                </h2>

                {pwdError && (
                  <div className="alert alert-danger" style={{ marginBottom: '16px' }}>
                    <AlertCircle size={20} className="alert-icon" />
                    <div>{pwdError}</div>
                  </div>
                )}

                {pwdSuccess && (
                  <div className="alert alert-success" style={{ marginBottom: '16px' }}>
                    <CheckCircle2 size={20} className="alert-icon" />
                    <div>{pwdSuccess}</div>
                  </div>
                )}

                <form onSubmit={handlePasswordSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', alignItems: 'end' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="currentPassword">Current Password</label>
                    <div className="input-wrapper">
                      <input
                        type="password"
                        id="currentPassword"
                        name="currentPassword"
                        className="form-input"
                        placeholder="••••••••"
                        value={pwdData.currentPassword}
                        onChange={handlePasswordChange}
                        required
                        disabled={pwdLoading}
                        style={{ paddingLeft: '16px' }}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="newPassword">New Password</label>
                    <div className="input-wrapper">
                      <input
                        type="password"
                        id="newPassword"
                        name="newPassword"
                        className="form-input"
                        placeholder="••••••••"
                        value={pwdData.newPassword}
                        onChange={handlePasswordChange}
                        required
                        disabled={pwdLoading}
                        style={{ paddingLeft: '16px' }}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="confirmPassword">Confirm New Password</label>
                    <div className="input-wrapper">
                      <input
                        type="password"
                        id="confirmPassword"
                        name="confirmPassword"
                        className="form-input"
                        placeholder="••••••••"
                        value={pwdData.confirmPassword}
                        onChange={handlePasswordChange}
                        required
                        disabled={pwdLoading}
                        style={{ paddingLeft: '16px' }}
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    disabled={pwdLoading}
                    style={{ gridColumn: 'span 3', justifySelf: 'end', width: 'auto', padding: '12px 24px' }}
                  >
                    {pwdLoading ? 'Updating password...' : 'Update Password'}
                  </button>
                </form>
              </div>

            </div>

            {/* Right side content */}
            <div>
              {/* Token Rotation Test Console Panel */}
              <div className="card console-card" style={{ height: 'calc(100% - 24px)', minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
                <h2 className="card-title">
                  <Terminal size={18} />
                  <span>Silent Token Rotation Test Suite</span>
                </h2>
                
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.4' }}>
                  Below is an interactive debugger detailing Axios request interception. Click the actions below to trigger authentication checks.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                  <button 
                    className="btn btn-secondary" 
                    style={{ fontSize: '13px', padding: '10px 14px' }}
                    onClick={triggerProtectedCall}
                  >
                    <Activity size={14} style={{ marginRight: '6px' }} />
                    Call Protected API
                  </button>
                  
                  <button 
                    className="btn btn-secondary" 
                    style={{ fontSize: '13px', padding: '10px 14px' }}
                    onClick={refreshSession}
                  >
                    <RefreshCw size={14} style={{ marginRight: '6px' }} />
                    Force Token Refresh
                  </button>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Console Logs</span>
                    <button 
                      onClick={clearLogs}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
                    >
                      <Trash2 size={12} /> Clear console
                    </button>
                  </div>
                  
                  <div className="console-terminal" id="console-terminal" style={{ flex: 1 }}>
                    {logs.length === 0 ? (
                      <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '12px 0' }}>
                        Waiting for actions...
                      </div>
                    ) : (
                      logs.map((log, index) => (
                        <div key={index} className={`console-line ${log.type}`}>
                          <span className="console-line-time">[{log.timestamp}]</span>
                          <span>{log.message}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};
