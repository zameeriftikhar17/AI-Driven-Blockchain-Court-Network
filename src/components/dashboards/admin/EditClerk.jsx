import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  FaArrowLeft,
  FaUserTie
} from 'react-icons/fa';
import { ref, onValue, off, update } from "firebase/database";
import { auth, db } from "../../../firebase";

const EditClerk = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = auth.currentUser;

  const [formData, setFormData] = useState({
    clerkId: '',
    fullName: '',
    email: '',
    phone: '',
    cnic: '',
    court: '',
    experience: '',
    status: 'Active'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  useEffect(() => {
    if (!id) {
      navigate('/admin-dashboard/clerks');
      return;
    }

    const clerkRef = ref(db, `users/${id}`);
    const unsubscribe = onValue(clerkRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        if (data.role !== 'clerk') {
          setError('User is not a clerk.');
          setTimeout(() => navigate('/admin-dashboard/clerks'), 2000);
          setLoading(false);
          return;
        }
        setFormData({
          clerkId: data.clerkId || data.id?.slice(0, 8).toUpperCase() || id.slice(0, 8).toUpperCase(),
          fullName: data.fullName || data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          cnic: data.cnic || '',
          court: data.court || '',
          experience: data.experience || '',
          status: data.status || 'Active'
        });
        setError('');
      } else {
        setError('Clerk not found.');
        setTimeout(() => navigate('/admin-dashboard/clerks'), 2000);
      }
      setLoading(false);
    }, (err) => {
      console.error(err);
      setError('Failed to load clerk data.');
      setLoading(false);
    });

    return () => off(clerkRef);
  }, [id, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const { fullName, email, phone, cnic, court, experience, status } = formData;

    if (!fullName || !email || !phone || !cnic || !court) {
      setError('All fields are required.');
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      setError('Invalid email address.');
      return;
    }

    const cnicPattern = /^[0-9]{5}-[0-9]{7}-[0-9]{1}$/;
    if (!cnicPattern.test(cnic)) {
      setError('CNIC must be in format XXXXX-XXXXXXX-X.');
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
        cnic,
        court,
        experience: experience ? Number(experience) : 0,
        status
      });
      alert('Clerk updated successfully!');
      navigate('/admin-dashboard/clerks');
    } catch (err) {
      console.error(err);
      setError('Failed to update clerk. Please try again.');
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <p>Loading clerk...</p>
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
        .edit-clerk-page {
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
        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--black);
          text-decoration: none;
          font-weight: 500;
          transition: 0.3s;
          margin-bottom: 1.5rem;
        }
        .back-link:hover {
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
        .save-btn {
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
        .save-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(2,136,209,0.4);
        }
        .save-btn:disabled {
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
          .edit-clerk-page {
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

      <div className="edit-clerk-page">
        <Link to="/admin-dashboard/clerks" className="back-link">
          <FaArrowLeft /> Back to Clerk Management
        </Link>

        <div className="page-header">
          <div className="page-icon"><FaUserTie /></div>
          <div>
            <h1>Edit Clerk</h1>
            <p>Update clerk information</p>
          </div>
        </div>

        <div className="form-card">
          <form onSubmit={handleSubmit}>
            {error && <div className="error-message">{error}</div>}
            <div className="form-grid">
              <div className="form-group">
                <label>Clerk ID</label>
                <input type="text" name="clerkId" value={formData.clerkId} disabled style={{ background: '#f0f0f0', cursor: 'not-allowed' }} />
              </div>
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input type="tel" name="phone" placeholder="03XX-XXXXXXX" value={formData.phone} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>CNIC</label>
                <input type="text" name="cnic" placeholder="XXXXX-XXXXXXX-X" value={formData.cnic} onChange={handleChange} required />
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
                <label>Status</label>
                <select name="status" value={formData.status} onChange={handleChange}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="cancel-btn" onClick={() => navigate('/admin-dashboard/clerks')}>Cancel</button>
              <button type="submit" className="save-btn">Save Changes</button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default EditClerk;