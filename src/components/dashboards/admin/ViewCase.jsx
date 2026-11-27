import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  FaArrowLeft,
  FaFileAlt,
  FaUser,
  FaGavel,
  FaUserTie,
  FaUniversity,
  FaClock,
  FaCalendarAlt,
  FaCheckCircle,
  FaExclamationTriangle,
  FaDownload,
  FaRobot,
  FaShieldAlt
} from 'react-icons/fa';
import { ref, onValue, off } from 'firebase/database';
import { auth, db } from '../../../firebase';

const ViewCase = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = auth.currentUser;

  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [caseHistory, setCaseHistory] = useState([]);
const [historyLoading, setHistoryLoading] = useState(true);
const [historyError, setHistoryError] = useState('');

  // =========================
  // AUTH CHECK
  // =========================
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // =========================
  // LOAD CASE FROM FIREBASE
  // =========================
  useEffect(() => {
    if (!id) {
      navigate('/admin-dashboard/cases');
      return;
    }

    const caseRef = ref(db, `cases/${id}`);

    const unsubscribe = onValue(
      caseRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();

          setCaseData({
            id: id,
            ...data
          });

          setError('');
        } else {
          setError('Case not found.');
        }

        setLoading(false);
      },
      (err) => {
        console.error('Firebase error:', err);
        setError('Failed to load case data.');
        setLoading(false);
      }
    );

    return () => off(caseRef);
  }, [id, navigate]);


  // =========================
