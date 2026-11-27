import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { FaSearch, FaCheckCircle, FaClock, FaUser, FaFileAlt, FaLink } from 'react-icons/fa';
import { ref, get, query, orderByChild, equalTo, onValue, off } from "firebase/database";
import { db } from "../firebase";

const CaseTracking = () => {
  const [caseId, setCaseId] = useState('');
  const [cnic, setCnic] = useState('');
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const caseRef = useRef(null);

  const formatCaseData = (data, id) => ({
    id: id,
    title: data.title || 'Untitled Case',
    status: data.status || 'Unknown',
    statusColor: data.statusColor || '#FF9A56',
    nextHearing: data.hearingDate || 'Not scheduled',
    judge: data.judge || 'Not assigned',
    filedDate: data.filedDate || 'Unknown',
    court: data.court || 'Not specified',
    blockchainHash: data.blockchainHash || 'N/A',
    progress: data.progress || 0,
    parties: data.parties || [],
    documents: data.documents || []
  });

  const attachListener = (path) => {
    if (caseRef.current) {
      off(caseRef.current);
      caseRef.current = null;
    }
    const caseDbRef = ref(db, path);
    caseRef.current = caseDbRef;
    onValue(caseDbRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const id = path.split('/').pop();
        setCaseData(formatCaseData(data, id));
        setLoading(false);
      } else {
        setError('Case no longer exists.');
        setCaseData(null);
        setLoading(false);
      }
    }, (error) => {
      console.error(error);
      setError('Failed to listen for case updates.');
      setLoading(false);
    });
  };

  useEffect(() => {
    return () => {
      if (caseRef.current) {
        off(caseRef.current);
        caseRef.current = null;
      }
    };
  }, []);

  const handleTrack = async (e) => {
    e.preventDefault();
    setError('');
    setCaseData(null);
    if (caseRef.current) {
      off(caseRef.current);
      caseRef.current = null;
    }

    if (!caseId && !cnic) {
      setError('Please enter Case ID or CNIC');
      return;
    }

    setLoading(true);

    try {
      let path = null;
      if (caseId) {
        const caseDbRef = ref(db, `cases/${caseId}`);
        const snapshot = await get(caseDbRef);
        if (snapshot.exists()) {
          path = `cases/${caseId}`;
        } else {
          setError('No case found with this Case ID.');
          setLoading(false);
          return;
        }
      } else if (cnic) {
        const casesRef = ref(db, 'cases');
        const cnicQuery = query(casesRef, orderByChild('cnic'), equalTo(cnic));
        const snapshot = await get(cnicQuery);
        if (snapshot.exists()) {
          const key = Object.keys(snapshot.val())[0];
          path = `cases/${key}`;
        } else {
          setError('No case found with this CNIC.');
          setLoading(false);
          return;
        }
      }

      if (path) {
        attachListener(path);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch case data. Please try again.');
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    if (status === 'In Progress') return <FaClock style={{ color: '#FF9A56' }} />;
    if (status === 'Completed') return <FaCheckCircle style={{ color: '#00E676' }} />;
    return <FaFileAlt style={{ color: '#4A6CF7' }} />;
  };

  return (
    <>
      <Helmet>
        <title>Track Case - CourtNetwork</title>
      </Helmet>

      {/* ===== Embedded CSS ===== */}
      <style>{`
        :root {
          --sky-light: #E8F4FD;
          --sky: #4FC3F7;
          --sky-dark: #0288D1;
          --black: #1A1A1A;
          --white: #FFFFFF;
          --gray: #6B7280;
          --light-gray: #F3F6FA;
          --shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
          --radius: 16px;
          --transition-smooth: cubic-bezier(0.4, 0, 0.2, 1);
        }

        .tracking-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          padding: 2rem;
          background: linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 50%, #90CAF9 100%);
          animation: gradientShift 12s ease-in-out infinite alternate;
        }
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .tracking-background {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 0;
          background: inherit;
        }
        .tracking-particles {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: 
            radial-gradient(circle at 20% 50%, rgba(79, 195, 247, 0.25) 0%, transparent 50%),
            radial-gradient(circle at 80% 50%, rgba(2, 136, 209, 0.15) 0%, transparent 50%);
          animation: pulseParticles 8s ease-in-out infinite alternate;
        }
        @keyframes pulseParticles {
          0% { opacity: 0.6; transform: scale(1); }
          100% { opacity: 1; transform: scale(1.05); }
        }
        .tracking-gradient {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 40%;
          background: linear-gradient(to top, rgba(255,255,255,0.6) 0%, transparent 100%);
        }

        .tracking-container {
          position: relative;
          z-index: 1;
          max-width: 900px;
          width: 100%;
          animation: fadeSlideUp 0.8s var(--transition-smooth) both;
        }
        @keyframes fadeSlideUp {
          0% { opacity: 0; transform: translateY(40px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }

        .tracking-content {
          text-align: center;
        }

        .tracking-header {
          margin-bottom: 2.5rem;
        }
        .tracking-badge {
          display: inline-block;
          padding: 0.4rem 1.2rem;
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.8);
          border-radius: 50px;
          color: var(--black);
          font-size: 0.9rem;
          font-weight: 600;
          margin-bottom: 1rem;
          animation: badgePulse 3s ease-in-out infinite;
        }
        @keyframes badgePulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(79, 195, 247, 0); }
          50% { transform: scale(1.02); box-shadow: 0 0 20px rgba(79, 195, 247, 0.2); }
        }

        .tracking-title {
          font-size: 3.5rem;
          font-weight: 800;
          color: var(--black);
          margin-bottom: 0.8rem;
          letter-spacing: -0.5px;
        }
        .tracking-title .highlight {
          background: linear-gradient(135deg, var(--sky), var(--sky-dark));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .tracking-subtitle {
          color: var(--gray);
          font-size: 1.1rem;
          max-width: 500px;
          margin: 0 auto;
        }

        .tracking-card {
          background: rgba(255, 255, 255, 0.85) !important;
          backdrop-filter: blur(20px) !important;
          border: 1px solid rgba(255, 255, 255, 0.9) !important;
          box-shadow: var(--shadow) !important;
          padding: 2.5rem;
          border-radius: var(--radius);
          transition: transform 0.3s var(--transition-smooth), box-shadow 0.3s var(--transition-smooth);
        }
        .tracking-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.12) !important;
        }

        .tracking-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .tracking-inputs {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          gap: 1.5rem;
          align-items: end;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          text-align: left;
        }
        .form-group label {
          color: var(--black);
          font-weight: 600;
          font-size: 0.9rem;
          transition: color 0.3s;
        }
        .form-group:focus-within label {
          color: var(--sky-dark);
        }
        .input-wrapper {
          position: relative;
        }
        .input-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--sky-dark);
          font-size: 1.1rem;
          transition: all 0.3s;
        }
        .form-group input {
          width: 100%;
          padding: 0.9rem 1rem 0.9rem 3rem;
          background: var(--white);
          border: 2px solid #D1E8F5;
          border-radius: 12px;
          color: var(--black);
          font-size: 1rem;
          transition: all 0.3s var(--transition-smooth);
        }
        .form-group input::placeholder {
          color: #B0BEC5;
        }
        .form-group input:focus {
          outline: none;
          border-color: var(--sky);
          box-shadow: 0 0 0 4px rgba(79, 195, 247, 0.2);
          transform: scale(1.01);
        }
        .input-wrapper::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 50%;
          width: 0;
          height: 2px;
          background: var(--sky-dark);
          transition: all 0.4s var(--transition-smooth);
          transform: translateX(-50%);
        }
        .form-group input:focus ~ .input-wrapper::after {
          width: 80%;
        }

        .form-divider {
          color: var(--gray);
          font-weight: 600;
          font-size: 0.9rem;
          padding-bottom: 0.5rem;
        }

        .error-message {
          color: #D32F2F;
          font-size: 0.9rem;
          text-align: left;
          padding: 0.5rem;
          background: rgba(211, 47, 47, 0.08);
          border-radius: 8px;
          border-left: 3px solid #D32F2F;
          animation: shake 0.5s var(--transition-smooth);
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          75% { transform: translateX(6px); }
        }

        .track-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 1rem 2.5rem;
          background: linear-gradient(135deg, var(--sky), var(--sky-dark));
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s var(--transition-smooth);
          box-shadow: 0 8px 30px rgba(79, 195, 247, 0.3);
          position: relative;
          overflow: hidden;
        }
        .track-btn::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle at center, rgba(255,255,255,0.2) 0%, transparent 60%);
          transform: scale(0);
          opacity: 0;
          transition: all 0.6s var(--transition-smooth);
        }
        .track-btn:hover:not(:disabled)::before {
          transform: scale(1);
          opacity: 1;
        }
        .track-btn:hover:not(:disabled) {
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 12px 40px rgba(2, 136, 209, 0.4);
        }
        .track-btn:active:not(:disabled) {
          transform: scale(0.97);
        }
        .track-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .loading-spinner {
          animation: rotateSlow 1.2s linear infinite;
        }
        @keyframes rotateSlow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .case-result {
          margin-top: 2.5rem;
          padding-top: 2.5rem;
          border-top: 1px solid rgba(0, 0, 0, 0.06);
          text-align: left;
          animation: slideUpFade 0.6s var(--transition-smooth) both;
        }
        @keyframes slideUpFade {
          0% { opacity: 0; transform: translateY(30px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        .result-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .result-title {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .result-title h3 {
          color: var(--black);
          font-size: 1.5rem;
          font-weight: 700;
          animation: fadeIn 0.8s var(--transition-smooth);
        }
        @keyframes fadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }

        .case-id-badge {
          padding: 0.3rem 1rem;
          background: rgba(79, 195, 247, 0.15);
          border: 1px solid var(--sky);
          border-radius: 50px;
          color: var(--sky-dark);
          font-size: 0.8rem;
          font-weight: 600;
          animation: badgePop 0.5s var(--transition-smooth);
        }
        @keyframes badgePop {
          0% { transform: scale(0.5); opacity: 0; }
          70% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }

        .case-status {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0.4rem 1.2rem;
          background: rgba(0, 0, 0, 0.04);
          border-radius: 50px;
          font-weight: 600;
          font-size: 0.9rem;
          color: var(--black);
          transition: all 0.3s;
        }
        .case-status svg {
          color: var(--sky-dark);
          animation: pulseIcon 2s ease-in-out infinite;
        }
        @keyframes pulseIcon {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }

        .progress-section {
          margin-bottom: 1.5rem;
          animation: fadeIn 0.9s var(--transition-smooth);
        }
        .progress-header {
          display: flex;
          justify-content: space-between;
          color: var(--gray);
          font-size: 0.9rem;
          margin-bottom: 0.5rem;
        }
        .progress-bar {
          width: 100%;
          height: 6px;
          background: #E0E7EF;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: inset 0 1px 3px rgba(0,0,0,0.05);
        }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--sky), var(--sky-dark));
          border-radius: 10px;
        }

        .result-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .result-item {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
          padding: 0.8rem;
          background: var(--light-gray);
          border-radius: 8px;
          transition: all 0.3s var(--transition-smooth);
          animation: fadeIn 0.5s var(--transition-smooth) both;
        }
        .result-item:nth-child(1) { animation-delay: 0.1s; }
        .result-item:nth-child(2) { animation-delay: 0.2s; }
        .result-item:nth-child(3) { animation-delay: 0.3s; }
        .result-item:nth-child(4) { animation-delay: 0.4s; }
        .result-item:nth-child(5) { animation-delay: 0.5s; }
        .result-item:nth-child(6) { animation-delay: 0.6s; }
        .result-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.06);
          background: #E3F2FD;
        }
        .result-label {
          font-size: 0.75rem;
          color: var(--gray);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 600;
        }
        .result-value {
          color: var(--black);
          font-size: 0.95rem;
          font-weight: 500;
        }

        .party-tag {
          display: inline-block;
          padding: 0.2rem 0.8rem;
          background: rgba(79, 195, 247, 0.1);
          border-radius: 50px;
          font-size: 0.85rem;
          margin-right: 0.5rem;
          margin-bottom: 0.3rem;
          color: var(--black);
          transition: all 0.3s;
        }
        .party-tag:hover {
          background: rgba(79, 195, 247, 0.25);
          transform: scale(1.05);
        }

        .blockchain-section {
          padding: 1.5rem;
          background: #E8F4FD;
          border-radius: 12px;
          margin-bottom: 1.5rem;
          border: 1px solid rgba(79, 195, 247, 0.2);
          animation: fadeIn 0.7s var(--transition-smooth);
        }
        .blockchain-header {
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--black);
          font-weight: 600;
          margin-bottom: 0.8rem;
        }
        .blockchain-icon {
          color: var(--sky-dark);
          animation: spinSlow 12s linear infinite;
        }
        @keyframes spinSlow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .blockchain-hash {
          display: flex;
          gap: 0.5rem;
          align-items: center;
          padding: 0.8rem;
          background: rgba(255, 255, 255, 0.6);
          border-radius: 8px;
          margin-bottom: 1rem;
          overflow: hidden;
          transition: all 0.3s;
        }
        .blockchain-hash:hover {
          background: rgba(255, 255, 255, 0.9);
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        .hash-label {
          color: var(--gray);
          font-size: 0.8rem;
          font-weight: 600;
          white-space: nowrap;
        }
        .hash-value {
          color: var(--sky-dark);
          font-family: monospace;
          font-size: 0.85rem;
          word-break: break-all;
        }

        .verify-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 0.6rem 1.5rem;
          background: rgba(2, 136, 209, 0.08);
          border: 1px solid var(--sky);
          border-radius: 8px;
          color: var(--sky-dark);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s var(--transition-smooth);
        }
        .verify-btn:hover {
          background: rgba(2, 136, 209, 0.15);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(2, 136, 209, 0.2);
        }
        .verify-btn:active {
          transform: scale(0.95);
        }

        .documents-section h4 {
          color: var(--black);
          margin-bottom: 1rem;
          font-weight: 700;
        }
        .documents-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .document-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.6rem 1rem;
          background: var(--light-gray);
          border-radius: 8px;
          transition: all 0.3s var(--transition-smooth);
          animation: slideInLeft 0.5s var(--transition-smooth) both;
        }
        .document-item:nth-child(1) { animation-delay: 0.1s; }
        .document-item:nth-child(2) { animation-delay: 0.2s; }
        .document-item:nth-child(3) { animation-delay: 0.3s; }
        @keyframes slideInLeft {
          0% { opacity: 0; transform: translateX(-20px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        .document-item:hover {
          background: #E3F2FD;
          transform: translateX(4px);
        }
        .document-item svg {
          color: var(--sky-dark);
          font-size: 1.2rem;
        }
        .document-item span {
          color: var(--black);
          flex: 1;
          font-size: 0.9rem;
        }
        .view-btn {
          padding: 0.2rem 1rem;
          background: rgba(79, 195, 247, 0.15);
          border: none;
          border-radius: 6px;
          color: var(--sky-dark);
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s var(--transition-smooth);
        }
        .view-btn:hover {
          background: rgba(79, 195, 247, 0.25);
          transform: scale(1.05);
        }

        @media (max-width: 768px) {
          .tracking-inputs {
            grid-template-columns: 1fr;
          }
          .form-divider {
            text-align: center;
            padding: 0;
          }
          .result-grid {
            grid-template-columns: 1fr;
          }
          .result-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .tracking-title {
            font-size: 2.2rem;
          }
          .tracking-card {
            padding: 1.5rem;
          }
        }

        @media (max-width: 480px) {
          .tracking-title {
            font-size: 1.8rem;
          }
          .blockchain-hash {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>

      {/* ===== Page Content ===== */}
      <div className="tracking-page">
        <div className="tracking-background">
          <div className="tracking-particles"></div>
          <div className="tracking-gradient"></div>
        </div>

        <div className="tracking-container">
          <motion.div
            className="tracking-content"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="tracking-header">
              <span className="tracking-badge">Case Tracking</span>
              <h1 className="tracking-title">
                Track Your <span className="highlight">Case</span>
              </h1>
              <p className="tracking-subtitle">
                Enter your Case ID or CNIC to check the current status and progress of your case
              </p>
            </div>

            <div className="tracking-card">
              <form onSubmit={handleTrack} className="tracking-form">
                <div className="tracking-inputs">
                  <div className="form-group">
                    <label>Case ID</label>
                    <div className="input-wrapper">
                      <FaFileAlt className="input-icon" />
                      <input
                        type="text"
                        value={caseId}
                        onChange={(e) => setCaseId(e.target.value)}
                        placeholder="e.g., 2026-C-001"
                      />
                    </div>
                  </div>
                  <div className="form-divider">OR</div>
                  <div className="form-group">
                    <label>CNIC Number</label>
                    <div className="input-wrapper">
                      <FaUser className="input-icon" />
                      <input
                        type="text"
                        value={cnic}
                        onChange={(e) => setCnic(e.target.value)}
                        placeholder="XXXXX-XXXXXXX-X"
                      />
                    </div>
                  </div>
                </div>
                {error && <div className="error-message">{error}</div>}
                <button type="submit" className="track-btn" disabled={loading}>
                  {loading ? (
                    <span className="loading-spinner">⏳</span>
                  ) : (
                    <>
                      <FaSearch /> Track Case
                    </>
                  )}
                </button>
              </form>

              <AnimatePresence>
                {caseData && (
                  <motion.div
                    className="case-result"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -30 }}
                    transition={{ duration: 0.5 }}
                  >
                    <div className="result-header">
                      <div className="result-title">
                        <h3>Case Details</h3>
                        <span className="case-id-badge">{caseData.id}</span>
                      </div>
                      <div className="case-status">
                        {getStatusIcon(caseData.status)}
                        <span style={{ color: caseData.statusColor }}>{caseData.status}</span>
                      </div>
                    </div>

                    <div className="progress-section">
                      <div className="progress-header">
                        <span>Case Progress</span>
                        <span>{caseData.progress}%</span>
                      </div>
                      <div className="progress-bar">
                        <motion.div
                          className="progress-fill"
                          initial={{ width: 0 }}
                          animate={{ width: `${caseData.progress}%` }}
                          transition={{ duration: 1, delay: 0.3 }}
                        />
                      </div>
                    </div>

                    <div className="result-grid">
                      <div className="result-item">
                        <span className="result-label">Title</span>
                        <span className="result-value">{caseData.title}</span>
                      </div>
                      <div className="result-item">
                        <span className="result-label">Judge</span>
                        <span className="result-value">{caseData.judge}</span>
                      </div>
                      <div className="result-item">
                        <span className="result-label">Next Hearing</span>
                        <span className="result-value">{caseData.nextHearing}</span>
                      </div>
                      <div className="result-item">
                        <span className="result-label">Filed Date</span>
                        <span className="result-value">{caseData.filedDate}</span>
                      </div>
                      <div className="result-item">
                        <span className="result-label">Court</span>
                        <span className="result-value">{caseData.court}</span>
                      </div>
                      <div className="result-item">
                        <span className="result-label">Parties</span>
                        <span className="result-value">
                          {caseData.parties.map((party, i) => (
                            <span key={i} className="party-tag">{party}</span>
                          ))}
                        </span>
                      </div>
                    </div>

                    <div className="blockchain-section">
                      <div className="blockchain-header">
                        <FaLink className="blockchain-icon" />
                        <span>Blockchain Verification</span>
                      </div>
                      <div className="blockchain-hash">
                        <span className="hash-label">Hash:</span>
                        <span className="hash-value">{caseData.blockchainHash}</span>
                      </div>
                      <button className="verify-btn">
                        <FaCheckCircle /> Verify on Blockchain
                      </button>
                    </div>

                    <div className="documents-section">
                      <h4>Documents</h4>
                      <div className="documents-list">
                        {caseData.documents.map((doc, i) => (
                          <div key={i} className="document-item">
                            <FaFileAlt />
                            <span>{doc}</span>
                            <button className="view-btn">View</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default CaseTracking;