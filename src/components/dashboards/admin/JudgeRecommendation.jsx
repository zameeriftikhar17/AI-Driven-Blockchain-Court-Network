
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  FaArrowLeft,
  FaRobot,
  FaGavel,
  FaCheckCircle,
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

const JudgeRecommendation = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const user = auth.currentUser;

  const [caseData, setCaseData] = useState(null);
  const [judges, setJudges] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState('');

  // Check login
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // Load case and judges
  useEffect(() => {
    if (!id || !user) return;

    const caseRef = ref(db, `cases/${id}`);
    const usersRef = ref(db, 'users');

    const unsubscribeCase = onValue(
      caseRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setCaseData({
            id,
            ...snapshot.val()
          });
        } else {
          setError('Case not found.');
        }

        setLoading(false);
      },
      (err) => {
        console.error('Case loading error:', err);
        setError('Failed to load case.');
        setLoading(false);
      }
    );

    const unsubscribeUsers = onValue(
      usersRef,
      (snapshot) => {
        const data = snapshot.val();

        if (!data) {
          setJudges([]);
          return;
        }

        const usersArray = Object.keys(data).map((key) => ({
          id: key,
          ...data[key]
        }));

        const judgeList = usersArray.filter(
          (judge) =>
            judge.role === 'judge' &&
            judge.status !== 'Inactive'
        );

        setJudges(judgeList);
      },
      (err) => {
        console.error('Judge loading error:', err);
        setError('Failed to load judges.');
      }
    );

    return () => {
      off(caseRef);
      off(usersRef);
    };
  }, [id, user, navigate]);

  // Generate AI recommendations
  useEffect(() => {
    if (!caseData || judges.length === 0) {
      setRecommendations([]);
      return;
    }

    const caseType = (
      caseData.predictedCaseType ||
      caseData.caseType ||
      caseData.type ||
      ''
    ).toLowerCase();

    const casePriority = (
      caseData.predictedPriority ||
      caseData.priority ||
      'medium'
    ).toLowerCase();

    const scoredJudges = judges
      .map((judge) => {
        let score = 50;

        const specialization = (
          judge.specialization ||
          judge.speciality ||
          judge.expertise ||
          ''
        ).toLowerCase();

        const workload = Number(
          judge.currentWorkload ??
          judge.workload ??
          0
        );

        const availability = String(
          judge.availability ||
          judge.status ||
          'Available'
        ).toLowerCase();

        // 1. Specialization matching
        if (
          caseType &&
          specialization &&
          (
            specialization.includes(caseType) ||
            caseType.includes(specialization)
          )
        ) {
          score += 30;
        }

        // 2. Workload
        if (workload <= 5) {
          score += 15;
        } else if (workload <= 10) {
          score += 8;
        } else {
          score -= 10;
        }

        // 3. Availability
        if (
          availability === 'available' ||
          availability === 'active'
        ) {
          score += 10;
        }

        // 4. High priority + low workload
        if (
          casePriority === 'high' &&
          workload <= 5
        ) {
          score += 5;
        }

        score = Math.max(0, Math.min(100, score));

        return {
          ...judge,
          recommendationScore: score
        };
      })
      .sort(
        (a, b) =>
          b.recommendationScore -
          a.recommendationScore
      );

    setRecommendations(scoredJudges);
  }, [caseData, judges]);

  // Get judge name
  const getJudgeName = (judge) => {
    return (
      judge.fullName ||
      judge.name ||
      judge.displayName ||
      judge.email ||
      judge.id
    );
  };

 
// Assign AI-recommended existing judge
const assignJudge = async (judge) => {
  if (!caseData || assigning) return;

  setAssigning(true);

  try {
    const currentWorkload = Number(
      judge.currentWorkload ??
      judge.workload ??
      0
    );

    const newWorkload = currentWorkload + 1;

    // First assign judge on Hyperledger Fabric blockchain
    const blockchainResponse = await fetch(
      'http://localhost:8000/blockchain/assign-judge',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          caseId: id,
          judgeId: judge.id
        })
      }
    );

    const blockchainText = await blockchainResponse.text();

    let blockchainResult;

    try {
      blockchainResult = JSON.parse(blockchainText);
    } catch {
      blockchainResult = {
        detail: blockchainText
      };
    }

    if (!blockchainResponse.ok) {
      throw new Error(
        blockchainResult.detail ||
        'Blockchain judge assignment failed'
      );
    }

    // Update case in Firebase after blockchain success
    await update(
      ref(db, `cases/${id}`),
      {
        assignedJudge: getJudgeName(judge),
        assignedJudgeId: judge.id,

        aiRecommended: true,
        aiRecommendationScore:
          judge.recommendationScore,

        aiRecommendationReason:
          'Recommended based on case specialization, workload and availability.',

        status: 'Assigned'
      }
    );

    // Update judge workload
    await update(
      ref(db, `users/${judge.id}`),
      {
        currentWorkload: newWorkload
      }
    );
