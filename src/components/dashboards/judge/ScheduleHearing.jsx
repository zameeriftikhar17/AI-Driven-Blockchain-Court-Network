import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaClock,
  FaUser,
  FaFileAlt,
  FaPlus,
  FaTrash,
  FaSave,
  FaVideo,
  FaMapMarkerAlt,
  FaEdit,
  FaTimes,
  FaCheck
} from 'react-icons/fa';
import { ref, onValue, off, push, set, update, serverTimestamp } from "firebase/database";
import { auth, db } from "../../../firebase";
import GlassCard from '../../common/GlassCard';

const ScheduleHearing = () => {
  const navigate = useNavigate();
  const user = auth.currentUser;
  const [hearingForm, setHearingForm] = useState({
    caseId: '',
    title: '',
    date: '',
    time: '',
    duration: '60',
    type: 'in-person',
    location: '',
    notes: '',
    participants: [''],
  });
  const [scheduledHearings, setScheduledHearings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  useEffect(() => {
    if (!user) return;
    const hearingsRef = ref(db, 'hearings');
    const unsubscribe = onValue(hearingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const hearingsArray = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        // Filter hearings created by this judge (or assigned to this judge)
        const filtered = hearingsArray.filter(h => h.createdBy === user.uid || h.judgeId === user.uid);
        filtered.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
        setScheduledHearings(filtered);
      } else {
        setScheduledHearings([]);
      }
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });
    return () => off(hearingsRef);
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setHearingForm(prev => ({ ...prev, [name]: value }));
  };

  const handleParticipantChange = (index, value) => {
    const newParticipants = [...hearingForm.participants];
    newParticipants[index] = value;
    setHearingForm(prev => ({ ...prev, participants: newParticipants }));
  };

  const addParticipant = () => {
    setHearingForm(prev => ({
      ...prev,
      participants: [...prev.participants, '']
    }));
  };

  const removeParticipant = (index) => {
    if (hearingForm.participants.length > 1) {
      const newParticipants = hearingForm.participants.filter((_, i) => i !== index);
      setHearingForm(prev => ({ ...prev, participants: newParticipants }));
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      confirmed: { class: 'status-confirmed', text: 'Confirmed' },
      pending: { class: 'status-pending', text: 'Pending' },
      completed: { class: 'status-completed', text: 'Completed' },
      cancelled: { class: 'status-cancelled', text: 'Cancelled' }
    };
    return statusMap[status] || statusMap.pending;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);

    // Validate required fields
    if (!hearingForm.caseId || !hearingForm.title || !hearingForm.date || !hearingForm.time || !hearingForm.location) {
      alert('Please fill in all required fields.');
      setSubmitting(false);
      return;
    }

    // Filter empty participant entries
    const participants = hearingForm.participants.filter(p => p.trim() !== '');
    if (participants.length === 0) {
      alert('Please add at least one participant.');
      setSubmitting(false);
      return;
    }

    try {
      const hearingRef = ref(db, 'hearings');
      const newHearingKey = push(hearingRef).key;
      const hearingData = {
        id: newHearingKey,
        caseId: hearingForm.caseId.trim(),
        title: hearingForm.title.trim(),
        date: hearingForm.date,
        time: hearingForm.time,
        duration: hearingForm.duration,
        type: hearingForm.type,
        location: hearingForm.location.trim(),
        notes: hearingForm.notes.trim() || '',
        participants: participants,
        status: 'pending',
        judge: user.displayName || 'Judge',
        judgeId: user.uid,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      };

// Save hearing date on Hyperledger Fabric blockchain first
const blockchainResponse = await fetch(
  'http://localhost:8000/blockchain/schedule-hearing',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      caseId: hearingForm.caseId.trim(),
      hearingDate: hearingForm.date,
    }),
  }
);

if (!blockchainResponse.ok) {
  const errorText = await blockchainResponse.text();
  throw new Error(errorText || 'Blockchain hearing scheduling failed');
}


      await set(ref(db, `hearings/${newHearingKey}`), hearingData);

      // Record hearing scheduling in blockchain history
