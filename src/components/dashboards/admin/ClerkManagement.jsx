import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaArrowLeft,
  FaSearch,
  FaEdit,
  FaToggleOn,
  FaToggleOff,
  FaUserTie,
  FaPlus
} from 'react-icons/fa';
import { ref, onValue, off, update } from "firebase/database";
import { auth, db } from "../../../firebase";

const ClerkManagement = () => {
  const navigate = useNavigate();
  const user = auth.currentUser;
  const [clerks, setClerks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  useEffect(() => {
    if (!user) return;

    const usersRef = ref(db, 'users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const clerksArray = Object.keys(data)
          .filter(key => data[key].role === 'clerk')
          .map(key => ({
            id: key,
            clerkId: key.slice(0, 8).toUpperCase(),
            ...data[key]
          }));
        setClerks(clerksArray);
      } else {
        setClerks([]);
      }
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });

    return () => off(usersRef);
  }, [user]);

  const toggleStatus = async (clerk) => {
    const newStatus = clerk.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await update(ref(db, `users/${clerk.id}`), { status: newStatus });
    } catch (err) {
      console.error(err);
    }
  };

  const filteredClerks = clerks.filter((clerk) => {
    const searchText = search.toLowerCase();
    return (
      (clerk.fullName || '').toLowerCase().includes(searchText) ||
      (clerk.clerkId || '').toLowerCase().includes(searchText) ||
      (clerk.email || '').toLowerCase().includes(searchText) ||
      (clerk.phone || '').toLowerCase().includes(searchText) ||
      (clerk.court || '').toLowerCase().includes(searchText)
    );
  });

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
        .clerk-management-page {
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
        .clerk-page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          flex-wrap: wrap;
          gap: 1rem;
          background: rgba(255,255,255,0.7);
          backdrop-filter: blur(10px);
          padding: 1.5rem 2rem;
          border-radius: var(--radius);
          box-shadow: var(--shadow);
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
        .clerk-heading {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-top: 0.5rem;
        }
        .clerk-heading-icon {
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
        .clerk-heading h1 {
          font-size: 2.2rem;
          font-weight: 800;
          color: var(--black);
          margin: 0;
        }
        .clerk-heading p {
          color: var(--gray);
          margin: 0;
        }
        .add-clerk-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 1.5rem;
          background: linear-gradient(135deg, var(--sky), var(--sky-dark));
          color: white;
          border: none;
          border-radius: 50px;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.3s;
          box-shadow: 0 4px 15px rgba(79,195,247,0.3);
        }
        .add-clerk-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(2,136,209,0.4);
        }
        .clerk-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1.5rem;
          flex-wrap: wrap;
          margin-bottom: 2rem;
          background: rgba(255,255,255,0.7);
          backdrop-filter: blur(10px);
          padding: 1rem 1.5rem;
          border-radius: var(--radius);
          box-shadow: var(--shadow);
        }
        .clerk-search {
          flex: 1;
          position: relative;
          min-width: 200px;
        }
        .clerk-search svg {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--gray);
        }
        .clerk-search input {
          width: 100%;
          padding: 0.6rem 1rem 0.6rem 2.8rem;
          border: 2px solid #D1E8F5;
          border-radius: 50px;
          font-size: 0.95rem;
          background: var(--white);
          transition: 0.3s;
        }
        .clerk-search input:focus {
          outline: none;
          border-color: var(--sky);
          box-shadow: 0 0 0 4px rgba(79,195,247,0.2);
        }
        .clerk-count {
          color: var(--gray);
          font-size: 0.95rem;
        }
        .clerk-count strong {
          color: var(--black);
        }
        .clerks-table-container {
          background: rgba(255,255,255,0.85);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.9);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          overflow: hidden;
          padding: 1.5rem;
        }
        .clerks-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.9rem;
        }
        .clerks-table th {
          padding: 0.8rem 0.6rem;
          text-align: left;
          font-weight: 600;
          color: var(--black);
          border-bottom: 2px solid rgba(0,0,0,0.05);
          white-space: nowrap;
        }
        .clerks-table td {
          padding: 0.8rem 0.6rem;
          border-bottom: 1px solid rgba(0,0,0,0.04);
        }
        .clerks-table tr:hover {
          background: rgba(79,195,247,0.04);
        }
        .role-badge {
          background: rgba(79,195,247,0.1);
          color: var(--sky-dark);
          padding: 0.1rem 0.6rem;
          border-radius: 50px;
          font-size: 0.8rem;
          font-weight: 500;
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
        .clerk-actions {
          display: flex;
          gap: 0.4rem;
          flex-wrap: wrap;
        }
        .clerk-actions button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: 0.3s;
          font-size: 0.85rem;
        }
        .edit-btn {
          background: rgba(255,154,86,0.1);
          color: #FF9A56;
        }
        .edit-btn:hover {
          background: rgba(255,154,86,0.2);
          transform: scale(1.05);
        }
        .status-btn {
          background: rgba(0,230,118,0.1);
          color: #00E676;
        }
        .status-btn:hover {
          background: rgba(0,230,118,0.2);
          transform: scale(1.05);
        }
        .no-clerks {
          text-align: center;
          padding: 2rem;
          color: var(--gray);
        }
        .loading-text {
          text-align: center;
          padding: 2rem;
          color: var(--gray);
        }
        @media (max-width: 992px) {
          .clerk-toolbar {
            flex-direction: column;
            align-items: stretch;
          }
          .clerks-table {
            font-size: 0.8rem;
          }
          .clerks-table th, .clerks-table td {
            padding: 0.4rem 0.3rem;
          }
        }
        @media (max-width: 768px) {
          .clerk-management-page {
            padding: 1rem;
          }
          .clerk-page-header {
            padding: 1rem;
            flex-direction: column;
            align-items: stretch;
          }
          .clerk-heading h1 {
            font-size: 1.8rem;
          }
          .clerks-table {
            font-size: 0.7rem;
          }
          .clerks-table th, .clerks-table td {
            padding: 0.2rem 0.2rem;
          }
          .clerk-actions button {
            width: 28px;
            height: 28px;
            font-size: 0.75rem;
          }
        }
        @media (max-width: 480px) {
          .clerk-heading {
            flex-direction: column;
            align-items: flex-start;
          }
          .add-clerk-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>

      <div className="clerk-management-page">
        <div className="clerk-page-header">
          <div>
            <Link to="/admin-dashboard" className="back-button">
              <FaArrowLeft /> Back to Dashboard
            </Link>
            <div className="clerk-heading">
              <div className="clerk-heading-icon"><FaUserTie /></div>
              <div>
                <h1>Clerk Management</h1>
                <p>Register, manage and monitor court clerks</p>
              </div>
            </div>
          </div>
          <Link to="/admin-dashboard/clerks/add" className="add-clerk-btn">
            <FaPlus /> Add Clerk
          </Link>
        </div>

        <div className="clerk-toolbar">
          <div className="clerk-search">
            <FaSearch />
            <input
              type="text"
              placeholder="Search clerk, ID, email or court..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="clerk-count">
            Total Clerks: <strong>{clerks.length}</strong>
          </div>
        </div>

        <div className="clerks-table-container">
          {loading ? (
            <div className="loading-text">Loading clerks...</div>
          ) : (
            <table className="clerks-table">
              <thead>
                <tr>
                  <th>Clerk ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Court</th>
                  <th>Experience</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClerks.map((clerk) => (
                  <tr key={clerk.id}>
                    <td><strong>{clerk.clerkId}</strong></td>
                    <td>{clerk.fullName || clerk.name || 'N/A'}</td>
                    <td>{clerk.email || 'N/A'}</td>
                    <td>{clerk.phone || 'N/A'}</td>
                    <td>{clerk.court || 'N/A'}</td>
                    <td>{clerk.experience ? `${clerk.experience} years` : 'N/A'}</td>
                    <td>
                      <span className={`status-badge ${(clerk.status || 'Active').toLowerCase()}`}>
                        {clerk.status || 'Active'}
                      </span>
                    </td>
                    <td>
                      <div className="clerk-actions">
                        <button
                          type="button"
                          className="edit-btn"
                          title="Edit Clerk"
                          onClick={() => navigate(`/admin-dashboard/clerks/edit/${clerk.id}`)}
                        >
                          <FaEdit />
                        </button>
                        <button
                          type="button"
                          className="status-btn"
                          title="Change Status"
                          onClick={() => toggleStatus(clerk)}
                        >
                          {clerk.status === 'Active' ? <FaToggleOn /> : <FaToggleOff />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && filteredClerks.length === 0 && (
            <div className="no-clerks">No clerks found.</div>
          )}
        </div>
      </div>
    </>
  );
};

export default ClerkManagement;