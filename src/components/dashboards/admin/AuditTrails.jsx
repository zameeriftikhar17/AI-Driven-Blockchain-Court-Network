import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FaArrowLeft,
  FaSearch,
  FaShieldAlt,
  FaUser,
  FaFileAlt,
  FaRobot,
  FaDatabase,
  FaGavel,
  FaUserTie
} from 'react-icons/fa';
import { ref, onValue, off } from "firebase/database";
import { auth, db } from "../../../firebase";

const AuditTrails = () => {
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('All');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const logsRef = ref(db, 'systemLogs');
    const unsubscribe = onValue(logsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const logsArray = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        // Sort by timestamp descending (newest first)
       logsArray.sort((a, b) => {
  const timeA = new Date(a.timestamp || 0).getTime();
  const timeB = new Date(b.timestamp || 0).getTime();

  return timeB - timeA;
});
        setLogs(logsArray);
      } else {
        setLogs([]);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching audit logs:', error);
      setLoading(false);
    });
    return () => off(logsRef);
  }, []);

  const getModuleIcon = (module) => {
    switch (module) {
      case 'AI': return <FaRobot />;
      case 'Blockchain': return <FaDatabase />;
      case 'Judges': return <FaGavel />;
      case 'Users': return <FaUser />;
      case 'Clerks': return <FaUserTie />;
      case 'Cases': return <FaFileAlt />;
      default: return <FaShieldAlt />;
    }
  };

  const filteredLogs = logs.filter((log) => {
    const searchText = search.toLowerCase();
    const matchesSearch =
      (log.user || '').toLowerCase().includes(searchText) ||
      (log.action || '').toLowerCase().includes(searchText) ||
      (log.module || '').toLowerCase().includes(searchText) ||
      (log.details || '').toLowerCase().includes(searchText);
    const matchesModule = moduleFilter === 'All' || log.module === moduleFilter;
    return matchesSearch && matchesModule;
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
        .audit-page {
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
        .audit-page-header {
          margin-bottom: 2rem;
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
        .audit-heading {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-top: 0.5rem;
        }
        .audit-heading-icon {
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
        .audit-heading h1 {
          font-size: 2.2rem;
          font-weight: 800;
          color: var(--black);
          margin: 0;
        }
        .audit-heading p {
          color: var(--gray);
          margin: 0;
        }
        .audit-toolbar {
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
        .audit-search {
          flex: 1;
          position: relative;
          min-width: 200px;
        }
        .audit-search svg {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--gray);
        }
        .audit-search input {
          width: 100%;
          padding: 0.6rem 1rem 0.6rem 2.8rem;
          border: 2px solid #D1E8F5;
          border-radius: 50px;
          font-size: 0.95rem;
          background: var(--white);
          transition: 0.3s;
        }
        .audit-search input:focus {
          outline: none;
          border-color: var(--sky);
          box-shadow: 0 0 0 4px rgba(79,195,247,0.2);
        }
        .audit-filters {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .audit-filter {
          padding: 0.6rem 1.2rem;
          border: 2px solid #D1E8F5;
          border-radius: 50px;
          background: var(--white);
          font-size: 0.9rem;
          cursor: pointer;
          transition: 0.3s;
        }
        .audit-filter:focus {
          outline: none;
          border-color: var(--sky);
        }
        .audit-count {
          color: var(--gray);
          font-size: 0.95rem;
        }
        .audit-count strong {
          color: var(--black);
        }
        .audit-table-container {
          background: rgba(255,255,255,0.85);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.9);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          overflow: hidden;
          padding: 1.5rem;
        }
        .audit-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.9rem;
        }
        .audit-table th {
          padding: 0.8rem 0.6rem;
          text-align: left;
          font-weight: 600;
          color: var(--black);
          border-bottom: 2px solid rgba(0,0,0,0.05);
          white-space: nowrap;
        }
        .audit-table td {
          padding: 0.8rem 0.6rem;
          border-bottom: 1px solid rgba(0,0,0,0.04);
        }
        .audit-table tr:hover {
          background: rgba(79,195,247,0.04);
        }
        .audit-user {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        .audit-user-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          background: rgba(79,195,247,0.1);
          border-radius: 50%;
          color: var(--sky-dark);
          font-size: 0.8rem;
        }
        .audit-action {
          color: var(--black);
        }
        .audit-module {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          padding: 0.1rem 0.6rem;
          background: rgba(0,0,0,0.04);
          border-radius: 50px;
          font-size: 0.8rem;
          color: var(--gray);
        }
        .audit-details {
          color: var(--black);
          font-size: 0.85rem;
        }
        .audit-status {
          padding: 0.15rem 0.7rem;
          border-radius: 50px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: capitalize;
        }
        .audit-status.success {
          background: #D1FAE5;
          color: #065F46;
        }
        .audit-status.failed {
          background: #FEE2E2;
          color: #991B1B;
        }
        .audit-status.pending {
          background: #FEF3C7;
          color: #92400E;
        }
        .no-audit-logs {
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
          .audit-toolbar {
            flex-direction: column;
            align-items: stretch;
          }
          .audit-table {
            font-size: 0.8rem;
          }
          .audit-table th, .audit-table td {
            padding: 0.4rem 0.3rem;
          }
        }
        @media (max-width: 768px) {
          .audit-page {
            padding: 1rem;
          }
          .audit-page-header {
            padding: 1rem;
          }
          .audit-heading h1 {
            font-size: 1.8rem;
          }
          .audit-table {
            font-size: 0.7rem;
          }
          .audit-table th, .audit-table td {
            padding: 0.2rem 0.2rem;
          }
        }
        @media (max-width: 480px) {
          .audit-heading {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>

      <div className="audit-page">
        <div className="audit-page-header">
          <Link to="/admin-dashboard" className="back-button">
            <FaArrowLeft /> Back to Dashboard
          </Link>
          <div className="audit-heading">
            <div className="audit-heading-icon"><FaShieldAlt /></div>
            <div>
              <h1>Audit Trails</h1>
              <p>Monitor and review system activities</p>
            </div>
          </div>
        </div>

        <div className="audit-toolbar">
          <div className="audit-search">
            <FaSearch />
            <input
              type="text"
              placeholder="Search user, action or module..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="audit-filters">
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="audit-filter"
            >
              <option value="All">All Modules</option>
              <option value="Users">Users</option>
              <option value="Judges">Judges</option>
              <option value="Clerks">Clerks</option>
              <option value="Cases">Cases</option>
              <option value="AI">AI</option>
              <option value="Blockchain">Blockchain</option>
            </select>
            <div className="audit-count">
              Total Logs: <strong>{filteredLogs.length}</strong>
            </div>
          </div>
        </div>

        <div className="audit-table-container">
          {loading ? (
            <div className="loading-text">Loading audit logs...</div>
          ) : (
            <table className="audit-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Action</th>
                  <th>Module</th>
                  <th>Details</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <div className="audit-user">
                        <div className="audit-user-icon"><FaUser /></div>
                        <span>{log.user || 'System'}</span>
                      </div>
                    </td>
                    <td><strong className="audit-action">{log.action}</strong></td>
                    <td>
                      <span className="audit-module">
                        {getModuleIcon(log.module)}
                        {log.module || 'General'}
                      </span>
                    </td>
                    <td><span className="audit-details">{log.details || log.message || 'N/A'}</span></td>
                    <td>{log.date || (log.timestamp ? new Date(log.timestamp).toLocaleDateString() : 'N/A')}</td>
                    <td>{log.time || (log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'N/A')}</td>
                    <td>
                      <span className={`audit-status ${(log.status || 'success').toLowerCase()}`}>
                        {log.status || 'Success'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && filteredLogs.length === 0 && (
            <div className="no-audit-logs">No audit records found.</div>
          )}
        </div>
      </div>
    </>
  );
};

export default AuditTrails;