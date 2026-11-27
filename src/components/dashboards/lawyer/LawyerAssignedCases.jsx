import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaSearch,
  FaFileAlt,
  FaUpload,
  FaEye,
  FaFilter,
  FaSort,
  FaChevronDown,
  FaChevronUp,
  FaGavel,
  FaCalendarAlt,
  FaUser,
  FaClipboardList,
  FaClock,
  FaCheckCircle,
  FaArrowLeft
} from 'react-icons/fa';
import { ref, onValue, off, query, orderByChild, equalTo } from "firebase/database";
import { auth, db } from "../../../firebase";
import GlassCard from '../../common/GlassCard';

const LawyerAssignedCases = () => {
  const navigate = useNavigate();
  const user = auth.currentUser;
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [sortField, setSortField] = useState('nextHearing');
  const [sortDirection, setSortDirection] = useState('asc');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  useEffect(() => {
    if (!user) return;
    const casesRef = ref(db, 'cases');
    const lawyerCasesQuery = query(casesRef, orderByChild('assignedLawyer'), equalTo(user.uid));

    const unsubscribe = onValue(lawyerCasesQuery, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const casesArray = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        setCases(casesArray);
      } else {
        setCases([]);
      }
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });

    return () => off(casesRef);
  }, [user]);

  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'active': return '#4A6CF7';
      case 'pending': return '#FF9A56';
      case 'completed': return '#00E676';
      case 'adjourned': return '#FF6B6B';
      default: return '#999';
    }
  };

  const getStatusBadge = (status) => {
    return (
      <span className="status-badge" style={{ 
        backgroundColor: `${getStatusColor(status)}20`,
        color: getStatusColor(status),
        padding: '4px 12px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '600',
        display: 'inline-block'
      }}>
        {status || 'Unknown'}
      </span>
    );
  };

  const filteredCases = cases
    .filter(c => {
      const matchesSearch = (c.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (c.client || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (c.caseType || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'All' || (c.status || '') === filterStatus;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let compareA = a[sortField] || '';
      let compareB = b[sortField] || '';
      if (typeof compareA === 'string') {
        compareA = compareA.toLowerCase();
        compareB = compareB.toLowerCase();
      }
      if (compareA < compareB) return sortDirection === 'asc' ? -1 : 1;
      if (compareA > compareB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <FaSort style={{ fontSize: '12px', opacity: 0.5 }} />;
    return sortDirection === 'asc' ? 
      <FaChevronUp style={{ fontSize: '12px' }} /> : 
      <FaChevronDown style={{ fontSize: '12px' }} />;
  };

  // Compute stats
  const total = cases.length;
  const active = cases.filter(c => c.status === 'Active').length;
  const pending = cases.filter(c => c.status === 'Pending').length;
  const completed = cases.filter(c => c.status === 'Completed').length;

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
        .lawyer-dashboard-page {
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
        .dashboard-header { margin-bottom: 2rem; }
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
        .dashboard-title h1 { font-size: 2.2rem; font-weight: 800; color: var(--black); margin: 0.2rem 0; }
        .dashboard-title p { color: var(--gray); margin: 0; }
        .search-filter-bar { margin-bottom: 1.5rem; }
        .search-card { padding: 1rem 1.2rem; }
        .search-filters { display: flex; gap: 1rem; flex-wrap: wrap; align-items: center; }
        .search-input-wrapper { flex: 1; position: relative; min-width: 200px; }
        .search-icon { position: absolute; left: 0.8rem; top: 50%; transform: translateY(-50%); color: var(--gray); }
        .search-input {
          width: 100%; padding: 0.6rem 0.8rem 0.6rem 2.4rem;
          border: 2px solid #D1E8F5; border-radius: 50px; font-size: 0.95rem;
          background: var(--white); transition: all 0.3s;
        }
        .search-input:focus { outline: none; border-color: var(--sky); box-shadow: 0 0 0 4px rgba(79,195,247,0.2); }
        .filter-controls { display: flex; gap: 0.6rem; align-items: center; flex-wrap: wrap; }
        .filter-toggle {
          display: inline-flex; align-items: center; gap: 0.3rem;
          padding: 0.4rem 0.8rem; border: 2px solid #D1E8F5; border-radius: 50px;
          background: white; cursor: pointer; font-size: 0.9rem; transition: all 0.3s;
        }
        .filter-toggle:hover { border-color: var(--sky); }
        .status-filter {
          padding: 0.4rem 0.8rem; border: 2px solid #D1E8F5; border-radius: 50px;
          font-size: 0.9rem; background: white; cursor: pointer;
        }
        .status-filter:focus { outline: none; border-color: var(--sky); }
        .cases-table-section { margin-bottom: 1.5rem; }
        .cases-table-card { padding: 1.5rem; overflow: hidden; }
        .table-container { overflow-x: auto; }
        .cases-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
        .cases-table th {
          padding: 0.8rem 0.6rem; text-align: left; font-weight: 600; color: var(--black);
          border-bottom: 2px solid rgba(0,0,0,0.05); cursor: pointer; white-space: nowrap;
        }
        .cases-table th:hover { color: var(--sky-dark); }
        .cases-table td { padding: 0.8rem 0.6rem; border-bottom: 1px solid rgba(0,0,0,0.04); }
        .case-row:hover { background: rgba(79,195,247,0.04); }
        .case-id-cell .case-id { font-weight: 600; color: var(--sky-dark); }
        .client-info { display: flex; flex-direction: column; }
        .client-name { font-weight: 500; color: var(--black); }
        .client-cnic { font-size: 0.75rem; color: var(--gray); }
        .case-type { background: rgba(0,0,0,0.04); padding: 0.1rem 0.6rem; border-radius: 50px; font-size: 0.8rem; color: var(--gray); }
        .hearing-date { display: flex; align-items: center; font-size: 0.9rem; color: var(--black); }
        .doc-count { display: inline-flex; align-items: center; gap: 0.2rem; color: var(--gray); font-size: 0.85rem; }
        .action-buttons { display: flex; gap: 0.4rem; flex-wrap: wrap; }
        .action-btn {
          display: inline-flex; align-items: center; gap: 0.3rem;
          padding: 0.2rem 0.6rem; border: none; border-radius: 6px;
          font-size: 0.8rem; font-weight: 500; text-decoration: none; cursor: pointer; transition: all 0.3s;
        }
        .action-btn.view-btn { background: rgba(79,195,247,0.1); color: var(--sky-dark); }
        .action-btn.view-btn:hover { background: rgba(79,195,247,0.2); transform: translateY(-2px); }
        .action-btn.submit-btn { background: rgba(0,230,118,0.1); color: #00E676; }
        .action-btn.submit-btn:hover { background: rgba(0,230,118,0.2); transform: translateY(-2px); }
        .no-results { text-align: center; padding: 2rem; color: var(--gray); }
        .quick-stats { margin-top: 0.5rem; }
        .stat-badges { display: flex; gap: 1rem; flex-wrap: wrap; }
        .stat-badge {
          display: inline-flex; align-items: center; gap: 0.4rem;
          padding: 0.3rem 0.8rem; background: rgba(255,255,255,0.7); backdrop-filter: blur(4px);
          border: 1px solid rgba(255,255,255,0.8); border-radius: 50px;
          font-size: 0.85rem; color: var(--black);
        }
        .stat-badge.active { border-color: #4A6CF740; background: #4A6CF710; }
        .stat-badge.pending { border-color: #FF9A5640; background: #FF9A5610; }
        .stat-badge.completed { border-color: #00E67640; background: #00E67610; }
        .stat-badge svg { font-size: 0.9rem; }
        @media (max-width: 768px) {
          .search-filters { flex-direction: column; align-items: stretch; }
          .filter-controls { flex-wrap: wrap; }
          .cases-table { font-size: 0.8rem; }
          .cases-table th, .cases-table td { padding: 0.4rem 0.3rem; }
          .action-buttons { flex-direction: column; align-items: flex-start; gap: 0.3rem; }
          .stat-badges { gap: 0.5rem; }
        }
      `}</style>

      <div className="lawyer-dashboard-page">
        <div className="dashboard-background"><div className="dashboard-particles"></div><div className="dashboard-gradient"></div></div>

        <div className="dashboard-container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="dashboard-header">
              <Link to="/lawyer/dashboard" className="back-btn">
                <FaArrowLeft /> Back to Dashboard
              </Link>
              <div className="dashboard-title">
                <h1>Assigned Cases</h1>
                <p>Cases where you are a party or legal representative</p>
              </div>
            </div>

            <motion.div className="search-filter-bar" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <GlassCard className="search-card">
                <div className="search-filters">
                  <div className="search-input-wrapper">
                    <FaSearch className="search-icon" />
                    <input
                      type="text"
                      placeholder="Search by Case ID or Client Name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="search-input"
                    />
                  </div>
                  <div className="filter-controls">
                    <button className="filter-toggle" onClick={() => setShowFilters(!showFilters)}>
                      <FaFilter /> Filters {showFilters ? '▲' : '▼'}
                    </button>
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="status-filter">
                      <option value="All">All Status</option>
                      <option value="Active">Active</option>
                      <option value="Pending">Pending</option>
                      <option value="Completed">Completed</option>
                      <option value="Adjourned">Adjourned</option>
                    </select>
                  </div>
                </div>
              </GlassCard>
            </motion.div>

            <motion.div className="cases-table-section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <GlassCard className="cases-table-card">
                <div className="table-container">
                  {loading ? (
                    <div className="no-results">Loading cases...</div>
                  ) : (
                    <table className="cases-table">
                      <thead>
                        <tr>
                          <th onClick={() => toggleSort('id')}>Case ID <SortIcon field="id" /></th>
                          <th onClick={() => toggleSort('client')}>Client <SortIcon field="client" /></th>
                          <th onClick={() => toggleSort('caseType')}>Case Type <SortIcon field="caseType" /></th>
                          <th onClick={() => toggleSort('status')}>Status <SortIcon field="status" /></th>
                          <th onClick={() => toggleSort('nextHearing')}>Next Hearing <SortIcon field="nextHearing" /></th>
                          <th>Documents</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCases.map((caseItem, index) => (
                          <motion.tr
                            key={caseItem.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="case-row"
                          >
                            <td className="case-id-cell"><span className="case-id">{caseItem.id}</span></td>
                            <td>
                              <div className="client-info">
                                <span className="client-name">{caseItem.client || 'Unknown'}</span>
                                <span className="client-cnic">{caseItem.clientCNIC || 'N/A'}</span>
                              </div>
                            </td>
                            <td><span className="case-type">{caseItem.caseType || 'General'}</span></td>
                            <td>{getStatusBadge(caseItem.status)}</td>
                            <td>
                              <div className="hearing-date">
                                <FaCalendarAlt style={{ marginRight: '6px', fontSize: '12px', opacity: 0.7 }} />
                                {caseItem.nextHearing || caseItem.hearingDate || 'N/A'}
                              </div>
                            </td>
                            <td>
                              <span className="doc-count">
                                <FaFileAlt style={{ marginRight: '4px' }} />
                                {caseItem.documents ? (Array.isArray(caseItem.documents) ? caseItem.documents.length : caseItem.documents) : 0}
                              </span>
                            </td>
                            <td>
                              <div className="action-buttons">
                                <Link to={`/lawyer/case-tracking/${caseItem.id}`} className="action-btn view-btn"><FaEye /> View</Link>
                                <Link to={`/lawyer/case-response/${caseItem.id}`} className="action-btn submit-btn"><FaUpload /> Submit</Link>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {!loading && filteredCases.length === 0 && (
                    <div className="no-results"><p>No cases found matching your criteria</p></div>
                  )}
                </div>
              </GlassCard>
            </motion.div>

            <motion.div className="quick-stats" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <div className="stat-badges">
                <div className="stat-badge"><FaClipboardList /><span>Total: {total}</span></div>
                <div className="stat-badge active"><FaGavel /><span>Active: {active}</span></div>
                <div className="stat-badge pending"><FaClock /><span>Pending: {pending}</span></div>
                <div className="stat-badge completed"><FaCheckCircle /><span>Completed: {completed}</span></div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default LawyerAssignedCases;