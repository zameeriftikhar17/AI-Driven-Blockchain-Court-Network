import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaEnvelope, FaArrowLeft } from 'react-icons/fa';
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../firebase";
import Swal from 'sweetalert2';
import GlassCard from '../common/GlassCard';
import './Auth.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      Swal.fire({ icon: 'warning', title: 'Email required', text: 'Please enter your email address.', confirmButtonColor: '#4f46e5' });
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      Swal.fire({
        icon: 'success',
        title: 'Reset email sent!',
        text: `Check your inbox at ${email} (and spam folder).`,
        confirmButtonColor: '#4f46e5',
      }).then(() => navigate('/login'));
    } catch (error) {
      let msg = 'Failed to send reset email.';
      if (error.code === 'auth/user-not-found') msg = 'No account found with that email.';
      Swal.fire({ icon: 'error', title: 'Error', text: msg, confirmButtonColor: '#4f46e5' });
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-background"><div className="auth-particles"></div><div className="auth-gradient"></div></div>
      <div className="auth-container" style={{ maxWidth: '440px' }}>
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <GlassCard glow className="auth-card">
            <div className="auth-header">
              <div className="auth-icon-wrapper"><span className="auth-icon">🔐</span></div>
              <h2 className="auth-title">Reset Password</h2>
              <p className="auth-subtitle">Enter your email and we'll send you a reset link.</p>
            </div>
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label>Email Address</label>
                <div className="input-wrapper">
                  <FaEnvelope className="input-icon" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
                </div>
              </div>
              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? <span className="loading-spinner">⏳</span> : 'Send Reset Link'}
              </button>
            </form>
            <div className="auth-footer">
              <p><Link to="/login" className="auth-link"><FaArrowLeft style={{ marginRight: '6px' }} /> Back to Login</Link></p>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
};

export default ForgotPassword;