
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaRobot,
  FaFileAlt,
  FaChartLine,
  FaClock,
  FaGavel,
  FaArrowLeft
} from 'react-icons/fa';
import { ref, onValue } from 'firebase/database';
import { auth, db } from '../../../firebase';

const AIRecommendations = () => {
  const navigate = useNavigate();

  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) {
      navigate('/login');
      return;
    }

    const casesRef = ref(db, 'cases');

    const unsubscribe = onValue(
      casesRef,
      (snapshot) => {
        const data = snapshot.val();

        if (data) {
          const casesArray = Object.keys(data).map(key => ({
            id: key,
            caseId: key,
            ...data[key]
          }));

          setCases(casesArray);
        } else {
          setCases([]);
        }

        setLoading(false);
      },
      (error) => {
        console.error('AI recommendations error:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [navigate]);

  const aiPredictedCases = cases.filter(item =>
    item.predictedCaseType ||
    item.predictedPriority ||
    item.predictedDurationDays !== undefined
  );

  const getPriorityClass = (priority) => {
    const value = String(priority || '').toLowerCase();

    if (value === 'high') return 'high';
    if (value === 'medium') return 'medium';
    if (value === 'low') return 'low';

    return 'unknown';
  };

  const getCaseTitle = (item) =>
    item.title || item.description || 'Untitled Case';

  const getJudgeRecommendation = (item) =>
    item.aiRecommendedJudge ||
    item.recommendedJudge ||
    item.assignedJudge ||
    item.judge ||
    'Pending Judge Assignment';

  return (
    <div className="ai-page">
      <style>{`
        .ai-page {
          min-height: 100vh;
          padding: 2rem;
          background: linear-gradient(135deg, #E3F2FD, #BBDEFB, #90CAF9);
          color: #1A1A1A;
        }

        .ai-container {
          max-width: 1400px;
          margin: auto;
        }

        .ai-topbar {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .ai-back {
          border: none;
          padding: 0.8rem 1rem;
          border-radius: 10px;
          background: white;
          cursor: pointer;
          font-weight: 600;
        }

        .ai-heading {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .ai-heading-icon {
          width: 55px;
          height: 55px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          background: #EDE7F6;
          color: #7C4DFF;
          font-size: 1.6rem;
        }

        .ai-heading h1 {
          margin: 0;
          font-size: 1.8rem;
        }

        .ai-heading p {
          margin: 5px 0 0;
          color: #6B7280;
        }

        .ai-models {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .ai-model {
          display: flex;
          gap: 1rem;
          padding: 1.2rem;
          background: white;
          border-radius: 14px;
          box-shadow: 0 5px 20px rgba(0,0,0,0.06);
        }

        .ai-model-icon {
          color: #7C4DFF;
          font-size: 1.4rem;
        }

        .ai-model h4 {
          margin: 0 0 8px;
        }

        .ai-model p {
          margin: 0;
          font-size: 0.85rem;
          color: #6B7280;
          line-height: 1.5;
        }

        .ai-analysis {
          padding: 1.5rem;
          background: white;
          border-radius: 16px;
          box-shadow: 0 8px 30px rgba(0,0,0,0.07);
        }

        .ai-analysis-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .ai-analysis-header h2 {
          margin: 0;
        }

        .ai-count {
          padding: 0.4rem 0.8rem;
          border-radius: 30px;
          background: #E1F5FE;
          color: #0288D1;
          font-weight: 700;
        }

        .ai-case-row {
          display: grid;
          grid-template-columns: 1.2fr 2fr;
          gap: 1rem;
          padding: 1rem;
          margin-bottom: 0.8rem;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          background: #FAFCFE;
        }

        .ai-case-main {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          min-width: 0;
        }

        .ai-case-id {
          color: #0288D1;
          font-weight: 700;
        }

        .ai-case-title {
          font-weight: 600;
          overflow-wrap: anywhere;
        }

        .ai-citizen {
          color: #6B7280;
          font-size: 0.85rem;
        }

        .ai-results {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.6rem;
        }

        .ai-result-box {
          padding: 0.8rem;
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 9px;
          min-width: 0;
        }

        .ai-label {
          display: block;
          margin-bottom: 7px;
          color: #6B7280;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
        }

        .ai-value {
          font-size: 0.85rem;
          font-weight: 700;
          overflow-wrap: anywhere;
        }

        .priority-badge {
          display: inline-block;
          padding: 0.25rem 0.6rem;
          border-radius: 30px;
          font-size: 0.75rem;
          font-weight: 700;
        }

        .priority-badge.high {
          background: #FEE2E2;
          color: #B91C1C;
        }

        .priority-badge.medium {
          background: #FEF3C7;
          color: #92400E;
        }

        .priority-badge.low {
          background: #D1FAE5;
          color: #065F46;
        }

        .priority-badge.unknown {
          background: #F3F4F6;
          color: #6B7280;
        }

        .ai-empty {
          padding: 2rem;
          text-align: center;
          color: #6B7280;
          background: #F9FAFB;
          border-radius: 12px;
        }

        @media(max-width: 1100px) {
          .ai-models {
            grid-template-columns: repeat(2, 1fr);
          }

          .ai-case-row {
            grid-template-columns: 1fr;
          }
        }

        @media(max-width: 700px) {
          .ai-page {
            padding: 1rem;
          }

          .ai-models {
            grid-template-columns: 1fr;
          }

          .ai-results {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media(max-width: 420px) {
          .ai-results {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="ai-container">

        <div className="ai-topbar">
          <button
            className="ai-back"
            onClick={() => navigate('/admin-dashboard')}
          >
            <FaArrowLeft /> Back to Dashboard
          </button>
        </div>

        <div className="ai-heading">
          <div className="ai-heading-icon">
            <FaRobot />
          </div>

          <div>
            <h1>AI Recommendations</h1>
            <p>AI-powered analysis of court cases</p>
          </div>
        </div>

        <div className="ai-models">

          <div className="ai-model">
            <FaFileAlt className="ai-model-icon" />
            <div>
              <h4>Case Type Prediction</h4>
              <p>Predicts the category or type of a submitted case.</p>
            </div>
          </div>

          <div className="ai-model">
            <FaChartLine className="ai-model-icon" />
            <div>
              <h4>Priority Prediction</h4>
              <p>Identifies High, Medium or Low priority.</p>
            </div>
          </div>

          <div className="ai-model">
            <FaClock className="ai-model-icon" />
            <div>
              <h4>Duration Prediction</h4>
              <p>Estimates the expected duration in days.</p>
            </div>
          </div>

          <div className="ai-model">
            <FaGavel className="ai-model-icon" />
            <div>
              <h4>Judge Recommendation</h4>
              <p>Displays the recommended or assigned judge.</p>
            </div>
          </div>

        </div>

        <div className="ai-analysis">

          <div className="ai-analysis-header">
            <h2>AI Case Analysis</h2>
            <span className="ai-count">
              {aiPredictedCases.length} Predicted Cases
            </span>
          </div>

          {loading ? (
            <div className="ai-empty">Loading AI recommendations...</div>
          ) : aiPredictedCases.length === 0 ? (
            <div className="ai-empty">
              <FaRobot size={30} />
              <p>No AI predictions are available yet.</p>
            </div>
          ) : (
            aiPredictedCases.map(item => (

              <div className="ai-case-row" key={item.id}>

                <div className="ai-case-main">
                  <span className="ai-case-id">
                    {item.caseId || item.id}
                  </span>

                  <span className="ai-case-title">
                    {getCaseTitle(item)}
                  </span>

                  <span className="ai-citizen">
                    Citizen: {item.userDisplayName || item.client || item.citizen || 'N/A'}
                  </span>
                </div>

                <div className="ai-results">

                  <div className="ai-result-box">
                    <span className="ai-label">Case Type</span>
                    <span className="ai-value">
                      {item.predictedCaseType || 'Not Predicted'}
                    </span>
                  </div>

                  <div className="ai-result-box">
                    <span className="ai-label">Priority</span>
                    <span className={`priority-badge ${getPriorityClass(item.predictedPriority)}`}>
                      {item.predictedPriority || 'Not Predicted'}
                    </span>
                  </div>

                  <div className="ai-result-box">
                    <span className="ai-label">Duration</span>
                    <span className="ai-value">
                      {item.predictedDurationDays !== undefined &&
                      item.predictedDurationDays !== null &&
                      item.predictedDurationDays !== ''
                        ? `${Number(item.predictedDurationDays).toFixed(0)} days`
                        : 'Not Predicted'}
                    </span>
                  </div>

                  <div className="ai-result-box">
                    <span className="ai-label">Judge Recommendation</span>
                    <span className="ai-value">
                      {getJudgeRecommendation(item)}
                    </span>
                  </div>

                </div>
              </div>

            ))
          )}

        </div>
      </div>
    </div>
  );
};

export default AIRecommendations;
