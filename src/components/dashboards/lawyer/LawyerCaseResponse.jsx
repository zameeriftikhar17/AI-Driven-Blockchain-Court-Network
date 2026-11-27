
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import {
  ref,
  onValue,
  push,
  update,
  serverTimestamp,
} from "firebase/database";

import {
  FaArrowLeft,
  FaFileAlt,
  FaUserTie,
  FaPaperPlane,
  FaShieldAlt,
} from "react-icons/fa";

import { auth, db } from "../../../firebase";

const LawyerCaseResponse = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [caseData, setCaseData] = useState(null);
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [lawyerResponseRecord, setLawyerResponseRecord] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        navigate("/login", { replace: true });
        return;
      }
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!user?.uid || !id) return;

    const caseRef = ref(db, `cases/${id}`);

    const unsubscribe = onValue(
      caseRef,
      (snapshot) => {
        const data = snapshot.val();

        if (
          data &&
          (data.assignedLawyer === user.uid ||
            data.assignedLawyerId === user.uid)
        ) {
          setCaseData(data);
        } else {
          setCaseData(null);
        }

        setLoading(false);
      },
      (error) => {
        console.error("Case loading error:", error);
        setCaseData(null);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, id]);

  useEffect(() => {
  if (!user?.uid || !id) return;

  const responsesRef = ref(db, "lawyerResponses");

  const unsubscribe = onValue(responsesRef, (snapshot) => {
    const data = snapshot.val() || {};

    const records = Object.entries(data)
      .map(([responseId, item]) => ({
        id: responseId,
        ...(item || {}),
      }))
      .filter(
        (item) =>
          String(item.caseId) === String(id) &&
          item.lawyerId === user.uid
      )
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    setLawyerResponseRecord(records[0] || null);
  });

  return () => unsubscribe();
}, [user, id]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!response.trim()) {
      setMessage("Please write your legal response.");
      return;
    }

    try {
      setSubmitting(true);
      setMessage("");

      const responseRef = push(ref(db, "lawyerResponses"));

      await update(ref(db), {
        [`lawyerResponses/${responseRef.key}`]: {
          caseId: id,
          lawyerId: user.uid,
          lawyerName: user.displayName || "Lawyer",
          response: response.trim(),
          status: "Submitted",
          createdAt: serverTimestamp(),
        },
        [`cases/${id}/lawyerResponseStatus`]: "Submitted",
      });

      setResponse("");
      setMessage("Legal response submitted successfully!");
    } catch (error) {
      console.error("Response submission error:", error);
      setMessage("Failed to submit response. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const show = (value) => value || "Not available";

  if (loading) {
    return (
      <div className="lcr-loading">
        <div className="lcr-spinner"></div>
        <p>Loading Case Details...</p>
        <style>{`
          .lcr-loading {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            background: #f5f9ff;
            color: #334155;
          }
          .lcr-spinner {
            width: 45px;
            height: 45px;
            border: 4px solid #dbeafe;
            border-top-color: #1e40af;
            border-radius: 50%;
            animation: lcrSpin .8s linear infinite;
            margin-bottom: 15px;
          }
          @keyframes lcrSpin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="lcr-error-page">
        <div className="lcr-error-card">
          <FaFileAlt />
          <h2>Case not found or you are not authorized.</h2>
          <button onClick={() => navigate("/lawyer/assigned-cases")}>
            <FaArrowLeft /> Back to Assigned Cases
          </button>
        </div>
        <style>{`
          .lcr-error-page {
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            background: #f5f9ff;
            padding: 20px;
          }
          .lcr-error-card {
            background: white;
            padding: 40px;
            border-radius: 18px;
            text-align: center;
            box-shadow: 0 8px 30px rgba(0,0,0,.08);
          }
          .lcr-error-card svg {
            font-size: 40px;
            color: #64748b;
          }
          .lcr-error-card h2 {
            color: #334155;
            margin: 15px 0 20px;
          }
          .lcr-error-card button {
            border: none;
            background: #1e3a8a;
            color: white;
            padding: 11px 18px;
            border-radius: 9px;
            cursor: pointer;
            font-weight: 700;
            display: inline-flex;
            align-items: center;
            gap: 8px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="lawyer-case-response">
      <style>{`
        .lawyer-case-response {
          min-height: 100vh;
          background: #f5f9ff;
          padding: 25px;
          color: #1e293b;
        }

        .lcr-container {
          max-width: 1100px;
          margin: auto;
        }

        .lcr-back {
          border: 1px solid #dbeafe;
          background: white;
          color: #1e3a8a;
          padding: 10px 15px;
          border-radius: 9px;
          cursor: pointer;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 18px;
        }

        .lcr-back:hover {
          background: #eff6ff;
        }

        .lcr-header {
          background: linear-gradient(135deg, #102a56, #1e40af);
          color: white;
          border-radius: 18px;
          padding: 25px;
          margin-bottom: 20px;
          box-shadow: 0 10px 28px rgba(30,64,175,.16);
        }

        .lcr-header h1 {
          margin: 0;
          font-size: 25px;
        }

        .lcr-case-id {
          margin-top: 7px;
          opacity: .85;
          font-size: 13px;
          word-break: break-all;
        }

        .lcr-section {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 22px;
          margin-bottom: 18px;
          box-shadow: 0 5px 18px rgba(15,23,42,.04);
        }

        .lcr-section-title {
          display: flex;
          align-items: center;
          gap: 9px;
          color: #1e3a8a;
          font-size: 18px;
          font-weight: 800;
          margin: 0 0 17px;
          padding-bottom: 11px;
          border-bottom: 1px solid #edf2f7;
        }

        .lcr-info-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 13px;
        }

        .lcr-info-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 11px;
          padding: 15px;
        }

        .lcr-label {
          display: block;
          color: #64748b;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          margin-bottom: 6px;
        }

        .lcr-value {
          color: #1e293b;
          font-size: 14px;
          font-weight: 700;
          word-break: break-word;
        }

        .lcr-guidance {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 12px;
          padding: 17px;
          color: #1e40af;
          font-size: 13px;
          line-height: 1.8;
        }

        .lcr-textarea {
          width: 100%;
          min-height: 220px;
          padding: 15px;
          border: 1px solid #cbd5e1;
          border-radius: 11px;
          background: #f8fafc;
          color: #1e293b;
          font-family: inherit;
          font-size: 14px;
          line-height: 1.7;
          resize: vertical;
          outline: none;
          box-sizing: border-box;
          transition: .2s;
        }

        .lcr-textarea:focus {
          border-color: #2563eb;
          background: white;
          box-shadow: 0 0 0 3px rgba(37,99,235,.1);
        }

        .lcr-submit {
          border: none;
          background: linear-gradient(135deg, #1e3a8a, #2563eb);
          color: white;
          padding: 13px 22px;
          border-radius: 9px;
          cursor: pointer;
          font-weight: 800;
          font-size: 14px;
          display: inline-flex;
          align-items: center;
          gap: 9px;
          margin-top: 15px;
          transition: .2s;
        }

        .lcr-submit:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 15px rgba(37,99,235,.2);
        }

        .lcr-submit:disabled {
          opacity: .6;
          cursor: not-allowed;
          transform: none;
        }

        .lcr-message {
          padding: 13px 15px;
          margin-top: 15px;
          border-radius: 9px;
          background: #eff6ff;
          color: #1e40af;
          border: 1px solid #bfdbfe;
          font-size: 13px;
          font-weight: 700;
        }

        @media(max-width:800px) {
          .lcr-info-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media(max-width:600px) {
          .lawyer-case-response {
            padding: 14px;
          }
          .lcr-header h1 {
            font-size: 21px;
          }
          .lcr-info-grid {
            grid-template-columns: 1fr;
          }
          .lcr-section {
            padding: 17px;
          }
          .lcr-submit {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>

      <div className="lcr-container">
        <button
          className="lcr-back"
          onClick={() => navigate("/lawyer/assigned-cases")}
        >
          <FaArrowLeft /> Back to Assigned Cases
        </button>

        <div className="lcr-header">
          <h1>Submit Legal Response</h1>
          <div className="lcr-case-id">Case ID: {id}</div>
        </div>

        <div className="lcr-section">
          <h2 className="lcr-section-title">
            <FaFileAlt /> Case Information
          </h2>

          <div className="lcr-info-grid">
            <div className="lcr-info-box">
              <span className="lcr-label">Case Number</span>
              <span className="lcr-value">{id}</span>
            </div>

            <div className="lcr-info-box">
              <span className="lcr-label">Case Type</span>
              <span className="lcr-value">
                {show(caseData.predictedCaseType || caseData.caseType)}
              </span>
            </div>

            <div className="lcr-info-box">
              <span className="lcr-label">Case Status</span>
              <span className="lcr-value">{show(caseData.status)}</span>
            </div>
          </div>
        </div>

        <div className="lcr-section">
          <h2 className="lcr-section-title">
            <FaShieldAlt /> Response Guidelines
          </h2>

          <div className="lcr-guidance">
            Please review the case details before submitting your legal
            response. Provide relevant legal arguments, observations, and
            remarks related to this case. Your response will be saved in the
            court system for review.
          </div>
        </div>
<div className="lcr-section">
  <h2 className="lcr-section-title">
    <FaShieldAlt /> Judge Review Status
  </h2>

  {!lawyerResponseRecord ? (
    <div className="lcr-guidance">
      Submit your legal response to see its review status.
    </div>
  ) : (
    <div className="lcr-guidance">
      <b>Status:</b>{" "}
      {lawyerResponseRecord.reviewStatus || "Pending Review"}

      {lawyerResponseRecord.reviewStatus === "Reviewed"
        ? " — The Judge has reviewed your response."
        : " — Your response is waiting for the Judge's review."}
    </div>
  )}
</div>
        <div className="lcr-section">
          <h2 className="lcr-section-title">
            <FaUserTie /> Lawyer Legal Response
          </h2>

          <form onSubmit={handleSubmit}>
            <label className="lcr-label">
              Legal Response / Remarks
            </label>

            <textarea
              className="lcr-textarea"
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Write your legal response, arguments, observations or remarks here..."
            />

            <button
              className="lcr-submit"
              type="submit"
              disabled={submitting}
            >
              <FaPaperPlane />
              {submitting ? "Submitting..." : "Submit Response"}
            </button>

            {message && (
              <div className="lcr-message">{message}</div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default LawyerCaseResponse;
