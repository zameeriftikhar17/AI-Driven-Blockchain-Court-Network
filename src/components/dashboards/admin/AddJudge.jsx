import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaUserPlus } from 'react-icons/fa';
import { ref, push, set, serverTimestamp } from "firebase/database";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../../firebase";

const AddJudge = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    judgeId: '',
    email: '',
    phone: '',
    specialization: '',
    experience: '',
    court: '',
    rank: '',
    availability: 'Available',
    password: '',
    confirmPassword: '',
    status: 'Active'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { fullName, judgeId, email, phone, specialization, experience, court, rank, availability, password, confirmPassword, status } = formData;

    if (!fullName || !email || !phone || !password || !confirmPassword || !specialization || !court || !rank) {
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

    const phonePattern = /^03[0-9]{2}-[0-9]{7}$/;
    if (!phonePattern.test(phone)) {
      setError('Phone must be in format 03XX-XXXXXXX.');
      setLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      const judgeData = {
        uid,
        fullName,
        email,
        phone,
        role: 'judge',
        specialization,
        experience: Number(experience) || 0,
        court,
        rank,
        availability,
        judgeId: judgeId || uid.slice(0, 8).toUpperCase(),
        status,
        createdAt: serverTimestamp()
      };

      await set(ref(db, `users/${uid}`), judgeData);

      const logsRef = ref(db, 'systemLogs');
      const logKey = push(logsRef).key;
      await set(ref(db, `systemLogs/${logKey}`), {
        action: `New judge ${fullName} registered with email ${email}`,
        user: 'System',
        timestamp: serverTimestamp()
      });

      alert('Judge registered successfully!');
      navigate('/admin-dashboard/judges');
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
        .judge-management-page {
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
        .judge-page-header {
          margin-bottom: 2rem;
        }
        .back-button {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--black);
          text-decoration: none;
          font-weight: 500;
          transition: 0.3s;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1rem;
          margin-bottom: 0.5rem;
        }
        .back-button:hover {
          color: var(--sky-dark);
          transform: translateX(-4px);
        }
        .judge-page-header h1 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 2.2rem;
          font-weight: 800;
          color: var(--black);
          margin: 0.5rem 0 0.2rem;
        }
        .judge-page-header p {
          color: var(--gray);
          margin: 0;
        }
        .judge-form-card {
          background: rgba(255,255,255,0.85);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.9);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          padding: 2rem;
          max-width: 900px;
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
        .add-judge-btn {
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
        .add-judge-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(2,136,209,0.4);
        }
        .add-judge-btn:disabled {
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
          .judge-management-page {
            padding: 1rem;
          }
          .judge-form-card {
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
          .judge-page-header h1 {
            font-size: 1.8rem;
          }
        }
      `}</style>

      <div className="judge-management-page">
        <div className="judge-page-header">
          <button className="back-button" onClick={() => navigate('/admin-dashboard/judges')}>
            <FaArrowLeft /> Back to Judge Management
          </button>
          <h1><FaUserPlus /> Register New Judge</h1>
          <p>Add a new judge to the CourtNetwork system</p>
        </div>

        <div className="judge-form-card">
          <form onSubmit={handleSubmit}>
            {error && <div className="error-message">{error}</div>}
            <div className="form-grid">
              <div className="form-group">
                <label>Full Name *</label>
                <input type="text" name="fullName" placeholder="Enter judge full name" value={formData.fullName} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Judge ID (optional)</label>
                <input type="text" name="judgeId" placeholder="e.g. J-004" value={formData.judgeId} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input type="email" name="email" placeholder="judge@example.com" value={formData.email} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Phone *</label>
                <input type="tel" name="phone" placeholder="03XX-XXXXXXX" value={formData.phone} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Specialization *</label>
                <select name="specialization" value={formData.specialization} onChange={handleChange} required>
                  <option value="">Select Specialization</option>
                  <option value="Civil">Civil</option>
                  <option value="Criminal">Criminal</option>
                  <option value="Constitutional">Constitutional</option>
                  <option value="Tax">Tax</option>
                  <option value="Family">Family</option>
                  <option value="Service">Service</option>
                  <option value="Election">Election</option>
                  <option value="Commercial">Commercial</option>
                </select>
              </div>
              <div className="form-group">
                <label>Experience (Years) *</label>
                <input type="number" name="experience" min="0" placeholder="e.g. 15" value={formData.experience} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Court *</label>
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
                <label>Rank *</label>
                <select name="rank" value={formData.rank} onChange={handleChange} required>
                  <option value="">Select Rank</option>
                  <option value="Junior">Junior</option>
                  <option value="Senior">Senior</option>
                  <option value="Experienced">Experienced</option>
                </select>
              </div>
              <div className="form-group">
                <label>Availability</label>
                <select name="availability" value={formData.availability} onChange={handleChange}>
                  <option value="Available">Available</option>
                  <option value="Busy">Busy</option>
                  <option value="On Leave">On Leave</option>
                </select>
              </div>
              <div className="form-group">
                <label>Password *</label>
                <input type="password" name="password" placeholder="Min 8 chars with special" value={formData.password} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Confirm Password *</label>
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
              <button type="button" className="cancel-btn" onClick={() => navigate('/admin-dashboard/judges')}>Cancel</button>
              <button type="submit" className="add-judge-btn" disabled={loading}>
                {loading ? 'Registering...' : <><FaUserPlus /> Register Judge</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default AddJudge;