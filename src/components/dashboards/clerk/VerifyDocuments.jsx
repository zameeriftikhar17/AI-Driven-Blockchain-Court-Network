import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaCheckCircle, FaFileAlt, FaTimes } from 'react-icons/fa';
import {
  ref,
  onValue,
  off,
  update,
  push,
  set,
  serverTimestamp
} from "firebase/database";
import { auth, db } from "../../../firebase";
import GlassCard from '../../common/GlassCard';

const VerifyDocuments = () => {
  const navigate = useNavigate();
  const user = auth.currentUser;
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    if (!user) navigate('/login');
    const casesRef = ref(db, 'cases');
    const unsubscribe = onValue(casesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const casesArray = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        setCases(casesArray.filter(c => c.documentsVerified === false || c.documentsVerified === undefined));
      } else {
        setCases([]);
      }
      setLoading(false);
    }, (err) => { console.error(err); setLoading(false); });
    return () => off(casesRef);
  }, [user, navigate]);

const handleVerify = async (caseId) => {
  setUpdating(caseId);

  try {
    // Get registered document hash from blockchain
    const caseResponse = await fetch(
      `http://localhost:8000/blockchain/case/${caseId}`
    );

    if (!caseResponse.ok) {
      throw new Error('Case not found on blockchain');
    }

    const blockchainCase = await caseResponse.json();

    if (!blockchainCase.documentHash) {
      throw new Error('Document hash not found on blockchain');
    }

    // Verify document hash on blockchain
    const verifyResponse = await fetch(
      'http://localhost:8000/blockchain/verify-document',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
  caseId,
  updatedDocumentHash: cases.find(c => c.id === caseId)?.updatedDocumentHash ||
                       cases.find(c => c.id === caseId)?.documentHash
})
      }
    );

    if (!verifyResponse.ok) {
      throw new Error('Blockchain verification failed');
    }

   const verificationResult = await verifyResponse.json();

if (verificationResult?.isAuthentic !== true) {
  throw new Error(
    verificationResult?.message || 'Document hash does not match blockchain record'
  );
}

    // Update Firebase only after successful blockchain verification
    await update(ref(db, `cases/${caseId}`), {
      documentsVerified: true,
      status: 'Assigned'
    });


    // Record document verification in blockchain history
try {
  const historyResponse = await fetch(
    'http://localhost:8000/blockchain/record-case-event',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        caseId,
        eventType: 'DOCUMENT_VERIFIED',
        details: 'Clerk successfully verified the document hash on blockchain.',
        actorId: user?.uid || 'clerk'
      })
    }
  );

  if (!historyResponse.ok) {
    console.error('Document verification history recording failed');
  }
} catch (historyError) {
  console.error('Document history error:', historyError);
}
    // Clerk notification
    const notifRef = ref(db, `notifications/${user.uid}`);
    const notifKey = push(notifRef).key;

    await set(ref(db, `notifications/${user.uid}/${notifKey}`), {
      message: `Documents verified successfully on blockchain for case ${caseId}.`,
      read: false,
      timestamp: serverTimestamp(),
      type: 'verification'
    });

    alert('Document successfully verified on blockchain!');

  } catch (err) {
    console.error('Document verification error:', err);
    alert(err.message || 'Document verification failed');
  }

  setUpdating(null);
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
        .dashboard-background { position: fixed; inset: 0; z-index: 0; background: inherit; }
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
          position: relative; z-index: 1; max-width: 900px; width: 100%;
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
        .table-card {
          background: rgba(255,255,255,0.85) !important;
          backdrop-filter: blur(20px) !important;
          border: 1px solid rgba(255,255,255,0.9) !important;
          box-shadow: var(--shadow) !important;
          padding: 1.5rem;
          border-radius: var(--radius);
        }
        .table-responsive { overflow-x: auto; }
        .cases-table { width: 100%; border-collapse: collapse; font-size: 0.95rem; }
        .cases-table th { padding: 1rem 0.8rem; text-align: left; font-weight: 600; color: var(--black); border-bottom: 2px solid rgba(0,0,0,0.05); }
        .cases-table td { padding: 0.8rem; border-bottom: 1px solid rgba(0,0,0,0.04); color: var(--black); }
        .cases-table tbody tr:hover { background: rgba(79,195,247,0.05); }
        .status-badge { display: inline-block; padding: 0.2rem 0.8rem; border-radius: 50px; font-weight: 600; font-size: 0.8rem; background: rgba(255,154,86,0.15); color: #FF9A56; }
        .verify-btn {
          display: inline-flex; align-items: center; gap: 0.4rem;
          padding: 0.3rem 0.8rem;
          background: rgba(0,230,118,0.15);
          border: none;
          border-radius: 8px;
          color: #00E676;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s;
        }
        .verify-btn:hover { background: rgba(0,230,118,0.25); transform: translateY(-2px); }
        .verify-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .no-data { text-align: center; padding: 2rem; color: var(--gray); }
        @media (max-width: 768px) {
          .cases-table { font-size: 0.85rem; }
          .cases-table th, .cases-table td { padding: 0.5rem; }
        }
      `}</style>

      <div className="dashboard-page">
        <div className="dashboard-background"><div className="dashboard-particles"></div><div className="dashboard-gradient"></div></div>
        <div className="dashboard-container">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <button onClick={() => navigate(-1)} className="back-btn"><FaArrowLeft /> Back</button>
            <div className="page-header">
              <h1>Verify Documents</h1>
              <p>Review and verify submitted case documents</p>
            </div>
            <GlassCard className="table-card">
              <div className="table-responsive">
                <table className="cases-table">
                  <thead>
                    <tr><th>Case ID</th><th>Title</th><th>Parties</th><th>Status</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan="5" className="no-data">Loading...</td></tr>
                    ) : cases.length === 0 ? (
                      <tr><td colSpan="5" className="no-data">No pending verifications.</td></tr>
                    ) : (
                      cases.map(c => (
                        <tr key={c.id}>
                          <td><strong>{c.id}</strong></td>
                          <td>{c.title || 'Untitled'}</td>
                          <td>{c.parties ? c.parties.join(', ') : 'N/A'}</td>
                          <td><span className="status-badge">{c.status || 'Pending'}</span></td>
                          <td>
                            <button className="verify-btn" onClick={() => handleVerify(c.id)} disabled={updating === c.id}>
                              {updating === c.id ? '...' : <><FaCheckCircle /> Verify</>}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default VerifyDocuments;