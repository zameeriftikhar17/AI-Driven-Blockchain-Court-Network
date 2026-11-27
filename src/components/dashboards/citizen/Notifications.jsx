import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  FaBell, 
  FaCheck, 
  FaTrash, 
  FaClock, 
  FaGavel, 
  FaFileAlt,
  FaUser,
  FaLink,
  FaCheckCircle,
  FaExclamationTriangle,
  FaArrowLeft
} from 'react-icons/fa';
import { ref, onValue, off, update, remove } from "firebase/database";
import { auth, db } from "../../../firebase";
import { onAuthStateChanged } from 'firebase/auth';
import GlassCard from '../../common/GlassCard';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
const [authLoading, setAuthLoading] = useState(true);


useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
    setUser(currentUser);
    setAuthLoading(false);

    if (!currentUser) {
      navigate('/login');
    }
  });

  return unsubscribe;
}, [navigate]);


  useEffect(() => {
    if (authLoading || !user) return;

    const notifRef = ref(db, `notifications/${user.uid}`);
    const unsubscribe = onValue(notifRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const notifArray = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
     notifArray.sort((a, b) => {
  const timeA = new Date(a.timestamp || 0).getTime();
  const timeB = new Date(b.timestamp || 0).getTime();
  return timeB - timeA;
});
        setNotifications(notifArray);
      } else {
        setNotifications([]);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching notifications:', error);
      setLoading(false);
    });

    return () => off(notifRef);
  }, [user, authLoading]);

  const markAsRead = (id) => {
    if (!user) return;
    const notifRef = ref(db, `notifications/${user.uid}/${id}`);
    update(notifRef, { read: true })
      .catch(err => console.error('Error marking as read:', err));
  };

  const markAllAsRead = () => {
    if (!user) return;
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;

    const updates = {};
    unreadIds.forEach(id => {
      updates[`notifications/${user.uid}/${id}/read`] = true;
    });
    update(ref(db), updates)
      .catch(err => console.error('Error marking all as read:', err));
  };

  const deleteNotification = (id) => {
    if (!user) return;
    const notifRef = ref(db, `notifications/${user.uid}/${id}`);
    remove(notifRef)
      .catch(err => console.error('Error deleting notification:', err));
  };

  const getFilteredNotifications = () => {
    if (filter === 'all') return notifications;
    if (filter === 'unread') return notifications.filter(n => !n.read);
    if (filter === 'read') return notifications.filter(n => n.read);
    return notifications.filter(n => n.type === filter);
  };

  const filteredNotifications = getFilteredNotifications();
  const unreadCount = notifications.filter(n => !n.read).length;

  const getTypeColor = (type) => {
    const colors = {
      hearing: '#4A6CF7',
      update: '#FF9A56',
      verification: '#00E676',
      reminder: '#FFD740',
      decision: '#7C4DFF',
      document: '#00BCD4',
      assignment: '#FF4081',
      blockchain: '#00D4FF',
      action: '#FF6B6B'
    };
    return colors[type] || '#4A6CF7';
  };

  const getTypeLabel = (type) => {
    const labels = {
      hearing: 'Hearing',
      update: 'Update',
      verification: 'Verification',
      reminder: 'Reminder',
      decision: 'Decision',
      document: 'Document',
      assignment: 'Assignment',
      blockchain: 'Blockchain',
      action: 'Action Required'
    };
    return labels[type] || type;
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
          --shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
          --radius: 16px;
          --transition-smooth: cubic-bezier(0.4, 0, 0.2, 1);
        }

        .dashboard-page {
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

        .dashboard-background {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 0;
          background: inherit;
        }
        .dashboard-particles {
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
        .dashboard-gradient {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 40%;
          background: linear-gradient(to top, rgba(255,255,255,0.6) 0%, transparent 100%);
        }

        .dashboard-container {
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

        .back-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 1.2rem;
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.8);
          border-radius: 50px;
          color: var(--black);
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s;
          margin-bottom: 1.5rem;
        }
        .back-btn:hover {
          background: white;
          transform: translateX(-4px);
        }

        .page-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        .page-header h1 {
          font-size: 2.5rem;
          font-weight: 800;
          color: var(--black);
          margin-bottom: 0.5rem;
        }
        .page-header p {
          color: var(--gray);
          font-size: 1.1rem;
        }

        .notifications-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .notif-stats {
          display: flex;
          gap: 1.2rem;
          align-items: center;
        }
        .notif-count {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          font-weight: 600;
          color: var(--black);
          background: rgba(255, 255, 255, 0.7);
          padding: 0.4rem 1rem;
          border-radius: 50px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.8);
        }
        .notif-total {
          color: var(--gray);
          font-size: 0.9rem;
        }
        .notif-actions {
          display: flex;
          gap: 0.8rem;
          align-items: center;
          flex-wrap: wrap;
        }
        .mark-all-btn {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.4rem 1.2rem;
          background: rgba(79, 195, 247, 0.15);
          border: 1px solid rgba(79, 195, 247, 0.3);
          border-radius: 50px;
          color: var(--sky-dark);
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.3s;
        }
        .mark-all-btn:hover {
          background: rgba(79, 195, 247, 0.25);
          transform: translateY(-2px);
        }
        .filter-select-notif {
          padding: 0.4rem 1rem;
          border: 2px solid #D1E8F5;
          border-radius: 50px;
          background: white;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.3s;
        }
        .filter-select-notif:focus {
          outline: none;
          border-color: var(--sky);
          box-shadow: 0 0 0 4px rgba(79, 195, 247, 0.2);
        }

        .notifications-card-full {
          background: rgba(255, 255, 255, 0.85) !important;
          backdrop-filter: blur(20px) !important;
          border: 1px solid rgba(255, 255, 255, 0.9) !important;
          box-shadow: var(--shadow) !important;
          padding: 1.5rem;
          border-radius: var(--radius);
        }
        .notif-header {
          margin-bottom: 1.5rem;
        }
        .notif-header h3 {
          color: var(--black);
          font-size: 1.2rem;
          font-weight: 700;
        }

        .notif-list-full {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }

        .notif-item-full {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.8rem 1rem;
          background: rgba(0, 0, 0, 0.02);
          border-radius: 12px;
          transition: all 0.3s;
        }
        .notif-item-full.unread {
          background: rgba(79, 195, 247, 0.05);
          border-left: 4px solid var(--sky);
        }
        .notif-item-full:hover {
          background: rgba(0, 0, 0, 0.04);
        }

        .notif-icon-wrapper {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .notif-icon {
          font-size: 1.1rem;
        }

        .notif-content {
          flex: 1;
          min-width: 0;
        }
        .notif-message {
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
        }
        .notif-type {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .notif-message p {
          margin: 0;
          color: var(--black);
          font-size: 0.9rem;
          word-wrap: break-word;
        }
        .notif-meta {
          display: flex;
          gap: 1rem;
          align-items: center;
          margin-top: 0.2rem;
        }
        .notif-time {
          font-size: 0.75rem;
          color: var(--gray);
        }
        .mark-read-btn {
          background: none;
          border: none;
          color: var(--sky-dark);
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          padding: 0;
          transition: color 0.3s;
        }
        .mark-read-btn:hover {
          color: var(--sky);
          text-decoration: underline;
        }

        .notif-actions-dropdown {
          display: flex;
          gap: 0.3rem;
          flex-shrink: 0;
        }
        .notif-action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 50%;
          background: transparent;
          color: var(--gray);
          cursor: pointer;
          transition: all 0.3s;
        }
        .notif-action-btn:hover {
          background: rgba(0, 0, 0, 0.05);
          color: var(--black);
        }
        .notif-action-btn.delete:hover {
          background: rgba(255, 107, 107, 0.1);
          color: #FF6B6B;
        }

        .empty-notifications {
          text-align: center;
          padding: 3rem 1rem;
        }
        .empty-icon {
          font-size: 3rem;
          color: #D1E8F5;
          margin-bottom: 0.5rem;
        }
        .empty-notifications h4 {
          color: var(--black);
          font-size: 1.2rem;
          margin-bottom: 0.2rem;
        }
        .empty-notifications p {
          color: var(--gray);
        }

        @media (max-width: 768px) {
          .notifications-controls {
            flex-direction: column;
            align-items: stretch;
          }
          .notif-item-full {
            flex-wrap: wrap;
            gap: 0.5rem;
          }
          .notif-actions-dropdown {
            margin-left: auto;
          }
          .page-header h1 {
            font-size: 2rem;
          }
        }
        @media (max-width: 480px) {
          .notif-item-full {
            flex-direction: column;
            align-items: flex-start;
          }
          .notif-actions-dropdown {
            margin-left: 0;
            width: 100%;
            justify-content: flex-end;
          }
        }
      `}</style>

      <div className="dashboard-page">
        <div className="dashboard-background">
          <div className="dashboard-particles"></div>
          <div className="dashboard-gradient"></div>
        </div>

        <div className="dashboard-container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Back Button */}
            <button onClick={() => navigate(-1)} className="back-btn">
              <FaArrowLeft /> Back
            </button>

            <div className="page-header">
              <h1>Notifications</h1>
              <p>Stay updated with your case activities and system updates</p>
            </div>

            <div className="notifications-controls">
              <div className="notif-stats">
                <span className="notif-count">
                  <FaBell /> {unreadCount} Unread
                </span>
                <span className="notif-total">
                  Total: {notifications.length}
                </span>
              </div>
              <div className="notif-actions">
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} className="mark-all-btn" type="button">
                    <FaCheck /> Mark All Read
                  </button>
                )}
                <select 
                  value={filter} 
                  onChange={(e) => setFilter(e.target.value)}
                  className="filter-select-notif"
                >
                  <option value="all">All</option>
                  <option value="unread">Unread</option>
                  <option value="read">Read</option>
                  <option value="hearing">Hearings</option>
                  <option value="update">Updates</option>
                  <option value="verification">Verifications</option>
                  <option value="decision">Decisions</option>
                  <option value="action">Action Required</option>
                </select>
              </div>
            </div>

            <GlassCard className="notifications-card-full">
              <div className="notif-header">
                <h3>All Notifications</h3>
              </div>

              {loading ? (
                <div className="empty-notifications">
                  <p>Loading...</p>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="empty-notifications">
                  <FaBell className="empty-icon" />
                  <h4>No notifications</h4>
                  <p>You&apos;re all caught up!</p>
                </div>
              ) : (
                <div className="notif-list-full">
                  {filteredNotifications.map((notif, index) => (
                    <motion.div
                      key={notif.id}
                      className={`notif-item-full ${notif.read ? 'read' : 'unread'}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <div 
                        className="notif-icon-wrapper"
                        style={{ background: `${getTypeColor(notif.type)}20` }}
                      >
                        <div className="notif-icon" style={{ color: getTypeColor(notif.type) }}>
                          {notif.icon || <FaBell />}
                        </div>
                      </div>
                      
                      <div className="notif-content">
                        <div className="notif-message">
                          <span className="notif-type" style={{ color: getTypeColor(notif.type) }}>
                            {getTypeLabel(notif.type)}
                          </span>
                          <p>{notif.message}</p>
                        </div>
                        <div className="notif-meta">
                          <span className="notif-time">{notif.time || 'Just now'}</span>
                          {!notif.read && (
                            <button 
                              onClick={() => markAsRead(notif.id)}
                              className="mark-read-btn"
                              type="button"
                            >
                              Mark as read
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="notif-actions-dropdown">
                        {!notif.read && (
                          <button 
                            onClick={() => markAsRead(notif.id)}
                            className="notif-action-btn"
                            title="Mark as read"
                            type="button"
                          >
                            <FaCheck />
                          </button>
                        )}
                        <button 
                          onClick={() => deleteNotification(notif.id)}
                          className="notif-action-btn delete"
                          title="Delete notification"
                          type="button"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default Notifications;