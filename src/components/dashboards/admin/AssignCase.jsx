
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  FaArrowLeft,
  FaGavel,
  FaUserTie,
  FaBriefcase
} from 'react-icons/fa';

import {
  ref,
  onValue,
  off,
  update,
  push,
  set,
  serverTimestamp
} from 'firebase/database';

import { auth, db } from '../../../firebase';
import Swal from 'sweetalert2';

const AssignCase = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const user = auth.currentUser;

  const [loading, setLoading] = useState(true);
  const [caseData, setCaseData] = useState(null);

  const [judges, setJudges] = useState([]);
  const [lawyers, setLawyers] = useState([]);

  const [formData, setFormData] = useState({
    judgeId: '',
    lawyerId: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // ============================================================
  // CHECK LOGIN
  // ============================================================

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // ============================================================
  // LOAD CASE + JUDGES + LAWYERS
  // ============================================================

  useEffect(() => {
    if (!user || !id) return;

    const caseRef = ref(db, `cases/${id}`);
    const usersRef = ref(db, 'users');

    let caseLoaded = false;
    let usersLoaded = false;

    const checkComplete = () => {
      if (caseLoaded && usersLoaded) {
        setLoading(false);
      }
    };

    // ==========================================================
    // LOAD CASE
    // ==========================================================

    const handleCase = (snapshot) => {
      if (snapshot.exists()) {
        setCaseData({
          id,
          ...snapshot.val()
        });
      } else {
        setError('Case not found.');
      }

      caseLoaded = true;
      checkComplete();
    };

    const handleCaseError = (err) => {
      console.error('Case Firebase error:', err);

      setError('Failed to load case.');

      caseLoaded = true;
      checkComplete();
    };

    onValue(
      caseRef,
      handleCase,
      handleCaseError
    );

    // ==========================================================
    // LOAD USERS
    // ==========================================================

    const handleUsers = (snapshot) => {
      const data = snapshot.val();

      if (data) {

        const usersArray = Object.keys(data).map(
          (key) => ({
            id: key,
            ...data[key]
          })
        );

        // ------------------------------------------------------
        // JUDGES
        // ------------------------------------------------------

        const judgesList = usersArray.filter(
          (u) => {

            const role = String(
              u.role || ''
            ).toLowerCase();

            const status = String(
              u.status || 'Active'
            ).toLowerCase();

            return (
              role === 'judge' &&
              status !== 'inactive'
            );
          }
        );

        // ------------------------------------------------------
        // LAWYERS
        // ------------------------------------------------------

        const lawyersList = usersArray.filter(
          (u) => {

            const role = String(
              u.role || ''
            ).toLowerCase();

            const status = String(
              u.status || 'Active'
            ).toLowerCase();

            return (
              role === 'lawyer' &&
              status !== 'inactive'
            );
          }
        );

        setJudges(judgesList);
        setLawyers(lawyersList);

        console.log(
          'Judges loaded:',
          judgesList
        );

        console.log(
          'Lawyers loaded:',
          lawyersList
        );

      } else {

        setJudges([]);
        setLawyers([]);

      }

      usersLoaded = true;
      checkComplete();
    };

    const handleUsersError = (err) => {
      console.error(
        'Users Firebase error:',
        err
      );

      setError(
        'Failed to load judges and lawyers.'
      );

      usersLoaded = true;
      checkComplete();
    };

    onValue(
      usersRef,
      handleUsers,
      handleUsersError
    );

    return () => {
      off(caseRef, 'value', handleCase);
      off(usersRef, 'value', handleUsers);
    };

  }, [id, user, navigate]);

  // ============================================================
  // HANDLE CHANGE
  // ============================================================

  const handleChange = (e) => {

    const {
      name,
      value
    } = e.target;

    setFormData(
      (prev) => ({
        ...prev,
        [name]: value
      })
    );

    setError('');
  };

  // ============================================================
  // SUBMIT ASSIGNMENT
  // ============================================================

  const handleSubmit = async (e) => {

    e.preventDefault();

    if (
      !formData.judgeId ||
      !formData.lawyerId
    ) {

      setError(
        'Please select both Judge and Lawyer.'
      );

      return;
    }

    const selectedJudge =
      judges.find(
        (judge) =>
          judge.id === formData.judgeId
      );

    const selectedLawyer =
      lawyers.find(
        (lawyer) =>
          lawyer.id === formData.lawyerId
      );

    if (
      !selectedJudge ||
      !selectedLawyer
    ) {

      setError(
        'Selected judge or lawyer not found.'
      );

      return;
    }

    setSubmitting(true);
    setError('');

    try {

      const judgeName =
        selectedJudge.fullName ||
        selectedJudge.name ||
        selectedJudge.id;

      const lawyerName =
        selectedLawyer.fullName ||
        selectedLawyer.name ||
        selectedLawyer.id;

      // ========================================================
      // UPDATE CASE
      // ========================================================

      const updates = {

        assignedJudge:
          judgeName,

        assignedJudgeId:
          selectedJudge.id,

        assignedLawyer:
          lawyerName,

        assignedLawyerId:
          selectedLawyer.id,

        status:
          'Assigned'
      };

      await update(
        ref(db, `cases/${id}`),
        updates
      );

      // ========================================================
      // SYSTEM LOG
      // ========================================================

      const logsRef =
        ref(db, 'systemLogs');

      const logKey =
        push(logsRef).key;

      await set(
        ref(
          db,
          `systemLogs/${logKey}`
        ),
        {

          action:
            `Case ${id} assigned to Judge ${judgeName} and Lawyer ${lawyerName}`,

          user:
            user?.displayName ||
            user?.email ||
            'Admin',

          timestamp:
            serverTimestamp()
        }
      );

      // ========================================================
      // SUCCESS
      // ========================================================

      await Swal.fire({

        icon: 'success',

        title:
          'Assigned Successfully!',

        text:
          `Case ${id} has been assigned to Judge ${judgeName} and Lawyer ${lawyerName}`,

        confirmButtonColor:
          '#4FC3F7',

        timer:
          3000,

        timerProgressBar:
          true

      });

      navigate(
        '/admin-dashboard/cases'
      );

    } catch (err) {

      console.error(
        'Assignment error:',
        err
      );

      Swal.fire({

        icon: 'error',

        title:
          'Assignment Failed',

        text:
          'Failed to assign case. Please try again.',

        confirmButtonColor:
          '#4FC3F7'

      });

      setError(
        'Failed to assign case. Please try again.'
      );

    } finally {

      setSubmitting(false);

    }
  };

  // ============================================================
  // LOADING
  // ============================================================

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

        <p>
          Loading case and users...
        </p>

      </div>

    );
  }

  // ============================================================
  // CASE NOT FOUND
  // ============================================================

  if (
    error &&
    !caseData
  ) {

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

        <p
          style={{
            color: '#D32F2F'
          }}
        >
          {error}
        </p>

        <button
          onClick={() =>
            navigate(
              '/admin-dashboard/cases'
            )
          }
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1.5rem',
            background: '#0288D1',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Back to Cases
        </button>

      </div>
    );
  }

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
          --shadow: 0 8px 32px rgba(0,0,0,0.08);
          --radius: 16px;
        }

        .case-management-page {
          min-height: 100vh;
          padding: 2rem;

          background:
            linear-gradient(
              135deg,
              #E3F2FD 0%,
              #BBDEFB 50%,
              #90CAF9 100%
            );
        }

        .case-page-header {
          margin-bottom: 2rem;

          background:
            rgba(255,255,255,0.7);

          backdrop-filter:
            blur(10px);

          padding:
            1.5rem 2rem;

          border-radius:
            var(--radius);

          box-shadow:
            var(--shadow);
        }

        .back-button {
          display:
            inline-flex;

          align-items:
            center;

          gap:
            0.5rem;

          color:
            var(--black);

          text-decoration:
            none;

          font-weight:
            500;

          background:
            none;

          border:
            none;

          cursor:
            pointer;

          font-size:
            1rem;

          padding:
            0;
        }

        .back-button:hover {
          color:
            var(--sky-dark);

          transform:
            translateX(-4px);
        }

        .case-heading {
          display:
            flex;

          align-items:
            center;

          gap:
            1rem;

          margin-top:
            0.5rem;
        }

        .case-heading-icon {
          display:
            flex;

          align-items:
            center;

          justify-content:
            center;

          width:
            48px;

          height:
            48px;

          background:
            rgba(79,195,247,0.15);

          border-radius:
            50%;

          color:
            var(--sky-dark);

          font-size:
            1.5rem;
        }

        .case-heading h1 {
          font-size:
            2.2rem;

          font-weight:
            800;

          color:
            var(--black);

          margin:
            0;
        }

        .case-heading p {
          color:
            var(--gray);

          margin:
            0;
        }

        .case-form-card {
          background:
            rgba(255,255,255,0.85);

          backdrop-filter:
            blur(20px);

          border:
            1px solid
            rgba(255,255,255,0.9);

          border-radius:
            var(--radius);

          box-shadow:
            var(--shadow);

          padding:
            2rem;

          max-width:
            700px;

          margin:
            0 auto;
        }

        .case-info-box {
          display:
            flex;

          align-items:
            center;

          gap:
            1rem;

          padding:
            0.8rem 1rem;

          background:
            rgba(79,195,247,0.06);

          border-radius:
            10px;

          margin-bottom:
            1.5rem;

          border-left:
            4px solid
            var(--sky);
        }

        .case-info-icon {
          font-size:
            1.2rem;

          color:
            var(--sky-dark);
        }

        .case-info-box div {
          display:
            flex;

          flex-direction:
            column;
        }

        .case-info-box span {
          font-size:
            0.8rem;

          color:
            var(--gray);
        }

        .case-info-box strong {
          font-size:
            1.1rem;

          color:
            var(--black);
        }

        .case-info-box p {
          margin:
            0.2rem 0 0;

          color:
            var(--black);
        }

        .form-grid {
          display:
            grid;

          grid-template-columns:
            1fr 1fr;

          gap:
            1.2rem;
        }

        .form-group {
          display:
            flex;

          flex-direction:
            column;

          gap:
            0.3rem;
        }

        .form-group label {
          font-weight:
            600;

          color:
            var(--black);

          font-size:
            0.9rem;

          display:
            flex;

          align-items:
            center;

          gap:
            0.4rem;
        }

        .form-group select {
          padding:
            0.6rem 0.8rem;

          border:
            2px solid
            #D1E8F5;

          border-radius:
            8px;

          font-size:
            0.95rem;

          background:
            var(--white);
        }

        .form-group select:focus {
          outline:
            none;

          border-color:
            var(--sky);

          box-shadow:
            0 0 0 4px
            rgba(79,195,247,0.2);
        }

        .form-actions {
          display:
            flex;

          justify-content:
            flex-end;

          gap:
            1rem;

          margin-top:
            2rem;
        }

        .cancel-btn {
          padding:
            0.6rem 1.5rem;

          background:
            rgba(0,0,0,0.06);

          border:
            none;

          border-radius:
            8px;

          color:
            var(--black);

          font-weight:
            600;

          cursor:
            pointer;
        }

        .add-case-btn {
          padding:
            0.6rem 1.5rem;

          background:
            linear-gradient(
              135deg,
              var(--sky),
              var(--sky-dark)
            );

          border:
            none;

          border-radius:
            8px;

          color:
            white;

          font-weight:
            600;

          cursor:
            pointer;

          display:
            inline-flex;

          align-items:
            center;

          gap:
            0.5rem;
        }

        .add-case-btn:disabled {
          opacity:
            0.6;

          cursor:
            not-allowed;
        }

        .error-message {
          color:
            #D32F2F;

          font-size:
            0.9rem;

          padding:
            0.5rem;

          background:
            rgba(211,47,47,0.08);

          border-radius:
            8px;

          border-left:
            3px solid
            #D32F2F;

          margin-bottom:
            1rem;

          grid-column:
            1 / -1;
        }

        .users-info {
          margin-top:
            1rem;

          padding:
            0.8rem;

          background:
            rgba(79,195,247,0.08);

          border-radius:
            8px;

          font-size:
            0.85rem;

          color:
            var(--gray);
        }

        @media (max-width: 768px) {

          .case-management-page {
            padding:
              1rem;
          }

          .case-form-card {
            padding:
              1.5rem;
          }

          .form-grid {
            grid-template-columns:
              1fr;
          }

          .form-actions {
            flex-direction:
              column;
          }

          .form-actions button {
            width:
              100%;
          }

          .case-heading h1 {
            font-size:
              1.8rem;
          }

        }

      `}</style>

      <div className="case-management-page">

        <div className="case-page-header">

          <button
            className="back-button"
            onClick={() =>
              navigate(
                '/admin-dashboard/cases'
              )
            }
          >
            <FaArrowLeft />
            Back to Case Management
          </button>

          <div className="case-heading">

            <div className="case-heading-icon">
              <FaBriefcase />
            </div>

            <div>

              <h1>
                Assign Case
              </h1>

              <p>
                Assign a judge and lawyer to this case
              </p>

            </div>

          </div>

        </div>

        <div className="case-form-card">

          <div className="case-info-box">

            <div className="case-info-icon">
              <FaBriefcase />
            </div>

            <div>

              <span>
                Case
              </span>

              <strong>
                {caseData?.caseId ||
                  caseData?.id ||
                  id}
              </strong>

              {caseData?.title && (
                <p>
                  {caseData.title}
                </p>
              )}

            </div>

          </div>

          <form onSubmit={handleSubmit}>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <div className="form-grid">

              {/* JUDGE */}

              <div className="form-group">

                <label>
                  <FaGavel />
                  Assign Judge
                </label>

                <select
                  name="judgeId"
                  value={formData.judgeId}
                  onChange={handleChange}
                  required
                >

                  <option value="">
                    Select Judge
                  </option>

                  {judges.map(
                    (judge) => (

                      <option
                        key={judge.id}
                        value={judge.id}
                      >

                        {judge.fullName ||
                          judge.name ||
                          judge.id}

                        {judge.judgeId
                          ? ` (${judge.judgeId})`
                          : ''}

                      </option>

                    )
                  )}

                </select>

                {judges.length === 0 && (
                  <small
                    style={{
                      color: '#D32F2F',
                      marginTop: '5px'
                    }}
                  >
                    No active judges found in users.
                  </small>
                )}

              </div>

              {/* LAWYER */}

              <div className="form-group">

                <label>
                  <FaUserTie />
                  Assign Lawyer
                </label>

                <select
                  name="lawyerId"
                  value={formData.lawyerId}
                  onChange={handleChange}
                  required
                >

                  <option value="">
                    Select Lawyer
                  </option>

                  {lawyers.map(
                    (lawyer) => (

                      <option
                        key={lawyer.id}
                        value={lawyer.id}
                      >

                        {lawyer.fullName ||
                          lawyer.name ||
                          lawyer.id}

                      </option>

                    )
                  )}

                </select>

                {lawyers.length === 0 && (
                  <small
                    style={{
                      color: '#D32F2F',
                      marginTop: '5px'
                    }}
                  >
                    No active lawyers found in users.
                  </small>
                )}

              </div>

            </div>

            <div className="users-info">

              <strong>
                Available:
              </strong>{' '}

              {judges.length} Judge(s)
              {' • '}
              {lawyers.length} Lawyer(s)

            </div>

            <div className="form-actions">

              <button
                type="button"
                className="cancel-btn"
                onClick={() =>
                  navigate(
                    '/admin-dashboard/cases'
                  )
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className="add-case-btn"
                disabled={
                  submitting ||
                  judges.length === 0 ||
                  lawyers.length === 0
                }
              >

                {submitting
                  ? 'Assigning...'
                  : (
                    <>
                      <FaBriefcase />
                      Assign Case
                    </>
                  )}

              </button>

            </div>

          </form>

        </div>

      </div>
    </>
  );
};

export default AssignCase;