try {
  const historyResponse = await fetch(
    'http://localhost:8000/blockchain/record-case-event',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        caseId: hearingForm.caseId.trim(),
        eventType: 'HEARING_SCHEDULED',
        details: `Hearing "${hearingForm.title}" scheduled for ${hearingForm.date} at ${hearingForm.time}, Location: ${hearingForm.location}`,
        actorId: user.uid,
      }),
    }
  );

 if (!historyResponse.ok) {
  const errorText = await historyResponse.text();
  console.error('Hearing blockchain history recording failed:', errorText);
} else {
  const result = await historyResponse.json();
  console.log('Hearing history saved:', result);
}
} catch (historyError) {
  console.error('Hearing history error:', historyError);
}
      // Reset form
      setHearingForm({
        caseId: '',
        title: '',
        date: '',
        time: '',
        duration: '60',
        type: 'in-person',
        location: '',
        notes: '',
        participants: [''],
      });
      alert('Hearing scheduled successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to schedule hearing. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelHearing = async (hearingId) => {
    if (window.confirm('Are you sure you want to cancel this hearing?')) {
      try {
        await update(ref(db, `hearings/${hearingId}`), { status: 'cancelled' });
      } catch (err) {
        console.error(err);
        alert('Failed to cancel hearing.');
      }
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
          --light-gray: #F3F6FA;
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
          position: relative; z-index: 1; max-width: 1200px; width: 100%;
          animation: fadeSlideUp 0.8s var(--transition-smooth) both;
        }
        @keyframes fadeSlideUp {
          0% { opacity: 0; transform: translateY(40px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .dashboard-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;
        }
        .title-with-back {
          display: flex; align-items: center; gap: 1rem;
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
          text-decoration: none;
        }
        .back-btn:hover { background: white; transform: translateX(-4px); }
        .dashboard-title h1 { font-size: 2rem; font-weight: 800; color: var(--black); margin: 0; }
        .dashboard-title p { color: var(--gray); margin: 0; }
        .dashboard-actions { display: flex; gap: 0.8rem; }
        .action-icon-btn {
          width: 44px; height: 44px;
          background: rgba(255,255,255,0.7);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.8);
          border-radius: 50%;
          color: var(--black);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.3s;
        }
        .action-icon-btn:hover { background: white; transform: scale(1.05); }
        .schedule-grid {
          display: grid; grid-template-columns: 1fr 1.5fr; gap: 1.5rem;
        }
        .form-card, .list-card { padding: 1.5rem; }
        .form-card h3, .list-card h3 { margin: 0 0 1rem 0; color: var(--black); }
        .hearing-form { display: flex; flex-direction: column; gap: 1rem; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .form-group { display: flex; flex-direction: column; gap: 0.3rem; }
        .form-group label { font-weight: 600; color: var(--black); font-size: 0.9rem; }
        .form-group input, .form-group select, .form-group textarea {
          padding: 0.6rem 0.8rem; border: 2px solid #D1E8F5; border-radius: 8px;
          font-size: 0.95rem; transition: all 0.3s; font-family: inherit;
        }
        .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
          outline: none; border-color: var(--sky); box-shadow: 0 0 0 3px rgba(79,195,247,0.2);
        }
        .form-group textarea { resize: vertical; min-height: 60px; }
        .participant-input { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.4rem; }
        .participant-input input { flex: 1; }
        .remove-participant {
          background: none; border: none; color: #FF6B6B; cursor: pointer; padding: 0.2rem;
        }
        .remove-participant:hover { color: #FF4757; }
        .add-participant-btn {
          display: inline-flex; align-items: center; gap: 0.4rem;
          padding: 0.3rem 0.8rem; background: rgba(79,195,247,0.1);
          border: 1px solid var(--sky); border-radius: 8px; color: var(--sky-dark);
          cursor: pointer; transition: all 0.3s; font-weight: 500;
        }
        .add-participant-btn:hover { background: rgba(79,195,247,0.2); }
        .btn-primary-full {
          width: 100%; padding: 0.8rem;
          background: linear-gradient(135deg, var(--sky), var(--sky-dark));
          border: none; border-radius: 12px; color: white; font-weight: 600;
          display: flex; align-items: center; justify-content: center; gap: 0.6rem;
          cursor: pointer; transition: all 0.3s; font-size: 1rem;
        }
        .btn-primary-full:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(2,136,209,0.3); }
        .btn-primary-full:disabled { opacity: 0.6; cursor: not-allowed; }

        .scheduled-list { display: flex; flex-direction: column; gap: 1rem; }
        .scheduled-item {
          background: rgba(0,0,0,0.02); border-radius: 12px; padding: 1rem;
          transition: background 0.3s;
        }
        .scheduled-item:hover { background: rgba(0,0,0,0.04); }
        .scheduled-header {
          display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;
        }
        .scheduled-title { display: flex; align-items: center; gap: 0.8rem; }
        .hearing-id { font-size: 0.8rem; font-weight: 600; color: var(--sky-dark); background: rgba(79,195,247,0.1); padding: 0.1rem 0.5rem; border-radius: 50px; }
        .scheduled-title h4 { margin: 0; color: var(--black); }
        .status-badge { padding: 0.2rem 0.8rem; border-radius: 50px; font-size: 0.75rem; font-weight: 600; }
        .status-confirmed { background: rgba(0,230,118,0.15); color: #00E676; }
        .status-pending { background: rgba(255,154,86,0.15); color: #FF9A56; }
        .status-completed { background: rgba(79,195,247,0.15); color: #4FC3F7; }
        .status-cancelled { background: rgba(255,107,107,0.15); color: #FF6B6B; }
        .scheduled-details {
          display: flex; flex-wrap: wrap; gap: 1rem; margin: 0.5rem 0;
        }
        .detail-item { display: flex; align-items: center; gap: 0.3rem; color: var(--gray); font-size: 0.85rem; }
        .scheduled-participants {
          display: flex; align-items: center; gap: 0.3rem; color: var(--gray); font-size: 0.85rem; margin-bottom: 0.5rem;
        }
        .scheduled-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
        .btn-secondary-sm, .btn-primary-sm {
          padding: 0.2rem 0.8rem; border: none; border-radius: 6px; font-size: 0.8rem;
          cursor: pointer; transition: all 0.3s; display: inline-flex; align-items: center; gap: 0.3rem;
        }
        .btn-secondary-sm { background: rgba(0,0,0,0.06); color: var(--black); }
        .btn-secondary-sm:hover { background: rgba(0,0,0,0.1); }
        .btn-secondary-sm.danger { color: #FF6B6B; }
        .btn-secondary-sm.danger:hover { background: rgba(255,107,107,0.1); }
        .btn-primary-sm { background: var(--sky-dark); color: white; }
        .btn-primary-sm:hover { background: var(--sky); }
        .no-hearings { text-align: center; padding: 2rem; color: var(--gray); }

        @media (max-width: 992px) {
          .schedule-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 768px) {
          .form-row { grid-template-columns: 1fr; }
          .dashboard-title { flex-wrap: wrap; }
          .title-with-back { flex-wrap: wrap; }
        }
      `}</style>

      <div className="dashboard-page">
        <div className="dashboard-background"><div className="dashboard-particles"></div><div className="dashboard-gradient"></div></div>
        <div className="dashboard-container">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="dashboard-header">
              <div className="dashboard-title">
                <div className="title-with-back">
                  <Link to="/judge-dashboard" className="back-btn"><FaArrowLeft /> Back</Link>
                  <div>
                    <h1>Schedule Hearing</h1>
                    <p>Schedule and manage court hearings for your cases</p>
                  </div>
                </div>
              </div>
              <div className="dashboard-actions">
                <button className="action-icon-btn"><FaCalendarAlt /></button>
              </div>
            </div>

            <div className="schedule-grid">
              <motion.div className="schedule-form-section" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                <GlassCard className="form-card">
                  <h3>Schedule New Hearing</h3>
                  <form onSubmit={handleSubmit} className="hearing-form">
                    <div className="form-row">
                      <div className="form-group">
                        <label>Case ID</label>
                        <input type="text" name="caseId" value={hearingForm.caseId} onChange={handleInputChange} placeholder="e.g., 2026-C-020" required />
                      </div>
                      <div className="form-group">
                        <label>Hearing Title</label>
                        <input type="text" name="title" value={hearingForm.title} onChange={handleInputChange} placeholder="Enter hearing title" required />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Date</label>
                        <input type="date" name="date" value={hearingForm.date} onChange={handleInputChange} required />
                      </div>
                      <div className="form-group">
                        <label>Time</label>
                        <input type="time" name="time" value={hearingForm.time} onChange={handleInputChange} required />
                      </div>
                      <div className="form-group">
                        <label>Duration (minutes)</label>
                        <select name="duration" value={hearingForm.duration} onChange={handleInputChange} required>
                          <option value="30">30 min</option>
                          <option value="60">1 hour</option>
                          <option value="90">1.5 hours</option>
                          <option value="120">2 hours</option>
                          <option value="180">3 hours</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Hearing Type</label>
                        <select name="type" value={hearingForm.type} onChange={handleInputChange} required>
                          <option value="in-person">In-Person</option>
                          <option value="virtual">Virtual</option>
                          <option value="hybrid">Hybrid</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Location / Meeting Link</label>
                        <input type="text" name="location" value={hearingForm.location} onChange={handleInputChange} placeholder="Courtroom or meeting link" required />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Participants</label>
                      {hearingForm.participants.map((participant, index) => (
                        <div key={index} className="participant-input">
                          <input type="text" value={participant} onChange={(e) => handleParticipantChange(index, e.target.value)} placeholder={`Participant ${index + 1} (e.g., Plaintiff: John Doe)`} />
                          {hearingForm.participants.length > 1 && (
                            <button type="button" onClick={() => removeParticipant(index)} className="remove-participant"><FaTrash /></button>
                          )}
                        </div>
                      ))}
                      <button type="button" onClick={addParticipant} className="add-participant-btn"><FaPlus /> Add Participant</button>
                    </div>
                    <div className="form-group">
                      <label>Notes</label>
                      <textarea name="notes" value={hearingForm.notes} onChange={handleInputChange} placeholder="Additional notes or special requirements" rows="3" />
                    </div>
                    <button type="submit" className="btn-primary-full" disabled={submitting}><FaSave /> {submitting ? 'Scheduling...' : 'Schedule Hearing'}</button>
                  </form>
                </GlassCard>
              </motion.div>

              <motion.div className="scheduled-list-section" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
                <GlassCard className="list-card">
                  <h3>Scheduled Hearings</h3>
                  {loading ? (
                    <p className="no-hearings">Loading...</p>
                  ) : scheduledHearings.length === 0 ? (
                    <p className="no-hearings">No hearings scheduled.</p>
                  ) : (
                    <div className="scheduled-list">
                      {scheduledHearings.map((hearing) => (
                        <div key={hearing.id} className="scheduled-item">
                          <div className="scheduled-header">
                            <div className="scheduled-title">
                              <span className="hearing-id">{hearing.id}</span>
                              <h4>{hearing.title}</h4>
                            </div>
                            <span className={`status-badge ${getStatusBadge(hearing.status).class}`}>
                              {getStatusBadge(hearing.status).text}
                            </span>
                          </div>
                          <div className="scheduled-details">
                            <div className="detail-item"><FaCalendarAlt /> <span>{hearing.date}</span></div>
                            <div className="detail-item"><FaClock /> <span>{hearing.time} ({hearing.duration} min)</span></div>
                            <div className="detail-item">{hearing.type === 'virtual' ? <FaVideo /> : <FaMapMarkerAlt />} <span>{hearing.location}</span></div>
                            <div className="detail-item"><FaFileAlt /> <span>Case: {hearing.caseId}</span></div>
                          </div>
                          <div className="scheduled-participants">
                            <FaUser /> <span>{hearing.participants.join(' • ')}</span>
                          </div>
                          <div className="scheduled-actions">
                            <Link to={`/judge-dashboard/hearing/${hearing.id}`} className="btn-primary-sm"><FaCheck /> View</Link>
                            {hearing.status !== 'cancelled' && (
                              <button className="btn-secondary-sm danger" onClick={() => handleCancelHearing(hearing.id)}><FaTimes /> Cancel</button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </GlassCard>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default ScheduleHearing;