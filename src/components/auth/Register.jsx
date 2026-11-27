import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaArrowRight } from 'react-icons/fa';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { ref, set } from 'firebase/database';
import { auth, db } from '../../firebase';
import Swal from 'sweetalert2';
import GlassCard from '../common/GlassCard';
import './Auth.css';

const Register = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    cnic: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Email validation
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(formData.email)) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Email',
        text: 'Please enter a valid email address.',
        confirmButtonColor: '#4f46e5'
      });
      return;
    }

    // Password validation
    const passwordPattern =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!passwordPattern.test(formData.password)) {
      Swal.fire({
        icon: 'error',
        title: 'Weak Password',
        text: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.',
        confirmButtonColor: '#4f46e5'
      });
      return;
    }

    // Confirm password
    if (formData.password !== formData.confirmPassword) {
      Swal.fire({
        icon: 'error',
        title: 'Password Mismatch',
        text: 'Passwords do not match.',
        confirmButtonColor: '#4f46e5'
      });
      return;
    }

    // CNIC validation
    const cnicPattern = /^[0-9]{5}-[0-9]{7}-[0-9]{1}$/;

    if (!cnicPattern.test(formData.cnic)) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid CNIC',
        text: 'CNIC must be in format XXXXX-XXXXXXX-X.',
        confirmButtonColor: '#4f46e5'
      });
      return;
    }

    // Phone validation
    const phonePattern = /^03[0-9]{2}-[0-9]{7}$/;

    if (!phonePattern.test(formData.phone)) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Phone Number',
        text: 'Phone must be in format 03XX-XXXXXXX.',
        confirmButtonColor: '#4f46e5'
      });
      return;
    }

    setLoading(true);

    try {
      // Create Firebase Authentication account
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      const uid = userCredential.user.uid;

      // Save user data in Firebase Realtime Database
      await set(ref(db, `users/${uid}`), {
        uid: uid,
        fullName: formData.fullName,
        cnic: formData.cnic,
        email: formData.email,
        phone: formData.phone,
        role: 'citizen',
        createdAt: new Date().toISOString()
      });

      Swal.fire({
        icon: 'success',
        title: 'Registration Successful!',
        text: 'You can now log in with your credentials.',
        confirmButtonColor: '#4f46e5'
      }).then(() => {
        navigate('/login');
      });

    } catch (error) {
      console.error('Registration error:', error);

      let message = 'An error occurred during registration.';

      switch (error.code) {
        case 'auth/email-already-in-use':
          message = 'This email is already registered.';
          break;

        case 'auth/invalid-email':
          message = 'Invalid email address.';
          break;

        case 'auth/weak-password':
          message = 'Password is too weak.';
          break;

        case 'auth/network-request-failed':
          message = 'Network error. Please check your internet connection.';
          break;

        default:
          message = error.message;
      }

      Swal.fire({
        icon: 'error',
        title: 'Registration Failed',
        text: message,
        confirmButtonColor: '#4f46e5'
      });

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">

      <div className="auth-container" style={{ maxWidth: '550px' }}>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="auth-wrapper"
        >

          <GlassCard glow className="auth-card">

            {/* HEADER */}
            <div className="auth-header">

              <div className="auth-icon-wrapper">
                <span className="auth-icon">⚖️</span>
              </div>

              <div>
                <h2 className="auth-title">
                  Create Account
                </h2>

                <p className="auth-subtitle">
                  Join CourtNetwork today
                </p>
              </div>

            </div>

            {/* FORM */}
            <form onSubmit={handleSubmit} className="auth-form">

              {/* FULL NAME */}
              <div className="form-group">

                <label>
                  Full Name
                </label>

                <div className="input-wrapper">

                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    required
                  />

                </div>

              </div>

              {/* CNIC */}
              <div className="form-group">

                <label>
                  CNIC Number
                </label>

                <div className="input-wrapper">

                  <input
                    type="text"
                    name="cnic"
                    value={formData.cnic}
                    onChange={handleChange}
                    placeholder="XXXXX-XXXXXXX-X"
                    required
                  />

                </div>

              </div>

              {/* EMAIL */}
              <div className="form-group">

                <label>
                  Email Address
                </label>

                <div className="input-wrapper">

                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    required
                  />

                </div>

              </div>

              {/* PHONE */}
              <div className="form-group">

                <label>
                  Phone Number
                </label>

                <div className="input-wrapper">

                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="03XX-XXXXXXX"
                    required
                  />

                </div>

              </div>

              {/* PASSWORD */}
              <div className="form-group">

                <label>
                  Password
                </label>

                <div className="input-wrapper">

                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Min 8 chars, uppercase, number & special"
                    required
                  />

                </div>

              </div>

              {/* CONFIRM PASSWORD */}
              <div className="form-group">

                <label>
                  Confirm Password
                </label>

                <div className="input-wrapper">

                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm your password"
                    required
                  />

                </div>

              </div>

              {/* REGISTER BUTTON */}
              <button
                type="submit"
                className="auth-btn"
                disabled={loading}
              >

                {loading ? (
                  <span className="loading-spinner">
                    ⏳ Creating Account...
                  </span>
                ) : (
                  <>
                    Register
                    <FaArrowRight />
                  </>
                )}

              </button>

            </form>

            {/* FOOTER */}
            <div className="auth-footer">

              <p>
                Already have an account?{' '}

                <Link
                  to="/login"
                  className="auth-link"
                >
                  Login here
                </Link>

              </p>

            </div>

          </GlassCard>

        </motion.div>

      </div>

    </div>
  );
};

export default Register;