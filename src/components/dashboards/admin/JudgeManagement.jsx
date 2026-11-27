
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaArrowLeft,
  FaPlus,
  FaSearch,
  FaEdit,
  FaToggleOn,
  FaToggleOff,
  FaGavel,
  FaCheck,
  FaTimes
} from 'react-icons/fa';

import { ref, onValue, off, update } from 'firebase/database';
import { auth, db } from '../../../firebase';

const JudgeManagement = () => {
  const navigate = useNavigate();

  const user = auth.currentUser;

  const [judges, setJudges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // ============================================================
  // CHECK ADMIN LOGIN
  // ============================================================

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // ============================================================
  // LOAD JUDGES FROM USERS
  // ============================================================

  useEffect(() => {
    if (!user) return;

    const usersRef = ref(db, 'users');

    const handleUsers = (snapshot) => {
      const data = snapshot.val();

      if (data) {
        const judgesArray = Object.keys(data)
          .filter((key) => {
            const role = String(data[key]?.role || '').toLowerCase();
            return role === 'judge';
          })
          .map((key) => ({
            id: key,
            judgeId:
              data[key]?.judgeId ||
              key.slice(0, 8).toUpperCase(),
            ...data[key]
          }));

        setJudges(judgesArray);
      } else {
        setJudges([]);
      }

      setLoading(false);
    };

    const handleError = (error) => {
      console.error('Firebase error:', error);
      setLoading(false);
    };

    onValue(usersRef, handleUsers, handleError);

    return () => {
      off(usersRef, 'value', handleUsers);
    };
  }, [user]);

  // ============================================================
  // APPROVE JUDGE
  // ============================================================

  const approveJudge = async (judge) => {
    try {
      await update(ref(db, `users/${judge.id}`), {
        status: 'Active',
        approvalStatus: 'Approved'
      });

      alert(
        `${judge.fullName || judge.name || 'Judge'} has been approved successfully.`
      );
    } catch (error) {
      console.error('Approve judge error:', error);
      alert('Failed to approve judge.');
    }
  };

  // ============================================================
  // REJECT JUDGE
  // ============================================================

  const rejectJudge = async (judge) => {
    try {
      await update(ref(db, `users/${judge.id}`), {
        status: 'Inactive',
        approvalStatus: 'Rejected'
      });

      alert(
        `${judge.fullName || judge.name || 'Judge'} has been rejected.`
      );
    } catch (error) {
      console.error('Reject judge error:', error);
      alert('Failed to reject judge.');
    }
  };

  // ============================================================
  // TOGGLE ACTIVE / INACTIVE
  // ============================================================

  const toggleStatus = async (judge) => {
    const currentStatus = String(
      judge.status || 'Active'
    );

    const newStatus =
      currentStatus.toLowerCase() === 'active'
        ? 'Inactive'
        : 'Active';

    try {
      await update(ref(db, `users/${judge.id}`), {
        status: newStatus
      });

      alert(
        `${judge.fullName || judge.name || 'Judge'} status changed to ${newStatus}.`
      );
    } catch (error) {
      console.error('Status update error:', error);
      alert('Failed to update judge status.');
    }
  };

  // ============================================================
  // SEARCH
  // ============================================================

  const filteredJudges = judges.filter((judge) => {
    const searchText = search.toLowerCase().trim();

    return (
      String(judge.fullName || '')
        .toLowerCase()
        .includes(searchText) ||

      String(judge.name || '')
        .toLowerCase()
        .includes(searchText) ||

      String(judge.judgeId || '')
        .toLowerCase()
        .includes(searchText) ||

      String(judge.specialization || '')
        .toLowerCase()
        .includes(searchText) ||

      String(judge.court || '')
        .toLowerCase()
        .includes(searchText) ||

      String(judge.rank || '')
        .toLowerCase()
        .includes(searchText)
    );
  });

  // ============================================================
  // APPROVAL STATUS
  // ============================================================

  const getApprovalStatus = (judge) => {
    if (judge.approvalStatus) {
      return judge.approvalStatus;
    }

    if (
      String(judge.status || '').toLowerCase() === 'active'
    ) {
      return 'Approved';
    }

    return 'Pending';
  };

  // ============================================================
  // RENDER
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
          --shadow: 0 8px 32px rgba(0,0,0,0.08);
          --radius: 16px;
        }

        * {
          box-sizing: border-box;
        }

        .judge-management-page {
          min-height: 100vh;
          padding: 2rem;

          background:
            linear-gradient(
              135deg,
              #E3F2FD 0%,
              #BBDEFB 50%,
              #90CAF9 100%
            );

          animation:
            gradientShift 12s ease-in-out infinite alternate;
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

        .judge-page-header {
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

        .judge-header-left {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
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

        .judge-heading {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .judge-heading-icon {
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

        .judge-heading h1 {
          font-size: 2.2rem;

          font-weight: 800;

          color: var(--black);

          margin: 0;
        }

        .judge-heading p {
          color: var(--gray);

          margin: 0.2rem 0 0;
        }

        .add-judge-btn {
          display: inline-flex;
          align-items: center;

          gap: 0.5rem;

          padding: 0.7rem 1.5rem;

          background:
            linear-gradient(
              135deg,
              var(--sky),
              var(--sky-dark)
            );

          color: white;

          border: none;

          border-radius: 50px;

          font-weight: 600;

          text-decoration: none;

          transition: all 0.3s;

          box-shadow:
            0 4px 15px
            rgba(79,195,247,0.3);
        }

        .add-judge-btn:hover {
          transform: translateY(-2px);

          box-shadow:
            0 8px 25px
            rgba(2,136,209,0.4);
        }

        .judge-toolbar {
          display: flex;

          justify-content: space-between;

          align-items: center;

          gap: 1.5rem;

          flex-wrap: wrap;

          margin-bottom: 2rem;

          background:
            rgba(255,255,255,0.7);

          backdrop-filter: blur(10px);

          padding: 1rem 1.5rem;

          border-radius: var(--radius);

          box-shadow: var(--shadow);
        }

        .judge-search {
          flex: 1;

          position: relative;

          min-width: 200px;
        }

        .judge-search svg {
          position: absolute;

          left: 1rem;

          top: 50%;

          transform:
            translateY(-50%);

          color: var(--gray);
        }

        .judge-search input {
          width: 100%;

          padding:
            0.7rem
            1rem
            0.7rem
            2.8rem;

          border:
            2px solid #D1E8F5;

          border-radius: 50px;

          font-size: 0.95rem;

          background: var(--white);

          transition: 0.3s;
        }

        .judge-search input:focus {
          outline: none;

          border-color: var(--sky);

          box-shadow:
            0 0 0 4px
            rgba(79,195,247,0.2);
        }

        .judge-count {
          color: var(--gray);

          font-size: 0.95rem;
        }

        .judge-count strong {
          color: var(--black);
        }

        .judges-table-container {
          background:
            rgba(255,255,255,0.85);

          backdrop-filter: blur(20px);

          border:
            1px solid
            rgba(255,255,255,0.9);

          border-radius: var(--radius);

          box-shadow: var(--shadow);

          overflow-x: auto;

          padding: 1.5rem;
        }

        .judges-table {
          width: 100%;

          min-width: 1100px;

          border-collapse: collapse;

          font-size: 0.9rem;
        }

        .judges-table th {
          padding: 0.9rem 0.6rem;

          text-align: left;

          font-weight: 700;

          color: var(--black);

          border-bottom:
            2px solid
            rgba(0,0,0,0.08);

          white-space: nowrap;
        }

        .judges-table td {
          padding: 0.9rem 0.6rem;

          border-bottom:
            1px solid
            rgba(0,0,0,0.05);

          vertical-align: middle;
        }

        .judges-table tr:hover {
          background:
            rgba(79,195,247,0.05);
        }

        .specialization-badge {
          display: inline-block;

          background:
            rgba(79,195,247,0.1);

          color: var(--sky-dark);

          padding:
            0.2rem 0.7rem;

          border-radius: 50px;

          font-size: 0.8rem;

          font-weight: 600;
        }

        .status-badge {
          display: inline-block;

          padding:
            0.25rem 0.75rem;

          border-radius: 50px;

          font-size: 0.75rem;

          font-weight: 700;

          text-transform: capitalize;

          white-space: nowrap;
        }

        .status-badge.active {
          background: #D1FAE5;
          color: #065F46;
        }

        .status-badge.inactive {
          background: #FEE2E2;
          color: #991B1B;
        }

        .status-badge.pending {
          background: #FEF3C7;
          color: #92400E;
        }

        .status-badge.approved {
          background: #D1FAE5;
          color: #065F46;
        }

        .status-badge.rejected {
          background: #FEE2E2;
          color: #991B1B;
        }

        .workload-container {
          display: flex;

          align-items: center;

          gap: 0.5rem;

          min-width: 100px;
        }

        .workload-bar {
          width: 60px;

          height: 6px;

          background: #E0E7EF;

          border-radius: 10px;

          overflow: hidden;
        }

        .workload-progress {
          height: 100%;

          background:
            linear-gradient(
              90deg,
              var(--sky),
              var(--sky-dark)
            );

          border-radius: 10px;

          transition: width 0.3s ease;
        }

        .judge-actions {
          display: flex;

          gap: 0.4rem;

          flex-wrap: wrap;
        }

        .judge-actions button {
          display: inline-flex;

          align-items: center;

          justify-content: center;

          width: 34px;

          height: 34px;

          border: none;

          border-radius: 7px;

          cursor: pointer;

          transition: 0.3s;

          font-size: 0.85rem;
        }

        .edit-btn {
          background:
            rgba(255,154,86,0.1);

          color: #FF9A56;
        }

        .edit-btn:hover {
          background:
            rgba(255,154,86,0.2);

          transform: scale(1.05);
        }

        .approve-btn {
          background:
            rgba(16,185,129,0.12);

          color: #059669;
        }

        .approve-btn:hover {
          background:
            rgba(16,185,129,0.22);

          transform: scale(1.05);
        }

        .reject-btn {
          background:
            rgba(239,68,68,0.12);

          color: #DC2626;
        }

        .reject-btn:hover {
          background:
            rgba(239,68,68,0.22);

          transform: scale(1.05);
        }

        .status-btn {
          background:
            rgba(0,230,118,0.1);

          color: #00A866;
        }

        .status-btn:hover {
          background:
            rgba(0,230,118,0.2);

          transform: scale(1.05);
        }

        .no-judges {
          text-align: center;

          padding: 3rem 2rem;

          color: var(--gray);

          font-size: 1rem;
        }

        .loading-text {
          text-align: center;

          padding: 3rem 2rem;

          color: var(--gray);

          font-size: 1rem;
        }

        @media (max-width: 992px) {

          .judge-toolbar {
            flex-direction: column;
            align-items: stretch;
          }

          .judges-table {
            font-size: 0.8rem;
          }

          .judges-table th,
          .judges-table td {
            padding:
              0.5rem
              0.4rem;
          }
        }

        @media (max-width: 768px) {

          .judge-management-page {
            padding: 1rem;
          }

          .judge-page-header {
            padding: 1rem;

            flex-direction: column;

            align-items: stretch;
          }

          .judge-heading h1 {
            font-size: 1.8rem;
          }

          .judges-table {
            font-size: 0.75rem;
          }

          .judge-actions button {
            width: 30px;

            height: 30px;

            font-size: 0.75rem;
          }

          .workload-bar {
            width: 40px;
          }
        }

        @media (max-width: 480px) {

          .judge-heading {
            flex-direction: column;

            align-items: flex-start;
          }

          .add-judge-btn {
            width: 100%;

            justify-content: center;
          }
        }

      `}</style>

      <div className="judge-management-page">

        <div className="judge-page-header">

          <div className="judge-header-left">

            <Link
              to="/admin-dashboard"
              className="back-button"
            >
              <FaArrowLeft />
              Back to Dashboard
            </Link>

            <div className="judge-heading">

              <div className="judge-heading-icon">
                <FaGavel />
              </div>

              <div>

                <h1>
                  Judge Management
                </h1>

                <p>
                  Register, approve, manage and monitor court judges
                </p>

              </div>

            </div>

          </div>

          <Link
            to="/admin-dashboard/judges/add"
            className="add-judge-btn"
          >
            <FaPlus />
            Add New Judge
          </Link>

        </div>

        <div className="judge-toolbar">

          <div className="judge-search">

            <FaSearch />

            <input
              type="text"
              placeholder="Search judge, ID or specialization..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
            />

          </div>

          <div className="judge-count">

            Total Judges:{' '}

            <strong>
              {judges.length}
            </strong>

          </div>

        </div>

        <div className="judges-table-container">

          {loading ? (

            <div className="loading-text">
              Loading judges...
            </div>

          ) : judges.length === 0 ? (

            <div className="no-judges">
              No judges found in Firebase.
            </div>

          ) : (

            <table className="judges-table">

              <thead>

                <tr>

                  <th>Judge ID</th>
                  <th>Name</th>
                  <th>Specialization</th>
                  <th>Experience</th>
                  <th>Court</th>
                  <th>Rank</th>
                  <th>Workload</th>
                  <th>Status</th>
                  <th>Approval</th>
                  <th>Actions</th>

                </tr>

              </thead>

              <tbody>

                {filteredJudges.map((judge) => {

                  const approvalStatus =
                    getApprovalStatus(judge);

                  const status =
                    judge.status || 'Pending';

                  const workload =
                    Math.min(
                      Math.max(
                        Number(judge.workload) || 0,
                        0
                      ),
                      100
                    );

                  return (

                    <tr key={judge.id}>

                      <td>
                        <strong>
                          {judge.judgeId}
                        </strong>
                      </td>

                      <td>
                        {judge.fullName ||
                          judge.name ||
                          'N/A'}
                      </td>

                      <td>
                        <span className="specialization-badge">
                          {judge.specialization ||
                            judge.judgeType ||
                            'General'}
                        </span>
                      </td>

                      <td>
                        {judge.experience !== undefined &&
                        judge.experience !== null &&
                        judge.experience !== ''
                          ? `${judge.experience} years`
                          : 'N/A'}
                      </td>

                      <td>
                        {judge.court || 'N/A'}
                      </td>

                      <td>
                        {judge.rank || 'N/A'}
                      </td>

                      <td>

                        <div className="workload-container">

                          <div className="workload-bar">

                            <div
                              className="workload-progress"
                              style={{
                                width: `${workload}%`
                              }}
                            />

                          </div>

                          <span>
                            {workload}%
                          </span>

                        </div>

                      </td>

                      <td>

                        <span
                          className={`status-badge ${
                            String(status).toLowerCase()
                          }`}
                        >
                          {status}
                        </span>

                      </td>

                      <td>

                        <span
                          className={`status-badge ${
                            String(
                              approvalStatus
                            ).toLowerCase()
                          }`}
                        >
                          {approvalStatus}
                        </span>

                      </td>

                      <td>

                        <div className="judge-actions">

                          <button
                            type="button"
                            className="edit-btn"
                            title="Edit Judge"
                            onClick={() =>
                              navigate(
                                `/admin-dashboard/judges/edit/${judge.id}`
                              )
                            }
                          >
                            <FaEdit />
                          </button>

                          {String(
                            approvalStatus
                          ).toLowerCase() !== 'approved' && (

                            <button
                              type="button"
                              className="approve-btn"
                              title="Approve Judge"
                              onClick={() =>
                                approveJudge(judge)
                              }
                            >
                              <FaCheck />
                            </button>

                          )}

                          {String(
                            approvalStatus
                          ).toLowerCase() !== 'rejected' && (

                            <button
                              type="button"
                              className="reject-btn"
                              title="Reject Judge"
                              onClick={() =>
                                rejectJudge(judge)
                              }
                            >
                              <FaTimes />
                            </button>

                          )}

                          <button
                            type="button"
                            className="status-btn"
                            title="Change Status"
                            onClick={() =>
                              toggleStatus(judge)
                            }
                          >

                            {String(status).toLowerCase() ===
                            'active' ? (

                              <FaToggleOn />

                            ) : (

                              <FaToggleOff />

                            )}

                          </button>

                        </div>

                      </td>

                    </tr>

                  );

                })}

              </tbody>

            </table>

          )}

          {!loading &&
            judges.length > 0 &&
            filteredJudges.length === 0 && (

              <div className="no-judges">
                No judges match your search.
              </div>

            )}

        </div>

      </div>
    </>
  );
};

export default JudgeManagement;