// LOAD BLOCKCHAIN CASE HISTORY
// =========================
useEffect(() => {
  if (!id) return;

  const fetchCaseHistory = async () => {
    setHistoryLoading(true);
    setHistoryError('');

    try {
      const response = await fetch(
        `http://localhost:8000/blockchain/case-history/${encodeURIComponent(id)}`
      );

      if (!response.ok) {
        throw new Error('Failed to load blockchain history');
      }

      const result = await response.json();

      setCaseHistory(Array.isArray(result) ? result : result.value || []);
    } catch (err) {
      console.error('Case history error:', err);
      setHistoryError(err.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  fetchCaseHistory();
}, [id]);



// LOAD HEARING DATE FROM BLOCKCHAIN
useEffect(() => {
  if (!id) return;

  const fetchBlockchainCase = async () => {
    try {
      const response = await fetch(
        `http://localhost:8000/blockchain/case/${encodeURIComponent(id)}`
      );

      if (!response.ok) return;

      const result = await response.json();

      if (
        result.status !== 'NOT_REGISTERED' &&
        result.hearingDate
      ) {
        setCaseData(prev => ({
          ...prev,
          hearingDate: result.hearingDate
        }));
      }
    } catch (err) {
      console.error('Blockchain case details error:', err);
    }
  };

  fetchBlockchainCase();
}, [id]);

  // =========================
  // HELPER FUNCTIONS
  // =========================

  const getJudgeName = () => {
    return (
      caseData?.assignedJudgeName ||
      caseData?.judgeName ||
      caseData?.assignedJudge ||
      caseData?.judge ||
      'Not Assigned'
    );
  };

  const getLawyerName = () => {
    return (
      caseData?.assignedLawyerName ||
      caseData?.lawyerName ||
      caseData?.assignedLawyer ||
      caseData?.lawyer ||
      'Not Assigned'
    );
  };

const getCitizenName = () => {
  return (
    caseData?.citizenName ||
    caseData?.clientName ||
    caseData?.client ||
    caseData?.citizen ||
    caseData?.userDisplayName ||
    'N/A'
  );
};

  const getStatusBadge = (status) => {
    const colors = {
      Pending: {
        bg: '#FEF3C7',
        text: '#92400E'
      },
      'In Progress': {
        bg: '#DBEAFE',
        text: '#1E40AF'
      },
      Completed: {
        bg: '#D1FAE5',
        text: '#065F46'
      },
      Rejected: {
        bg: '#FEE2E2',
        text: '#991B1B'
      },
      Closed: {
        bg: '#F3F4F6',
        text: '#4B5563'
      },
      Assigned: {
        bg: '#E0E7FF',
        text: '#3730A3'
      },
      Adjourned: {
        bg: '#FDE68A',
        text: '#92400E'
      }
    };

    const color = colors[status] || colors.Pending;

    return (
      <span
        style={{
          backgroundColor: color.bg,
          color: color.text,
          padding: '0.25rem 0.75rem',
          borderRadius: '50px',
          fontSize: '0.8rem',
          fontWeight: '600',
          display: 'inline-block'
        }}
      >
        {status || 'Pending'}
      </span>
    );
  };

  const formatValue = (value) => {
    if (value === undefined || value === null || value === '') {
      return 'N/A';
    }

    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }

    if (Array.isArray(value)) {
      return value.join(', ');
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  };

  // =========================
  // GENERATE CASE REPORT
  // =========================
  const generateReport = () => {
    if (!caseData) return;

    const reportWindow = window.open('', '_blank', 'width=1000,height=800');

    if (!reportWindow) {
      alert(
        'Report window could not be opened. Please allow pop-ups for this website.'
      );
      return;
    }

    const reportDate = new Date().toLocaleString();

    const reportHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />

        <title>
          Case Report - ${formatValue(caseData.id)}
        </title>

        <style>

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            padding: 0;
            font-family: Arial, Helvetica, sans-serif;
            color: #1A1A1A;
            background: #ffffff;
          }

          .report-container {
            width: 90%;
            max-width: 1000px;
            margin: 30px auto;
          }

          .report-header {
            text-align: center;
            border-bottom: 3px solid #0288D1;
            padding-bottom: 20px;
            margin-bottom: 25px;
          }

          .logo-title {
            font-size: 27px;
            font-weight: 800;
            color: #1A1A1A;
            margin-bottom: 5px;
          }

          .logo-title span {
            color: #0288D1;
          }

          .report-subtitle {
            font-size: 14px;
            color: #666;
          }

          .report-title {
            text-align: center;
            margin: 25px 0;
          }

          .report-title h1 {
            margin: 0;
            font-size: 25px;
            color: #1A1A1A;
          }

          .report-title p {
            margin-top: 8px;
            color: #666;
            font-size: 13px;
          }

          .case-heading {
            background: #E3F2FD;
            border-left: 5px solid #0288D1;
            padding: 15px;
            margin-bottom: 20px;
          }

          .case-heading h2 {
            margin: 0 0 7px 0;
            font-size: 20px;
          }

          .case-heading p {
            margin: 0;
            color: #555;
            font-size: 13px;
          }

          .section {
            margin-top: 25px;
          }

          .section-title {
            background: #0288D1;
            color: white;
            padding: 10px 14px;
            font-size: 16px;
            font-weight: 700;
            border-radius: 5px 5px 0 0;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }

          th,
          td {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: left;
            vertical-align: top;
            font-size: 13px;
          }

          th {
            width: 28%;
            background: #F5F9FC;
            font-weight: 700;
          }

          .status {
            display: inline-block;
            padding: 5px 12px;
            border-radius: 20px;
            background: #DBEAFE;
            color: #1E40AF;
            font-weight: 700;
          }

          .description {
            border: 1px solid #ddd;
            padding: 15px;
            line-height: 1.7;
            min-height: 100px;
            white-space: pre-wrap;
            font-size: 13px;
          }

          .ai-box {
            border: 1px solid #D1E8F5;
            background: #F5FBFF;
            padding: 15px;
            border-radius: 6px;
          }

          .blockchain-box {
            border: 1px solid #ddd;
            background: #FAFAFA;
            padding: 15px;
            border-radius: 6px;
            word-break: break-all;
            font-family: monospace;
            font-size: 12px;
          }

          .footer {
            margin-top: 40px;
            padding-top: 15px;
            border-top: 1px solid #ddd;
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            color: #777;
          }

          .signature-section {
            margin-top: 60px;
            display: flex;
            justify-content: space-between;
          }

          .signature {
            width: 200px;
            text-align: center;
          }

          .signature-line {
            border-top: 1px solid #333;
            margin-bottom: 7px;
          }

          @media print {

            body {
              background: white;
            }

            .report-container {
              width: 100%;
              margin: 0;
            }

            .no-print {
              display: none !important;
            }

            .section,
            .case-heading {
              page-break-inside: avoid;
            }

          }

        </style>
      </head>

      <body>

        <div class="report-container">

          <div class="report-header">
            <div class="logo-title">
              AI Driven Block Chain Court <span>Network</span>
            </div>

            <div class="report-subtitle">
              Smart Court Management System
            </div>
          </div>

          <div class="report-title">
            <h1>OFFICIAL CASE REPORT</h1>
            <p>Generated on: ${reportDate}</p>
          </div>

          <div class="case-heading">

            <h2>
              ${formatValue(caseData.title)}
            </h2>

            <p>
              Case ID:
              <strong>${formatValue(caseData.id)}</strong>
            </p>

          </div>

          <div class="section">

            <div class="section-title">
              Case Information
            </div>

            <table>

              <tr>
                <th>Case ID</th>
                <td>${formatValue(caseData.id)}</td>
              </tr>

              <tr>
                <th>Case Title</th>
                <td>${formatValue(caseData.title)}</td>
              </tr>

              <tr>
                <th>Case Type</th>
                <td>${formatValue(caseData.caseType)}</td>
              </tr>

              <tr>
                <th>Case Sub Type</th>
                <td>${formatValue(caseData.caseSubtype || caseData.caseSubType)}</td>
              </tr>

              <tr>
                <th>Status</th>
                <td>
                  <span class="status">
                    ${formatValue(caseData.status || 'Pending')}
                  </span>
                </td>
              </tr>

              <tr>
                <th>Priority</th>
                <td>${formatValue(caseData.priority)}</td>
              </tr>

              <tr>
                <th>Filing Date</th>
                <td>${formatValue(caseData.filingDate)}</td>
              </tr>

              <tr>
                <th>Hearing Date</th>
                <td>${formatValue(caseData.hearingDate)}</td>
              </tr>

            </table>

          </div>

          <div class="section">

            <div class="section-title">
              Parties & Court Assignment
            </div>

            <table>

              <tr>
                <th>Citizen / Client</th>
                <td>${formatValue(getCitizenName())}</td>
              </tr>

              <tr>
                <th>Lawyer</th>
                <td>${formatValue(getLawyerName())}</td>
              </tr>

              <tr>
                <th>Judge</th>
                <td>${formatValue(getJudgeName())}</td>
              </tr>

              <tr>
                <th>Court</th>
                <td>${formatValue(caseData.court)}</td>
              </tr>

              <tr>
                <th>Court Room</th>
                <td>${formatValue(caseData.courtRoom || caseData.roomNumber)}</td>
              </tr>

            </table>

          </div>

          <div class="section">

            <div class="section-title">
              Case Description
            </div>

            <div class="description">
              ${formatValue(caseData.description)}
            </div>

          </div>

          ${
            caseData.aiSummary ||
            caseData.aiConfidence ||
            caseData.recommendedAction
              ? `
                <div class="section">

                  <div class="section-title">
                    AI Case Analysis
                  </div>

                  <div class="ai-box">

                    <table>

                      <tr>
                        <th>AI Summary</th>
                        <td>${formatValue(caseData.aiSummary)}</td>
                      </tr>

                      <tr>
                        <th>AI Confidence</th>
                        <td>${formatValue(caseData.aiConfidence)}%</td>
                      </tr>

                      <tr>
                        <th>Recommended Action</th>
                        <td>${formatValue(caseData.recommendedAction)}</td>
                      </tr>

                      <tr>
                        <th>AI Priority</th>
                        <td>${formatValue(caseData.priority)}</td>
                      </tr>

                    </table>

                  </div>

                </div>
              `
              : ''
          }

          ${
            caseData.documentsVerified !== undefined
              ? `
                <div class="section">

                  <div class="section-title">
                    Document Verification
                  </div>

                  <table>

                    <tr>
                      <th>Documents Verified</th>
                      <td>
                        ${caseData.documentsVerified ? 'Yes' : 'No'}
                      </td>
                    </tr>

                  </table>

                </div>
              `
              : ''
          }

          ${
            caseData.blockchainHash
              ? `
                <div class="section">

                  <div class="section-title">
                    Blockchain Record
                  </div>

                  <div class="blockchain-box">
                    ${formatValue(caseData.blockchainHash)}
                  </div>

                </div>
              `
              : ''
          }

          <div class="signature-section">

            <div class="signature">

              <div class="signature-line"></div>

              <strong>Authorized Officer</strong>

            </div>

            <div class="signature">

              <div class="signature-line"></div>

              <strong>Court Official</strong>

            </div>

          </div>

          <div class="footer">

            <span>
              AI Driven Block Chain Court Network
            </span>

            <span>
              Case Report - ${formatValue(caseData.id)}
            </span>

          </div>

        </div>

        <script>

          window.onload = function() {

            setTimeout(function() {
              window.print();
            }, 500);

          };

        </script>

      </body>
      </html>
    `;

    reportWindow.document.open();
    reportWindow.document.write(reportHTML);
    reportWindow.document.close();
  };

  // =========================
  // LOADING
  // =========================
  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem'
        }}
      >
        <p>Loading case...</p>
      </div>
    );
  }

  // =========================
  // ERROR
  // =========================
  if (error || !caseData) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          padding: '2rem'
        }}
      >
        <p style={{ color: '#D32F2F' }}>
          {error || 'Case not found.'}
        </p>

        <Link
          to="/admin-dashboard/cases"
          style={{
            marginTop: '1rem',
            color: '#0288D1',
            textDecoration: 'underline'
          }}
        >
          Back to Cases
        </Link>
      </div>
    );
  }

  // =========================
  // MAIN UI
  // =========================
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

        .view-case-page {
          min-height: 100vh;
          padding: 2rem;
          background: linear-gradient(
            135deg,
            #E3F2FD 0%,
            #BBDEFB 50%,
            #90CAF9 100%
          );

          animation: gradientShift 12s ease-in-out infinite alternate;
        }

        @keyframes gradientShift {

          0% {
            background-position: 0% 50%;
          }

          50% {
            background-position: 100% 50%;
          }

          100% {
            background-position: 0% 50%;
          }

        }

        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--black);
          text-decoration: none;
          font-weight: 500;
          transition: 0.3s;
          margin-bottom: 1.5rem;
        }

        .back-link:hover {
          color: var(--sky-dark);
          transform: translateX(-4px);
        }

        .page-header {
          margin-bottom: 2rem;
          background: rgba(255,255,255,0.7);
          backdrop-filter: blur(10px);
          padding: 1.5rem 2rem;
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .page-header h1 {
          font-size: 2.2rem;
          font-weight: 800;
          color: var(--black);
          margin: 0;
        }

        .page-header p {
          color: var(--gray);
          margin: 0;
        }

        .case-detail-card {
          background: rgba(255,255,255,0.85);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.9);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          padding: 2rem;
          max-width: 900px;
          margin: 0 auto;
        }

        .detail-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid rgba(0,0,0,0.06);
        }

        .detail-title h2 {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--black);
          margin: 0;
        }

        .detail-id {
          font-size: 0.9rem;
          color: var(--gray);
        }

        .detail-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.2rem;
        }

        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
          padding: 0.7rem 0.8rem;
          background: rgba(0,0,0,0.02);
          border-radius: 8px;
        }

        .detail-item .label {
          font-size: 0.75rem;
          color: var(--gray);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 600;
        }

        .detail-item .value {
          font-size: 1rem;
          font-weight: 500;
          color: var(--black);
          display: flex;
          align-items: center;
          gap: 0.4rem;
          word-break: break-word;
        }

        .detail-item .value svg {
          color: var(--sky-dark);
          flex-shrink: 0;
        }

        .full-width {
          grid-column: 1 / -1;
        }

        .description-section {
          margin-top: 1.5rem;
          padding-top: 1rem;
          border-top: 1px solid rgba(0,0,0,0.06);
        }

        .description-section h3 {
          font-size: 1rem;
          font-weight: 700;
          color: var(--black);
          margin-bottom: 0.5rem;
        }

        .description-section p {
          color: var(--gray);
          line-height: 1.6;
          white-space: pre-wrap;
        }

        .action-buttons {
          display: flex;
          gap: 0.8rem;
          margin-top: 2rem;
          justify-content: flex-end;
          flex-wrap: wrap;
        }

        .btn-edit,
        .btn-back,
        .btn-report {
          padding: 0.65rem 1.3rem;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.3s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          font-size: 0.9rem;
        }

        .btn-edit {
          background: linear-gradient(
            135deg,
            var(--sky),
            var(--sky-dark)
          );

          color: white;

          box-shadow:
            0 4px 15px rgba(79,195,247,0.3);
        }

        .btn-edit:hover {
          transform: translateY(-2px);

          box-shadow:
            0 8px 25px rgba(2,136,209,0.4);
        }

        .btn-back {
          background: rgba(0,0,0,0.06);
          color: var(--black);
        }

        .btn-back:hover {
          background: rgba(0,0,0,0.1);
          transform: translateY(-2px);
        }

        .btn-report {
          background: linear-gradient(
            135deg,
            #1565C0,
            #0288D1
          );

          color: white;

          box-shadow:
            0 4px 15px rgba(2,136,209,0.3);
        }

        .btn-report:hover {
          transform: translateY(-2px);

          box-shadow:
            0 8px 25px rgba(2,136,209,0.45);
        }

        .blockchain-value {
          font-family: monospace;
          font-size: 0.85rem !important;
          word-break: break-all;
        }

        @media (max-width: 768px) {

          .view-case-page {
            padding: 1rem;
          }

          .detail-grid {
            grid-template-columns: 1fr;
          }

          .page-header h1 {
            font-size: 1.8rem;
          }

          .case-detail-card {
            padding: 1.5rem;
          }

          .action-buttons {
            justify-content: stretch;
          }

          .btn-edit,
          .btn-back,
          .btn-report {
            flex: 1;
          }

        }

        @media (max-width: 480px) {

          .action-buttons {
            flex-direction: column;
          }

          .btn-edit,
          .btn-back,
          .btn-report {
            width: 100%;
          }

        }

      `}</style>

      <div className="view-case-page">

        {/* BACK */}
        <Link
          to="/admin-dashboard/cases"
          className="back-link"
        >
          <FaArrowLeft />
          Back to Case Management
        </Link>

        {/* PAGE HEADER */}
        <div className="page-header">

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.8rem'
            }}
          >

            <FaFileAlt
              style={{
                color: 'var(--sky-dark)',
                fontSize: '1.8rem'
              }}
            />

            <div>

              <h1>
                Case Details
              </h1>

              <p>
                View complete case information
              </p>

            </div>

          </div>

        </div>

        {/* CASE CARD */}
        <div className="case-detail-card">

          {/* HEADER */}
          <div className="detail-header">

            <div className="detail-title">

              <h2>
  {caseData.title ||
   caseData.caseTitle ||
   caseData.caseName ||
   `${caseData.predictedCaseType || caseData.caseType || 'Court'} Case`}
