// src/components/auth/Login.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaEnvelope, FaLock, FaArrowRight } from 'react-icons/fa';
import { signInWithEmailAndPassword } from "firebase/auth";
import { ref, get } from "firebase/database";
import { auth, db } from "../../firebase";
import Swal from 'sweetalert2';
import GlassCard from '../common/GlassCard';
import './Auth.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleUserRedirect = async (userCredential) => {
    const uid = userCredential.user.uid;
    const userRef = ref(db, `users/${uid}`);
    const snapshot = await get(userRef);
    if (!snapshot.exists()) {
      await auth.signOut();
      throw new Error('You are not authorized. Please register first.');
    }
    const userData = snapshot.val();
    const role = userData.role || 'citizen';
    localStorage.setItem('token', userCredential.user.accessToken || '');
    localStorage.setItem('uid', uid);
    localStorage.setItem('role', role);
    const roleMap = {
      citizen: '/citizen-dashboard',
      lawyer: '/lawyer-dashboard',
      judge: '/judge-dashboard',
      clerk: '/clerk-dashboard',
      admin: '/admin-dashboard'
    };
    const redirectPath = roleMap[role] || '/';
    navigate(redirectPath);
    Swal.fire({
      icon: 'success',
      title: 'Welcome back!',
      timer: 1500,
      showConfirmButton: false,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await handleUserRedirect(userCredential);
    } catch (error) {
      let message = 'Login failed. Please try again.';
      switch (error.code) {
        case 'auth/user-not-found': message = 'No account found with this email.'; break;
        case 'auth/wrong-password': message = 'Incorrect password.'; break;
        case 'auth/invalid-email': message = 'Invalid email format.'; break;
        case 'auth/too-many-requests': message = 'Too many failed attempts. Please try later.'; break;
        default: message = error.message;
      }
      Swal.fire({ icon: 'error', title: 'Login Failed', text: message, confirmButtonColor: '#4f46e5' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-background"><div className="auth-particles"></div><div className="auth-gradient"></div></div>
      <div className="auth-container">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="auth-wrapper">
          <GlassCard glow className="auth-card">
            <div className="auth-header">
              <div className="auth-icon-wrapper"><span className="auth-icon">⚖️</span></div>
              <h2 className="auth-title">Welcome Back</h2>
              <p className="auth-subtitle">Login to your CourtNetwork account</p>
            </div>
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label>Email Address</label>
                <div className="input-wrapper">
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" required />
                </div>
              </div>
              <div className="form-group">
                <label>Password</label>
                <div className="input-wrapper">
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required />
                </div>
              </div>
              <div className="form-options">
                <label className="checkbox-label"><input type="checkbox" /> Remember me</label>
                {/* ✅ THIS IS THE LINK – MAKE SURE IT EXISTS */}
                <Link to="/forgot-password" className="forgot-link">Forgot Password?</Link>
              </div>
              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? <span className="loading-spinner">⏳</span> : <>Login <FaArrowRight /></>}
              </button>
            </form>
            <div className="auth-footer">
              <p>Don't have an account? <Link to="/register" className="auth-link">Register here</Link></p>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;