// Send notification to assigned judge
const notificationRef = ref(
  db,
  `notifications/${judge.id}`
);

const newNotificationRef = push(notificationRef);

await set(newNotificationRef, {
  type: 'case_assigned',
  title: 'New Case Assigned',
  message: `A new case (${caseData.caseId || id}) has been assigned to you.`,
  caseId: id,
  read: false,
  timestamp: serverTimestamp()
});


    // Record judge assignment in blockchain history
const historyResponse = await fetch(
  'http://localhost:8000/blockchain/record-case-event',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      caseId: id,
      eventType: 'JUDGE_ASSIGNED',
      details: `AI recommended judge ${getJudgeName(judge)} assigned successfully.`,
      actorId: user?.uid || 'admin'
    })
  }
);

if (!historyResponse.ok) {
  console.error('Judge assignment history recording failed');
}
    Swal.fire({
      icon: 'success',
      title: 'Judge Assigned!',
      text: `${getJudgeName(
        judge
      )} has been assigned successfully on blockchain. Workload updated to ${newWorkload}.`,
      confirmButtonColor: '#0288D1'
    }).then(() => {
      navigate('/admin-dashboard/cases');
    });

  } catch (error) {
    console.error('Assignment error:', error);

    Swal.fire({
      icon: 'error',
      title: 'Assignment Failed',
      text: error.message ||
        'Unable to assign judge. Please try again.'
    });
  } finally {
    setAssigning(false);
  }
};



  // Loading
  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <h3>
          <FaRobot /> Generating AI Recommendations...
        </h3>
      </div>
    );
  }

  // Error
  if (error || !caseData) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <h3 style={{ color: '#D32F2F' }}>
          {error || 'Case not found'}
        </h3>

        <button
          onClick={() =>
            navigate('/admin-dashboard/cases')
          }
          style={{
            marginTop: '1rem',
            padding: '0.7rem 1.5rem',
            border: 'none',
            borderRadius: '8px',
            background: '#0288D1',
            color: 'white',
            cursor: 'pointer'
          }}
        >
          Back to Cases
        </button>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .recommendation-page {
          min-height: 100vh;
          padding: 2rem;
          background:
            linear-gradient(
              135deg,
              #E3F2FD,
              #BBDEFB,
              #90CAF9
            );
        }

        .recommendation-container {
          max-width: 1100px;
          margin: auto;
        }

        .recommendation-header {
          background: rgba(255,255,255,0.9);
          padding: 1.5rem 2rem;
          border-radius: 16px;
          margin-bottom: 1.5rem;
          box-shadow: 0 8px 30px rgba(0,0,0,0.08);
        }

        .back-btn {
          border: none;
          background: transparent;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 600;
          color: #0288D1;
        }

        .title-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-top: 1rem;
        }

        .title-icon {
          width: 55px;
          height: 55px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(124,77,255,0.12);
          color: #7C4DFF;
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .title-row h1 {
          margin: 0;
          color: #1A1A1A;
        }

        .title-row p {
          margin: 0.3rem 0 0;
          color: #6B7280;
        }

        .case-summary {
          background: rgba(255,255,255,0.92);
          padding: 1.5rem;
          border-radius: 16px;
          margin-bottom: 1.5rem;
          box-shadow: 0 8px 30px rgba(0,0,0,0.08);
        }

        .summary-grid {
          display: grid;
          grid-template-columns:
            repeat(3, 1fr);
          gap: 1rem;
        }

        .summary-item {
          padding: 1rem;
          background: #F8FAFC;
          border-radius: 10px;
        }

        .summary-item span {
          display: block;
          font-size: 0.8rem;
          color: #6B7280;
          margin-bottom: 0.3rem;
        }

        .summary-item strong {
          color: #1A1A1A;
        }

        .ai-banner {
          padding: 1rem 1.2rem;
          background: rgba(124,77,255,0.08);
          border-left: 4px solid #7C4DFF;
          border-radius: 10px;
          margin-bottom: 1.5rem;
          color: #312E81;
        }

        .judge-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .judge-card {
          background: rgba(255,255,255,0.95);
          padding: 1.3rem;
          border-radius: 14px;
          box-shadow: 0 6px 25px rgba(0,0,0,0.07);
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .judge-icon {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: rgba(79,195,247,0.12);
          color: #0288D1;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.3rem;
          flex-shrink: 0;
        }

        .judge-info {
          flex: 1;
          min-width: 180px;
        }

        .judge-info h3 {
          margin: 0 0 0.3rem;
          color: #1A1A1A;
        }

        .judge-details {
          display: flex;
          gap: 0.8rem;
          flex-wrap: wrap;
          color: #6B7280;
          font-size: 0.85rem;
        }

        .score-box {
          text-align: center;
          min-width: 90px;
        }

        .score {
          font-size: 1.7rem;
          font-weight: 800;
          color: #7C4DFF;
        }

        .score-label {
          font-size: 0.75rem;
          color: #6B7280;
        }

        .recommended-label {
          display: inline-block;
          margin-top: 0.4rem;
          padding: 0.2rem 0.6rem;
          border-radius: 20px;
          background: #EDE9FE;
          color: #6D28D9;
          font-size: 0.7rem;
          font-weight: 700;
        }

        .assign-btn {
          border: none;
          padding: 0.65rem 1.2rem;
          border-radius: 8px;
          background: linear-gradient(
            135deg,
            #4FC3F7,
            #0288D1
          );
          color: white;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
        }

        .assign-btn:hover {
          transform: translateY(-2px);
        }

        .assign-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .empty {
          text-align: center;
          padding: 2rem;
          color: #6B7280;
          background: white;
          border-radius: 15px;
        }

        @media(max-width: 768px) {
          .recommendation-page {
            padding: 1rem;
          }

          .recommendation-header {
            padding: 1.2rem;
          }

          .title-row {
            align-items: flex-start;
          }

          .title-row h1 {
            font-size: 1.5rem;
          }

          .summary-grid {
            grid-template-columns: 1fr;
          }

          .judge-card {
            flex-direction: column;
            align-items: stretch;
          }

          .judge-icon {
            align-self: center;
          }

          .judge-info {
            text-align: center;
          }

          .judge-details {
            justify-content: center;
          }

          .score-box {
            align-self: center;
          }

          .assign-btn {
            width: 100%;
          }
        }
      `}</style>

      <div className="recommendation-page">
        <div className="recommendation-container">

          {/* Header */}
          <div className="recommendation-header">

            <button
              className="back-btn"
              onClick={() =>
                navigate('/admin-dashboard/cases')
              }
            >
              <FaArrowLeft /> Back to Cases
            </button>

            <div className="title-row">

              <div className="title-icon">
                <FaRobot />
              </div>

              <div>
                <h1>AI Judge Recommendation</h1>

                <p>
                  AI-assisted judge selection based on
                  case requirements
                </p>
              </div>

            </div>
          </div>

          {/* Case Information */}
          <div className="case-summary">

            <h3>
              <FaBriefcase /> Case Information
            </h3>

            <div className="summary-grid">

              <div className="summary-item">
                <span>Case ID</span>
                <strong>
                  {caseData.caseId || caseData.id}
                </strong>
              </div>

              <div className="summary-item">
                <span>Case Type</span>
                <strong>
                  {caseData.predictedCaseType ||
                    caseData.caseType ||
                    caseData.type ||
                    'General'}
                </strong>
              </div>

              <div className="summary-item">
                <span>Priority</span>
                <strong>
                  {caseData.predictedPriority ||
                    caseData.priority ||
                    'Medium'}
                </strong>
              </div>

            </div>
          </div>

          {/* AI Information */}
          <div className="ai-banner">

            <FaRobot />{' '}

            <strong>AI Analysis:</strong>{' '}

            Judges are ranked according to
            specialization, workload and availability.
            The highest scoring judge is the recommended
            candidate.

          </div>

          {/* Judges */}
          <div className="judge-list">

            {recommendations.length === 0 ? (

              <div className="empty">
                No active judges available.
              </div>

            ) : (

              recommendations.map((judge, index) => (

                <div
                  key={judge.id}
                  className="judge-card"
                >

                  <div className="judge-icon">
                    <FaGavel />
                  </div>

                  <div className="judge-info">

                    <h3>
                      {index === 0 && '⭐ '}
                      {getJudgeName(judge)}
                    </h3>

                    <div className="judge-details">

                      <span>
                        <FaUserTie />{' '}
                        {judge.specialization ||
                          judge.speciality ||
                          judge.expertise ||
                          'General'}
                      </span>

                      <span>
                        Workload:{' '}
                        {judge.currentWorkload ??
                          judge.workload ??
                          0}
                      </span>

                      <span>
                        Status:{' '}
                        {judge.availability ||
                          judge.status ||
                          'Available'}
                      </span>

                    </div>

                  </div>

                  <div className="score-box">

                    <div className="score">
                      {judge.recommendationScore}%
                    </div>

                    <div className="score-label">
                      Match Score
                    </div>

                    {index === 0 && (
                      <div className="recommended-label">
                        AI Recommended
                      </div>
                    )}

                  </div>

                  <button
                    className="assign-btn"
                    onClick={() =>
                      assignJudge(judge)
                    }
                    disabled={assigning}
                  >
                    <FaCheckCircle />{' '}

                    {index === 0
                      ? 'Assign Recommended'
                      : 'Assign Judge'}

                  </button>

                </div>

              ))
            )}

          </div>

        </div>
      </div>
    </>
  );
};

export default JudgeRecommendation;