</h2>

              <div className="detail-id">

                Case ID:{' '}

                <strong>
                  {caseData.id}
                </strong>

              </div>

            </div>

            <div>
              {getStatusBadge(caseData.status || 'Pending')}
            </div>

          </div>

          {/* DETAILS */}
          <div className="detail-grid">

            {/* CASE TYPE */}
            <div className="detail-item">

              <span className="label">
                <FaFileAlt /> Case Type
              </span>

              <span className="value">
                {caseData.caseType || 'General'}
              </span>

            </div>

            {/* CASE SUB TYPE */}
            <div className="detail-item">

              <span className="label">
                <FaFileAlt /> Case Sub Type
              </span>

              <span className="value">
                {caseData.caseSubtype ||
                  caseData.caseSubType ||
                  'N/A'}
              </span>

            </div>

            {/* CITIZEN */}
            <div className="detail-item">

              <span className="label">
                <FaUser /> Citizen / Client
              </span>

              <span className="value">
                {getCitizenName()}
              </span>

            </div>

            {/* LAWYER */}
            <div className="detail-item">

              <span className="label">
                <FaUserTie /> Lawyer
              </span>

              <span className="value">
                {getLawyerName()}
              </span>

            </div>

            {/* JUDGE */}
            <div className="detail-item">

              <span className="label">
                <FaGavel /> Judge
              </span>

              <span className="value">
                {getJudgeName()}
              </span>

            </div>

            {/* COURT */}
            <div className="detail-item">

              <span className="label">
                <FaUniversity /> Court
              </span>

              <span className="value">
                {caseData.court || 'N/A'}
              </span>

            </div>

            {/* FILING DATE */}
            <div className="detail-item">

              <span className="label">
                <FaCalendarAlt /> Filing Date
              </span>

              <span className="value">
                {caseData.filingDate || 'N/A'}
              </span>

            </div>

            {/* HEARING DATE */}
            <div className="detail-item">

              <span className="label">
                <FaClock /> Hearing Date
              </span>

              <span className="value">
                {caseData.hearingDate || 'N/A'}
              </span>

            </div>

            {/* STATUS */}
            <div className="detail-item">

              <span className="label">
                <FaClock /> Status
              </span>

              <span className="value">
                {caseData.status || 'Pending'}
              </span>

            </div>

           {/* PRIORITY */}
