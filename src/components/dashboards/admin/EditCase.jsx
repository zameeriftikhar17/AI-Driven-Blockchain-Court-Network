
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import {
  FaArrowLeft,
  FaFileAlt,
  FaUserTie,
  FaGavel,
  FaSpinner,
  FaRobot,
  FaUser
} from 'react-icons/fa';

import {
  ref,
  onValue,
  off,
  update
} from 'firebase/database';

import { auth, db } from '../../../firebase';
import Swal from 'sweetalert2';

const EditCase = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    caseId: '',
    title: '',
    caseType: '',
    predictedCaseType: '',
    client: '',
    lawyer: 'Not Assigned',
    judge: 'Not Assigned',
    recommendedLawyer: 'Not Available',
    recommendedJudge: 'Not Available',
    court: '',
    status: 'Pending',
    filingDate: '',
    assignedLawyerId: '',
    assignedJudgeId: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [lawyers, setLawyers] = useState([]);
  const [judges, setJudges] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);

  // ============================================================
  // AUTH CHECK
  // ============================================================

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user) navigate('/login');
    });

    return () => unsubscribeAuth();
  }, [navigate]);

  // ============================================================
  // GET USER NAME
  // ============================================================

  const getUserName = (user) => {
    if (!user) return 'Unknown User';

    return (
      user.fullName ||
      user.name ||
      user.displayName ||
      user.username ||
      user.userName ||
      user.email ||
      'Unnamed User'
    );
  };

  // ============================================================
  // GET LAWYER SPECIALIZATION
  // ============================================================

  const getLawyerSpecialization = (lawyer) => {
    if (!lawyer) return '';

    return (
      lawyer.lawyerType ||
      lawyer.specialization ||
      lawyer.specialisation ||
      lawyer.expertise ||
      lawyer.caseType ||
      'General Lawyer'
    );
  };

  // ============================================================
  // LOAD CASE
  // ============================================================

  useEffect(() => {
    if (!id) {
      navigate('/admin-dashboard/cases');
      return;
    }

    const caseRef = ref(db, `cases/${id}`);

    const unsubscribe = onValue(
      caseRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setError('Case not found.');
          setLoading(false);

          return;
        }

        const data = snapshot.val();

        console.log('EDIT CASE DATA:', data);

        // Existing lawyer ID
        const existingLawyerId =
          data.assignedLawyerId ||
          data.lawyerId ||
          (
            data.assignedLawyer &&
            data.assignedLawyer !== 'Not Assigned'
              ? data.assignedLawyer
              : ''
          ) ||
          '';

        // Existing judge ID
        const existingJudgeId =
          data.assignedJudgeId ||
          data.judgeId ||
          (
            data.assignedJudge &&
            data.assignedJudge !== 'Not Assigned' &&
            data.assignedJudge !== data.assignedJudgeName
              ? data.assignedJudge
              : ''
          ) ||
          '';

        // AI-predicted case type
        const predictedType =
          data.predictedCaseType ||
          data.aiPredictedCaseType ||
          data.caseType ||
          data.type ||
          '';

        // Current case type (may already have an admin change)
        const currentCaseType =
          data.adminCaseType ||
          data.caseType ||
          data.type ||
          predictedType;

        // AI recommended judge
        const recommendedJudge =
          data.recommendedJudgeName ||
          data.aiRecommendedJudgeName ||
          data.recommendedJudge ||
          data.aiRecommendedJudge ||
          data.assignedJudgeName ||
          data.assignedJudge ||
          data.judgeName ||
          data.judge ||
          'Not Available';

        // AI recommended lawyer
        const recommendedLawyer =
          data.recommendedLawyerName ||
          data.aiRecommendedLawyerName ||
          data.recommendedLawyer ||
          data.aiRecommendedLawyer ||
          data.assignedLawyerName ||
          data.lawyerName ||
          data.lawyer ||
          'Not Available';

        // Citizen name from the original filing account
        const citizenName =
          data.userDisplayName ||
          data.citizenName ||
          data.userName ||
          data.client ||
          data.citizen ||
          '';

        setFormData({
          caseId: data.caseId || data.id || id,

          title:
            data.title ||
            data.caseTitle ||
            data.subject ||
            '',

          caseType: currentCaseType,

          predictedCaseType: predictedType,

          client: citizenName,

          lawyer:
            data.assignedLawyerName ||
            data.lawyerName ||
            (
              data.lawyer &&
              data.lawyer !== existingLawyerId
                ? data.lawyer
                : ''
            ) ||
            'Not Assigned',

          judge:
            data.assignedJudgeName ||
            data.judgeName ||
            (
              data.assignedJudge &&
              data.assignedJudge !== existingJudgeId
                ? data.assignedJudge
                : ''
            ) ||
            (
              data.judge &&
              data.judge !== existingJudgeId
                ? data.judge
                : ''
            ) ||
            'Not Assigned',

          recommendedJudge,
          recommendedLawyer,

          court: data.court || '',

          status: data.status || 'Pending',

          filingDate:
            data.filingDate ||
            data.filedDate ||
            '',

          assignedLawyerId: existingLawyerId,
          assignedJudgeId: existingJudgeId
        });

        setError('');
        setLoading(false);
      },
      (err) => {
        console.error('CASE LOAD ERROR:', err);
        setError('Failed to load case data.');
        setLoading(false);
      }
    );

    return () => {
      off(caseRef);
    };
  }, [id, navigate]);

  // ============================================================
  // LOAD JUDGES AND LAWYERS
  // ============================================================

  useEffect(() => {
    const usersRef = ref(db, 'users');

    setUsersLoading(true);

    const unsubscribe = onValue(
      usersRef,
      (snapshot) => {
        const data = snapshot.val();

        if (!data) {
          setLawyers([]);
          setJudges([]);
          setUsersLoading(false);
          return;
        }

        const allUsers = Object.entries(data)
          .map(([userId, userData]) => ({
            id: userId,
            ...(userData || {})
          }))
          .filter((user) => user && typeof user === 'object');

        const isActiveUser = (user) => {
          const status = String(user.status || '')
            .trim()
            .toLowerCase();

          const accountStatus = String(user.accountStatus || '')
            .trim()
            .toLowerCase();

          return (
            user.isActive !== false &&
            user.active !== false &&
            !['inactive', 'disabled', 'deactivated'].includes(status) &&
            !['inactive', 'disabled', 'deactivated'].includes(accountStatus)
          );
        };

        const lawyerList = allUsers
          .filter((user) => {
            const role = String(
              user.role || user.userRole || user.type || ''
            ).trim().toLowerCase();

            return (
              ['lawyer', 'advocate'].includes(role) &&
              isActiveUser(user)
            );
          })
          .sort((a, b) =>
            getUserName(a).localeCompare(getUserName(b))
          );

        const judgeList = allUsers
          .filter((user) => {
            const role = String(
              user.role || user.userRole || user.type || ''
            ).trim().toLowerCase();

            return role === 'judge' && isActiveUser(user);
          })
          .sort((a, b) =>
            getUserName(a).localeCompare(getUserName(b))
          );

        setLawyers(lawyerList);
        setJudges(judgeList);
        setUsersLoading(false);
      },
      (err) => {
        console.error('USERS LOAD ERROR:', err);
        setLawyers([]);
        setJudges([]);
        setUsersLoading(false);
        setError('Unable to load judges and lawyers from Firebase.');
      }
    );

    return () => {
      off(usersRef);
    };
  }, []);

  // ============================================================
  // HANDLE INPUT CHANGE
  // ============================================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  // ============================================================
  // CHANGE LAWYER
  // ============================================================

  const handleLawyerChange = (e) => {
    const lawyerId = e.target.value;

    const selectedLawyer = lawyers.find(
      (lawyer) => String(lawyer.id) === String(lawyerId)
    );

    if (!selectedLawyer) {
      setFormData((previous) => ({
        ...previous,
        assignedLawyerId: '',
        lawyer: 'Not Assigned'
      }));

      return;
    }

    setFormData((previous) => ({
      ...previous,
      assignedLawyerId: selectedLawyer.id,
      lawyer: getUserName(selectedLawyer)
    }));
  };

  // ============================================================
  // CHANGE JUDGE
  // ============================================================

  const handleJudgeChange = (e) => {
    const judgeId = e.target.value;

    const selectedJudge = judges.find(
      (judge) => String(judge.id) === String(judgeId)
    );

    if (!selectedJudge) {
      setFormData((previous) => ({
        ...previous,
        assignedJudgeId: '',
        judge: 'Not Assigned'
      }));

      return;
    }

    setFormData((previous) => ({
      ...previous,
      assignedJudgeId: selectedJudge.id,
      judge: getUserName(selectedJudge)
    }));
  };

  // ============================================================
  // SUBMIT / UPDATE CASE
  // ============================================================

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const {
      title,
      caseType,
      client,
      court,
      status,
      filingDate,
      assignedLawyerId,
      assignedJudgeId
    } = formData;

    if (
      !title.trim() ||
      !caseType ||
      !client.trim() ||
      !court ||
      !filingDate
    ) {
      setError('Please fill in all required fields.');
      return;
    }

    const selectedLawyer = lawyers.find(
      (lawyer) => String(lawyer.id) === String(assignedLawyerId)
    );

    const selectedJudge = judges.find(
      (judge) => String(judge.id) === String(assignedJudgeId)
    );

    const lawyerName = selectedLawyer
      ? getUserName(selectedLawyer)
      : formData.lawyer || 'Not Assigned';

    const judgeName = selectedJudge
      ? getUserName(selectedJudge)
      : formData.judge || 'Not Assigned';

    try {
      setSaving(true);

      const updateData = {
        // Basic information
        title: title.trim(),
        caseType,
        court,
        status,
        filingDate,

        // Citizen name is kept from original case record.
        // userDisplayName is NOT overwritten.

        // Admin case type selection
        adminCaseType:
          caseType !== formData.predictedCaseType
            ? caseType
            : null,

        // Lawyer assignment
        lawyer: lawyerName,
        lawyerName,
        assignedLawyer: assignedLawyerId || null,
        assignedLawyerId: assignedLawyerId || null,
        assignedLawyerName: lawyerName,

        // Judge assignment
        judge: judgeName,
        judgeName,
        assignedJudge: judgeName,
        assignedJudgeName: judgeName,
        assignedJudgeId: assignedJudgeId || null,

        // Update details
        lastUpdatedAt: new Date().toISOString(),
        lastUpdatedBy: auth.currentUser?.uid || null
      };

      console.log('UPDATING CASE:', updateData);

      await update(
        ref(db, `cases/${id}`),
        updateData
      );

      await Swal.fire({
        icon: 'success',
        title: 'Case Updated Successfully',
        html: `
          <div style="text-align:left">
            <p><strong>Case:</strong> ${formData.caseId}</p>
            <p><strong>Citizen:</strong> ${formData.client}</p>
            <p><strong>AI Predicted Type:</strong> ${formData.predictedCaseType}</p>
            <p><strong>Current Case Type:</strong> ${caseType}</p>
            <p><strong>Lawyer:</strong> ${lawyerName}</p>
            <p><strong>Judge:</strong> ${judgeName}</p>
          </div>
        `,
        confirmButtonColor: '#0288D1'
      });

      navigate('/admin-dashboard/cases');
    } catch (err) {
      console.error('CASE UPDATE ERROR:', err);

      setError(
        err?.message || 'Failed to update case. Please try again.'
      );

      Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: err?.message || 'Failed to update case.',
        confirmButtonColor: '#0288D1'
      });
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // RECOMMENDATION DISPLAY
  // ============================================================

  const getRecommendationName = (value, users) => {
    if (!value || value === 'Not Available') {
      return 'Not Available';
    }

    const matchedUser = users.find(
      (user) =>
        String(user.id) === String(value)
    );

    return matchedUser ? getUserName(matchedUser) : value;
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="edit-loading">
        <FaSpinner className="spin" />
        <p>Loading case...</p>

        <style>{`
          .edit-loading {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 12px;
          }

          .spin {
            font-size: 32px;
            color: #0288D1;
            animation: editSpin 1s linear infinite;
          }

          @keyframes editSpin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error && !formData.caseId) {
    return (
      <div className="edit-error">
        <p>{error}</p>
        <Link to="/admin-dashboard/cases">Back to Cases</Link>
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
          background: linear-gradient(
            135deg,
            #E3F2FD 0%,
            #BBDEFB 50%,
            #90CAF9 100%
          );
        }

        .case-page-header {
          margin-bottom: 2rem;
          background: rgba(255,255,255,0.7);
          backdrop-filter: blur(10px);
          padding: 1.5rem 2rem;
          border-radius: var(--radius);
          box-shadow: var(--shadow);
        }

        .case-header-left {
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

        .case-heading {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .case-heading-icon {
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

        .case-heading h1 {
          font-size: 2.2rem;
          font-weight: 800;
          color: var(--black);
          margin: 0;
        }

        .case-heading p {
          color: var(--gray);
          margin: 0;
        }

        .case-form-card {
          background: rgba(255,255,255,0.88);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.9);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          padding: 2rem;
          max-width: 900px;
          margin: 0 auto;
        }

        .case-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.2rem;
        }

        .case-form-group {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .case-form-group label {
          font-weight: 600;
          color: var(--black);
          font-size: 0.9rem;
        }

        .case-form-group input,
        .case-form-group select {
          padding: 0.7rem 0.8rem;
          border: 2px solid #D1E8F5;
          border-radius: 8px;
          font-size: 0.95rem;
          transition: 0.3s;
          background: var(--white);
          font-family: inherit;
          width: 100%;
          box-sizing: border-box;
        }

        .case-form-group input:focus,
        .case-form-group select:focus {
          outline: none;
          border-color: var(--sky);
          box-shadow: 0 0 0 4px rgba(79,195,247,0.2);
        }

        .case-form-group select {
          cursor: pointer;
        }

        .case-form-group input:disabled {
          background: #F0F4F8;
          color: #475569;
          cursor: not-allowed;
        }

        .full-width {
          grid-column: 1 / -1;
        }

        .assignment-label {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .assignment-label svg {
          color: var(--sky-dark);
        }

        .recommendation-box {
          background: #EAF6FF;
          border: 1px solid #B6DDF5;
          border-left: 4px solid #0288D1;
          padding: 12px 14px;
          border-radius: 9px;
          margin-bottom: 8px;
        }

        .recommendation-heading {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #075985;
          font-size: 0.82rem;
          font-weight: 700;
          margin-bottom: 6px;
        }

        .recommendation-value {
          color: #172554;
          font-weight: 700;
          font-size: 1rem;
        }

        .recommendation-note {
          color: #64748B;
          font-size: 0.76rem;
          margin-top: 5px;
        }

        .assignment-info {
          margin-top: 5px;
          font-size: 0.78rem;
          color: #64748B;
        }

        .users-loading {
          font-size: 12px;
          color: #64748B;
          margin-top: 4px;
        }

        .error-message {
          color: #D32F2F;
          font-size: 0.9rem;
          padding: 0.7rem;
          background: rgba(211,47,47,0.08);
          border-radius: 8px;
          border-left: 3px solid #D32F2F;
          margin-bottom: 1rem;
          grid-column: 1 / -1;
        }

        .case-form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          margin-top: 2rem;
        }

        .cancel-btn,
        .save-case-btn {
          padding: 0.7rem 1.5rem;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: 0.3s;
        }

        .cancel-btn {
          background: rgba(0,0,0,0.06);
          color: var(--black);
        }

        .cancel-btn:hover {
          background: rgba(0,0,0,0.1);
        }

        .save-case-btn {
          background: linear-gradient(135deg, var(--sky), var(--sky-dark));
          color: white;
          box-shadow: 0 4px 15px rgba(79,195,247,0.3);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .save-case-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(2,136,209,0.4);
        }

        .save-case-btn:disabled,
        .cancel-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .edit-error {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #D32F2F;
        }

        .edit-error a {
          color: #0288D1;
          margin-top: 10px;
        }

        @media (max-width: 768px) {
          .case-management-page {
            padding: 1rem;
          }

          .case-form-card {
            padding: 1.5rem;
          }

          .case-form-grid {
            grid-template-columns: 1fr;
          }

          .case-form-actions {
            flex-direction: column;
          }

          .case-form-actions button {
            width: 100%;
          }

          .case-heading h1 {
            font-size: 1.8rem;
          }
        }
      `}</style>

      <div className="case-management-page">

        {/* HEADER */}

        <div className="case-page-header">
          <div className="case-header-left">

            <Link
              to="/admin-dashboard/cases"
              className="back-button"
            >
              <FaArrowLeft />
              Back to Case Management
            </Link>

            <div className="case-heading">
              <div className="case-heading-icon">
                <FaFileAlt />
              </div>

              <div>
                <h1>Edit Case</h1>
                <p>Review AI recommendations and update case information</p>
              </div>
            </div>

          </div>
        </div>

        {/* FORM */}

        <div className="case-form-card">

          <form onSubmit={handleSubmit}>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <div className="case-form-grid">

              {/* CASE ID */}

              <div className="case-form-group">
                <label>Case ID</label>

                <input
                  type="text"
                  value={formData.caseId}
                  disabled
                />
              </div>

              {/* CITIZEN */}

              <div className="case-form-group">
                <label className="assignment-label">
                  <FaUser />
                  Citizen / Case Filed By
                </label>

                <input
                  type="text"
                  value={formData.client}
                  disabled
                />

                <div className="assignment-info">
                  Citizen name is taken from the account used to file this case.
                </div>
              </div>

              {/* AI CASE TYPE */}

              <div className="case-form-group full-width">

                <label className="assignment-label">
                  <FaRobot />
                  AI-Predicted Case Type
                </label>

                <div className="recommendation-box">
                  <div className="recommendation-heading">
                    <FaRobot />
                    Original AI Prediction
                  </div>

                  <div className="recommendation-value">
                    {formData.predictedCaseType || 'Not Available'}
                  </div>

                  <div className="recommendation-note">
                    This is the case type predicted by the AI model.
                  </div>
                </div>

                <label>Change Case Type (Admin)</label>

                <select
                  name="caseType"
                  value={formData.caseType}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Case Type</option>
                  <option value="Civil">Civil</option>
                  <option value="Criminal">Criminal</option>
                  <option value="Constitutional">Constitutional</option>
                  <option value="Family">Family</option>
                  <option value="Property">Property</option>
                  <option value="Corporate">Corporate</option>
                </select>

                <div className="assignment-info">
                  Admin can keep the AI prediction or select another case type.
                </div>

              </div>

              {/* CASE TITLE */}

              <div className="case-form-group full-width">
                <label>Case Title</label>

                <input
                  type="text"
                  name="title"
                  placeholder="Enter case title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* AI RECOMMENDED LAWYER */}

              <div className="case-form-group">

                <label className="assignment-label">
                  <FaRobot />
                  AI / Existing Lawyer Recommendation
                </label>

                <div className="recommendation-box">
                  <div className="recommendation-heading">
                    <FaRobot />
                    Recommended Lawyer
                  </div>

                  <div className="recommendation-value">
                    {getRecommendationName(
                      formData.recommendedLawyer,
                      lawyers
                    )}
                  </div>

                  <div className="recommendation-note">
                    Existing recommendation / assigned lawyer.
                  </div>
                </div>

                <label className="assignment-label">
                  <FaUserTie />
                  Change Lawyer (Admin)
                </label>

                <select
                  value={formData.assignedLawyerId}
                  onChange={handleLawyerChange}
                  disabled={usersLoading}
                >
                  <option value="">
                    {usersLoading
                      ? 'Loading lawyers...'
                      : 'Select Lawyer'}
                  </option>

                  {lawyers.map((lawyer) => (
                    <option
                      key={lawyer.id}
                      value={lawyer.id}
                    >
                      {getUserName(lawyer)}
                      {' — '}
                      {getLawyerSpecialization(lawyer)}
                    </option>
                  ))}
                </select>

                {usersLoading && (
                  <div className="users-loading">
                    Loading lawyers from Firebase...
                  </div>
                )}

                {!usersLoading && lawyers.length === 0 && (
                  <div className="users-loading">
                    No active lawyers found.
                  </div>
                )}

                <div className="assignment-info">
                  Current selection: {formData.lawyer}
                </div>

              </div>

              {/* AI RECOMMENDED JUDGE */}

              <div className="case-form-group">

                <label className="assignment-label">
                  <FaRobot />
                  AI / Existing Judge Recommendation
                </label>

                <div className="recommendation-box">
                  <div className="recommendation-heading">
                    <FaRobot />
                    Recommended Judge
                  </div>

                  <div className="recommendation-value">
                    {getRecommendationName(
                      formData.recommendedJudge,
                      judges
                    )}
                  </div>

                  <div className="recommendation-note">
                    Existing recommendation / assigned judge.
                  </div>
                </div>

                <label className="assignment-label">
                  <FaGavel />
                  Change Judge (Admin)
                </label>

                <select
                  value={formData.assignedJudgeId}
                  onChange={handleJudgeChange}
                  disabled={usersLoading}
                >
                  <option value="">
                    {usersLoading
                      ? 'Loading judges...'
                      : 'Select Judge'}
                  </option>

                  {judges.map((judge) => (
                    <option
                      key={judge.id}
                      value={judge.id}
                    >
                      {getUserName(judge)}
                    </option>
                  ))}
                </select>

                {usersLoading && (
                  <div className="users-loading">
                    Loading judges from Firebase...
                  </div>
                )}

                {!usersLoading && judges.length === 0 && (
                  <div className="users-loading">
                    No active judges found.
                  </div>
                )}

                <div className="assignment-info">
                  Current selection: {formData.judge}
                </div>

              </div>

              {/* COURT */}

              <div className="case-form-group">
                <label>Assigned Court</label>

                <select
                  name="court"
                  value={formData.court}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Court</option>
                  <option value="Lahore High Court">
                    Lahore High Court
                  </option>
                  <option value="Islamabad High Court">
                    Islamabad High Court
                  </option>
                  <option value="Peshawar High Court">
                    Peshawar High Court
                  </option>
                  <option value="Sindh High Court">
                    Sindh High Court
                  </option>
                  <option value="Balochistan High Court">
                    Balochistan High Court
                  </option>
                </select>
              </div>

              {/* FILING DATE */}

              <div className="case-form-group">
                <label>Filing Date</label>

                <input
                  type="date"
                  name="filingDate"
                  value={formData.filingDate}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* STATUS */}

              <div className="case-form-group">
                <label>Status</label>

                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  required
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Closed">Closed</option>
                  <option value="Assigned">Assigned</option>
                  <option value="Verified">Verified</option>
                </select>
              </div>

            </div>

            {/* ACTION BUTTONS */}

            <div className="case-form-actions">

              <button
                type="button"
                className="cancel-btn"
                onClick={() => navigate('/admin-dashboard/cases')}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="save-case-btn"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <FaSpinner className="spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>

            </div>

          </form>

        </div>

      </div>
    </>
  );
};

export default EditCase;
