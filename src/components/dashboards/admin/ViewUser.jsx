import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  FaArrowLeft,
  FaUser,
  FaEnvelope,
  FaPhone,
  FaIdCard,
  FaUserTag,
  FaCalendarAlt,
  FaCircle
} from 'react-icons/fa';
import { ref, onValue, off } from "firebase/database";
import { auth, db } from "../../../firebase";

const ViewUser = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = auth.currentUser;

  const [userData, setUserData] = useState(null);
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
        setUserData({
          id: id,
          ...data
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

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    if (typeof timestamp === 'string') return timestamp.split('T')[0];
    return new Date(timestamp).toISOString().split('T')[0];
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <p>Loading user...</p>
      </div>
    );
  }

  if (error || !userData) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: '2rem' }}>
        <p style={{ color: '#D32F2F' }}>{error || 'User not found.'}</p>
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
        .user-details-card {
          background: rgba(255,255,255,0.85);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.9);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          padding: 2rem;
          max-width: 700px;
          margin: 0 auto;
        }
        .user-profile-header {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid rgba(0,0,0,0.06);
          margin-bottom: 1.5rem;
        }
        .user-profile-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 72px;
          height: 72px;
          background: rgba(79,195,247,0.1);
          border-radius: 50%;
          color: var(--sky-dark);
          font-size: 2.2rem;
        }
        .user-profile-header h2 {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--black);
          margin: 0;
        }
        .role-badge {
          padding: 0.15rem 0.7rem;
          border-radius: 50px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: capitalize;
          display: inline-block;
        }
        .role-badge.citizen {
          background: #DBEAFE;
          color: #1E40AF;
        }
        .role-badge.lawyer {
          background: #D1FAE5;
          color: #065F46;
        }
        .role-badge.judge {
          background: #FEF3C7;
          color: #92400E;
        }
        .role-badge.clerk {
          background: #FCE7F3;
          color: #9D174D;
        }
        .role-badge.admin {
          background: #FEE2E2;
          color: #991B1B;
        }
        .user-details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.2rem;
        }
        .user-detail-item {
          display: flex;
          align-items: center;
          gap: 0.8rem;
          padding: 0.6rem 0.8rem;
          background: rgba(0,0,0,0.02);
          border-radius: 8px;
        }
        .user-detail-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(79,195,247,0.1);
          color: var(--sky-dark);
          flex-shrink: 0;
        }
        .user-detail-item div {
          display: flex;
          flex-direction: column;
        }
        .user-detail-item span {
          font-size: 0.7rem;
          color: var(--gray);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .user-detail-item strong {
          font-size: 0.95rem;
          color: var(--black);
          font-weight: 600;
        }
        .status-badge {
          padding: 0.15rem 0.7rem;
          border-radius: 50px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: capitalize;
        }
        .status-badge.active {
          background: #D1FAE5;
          color: #065F46;
        }
        .status-badge.inactive {
          background: #FEE2E2;
          color: #991B1B;
        }
        .user-details-actions {
          display: flex;
          gap: 1rem;
          margin-top: 2rem;
          justify-content: flex-end;
          flex-wrap: wrap;
        }
        .user-edit-link, .user-back-link {
          padding: 0.6rem 1.5rem;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          transition: 0.3s;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }
        .user-edit-link {
          background: linear-gradient(135deg, var(--sky), var(--sky-dark));
          color: white;
          box-shadow: 0 4px 15px rgba(79,195,247,0.3);
        }
        .user-edit-link:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(2,136,209,0.4);
        }
        .user-back-link {
          background: rgba(0,0,0,0.06);
          color: var(--black);
        }
        .user-back-link:hover {
          background: rgba(0,0,0,0.1);
        }
        @media (max-width: 768px) {
          .user-management-page {
            padding: 1rem;
          }
          .user-details-grid {
            grid-template-columns: 1fr;
          }
          .user-heading h1 {
            font-size: 1.8rem;
          }
          .user-details-card {
            padding: 1.5rem;
          }
          .user-profile-header {
            flex-direction: column;
            text-align: center;
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
              <div className="user-heading-icon"><FaUser /></div>
              <div>
                <h1>User Details</h1>
                <p>View registered user information</p>
              </div>
            </div>
          </div>
        </div>

        <div className="user-details-card">
          <div className="user-profile-header">
            <div className="user-profile-icon"><FaUser /></div>
            <div>
              <h2>{userData.fullName || userData.name || 'N/A'}</h2>
              <span className={`role-badge ${(userData.role || 'citizen').toLowerCase()}`}>
                {userData.role || 'Citizen'}
              </span>
            </div>
          </div>

          <div className="user-details-grid">
            <div className="user-detail-item">
              <div className="user-detail-icon"><FaIdCard /></div>
              <div>
                <span>User ID</span>
                <strong>{userData.id}</strong>
              </div>
            </div>
            <div className="user-detail-item">
              <div className="user-detail-icon"><FaEnvelope /></div>
              <div>
                <span>Email</span>
                <strong>{userData.email || 'N/A'}</strong>
              </div>
            </div>
            <div className="user-detail-item">
              <div className="user-detail-icon"><FaPhone /></div>
              <div>
                <span>Phone</span>
                <strong>{userData.phone || 'N/A'}</strong>
              </div>
            </div>
            <div className="user-detail-item">
              <div className="user-detail-icon"><FaUserTag /></div>
              <div>
                <span>Role</span>
                <strong>{userData.role || 'Citizen'}</strong>
              </div>
            </div>
            <div className="user-detail-item">
              <div className="user-detail-icon"><FaCalendarAlt /></div>
              <div>
                <span>Registration Date</span>
                <strong>{formatDate(userData.createdAt)}</strong>
              </div>
            </div>
            <div className="user-detail-item">
              <div className="user-detail-icon"><FaCircle /></div>
              <div>
                <span>Account Status</span>
                <strong>
                  <span className={`status-badge ${(userData.status || 'Active').toLowerCase()}`}>
                    {userData.status || 'Active'}
                  </span>
                </strong>
              </div>
            </div>
          </div>

          <div className="user-details-actions">
            <Link to={`/admin-dashboard/users/edit/${userData.id}`} className="user-edit-link">
              Edit User
            </Link>
            <Link to="/admin-dashboard/users" className="user-back-link">
              Back to Users
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default ViewUser;