<div className="detail-item">

  <span className="label">
    <FaExclamationTriangle /> Priority
  </span>

  <span className="value">
    {caseData.priority || caseData.predictedPriority || 'N/A'}
  </span>

</div>

            {/* DOCUMENT VERIFICATION */}
            {caseData.documentsVerified !== undefined && (

              <div className="detail-item">

                <span className="label">
                  <FaCheckCircle /> Documents Verified
                </span>

                <span className="value">

                  {caseData.documentsVerified
                    ? 'Yes'
                    : 'No'}

                </span>

              </div>

            )}

            {/* AI CONFIDENCE */}
            {caseData.aiConfidence !== undefined && (

              <div className="detail-item">

                <span className="label">
                  <FaRobot /> AI Confidence
                </span>

                <span className="value">

                  {caseData.aiConfidence}%

                </span>

              </div>

            )}

            {/* BLOCKCHAIN */}
            {caseData.blockchainHash && (

              <div className="detail-item full-width">

                <span className="label">
                  <FaShieldAlt /> Blockchain Hash
                </span>

                <span
                  className="value blockchain-value"
                >
                  {caseData.blockchainHash}
                </span>

              </div>

            )}

          </div>

          {/* DESCRIPTION */}
          {caseData.description && (

            <div className="description-section">

              <h3>
                Description
              </h3>

              <p>
                {caseData.description}
              </p>

            </div>

          )}

          {/* AI SUMMARY */}
          {caseData.aiSummary && (

            <div className="description-section">

              <h3>
                AI Case Summary
              </h3>

              <p>
                {caseData.aiSummary}
              </p>

            </div>

          )}

          {/* AI RECOMMENDATION */}
          {caseData.recommendedAction && (

            <div className="description-section">

              <h3>
                AI Recommended Action
              </h3>

              <p>
                {caseData.recommendedAction}
              </p>

            </div>

          )}


          {/* BLOCKCHAIN CASE HISTORY */}
