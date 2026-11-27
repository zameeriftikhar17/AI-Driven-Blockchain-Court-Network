import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaFileAlt, FaPlus, FaCheckCircle } from 'react-icons/fa';
import { ref, push, set, serverTimestamp } from "firebase/database";
import { auth, db } from "../../../firebase";
import GlassCard from '../../common/GlassCard';

const RegisterCase = () => {
  const navigate = useNavigate();
  const user = auth.currentUser;
  const [formData, setFormData] = useState({
    caseTitle: '',
    caseType: '',
    filingDate: '',
    parties: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submittedId, setSubmittedId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  const caseTypes = [
    'Civil Dispute',
    'Family Matter',
    'Property Dispute',
    'Criminal Case',
    'Corporate Dispute',
    'Consumer Complaint',
    'Employment Dispute',
    'Other'
  ];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const generateBlockchainHash = (caseId, clerkId) => {
    const str = `${caseId}-${clerkId}-${Date.now()}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `0x${Math.abs(hash).toString(16).padStart(64, '0')}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!formData.caseTitle || !formData.caseType || !formData.filingDate || !formData.parties) {
      setError('Please fill in all required fields.');
      setLoading(false);
      return;
    }

    try {
      const newCaseRef = ref(db, 'cases');
      const newCaseKey = push(newCaseRef).key;
      const partiesArray = formData.parties.split(',').map(p => p.trim()).filter(p => p);

      const caseData = {
        id: newCaseKey,
        title: formData.caseTitle,
        caseType: formData.caseType,
        filingDate: formData.filingDate,
        parties: partiesArray,
        description: formData.description || '',
        status: 'Pending Review',
        documentsVerified: false,
        assignedJudge: null,
        registeredBy: user.uid,
        registeredByName: user.displayName || 'Clerk',
        createdAt: serverTimestamp(),
        blockchainHash: generateBlockchainHash(newCaseKey, user.uid)
      };

      await set(ref(db, `cases/${newCaseKey}`), caseData);

      const notifRef = ref(db, `notifications/${user.uid}`);
      const notifKey = push(notifRef).key;
      await set(ref(db, `notifications/${user.uid}/${notifKey}`), {
        message: `Case ${newCaseKey} registered successfully.`,
        read: false,
        timestamp: serverTimestamp(),
        type: 'case_registered'
      });

      setSubmittedId(newCaseKey);
      setSuccess(true);
      setTimeout(() => navigate('/clerk-dashboard'), 3000);
    } catch (err) {
      console.error(err);
      setError('Failed to register case. Please try again.');
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
        .dashboard-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          background: linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 50%, #90CAF9 100%);
          animation: gradientShift 12s ease-in-out infinite alternate;
        }
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .dashboard-background {
          position: fixed; inset: 0; z-index: 0;
          background: inherit;
        }
        .dashboard-particles {
          position: absolute; inset: 0;
          background: radial-gradient(circle at 20% 50%, rgba(79,195,247,0.25) 0%, transparent 50%),
                      radial-gradient(circle at 80% 50%, rgba(2,136,209,0.15) 0%, transparent 50%);
          animation: pulseParticles 8s ease-in-out infinite alternate;
        }
        @keyframes pulseParticles {
          0% { opacity: 0.6; transform: scale(1); }
          100% { opacity: 1; transform: scale(1.05); }
        }
        .dashboard-gradient {
          position: absolute; bottom: 0; left: 0; right: 0; height: 40%;
          background: linear-gradient(to top, rgba(255,255,255,0.6) 0%, transparent 100%);
        }
        .dashboard-container {
          position: relative; z-index: 1; max-width: 700px; width: 100%;
          animation: fadeSlideUp 0.8s var(--transition-smooth) both;
        }
        @keyframes fadeSlideUp {
          0% { opacity: 0; transform: translateY(40px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .back-btn {
          display: inline-flex; align-items: center; gap: 0.5rem;
          padding: 0.6rem 1.2rem;
          background: rgba(255,255,255,0.7);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.8);
          border-radius: 50px;
          color: var(--black);
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s;
          margin-bottom: 1.5rem;
        }
        .back-btn:hover { background: white; transform: translateX(-4px); }
        .page-header { text-align: center; margin-bottom: 2rem; }
        .page-header h1 { font-size: 2.5rem; font-weight: 800; color: var(--black); margin-bottom: 0.5rem; }
        .page-header p { color: var(--gray); font-size: 1.1rem; }
        .form-card {
          background: rgba(255,255,255,0.85) !important;
          backdrop-filter: blur(20px) !important;
          border: 1px solid rgba(255,255,255,0.9) !important;
          box-shadow: var(--shadow) !important;
          padding: 2.5rem;
          border-radius: var(--radius);
        }
        .case-form { display: flex; flex-direction: column; gap: 1.5rem; }
        .form-group { display: flex; flex-direction: column; gap: 0.5rem; text-align: left; }
        .form-group label { color: var(--black); font-weight: 600; font-size: 0.9rem; }
        .form-group input, .form-group select, .form-group textarea {
          width: 100%; padding: 0.8rem 1rem;
          background: var(--white);
          border: 2px solid #D1E8F5;
          border-radius: 12px;
          color: var(--black);
          font-size: 1rem;
          transition: all 0.3s var(--transition-smooth);
          font-family: inherit;
        }
        .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
          outline: none; border-color: var(--sky); box-shadow: 0 0 0 4px rgba(79,195,247,0.2);
        }
        .form-group textarea { resize: vertical; min-height: 100px; }
        .form-actions { display: flex; gap: 1rem; justify-content: flex-end; margin-top: 0.5rem; }
        .btn-secondary, .btn-primary {
          padding: 0.8rem 2rem; border: none; border-radius: 12px;
          font-weight: 600; font-size: 1rem; cursor: pointer;
          transition: all 0.3s var(--transition-smooth);
        }
        .btn-secondary { background: rgba(0,0,0,0.06); color: var(--black); }
        .btn-secondary:hover { background: rgba(0,0,0,0.1); }
        .btn-primary {
          background: linear-gradient(135deg, var(--sky), var(--sky-dark));
          color: white; box-shadow: 0 4px 15px rgba(79,195,247,0.3);
        }
        .btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(2,136,209,0.4); }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .error-message {
          color: #D32F2F; padding: 0.5rem; background: rgba(211,47,47,0.08);
          border-radius: 8px; border-left: 3px solid #D32F2F;
          animation: shake 0.5s var(--transition-smooth);
        }
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          75% { transform: translateX(6px); }
        }
        .success-message { text-align: center; padding: 2rem 0; }
        .success-icon { font-size: 4rem; color: #00E676; margin-bottom: 1rem; }
        .success-message h2 { font-size: 2rem; color: var(--black); margin-bottom: 0.5rem; }
        .success-message p { color: var(--gray); }
        .hash-text { margin-top: 1rem; font-family: monospace; background: rgba(0,0,0,0.04); padding: 0.5rem 1rem; border-radius: 8px; word-break: break-all; }
        @media (max-width: 768px) {
          .form-card { padding: 1.5rem; }
          .form-actions { flex-direction: column; }
          .form-actions button { width: 100%; }
        }
      `}</style>

      <div className="dashboard-page">
        <div className="dashboard-background"><div className="dashboard-particles"></div><div className="dashboard-gradient"></div></div>
        <div className="dashboard-container">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <button onClick={() => navigate(-1)} className="back-btn"><FaArrowLeft /> Back</button>
            <div className="page-header">
              <h1>Register New Case</h1>
              <p>Enter case details and generate blockchain hash</p>
            </div>
            <GlassCard className="form-card">
              {success ? (
                <motion.div className="success-message" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
                  <FaCheckCircle className="success-icon" />
                  <h2>Case Registered Successfully!</h2>
                  <p>Case ID: <strong>{submittedId}</strong></p>
                  <p className="hash-text">Blockchain Hash: {formData.blockchainHash || '0x...'}</p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="case-form">
                  {error && <div className="error-message">{error}</div>}
                  <div className="form-group">
                    <label>Case Title *</label>
                    <input type="text" name="caseTitle" value={formData.caseTitle} onChange={handleChange} placeholder="e.g., Property Dispute" required />
                  </div>
                  <div className="form-group">
                    <label>Case Type *</label>
                    <select name="caseType" value={formData.caseType} onChange={handleChange} required>
                      <option value="">Select Case Type</option>
                      {caseTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Filing Date *</label>
                    <input type="date" name="filingDate" value={formData.filingDate} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label>Parties (comma separated) *</label>
                    <input type="text" name="parties" value={formData.parties} onChange={handleChange} placeholder="e.g., Plaintiff: John Doe, Defendant: Jane Smith" required />
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Optional case description" rows="3" />
                  </div>
                  <div className="form-actions">
                    <button type="button" onClick={() => navigate('/clerk-dashboard')} className="btn-secondary">Cancel</button>
                    <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Submitting...' : 'Register Case'}</button>
                  </div>
                </form>
              )}
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default RegisterCase;