import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  FaArrowLeft,
  FaUserEdit
} from 'react-icons/fa';
import { ref, onValue, off, update } from "firebase/database";
import { auth, db } from "../../../firebase";

const EditUser = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const user = auth.currentUser;

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: 'citizen',
    status: 'Active',
    registrationDate: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  useEffect(() => {
    if (!id) {
      navigate('/admin-dashboard/users');
      return;
    }

    const userRef = ref(db, `users/${id}`);
    const unsubscribe = onValue(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setFormData({
          fullName: data.fullName || data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          role: data.role || 'citizen',
          status: data.status || 'Active',
          registrationDate: data.registrationDate || data.createdAt ? new Date(data.createdAt).toISOString().split('T')[0] : ''
        });
        setError('');
      } else {
        setError('User not found.');
        setTimeout(() => navigate('/admin-dashboard/users'), 2000);
      }
      setLoading(false);
    }, (err) => {
      console.error(err);
      setError('Failed to load user data.');
      setLoading(false);
    });

    return () => off(userRef);
  }, [id, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const { fullName, email, phone, role, status } = formData;

    if (!fullName || !email || !phone) {
      setError('All fields are required.');
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      setError('Invalid email address.');
      return;
    }

    const phonePattern = /^03[0-9]{2}-[0-9]{7}$/;
    if (!phonePattern.test(phone)) {
      setError('Phone must be in format 03XX-XXXXXXX.');
      return;
    }

    try {
      await update(ref(db, `users/${id}`), {
        fullName,
        email,
        phone,
        role,
        status
      });
      alert('User updated successfully!');
      navigate('/admin-dashboard/users');
    } catch (err) {
      console.error(err);
      setError('Failed to update user. Please try again.');
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <p>Loading user...</p>
      </div>
    );
  }

  if (error && !formData.fullName) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: '2rem' }}>
        <p style={{ color: '#D32F2F' }}>{error}</p>
        <Link to="/admin-dashboard/users" style={{ marginTop: '1rem', color: '#0288D1', textDecoration: 'underline' }}>Back to Users</Link>
      </div>
    );
  }

  return (
    <>
      <style>{`
        :root {
          --sky: #4FC3F7;
          --sky-dark: #0288D1;
          --black: #1A1A1A;
          --white: #FFFFFF;
          --gray: #6B7280;
          --shadow: 0 8px 32px rgba(0,0,0,0.08);
          --radius: 16px;
          --transition-smooth: cubic-bezier(0.4,0,0.2,1);
        }
        .user-management-page {
          min-height: 100vh;
          padding: 2rem;
          background: linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 50%, #90CAF9 100%);
          animation: gradientShift 12s ease-in-out infinite alternate;
        }
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .user-page-header {
          margin-bottom: 2rem;
          background: rgba(255,255,255,0.7);
          backdrop-filter: blur(10px);
          padding: 1.5rem 2rem;
          border-radius: var(--radius);
          box-shadow: var(--shadow);
        }
        .user-header-left {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .back-button {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--black);
          text-decoration: none;
          font-weight: 500;
          transition: 0.3s;
        }
        .back-button:hover {
          color: var(--sky-dark);
          transform: translateX(-4px);
        }
        .user-heading {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .user-heading-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          background: rgba(79,195,247,0.15);
          border-radius: 50%;
          color: var(--sky-dark);
          font-size: 1.5rem;
        }
        .user-heading h1 {
          font-size: 2.2rem;
          font-weight: 800;
          color: var(--black);
          margin: 0;
        }
        .user-heading p {
          color: var(--gray);
          margin: 0;
        }
        .user-edit-card {
          background: rgba(255,255,255,0.85);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.9);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          padding: 2rem;
          max-width: 800px;
          margin: 0 auto;
        }
        .user-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.2rem;
        }
        .user-form-group {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }
        .user-form-group label {
          font-weight: 600;
          color: var(--black);
          font-size: 0.9rem;
        }
        .user-form-group input,
        .user-form-group select {
          padding: 0.6rem 0.8rem;
          border: 2px solid #D1E8F5;
          border-radius: 8px;
          font-size: 0.95rem;
          transition: 0.3s;
          background: var(--white);
          font-family: inherit;
        }
        .user-form-group input:focus,
        .user-form-group select:focus {
          outline: none;
          border-color: var(--sky);
          box-shadow: 0 0 0 4px rgba(79,195,247,0.2);
        }
        .user-form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          margin-top: 2rem;
        }
        .user-cancel-btn {
          padding: 0.6rem 1.5rem;
          background: rgba(0,0,0,0.06);
          border: none;
          border-radius: 8px;
          color: var(--black);
          font-weight: 600;
          cursor: pointer;
          transition: 0.3s;
        }
        .user-cancel-btn:hover {
          background: rgba(0,0,0,0.1);
        }
        .user-save-btn {
          padding: 0.6rem 1.5rem;
          background: linear-gradient(135deg, var(--sky), var(--sky-dark));
          border: none;
          border-radius: 8px;
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: 0.3s;
          box-shadow: 0 4px 15px rgba(79,195,247,0.3);
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }
        .user-save-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(2,136,209,0.4);
        }
        .user-save-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .error-message {
          color: #D32F2F;
          font-size: 0.9rem;
          padding: 0.5rem;
          background: rgba(211,47,47,0.08);
          border-radius: 8px;
          border-left: 3px solid #D32F2F;
          margin-bottom: 1rem;
          grid-column: 1 / -1;
        }
        @media (max-width: 768px) {
          .user-management-page {
            padding: 1rem;
          }
          .user-edit-card {
            padding: 1.5rem;
          }
          .user-form-grid {
            grid-template-columns: 1fr;
          }
          .user-form-actions {
            flex-direction: column;
          }
          .user-form-actions button {
            width: 100%;
            justify-content: center;
          }
          .user-heading h1 {
            font-size: 1.8rem;
          }
        }
      `}</style>

      <div className="user-management-page">
        <div className="user-page-header">
          <div className="user-header-left">
            <Link to="/admin-dashboard/users" className="back-button">
              <FaArrowLeft /> Back to User Management
            </Link>
            <div className="user-heading">
              <div className="user-heading-icon"><FaUserEdit /></div>
              <div>
                <h1>Edit User</h1>
                <p>Update registered user information</p>
              </div>
            </div>
          </div>
        </div>

        <div className="user-edit-card">
          <form onSubmit={handleSubmit}>
            {error && <div className="error-message">{error}</div>}
            <div className="user-form-grid">
              <div className="user-form-group">
                <label>User ID</label>
                <input type="text" name="userId" value={id} disabled style={{ background: '#f0f0f0', cursor: 'not-allowed' }} />
              </div>
              <div className="user-form-group">
                <label>Full Name</label>
                <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required />
              </div>
              <div className="user-form-group">
                <label>Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} required />
              </div>
              <div className="user-form-group">
                <label>Phone</label>
                <input type="text" name="phone" placeholder="03XX-XXXXXXX" value={formData.phone} onChange={handleChange} required />
              </div>
              <div className="user-form-group">
                <label>Role</label>
                <select name="role" value={formData.role} onChange={handleChange} required>
                  <option value="citizen">Citizen</option>
                  <option value="lawyer">Lawyer</option>
                  <option value="judge">Judge</option>
                  <option value="clerk">Clerk</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="user-form-group">
                <label>Status</label>
                <select name="status" value={formData.status} onChange={handleChange} required>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div className="user-form-group">
                <label>Registration Date</label>
                <input type="date" name="registrationDate" value={formData.registrationDate} disabled style={{ background: '#f0f0f0', cursor: 'not-allowed' }} />
              </div>
            </div>

            <div className="user-form-actions">
              <button type="button" className="user-cancel-btn" onClick={() => navigate('/admin-dashboard/users')}>Cancel</button>
              <button type="submit" className="user-save-btn">Update User</button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default EditUser;