<div className="description-section">

  <h3>
    <FaShieldAlt /> Blockchain Case History
  </h3>

  {historyLoading ? (
    <p>Loading blockchain history...</p>
  ) : historyError ? (
    <p style={{ color: 'red' }}>{historyError}</p>
  ) : caseHistory.length === 0 ? (
    <p>No blockchain history available.</p>
  ) : (
    <div style={{ marginTop: '1rem' }}>
      {caseHistory.map((event, index) => (
        <div
          key={index}
          style={{
            background: '#F5F9FC',
            padding: '1rem',
            marginBottom: '0.8rem',
            borderRadius: '10px',
            borderLeft: '4px solid #0288D1'
          }}
        >
          <h4 style={{ margin: '0 0 8px 0' }}>
            {event.eventType}
          </h4>

          <p style={{ margin: '5px 0' }}>
            {event.details}
          </p>

          <p style={{ margin: '5px 0', color: '#666' }}>
            Actor: {event.actorId}
          </p>

          <small style={{ color: '#666' }}>
            {event.timestamp
              ? new Date(event.timestamp).toLocaleString()
              : 'Date unavailable'}
          </small>
        </div>
      ))}
    </div>
  )}

</div>

          {/* ACTION BUTTONS */}
          <div className="action-buttons">

            {/* CLOSE */}
            <Link
              to="/admin-dashboard/cases"
              className="btn-back"
            >
              Close
            </Link>

            {/* EDIT */}
            <Link
              to={`/admin-dashboard/cases/edit/${caseData.id}`}
              className="btn-edit"
            >
              <FaFileAlt />
              Edit Case
            </Link>

            {/* GENERATE REPORT */}
            <button
              type="button"
              className="btn-report"
              onClick={generateReport}
            >
              <FaDownload />
              Generate Report
            </button>

          </div>

        </div>

      </div>
    </>
  );
};

export default ViewCase;