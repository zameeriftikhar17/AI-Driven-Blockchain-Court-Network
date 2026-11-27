import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

import {
  FaSearch,
  FaFilter,
  FaEye,
  FaArrowLeft,
  FaShieldAlt,
  FaRobot,
  FaClock,
  FaFlag,
  FaUserTie,
  FaCheckCircle,
  FaTimesCircle
} from 'react-icons/fa';

import {
  ref,
  onValue,
  query,
  orderByChild,
  equalTo
} from 'firebase/database';

import { auth, db } from '../../../firebase';
import GlassCard from '../../common/GlassCard';

const MyCases = () => {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ============================================================
  // GET CURRENT USER CASES
  // ============================================================

  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      setLoading(false);
      navigate('/login');
      return;
    }

    const casesRef = ref(db, 'cases');

    const userCasesQuery = query(
      casesRef,
      orderByChild('userId'),
      equalTo(user.uid)
    );

    const unsubscribe = onValue(
      userCasesQuery,

      (snapshot) => {
        const data = snapshot.val();

        if (data) {
          const casesArray = Object.keys(data).map((key) => {
            const caseData = data[key] || {};

            return {
              id: key,
              ...caseData
            };
          });

          casesArray.sort((a, b) => {
            const dateA = getDateValue(a.createdAt);
            const dateB = getDateValue(b.createdAt);

            return dateB - dateA;
          });

          setCases(casesArray);
        } else {
          setCases([]);
        }

        setLoading(false);
      },

      (firebaseError) => {
        console.error(
          'Firebase My Cases Error:',
          firebaseError
        );

        setError(
          'Unable to load your cases. Please try again.'
        );

        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [navigate]);

  // ============================================================
  // DATE HELPER
  // ============================================================

  const getDateValue = (timestamp) => {
    if (!timestamp) {
      return 0;
    }

    if (
      typeof timestamp === 'object' &&
      timestamp.seconds
    ) {
      return timestamp.seconds * 1000;
    }

    if (typeof timestamp === 'number') {
      return timestamp;
    }

    const parsedDate =
      new Date(timestamp).getTime();

    return isNaN(parsedDate)
      ? 0
      : parsedDate;
  };

  const formatDate = (timestamp) => {
    const dateValue =
      getDateValue(timestamp);

    if (!dateValue) {
      return 'N/A';
    }

    return new Date(
      dateValue
    ).toLocaleDateString(
      'en-GB',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }
    );
  };

  // ============================================================
  // LAWYER REQUEST STATUS
  // ============================================================

  const getLawyerRequestStatus = (caseItem) => {
    const requestStatus =
      String(
        caseItem.lawyerRequestStatus ||
        caseItem.lawyerStatus ||
        caseItem.requestStatus ||
        ''
      )
        .trim()
        .toLowerCase();

    if (
      requestStatus === 'accepted' ||
      requestStatus === 'approved'
    ) {
      return 'Accepted';
    }

    if (
      requestStatus === 'rejected' ||
      requestStatus === 'declined'
    ) {
      return 'Rejected';
    }

    if (
      requestStatus === 'pending' ||
      requestStatus === 'pending approval' ||
      requestStatus === 'pending lawyer approval'
    ) {
      return 'Pending';
    }

    /*
      IMPORTANT:
      Lawyer Dashboard already writes assignedLawyer
      after accepting the request.

      Therefore if assignedLawyer exists but
      lawyerRequestStatus is missing, we still show
      Accepted.
    */

    if (
      caseItem.assignedLawyer ||
      caseItem.assignedLawyerId ||
      caseItem.lawyerId
    ) {
      return 'Accepted';
    }

    return 'Pending';
  };

  // ============================================================
  // LAWYER NAME
  // ============================================================

  const getLawyerName = (caseItem) => {
    return (
      caseItem.assignedLawyerName ||
      caseItem.lawyerName ||
      caseItem.selectedLawyerName ||
      caseItem.assignedLawyer ||
      caseItem.lawyerId ||
      'Not Assigned'
    );
  };

  // ============================================================
  // SEARCH + FILTER
  // ============================================================

  const filteredCases = cases.filter(
    (caseItem) => {
      const search =
        searchTerm
          .toLowerCase()
          .trim();

      const caseId =
        String(
          caseItem.id || ''
        ).toLowerCase();

      const caseType =
        String(
          caseItem.caseType || ''
        ).toLowerCase();

      const defendantName =
        String(
          caseItem.defendantName || ''
        ).toLowerCase();

      const description =
        String(
          caseItem.description || ''
        ).toLowerCase();

      const predictedCaseType =
        String(
          caseItem.predictedCaseType ||
          caseItem.predicted_case_type ||
          ''
        ).toLowerCase();

      const predictedPriority =
        String(
          caseItem.predictedPriority ||
          caseItem.predicted_priority ||
          ''
        ).toLowerCase();

      const lawyerName =
        String(
          getLawyerName(caseItem)
        ).toLowerCase();

      const lawyerStatus =
        String(
          getLawyerRequestStatus(
            caseItem
          )
        ).toLowerCase();

      const matchesSearch =
        caseId.includes(search) ||
        caseType.includes(search) ||
        defendantName.includes(search) ||
        description.includes(search) ||
        predictedCaseType.includes(search) ||
        predictedPriority.includes(search) ||
        lawyerName.includes(search) ||
        lawyerStatus.includes(search);

      const status =
        String(
          caseItem.status || ''
        ).toLowerCase();

      const matchesFilter =
        filter === 'all' ||
        status === filter.toLowerCase();

      return (
        matchesSearch &&
        matchesFilter
      );
    }
  );

  // ============================================================
  // STATUS COLOR
  // ============================================================

  const getStatusColor = (status) => {
    const normalizedStatus =
      String(
        status || ''
      ).toLowerCase();

    if (
      normalizedStatus ===
      'pending'
    ) {
      return '#FF9A56';
    }

    if (
      normalizedStatus ===
      'active'
    ) {
      return '#4A6CF7';
    }

    if (
      normalizedStatus ===
      'completed'
    ) {
      return '#00A86B';
    }

    if (
      normalizedStatus ===
      'on hold'
    ) {
      return '#FF6B6B';
    }

    if (
      normalizedStatus ===
      'in progress'
    ) {
      return '#FF9A56';
    }

    return '#6B7280';
  };

  // ============================================================
  // LAWYER STATUS COLOR
  // ============================================================

  const getLawyerStatusColor = (
    status
  ) => {
    const normalized =
      String(
        status || ''
      ).toLowerCase();

    if (
      normalized ===
      'accepted'
    ) {
      return '#00A86B';
    }

    if (
      normalized ===
      'rejected'
    ) {
      return '#DC2626';
    }

    return '#FF9A56';
  };

  // ============================================================
  // STATUS CLASS
  // ============================================================

  const getStatusClass = (
    status
  ) => {
    return String(
      status || 'unknown'
    )
      .toLowerCase()
      .replace(
        /\s+/g,
        '-'
      );
  };

  // ============================================================
  // PREDICTED CASE TYPE
  // ============================================================

  const getPredictedCaseType = (
    caseItem
  ) => {
    return (
      caseItem.predictedCaseType ||
      caseItem.predicted_case_type ||
      caseItem.aiPredictedCaseType ||
      caseItem.aiClassification ||
      caseItem.caseClassification ||
      null
    );
  };

  // ============================================================
  // PREDICTED PRIORITY
  // ============================================================

  const getPredictedPriority = (
    caseItem
  ) => {
    return (
      caseItem.predictedPriority ||
      caseItem.predicted_priority ||
      caseItem.aiPredictedPriority ||
      null
    );
  };

  // ============================================================
  // PREDICTED DURATION
  // ============================================================

  const getPredictedDuration = (
    caseItem
  ) => {
    const duration =
      caseItem.predictedDurationDays ??
      caseItem.predicted_duration_days ??
      caseItem.aiPredictedDurationDays ??
      null;

    if (
      duration === null ||
      duration === undefined ||
      duration === ''
    ) {
      return null;
    }

    const numericDuration =
      Number(duration);

    if (isNaN(numericDuration)) {
      return null;
    }

    return Math.round(
      numericDuration
    );
  };

  // ============================================================
  // PRIORITY CLASS
  // ============================================================

  const getPriorityClass = (
    priority
  ) => {
    const normalizedPriority =
      String(
        priority || ''
      ).toLowerCase();

    if (
      normalizedPriority ===
      'high'
    ) {
      return 'priority-high';
    }

    if (
      normalizedPriority ===
      'medium'
    ) {
      return 'priority-medium';
    }

    if (
      normalizedPriority ===
      'low'
    ) {
      return 'priority-low';
    }

    return '';
  };

  // ============================================================
  // BLOCKCHAIN HASH
  // ============================================================

 const hasBlockchainHash = (caseItem) => {
  return (
    caseItem.blockchainStatus === 'REGISTERED' ||
    Boolean(caseItem.documentHash)
  );
};

  // ============================================================
  // UI
  // ============================================================

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

        * {
          box-sizing: border-box;
        }

        .dashboard-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          padding: 2rem;
          background:
            linear-gradient(
              135deg,
              #E3F2FD 0%,
              #BBDEFB 50%,
              #90CAF9 100%
            );
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
            radial-gradient(
              circle at 20% 50%,
              rgba(79, 195, 247, 0.25) 0%,
              transparent 50%
            ),
            radial-gradient(
              circle at 80% 50%,
              rgba(2, 136, 209, 0.15) 0%,
              transparent 50%
            );
        }

        .dashboard-gradient {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 1400px;
          margin: auto;
        }

        .page-header {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 25px;
        }

        .back-btn {
          width: 44px;
          height: 44px;
          border: none;
          border-radius: 12px;
          background: white;
          color: #0288D1;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: var(--shadow);
          transition: .2s;
        }

        .back-btn:hover {
          transform: translateX(-2px);
          background: #0288D1;
          color: white;
        }

        .page-title h1 {
          margin: 0;
          color: #1A1A1A;
          font-size: 28px;
          font-weight: 800;
        }

        .page-title p {
          margin: 5px 0 0;
          color: #6B7280;
        }

        .toolbar-card {
          padding: 20px;
          margin-bottom: 20px;
          background: rgba(255,255,255,.92) !important;
          border-radius: 16px;
        }

        .toolbar {
          display: flex;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
        }

        .search-box {
          flex: 1;
          min-width: 240px;
          position: relative;
        }

        .search-box svg {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #94A3B8;
        }

        .search-input {
          width: 100%;
          height: 45px;
          padding: 0 15px 0 42px;
          border: 1px solid #D1D5DB;
          border-radius: 10px;
          outline: none;
          font-size: 14px;
        }

        .search-input:focus {
          border-color: #0288D1;
          box-shadow: 0 0 0 3px rgba(2,136,209,.1);
        }

        .filter-box {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .filter-box svg {
          color: #0288D1;
        }

        .filter-select {
          height: 45px;
          padding: 0 35px 0 12px;
          border: 1px solid #D1D5DB;
          border-radius: 10px;
          background: white;
          outline: none;
        }

        .cases-card {
          padding: 20px;
          background: rgba(255,255,255,.94) !important;
          border-radius: 16px;
          overflow: hidden;
        }

        .table-wrapper {
          width: 100%;
          overflow-x: auto;
        }

        .cases-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 1150px;
        }

        .cases-table th {
          padding: 14px 12px;
          text-align: left;
          background: #F1F8FD;
          color: #374151;
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
        }

        .cases-table td {
          padding: 15px 12px;
          border-bottom: 1px solid #E5E7EB;
          vertical-align: middle;
        }

        .case-id {
          color: #0288D1;
          font-weight: 800;
          font-size: 13px;
        }

        .case-type {
          font-weight: 700;
          color: #1F2937;
        }

        .defendant {
          color: #6B7280;
          font-size: 13px;
        }

        .status-badge {
          display: inline-flex;
          padding: 5px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
        }

        .lawyer-status-cell {
          min-width: 140px;
        }

        .lawyer-name-small {
          color: #1F2937;
          font-size: 13px;
          font-weight: 700;
          margin-bottom: 6px;
        }

        .lawyer-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 9px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 800;
        }

        .lawyer-status-badge.accepted {
          background: #DCFCE7;
          color: #15803D;
        }

        .lawyer-status-badge.pending {
          background: #FFF7ED;
          color: #EA580C;
        }

        .lawyer-status-badge.rejected {
          background: #FEE2E2;
          color: #DC2626;
        }

        .ai-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          margin-top: 5px;
          padding: 4px 8px;
          border-radius: 20px;
          background: #EEF2FF;
          color: #4F46E5;
          font-size: 10px;
          font-weight: 700;
        }

        .ai-priority {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 6px 9px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 800;
        }

        .priority-high {
          background: #FEE2E2;
          color: #DC2626;
        }

        .priority-medium {
          background: #FEF3C7;
          color: #D97706;
        }

        .priority-low {
          background: #DCFCE7;
          color: #15803D;
        }

        .ai-detail {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #475569;
          font-size: 12px;
          font-weight: 700;
        }

        .blockchain-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 9px;
          border-radius: 20px;
          background: #DCFCE7;
          color: #15803D;
          font-size: 10px;
          font-weight: 800;
        }

        .view-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border-radius: 8px;
          background: #E0F2FE;
          color: #0288D1;
          text-decoration: none;
          font-size: 12px;
          font-weight: 800;
        }

        .view-btn:hover {
          background: #0288D1;
          color: white;
        }

        .no-cases {
          text-align: center;
          padding: 40px;
          color: #6B7280;
        }

        .error-message {
          margin-bottom: 15px;
          padding: 12px 15px;
          border-radius: 10px;
          background: #FEE2E2;
          color: #B91C1C;
          font-size: 13px;
        }

        .lawyer-accepted-icon {
          color: #16A34A;
        }

        .lawyer-pending-icon {
          color: #EA580C;
        }

        @media(max-width: 700px) {
          .dashboard-page {
            padding: 1rem;
          }

          .page-title h1 {
            font-size: 22px;
          }

          .toolbar {
            flex-direction: column;
            align-items: stretch;
          }

          .search-box {
            min-width: 100%;
          }

          .filter-box {
            width: 100%;
          }

          .filter-select {
            flex: 1;
          }
        }

      `}</style>

      <div className="dashboard-page">

        <div className="dashboard-background">
          <div className="dashboard-particles"></div>
        </div>

        <div className="dashboard-gradient">

          {/* =====================================================
              HEADER
          ====================================================== */}

          <motion.div
            className="page-header"
            initial={{
              opacity: 0,
              y: 20
            }}
            animate={{
              opacity: 1,
              y: 0
            }}
          >

            <button
              className="back-btn"
              onClick={() =>
                navigate('/citizen-dashboard')
              }
            >
              <FaArrowLeft />
            </button>

            <div className="page-title">

              <h1>
                My Cases
              </h1>

              <p>
                View and track all your submitted cases
              </p>

            </div>

          </motion.div>

          {/* =====================================================
              TOOLBAR
          ====================================================== */}

          <GlassCard className="toolbar-card">

            <div className="toolbar">

              <div className="search-box">

                <FaSearch />

                <input
                  className="search-input"
                  type="text"
                  placeholder="Search by case ID, type, lawyer, status..."
                  value={searchTerm}
                  onChange={(e) =>
                    setSearchTerm(
                      e.target.value
                    )
                  }
                />

              </div>

              <div className="filter-box">

                <FaFilter />

                <select
                  className="filter-select"
                  value={filter}
                  onChange={(e) =>
                    setFilter(
                      e.target.value
                    )
                  }
                >

                  <option value="all">
                    All Cases
                  </option>

                  <option value="pending">
                    Pending
                  </option>

                  <option value="active">
                    Active
                  </option>

                  <option value="in progress">
                    In Progress
                  </option>

                  <option value="completed">
                    Completed
                  </option>

                  <option value="on hold">
                    On Hold
                  </option>

                </select>

              </div>

            </div>

          </GlassCard>

          {/* =====================================================
              ERROR
          ====================================================== */}

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {/* =====================================================
              CASES
          ====================================================== */}

          <motion.div
            initial={{
              opacity: 0,
              y: 20
            }}
            animate={{
              opacity: 1,
              y: 0
            }}
          >

            <GlassCard className="cases-card">

              <div className="table-wrapper">

                <table className="cases-table">

                  <thead>

                    <tr>

                      <th>
                        Case ID
                      </th>

                      <th>
                        Case Type
                      </th>

                      <th>
                        Defendant
                      </th>

                      <th>
                        Case Status
                      </th>

                      <th>
                        Lawyer
                      </th>

                      <th>
                        AI Classification
                      </th>

                      <th>
                        AI Priority
                      </th>

                      <th>
                        Duration
                      </th>

                      <th>
                        Date
                      </th>

                      <th>
                        Blockchain
                      </th>

                      <th>
                        Action
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {loading ? (

                      <tr>

                        <td
                          colSpan="11"
                          className="no-cases"
                        >
                          Loading your cases...
                        </td>

                      </tr>

                    ) : filteredCases.length === 0 ? (

                      <tr>

                        <td
                          colSpan="11"
                          className="no-cases"
                        >

                          {cases.length === 0
                            ? 'No cases have been filed yet.'
                            : 'No cases match your search or filter.'
                          }

                        </td>

                      </tr>

                    ) : (

                      filteredCases.map(
                        (
                          caseItem,
                          index
                        ) => {

                          const statusColor =
                            getStatusColor(
                              caseItem.status
                            );

                          const lawyerStatus =
                            getLawyerRequestStatus(
                              caseItem
                            );

                          const lawyerName =
                            getLawyerName(
                              caseItem
                            );

                          const lawyerStatusColor =
                            getLawyerStatusColor(
                              lawyerStatus
                            );

                          const predictedType =
                            getPredictedCaseType(
                              caseItem
                            );

                          const predictedPriority =
                            getPredictedPriority(
                              caseItem
                            );

                          const predictedDuration =
                            getPredictedDuration(
                              caseItem
                            );

                          return (

                            <motion.tr
                              key={caseItem.id}
                              initial={{
                                opacity: 0,
                                y: 10
                              }}
                              animate={{
                                opacity: 1,
                                y: 0
                              }}
                              transition={{
                                delay:
                                  index * 0.05
                              }}
                            >

                              {/* CASE ID */}

                              <td>

                                <span className="case-id">
                                  {caseItem.id}
                                </span>

                              </td>

                              {/* CASE TYPE */}

                              <td>

                                <div className="case-type">

                                  {caseItem.caseType ||
                                    'Not specified'}

                                </div>

                              </td>

                              {/* DEFENDANT */}

                              <td>

                                <span className="defendant">

                                  {caseItem.defendantName ||
                                    'Not specified'}

                                </span>

                              </td>

                              {/* CASE STATUS */}

                              <td>

                                <span
                                  className={
                                    `status-badge ${
                                      getStatusClass(
                                        caseItem.status
                                      )
                                    }`
                                  }

                                  style={{
                                    backgroundColor:
                                      `${statusColor}20`,
                                    color:
                                      statusColor
                                  }}
                                >

                                  {caseItem.status ||
                                    'Pending'}

                                </span>

                              </td>

                              {/* =================================================
                                  LAWYER
                              ================================================== */}

                              <td>

                                <div className="lawyer-status-cell">

                                  <div className="lawyer-name-small">

                                    <FaUserTie
                                      style={{
                                        marginRight: 5,
                                        color: '#0288D1'
                                      }}
                                    />

                                    {lawyerName}

                                  </div>

                                  <span
                                    className={
                                      `lawyer-status-badge ${
                                        lawyerStatus ===
                                        'Accepted'
                                          ? 'accepted'
                                          : lawyerStatus ===
                                            'Rejected'
                                          ? 'rejected'
                                          : 'pending'
                                      }`
                                    }
                                    style={{
                                      color:
                                        lawyerStatusColor
                                    }}
                                  >

                                    {lawyerStatus ===
                                    'Accepted' ? (

                                      <FaCheckCircle
                                        className="lawyer-accepted-icon"
                                      />

                                    ) : lawyerStatus ===
                                      'Rejected' ? (

                                      <FaTimesCircle
                                        className="lawyer-rejected-icon"
                                      />

                                    ) : (

                                      <FaClock
                                        className="lawyer-pending-icon"
                                      />

                                    )}

                                    {lawyerStatus}

                                  </span>

                                </div>

                              </td>

                              {/* AI CLASSIFICATION */}

                              <td>

                                {predictedType ? (

                                  <div>

                                    <div className="case-type">

                                      {String(
                                        predictedType
                                      )}

                                    </div>

                                    <div className="ai-badge">

                                      <FaRobot />

                                      AI Predicted

                                    </div>

                                  </div>

                                ) : (

                                  <span className="defendant">
                                    Processing...
                                  </span>

                                )}

                              </td>

                              {/* AI PRIORITY */}

                              <td>

                                {predictedPriority ? (

                                  <div
                                    className={
                                      `ai-priority ${
                                        getPriorityClass(
                                          predictedPriority
                                        )
                                      }`
                                    }
                                  >

                                    <FaFlag />

                                    {String(
                                      predictedPriority
                                    )}

                                  </div>

                                ) : (

                                  <span className="defendant">
                                    Processing...
                                  </span>

                                )}

                              </td>

                              {/* DURATION */}

                              <td>

                                {predictedDuration !==
                                null ? (

                                  <div className="ai-detail">

                                    <FaClock />

                                    {predictedDuration}{' '}
                                    days

                                  </div>

                                ) : (

                                  <span className="defendant">
                                    Processing...
                                  </span>

                                )}

                              </td>

                              {/* DATE */}

                              <td>

                                {formatDate(
                                  caseItem.createdAt
                                )}

                              </td>

                              {/* BLOCKCHAIN */}

                              <td>

                                {hasBlockchainHash(
                                  caseItem
                                ) ? (

                                  <div className="blockchain-badge">

                                    <FaShieldAlt />

                                    Blockchain

                                  </div>

                                ) : (

                                  <span className="defendant">
                                    Pending
                                  </span>

                                )}

                              </td>

                              {/* VIEW */}

                              <td>

                                <Link
                                  to={`/case-details/${caseItem.id}`}
                                  className="view-btn"
                                >

                                  <FaEye />

                                  View

                                </Link>

                              </td>

                            </motion.tr>

                          );

                        }
                      )

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

export default MyCases;