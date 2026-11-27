import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaUserTie } from 'react-icons/fa';
import { ref, push, set, serverTimestamp } from "firebase/database";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../../firebase";

const AddClerk = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    clerkId: '',
    fullName: '',
    email: '',
    phone: '',
    cnic: '',
    court: '',
    experience: '',
    password: '',
    confirmPassword: '',
    status: 'Active'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { clerkId, fullName, email, phone, cnic, court, experience, password, confirmPassword, status } = formData;

    if (!fullName || !email || !phone || !cnic || !password || !confirmPassword || !court) {
      setError('All required fields must be filled.');
      setLoading(false);
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      setError('Invalid email address.');
      setLoading(false);
      return;
    }

    const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordPattern.test(password)) {
      setError('Password must be at least 8 characters, include uppercase, lowercase, number, and special character.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    const cnicPattern = /^[0-9]{5}-[0-9]{7}-[0-9]{1}$/;
    if (!cnicPattern.test(cnic)) {
      setError('CNIC must be in format XXXXX-XXXXXXX-X.');
      setLoading(false);
      return;
    }

    const phonePattern = /^03[0-9]{2}-[0-9]{7}$/;
    if (!phonePattern.test(phone)) {
      setError('Phone must be in format 03XX-XXXXXXX.');
      setLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      const clerkData = {
        uid,
        fullName,
        email,
        phone,
        cnic,
        role: 'clerk',
        court: court || '',
        experience: experience ? Number(experience) : 0,
        clerkId: clerkId || uid.slice(0, 8).toUpperCase(),
        status,
        createdAt: serverTimestamp()
      };

      await set(ref(db, `users/${uid}`), clerkData);

      const logsRef = ref(db, 'systemLogs');
      const logKey = push(logsRef).key;
      await set(ref(db, `systemLogs/${logKey}`), {
        action: `New clerk ${fullName} registered with email ${email}`,
        user: 'System',
        timestamp: serverTimestamp()
      });

      alert('Clerk added successfully!');
      navigate('/admin-dashboard/clerks');
    } catch (err) {
      console.error(err);
      let msg = 'Registration failed.';
      if (err.code === 'auth/email-already-in-use') msg = 'This email is already registered.';
      else if (err.code === 'auth/invalid-email') msg = 'Invalid email address.';
      else if (err.code === 'auth/weak-password') msg = 'Password is too weak.';
      else msg = err.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

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
        .add-clerk-page {
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
        .back-button {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--black);
          text-decoration: none;
          font-weight: 500;
          transition: 0.3s;
          margin-bottom: 1.5rem;
        }
        .back-button:hover {
          color: var(--sky-dark);
          transform: translateX(-4px);
        }
        .page-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 2rem;
        }
        .page-icon {
          width: 50px;
          height: 50px;
          border-radius: 12px;
          background: rgba(79,195,247,0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--sky-dark);
          font-size: 1.8rem;
        }
        .page-header h1 {
          margin: 0;
          font-size: 2.2rem;
          font-weight: 800;
          color: var(--black);
        }
        .page-header p {
          margin: 0.2rem 0 0;
          color: var(--gray);
        }
        .form-card {
          background: rgba(255,255,255,0.85);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.9);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          padding: 2rem;
          max-width: 800px;
          margin: 0 auto;
        }
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.2rem;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }
        .form-group label {
          font-weight: 600;
          color: var(--black);
          font-size: 0.9rem;
        }
        .form-group input,
        .form-group select {
          padding: 0.6rem 0.8rem;
          border: 2px solid #D1E8F5;
          border-radius: 8px;
          font-size: 0.95rem;
          transition: 0.3s;
          background: var(--white);
          font-family: inherit;
        }
        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: var(--sky);
          box-shadow: 0 0 0 4px rgba(79,195,247,0.2);
        }
        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          margin-top: 2rem;
        }
        .cancel-btn {
          padding: 0.6rem 1.5rem;
          background: rgba(0,0,0,0.06);
          border: none;
          border-radius: 8px;
          color: var(--black);
          font-weight: 600;
          cursor: pointer;
          transition: 0.3s;
        }
        .cancel-btn:hover {
          background: rgba(0,0,0,0.1);
        }
        .add-btn {
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
        .add-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(2,136,209,0.4);
        }
        .add-btn:disabled {
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
          .add-clerk-page {
            padding: 1rem;
          }
          .form-card {
            padding: 1.5rem;
          }
          .form-grid {
            grid-template-columns: 1fr;
          }
          .form-actions {
            flex-direction: column;
          }
          .form-actions button {
            width: 100%;
            justify-content: center;
          }
          .page-header h1 {
            font-size: 1.8rem;
          }
        }
      `}</style>

      <div className="add-clerk-page">
        <Link to="/admin-dashboard/clerks" className="back-button">
          <FaArrowLeft /> Back to Clerk Management
        </Link>

        <div className="page-header">
          <div className="page-icon"><FaUserTie /></div>
          <div>
            <h1>Add New Clerk</h1>
            <p>Register a new court clerk</p>
          </div>
        </div>

        <div className="form-card">
          <form onSubmit={handleSubmit}>
            {error && <div className="error-message">{error}</div>}
            <div className="form-grid">
              <div className="form-group">
                <label>Clerk ID (optional)</label>
                <input type="text" name="clerkId" placeholder="e.g. C-004" value={formData.clerkId} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" name="fullName" placeholder="Enter full name" value={formData.fullName} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" name="email" placeholder="Enter email" value={formData.email} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input type="tel" name="phone" placeholder="0300-1234567" value={formData.phone} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>CNIC</label>
                <input type="text" name="cnic" placeholder="35202-1234567-1" value={formData.cnic} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Assigned Court</label>
                <select name="court" value={formData.court} onChange={handleChange} required>
                  <option value="">Select Court</option>
                  <option value="Lahore High Court">Lahore High Court</option>
                  <option value="Islamabad High Court">Islamabad High Court</option>
                  <option value="Peshawar High Court">Peshawar High Court</option>
                  <option value="Sindh High Court">Sindh High Court</option>
                  <option value="Balochistan High Court">Balochistan High Court</option>
                </select>
              </div>
              <div className="form-group">
                <label>Experience (Years)</label>
                <input type="number" name="experience" min="0" placeholder="e.g. 5" value={formData.experience} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" name="password" placeholder="Min 8 chars with special" value={formData.password} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Confirm Password</label>
                <input type="password" name="confirmPassword" placeholder="Re-enter password" value={formData.confirmPassword} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select name="status" value={formData.status} onChange={handleChange}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="cancel-btn" onClick={() => navigate('/admin-dashboard/clerks')}>
                Cancel
              </button>
              <button type="submit" className="add-btn" disabled={loading}>
                {loading ? 'Adding...' : 'Add Clerk'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default AddClerk;