import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaLock, FaCheckCircle } from 'react-icons/fa';
import { verifyPasswordResetCode, confirmPasswordReset } from "firebase/auth";
import { auth } from "../../firebase";
import Swal from 'sweetalert2';
import GlassCard from '../common/GlassCard';
import './Auth.css';

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [oobCode, setOobCode] = useState(null);
  const [email, setEmail] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get('oobCode');
    if (code) {
      setOobCode(code);
      verifyPasswordResetCode(auth, code)
        .then((email) => setEmail(email))
        .catch(() => {
          Swal.fire({
            icon: 'error',
            title: 'Invalid or expired link',
            text: 'The reset link is invalid or expired. Request a new one.',
            confirmButtonColor: '#4f46e5',
          }).then(() => navigate('/forgot-password'));
        });
    } else {
      Swal.fire({
        icon: 'warning',
        title: 'Missing reset code',
        text: 'No reset code provided. Request a new link.',
        confirmButtonColor: '#4f46e5',
      }).then(() => navigate('/forgot-password'));
    }
  }, [location, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!newPassword || newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!regex.test(newPassword)) {
      setError('Password must include uppercase, lowercase, number, and special character.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!oobCode) {
      setError('Reset code missing. Request a new link.');
      return;
    }
    setLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setSuccess(true);
      Swal.fire({
        icon: 'success',
        title: 'Password reset successful!',
        text: 'You can now log in with your new password.',
        confirmButtonColor: '#4f46e5',
      }).then(() => navigate('/login'));
    } catch (error) {
      let msg = 'Failed to reset password.';
      if (error.code === 'auth/expired-action-code') msg = 'The reset link has expired.';
      else if (error.code === 'auth/invalid-action-code') msg = 'The reset link is invalid.';
      setError(msg);
      Swal.fire({ icon: 'error', title: 'Reset Failed', text: msg, confirmButtonColor: '#4f46e5' });
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-background"><div className="auth-particles"></div><div className="auth-gradient"></div></div>
      <div className="auth-container" style={{ maxWidth: '440px' }}>
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <GlassCard glow className="auth-card">
            <div className="auth-header">
              <div className="auth-icon-wrapper"><span className="auth-icon">🔑</span></div>
              <h2 className="auth-title">Set New Password</h2>
              <p className="auth-subtitle">{email ? `For ${email}` : 'Enter your new password'}</p>
            </div>
            {error && <div className="auth-error">{error}</div>}
            {success && <div className="auth-success"><FaCheckCircle /> Password updated! Redirecting...</div>}
            {!success && (
              <form onSubmit={handleSubmit} className="auth-form">
                <div className="form-group">
                  <label>New Password</label>
                  <div className="input-wrapper">
                    <FaLock className="input-icon" />
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 8 chars, with uppercase, number, special" required />
                  </div>
                </div>
                <div className="form-group">
                  <label>Confirm Password</label>
                  <div className="input-wrapper">
                    <FaLock className="input-icon" />
                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm your new password" required />
                  </div>
                </div>
                <button type="submit" className="auth-btn" disabled={loading}>
                  {loading ? <span className="loading-spinner">⏳</span> : 'Update Password'}
                </button>
              </form>
            )}
            <div className="auth-footer"><p><Link to="/login" className="auth-link">Back to Login</Link></p></div>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
};

export default ResetPassword;