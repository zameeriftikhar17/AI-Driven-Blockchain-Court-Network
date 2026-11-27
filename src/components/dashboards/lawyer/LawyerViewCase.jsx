
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { ref, onValue } from "firebase/database";

import {
  FaArrowLeft,
  FaFileAlt,
  FaUser,
  FaUserTie,
  FaRobot,
  FaShieldAlt,
  FaCalendarAlt,
  FaClock,
  FaExclamationTriangle,
} from "react-icons/fa";

import { auth, db } from "../../../firebase";

const LawyerViewCase = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [caseData, setCaseData] = useState(null);
  const [hearings, setHearings] = useState([]);
  const [blockchainHistory, setBlockchainHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // AUTH
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

  // LOAD CASE
  useEffect(() => {
    if (!user?.uid || !id) return;

    setLoading(true);
    setError("");

    const caseRef = ref(db, `cases/${id}`);

    const unsubscribe = onValue(
      caseRef,
      (snapshot) => {
        const data = snapshot.val();

        if (!data) {
          setCaseData(null);
          setError("Case not found.");
          setLoading(false);
          return;
        }

        // Only assigned lawyer can view this case
        const isAssignedLawyer =
          data.assignedLawyer === user.uid ||
          data.assignedLawyerId === user.uid;

        if (!isAssignedLawyer) {
          setCaseData(null);
          setError("You are not authorized to view this case.");
          setLoading(false);
          return;
        }

        setCaseData({
          id,
          ...data,
        });

        setLoading(false);
      },
      (err) => {
        console.error("CASE ERROR:", err);
        setError("Failed to load case.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, id]);

  // LOAD HEARINGS
  useEffect(() => {
    if (!user?.uid || !id) return;

    const hearingsRef = ref(db, "hearings");

    const unsubscribe = onValue(
      hearingsRef,
      (snapshot) => {
        const data = snapshot.val() || {};

        const loadedHearings = Object.entries(data)
          .map(([hearingId, hearing]) => ({
            id: hearingId,
            ...(hearing || {}),
          }))
          .filter((hearing) => {
            const hearingCaseId =
              hearing.caseId ||
              hearing.caseID ||
              hearing.case_id ||
              hearing.case ||
              hearing.caseNumber;

            return String(hearingCaseId) === String(id);
          });

        setHearings(loadedHearings);
      },
      (err) => {
        console.error("HEARING ERROR:", err);
        setHearings([]);
      }
    );

    return () => unsubscribe();
  }, [user, id]);

  // LOAD BLOCKCHAIN HISTORY
  useEffect(() => {
    if (!id) return;

    const loadHistory = async () => {
      try {
        const response = await fetch(
          `http://localhost:8000/blockchain/case-history/${encodeURIComponent(id)}`
        );

        if (!response.ok) {
          throw new Error("Failed to load blockchain history");
        }

        const data = await response.json();
        setBlockchainHistory(data || []);
      } catch (err) {
        console.error("Blockchain History Error:", err);
        setBlockchainHistory([]);
      }
    };

    loadHistory();
  }, [id]);

  // HELPERS
  const show = (value, fallback = "Not available") => {
    if (value === undefined || value === null || value === "") {
      return fallback;
    }

    return String(value);
  };

  const formatDate = (value) => {
    if (!value) return "Not available";

    try {
      if (typeof value === "object" && value.seconds) {
        return new Date(value.seconds * 1000).toLocaleDateString(
          "en-GB",
          {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }
        );
      }

      const date = new Date(value);

      if (isNaN(date.getTime())) return String(value);

      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return String(value);
    }
  };

  const caseNumber =
    caseData?.caseNumber ||
    caseData?.caseId ||
    caseData?.id ||
    id;

  const caseType =
    caseData?.predictedCaseType ||
    caseData?.caseType ||
    caseData?.type ||
    "Not available";

  const caseSubtype =
    caseData?.caseSubtype ||
    caseData?.predictedCaseSubtype ||
    "Not available";

  const priority =
    caseData?.predictedPriority ||
    caseData?.priority ||
    "Normal";

  const status = caseData?.status || "Pending";

  const citizenName =
    caseData?.userDisplayName ||
    caseData?.citizenName ||
    caseData?.userName ||
    caseData?.client ||
    "Citizen";

  const citizenEmail =
    caseData?.userEmail ||
    caseData?.citizenEmail ||
    "Not available";

  const citizenCNIC =
    caseData?.clientCNIC ||
    caseData?.citizenCNIC ||
    caseData?.cnic ||
    "Not available";

  const defendantName =
    caseData?.defendantName ||
    caseData?.respondent ||
    "Not available";

  const description =
    caseData?.description ||
    caseData?.caseDescription ||
    "No case description available.";

  const lawyerName =
    caseData?.assignedLawyerName ||
    caseData?.selectedLawyerName ||
    caseData?.lawyerName ||
    "Assigned Lawyer";

  const estimatedDuration =
    caseData?.predictedDurationDays ??
    caseData?.estimatedDurationDays ??
    caseData?.estimated_duration_days;

  const documents = Array.isArray(caseData?.documents)
    ? caseData.documents
    : caseData?.documents &&
      typeof caseData.documents === "object"
    ? Object.values(caseData.documents)
    : [];

  const handleBack = () => {
    navigate("/lawyer/assigned-cases");
  };

  // LOADING
  if (loading) {
    return (
      <div className="lvc-loading">
        <div className="lvc-spinner"></div>
        <p>Loading Case Details...</p>

        <style>{`
          .lvc-loading {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            background: #f5f9ff;
            color: #334155;
          }

          .lvc-spinner {
            width: 45px;
            height: 45px;
            border: 4px solid #dbeafe;
            border-top-color: #1e40af;
            border-radius: 50%;
            animation: lvcSpin .8s linear infinite;
            margin-bottom: 15px;
          }

          @keyframes lvcSpin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // ERROR
  if (error || !caseData) {
    return (
      <div className="lvc-error-page">
        <div className="lvc-error-card">
          <FaFileAlt />
          <h2>{error || "Case Not Found"}</h2>

          <button onClick={handleBack}>
            <FaArrowLeft />
            Back to Assigned Cases
          </button>
        </div>

        <style>{`
          .lvc-error-page {
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            background: #f5f9ff;
            padding: 20px;
          }

          .lvc-error-card {
            background: white;
            padding: 40px;
            border-radius: 18px;
            text-align: center;
            box-shadow: 0 8px 30px rgba(0,0,0,.08);
          }

          .lvc-error-card svg {
            font-size: 40px;
            color: #64748b;
          }

          .lvc-error-card h2 {
            color: #334155;
            margin: 15px 0 20px;
          }

          .lvc-error-card button {
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
    <div className="lawyer-view-case">
      <style>{`
        .lawyer-view-case {
          min-height: 100vh;
          background: #f5f9ff;
          padding: 25px;
          color: #1e293b;
        }

        .lvc-container {
          max-width: 1100px;
          margin: auto;
        }

        .lvc-back {
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

        .lvc-back:hover {
          background: #eff6ff;
        }

        .lvc-header {
          background: linear-gradient(135deg, #102a56, #1e40af);
          color: white;
          border-radius: 18px;
          padding: 25px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          margin-bottom: 20px;
          box-shadow: 0 10px 28px rgba(30,64,175,.16);
        }

        .lvc-header h1 {
          margin: 0;
          font-size: 25px;
        }

        .lvc-case-id {
          margin-top: 7px;
          opacity: .85;
          font-size: 13px;
          word-break: break-all;
        }

        .lvc-status {
          padding: 8px 15px;
          border-radius: 20px;
          background: rgba(255,255,255,.16);
          font-weight: 800;
          font-size: 12px;
        }

        .lvc-section {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 22px;
          margin-bottom: 18px;
          box-shadow: 0 5px 18px rgba(15,23,42,.04);
        }

        .lvc-section-title {
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

        .lvc-info-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 13px;
        }

        .lvc-info-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 11px;
          padding: 15px;
        }

        .lvc-label {
          display: block;
          color: #64748b;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          margin-bottom: 6px;
        }

        .lvc-value {
          color: #1e293b;
          font-size: 14px;
          font-weight: 700;
          word-break: break-word;
        }

        .lvc-people {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }

        .lvc-person {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 17px;
        }

        .lvc-person h3 {
          margin: 0 0 12px;
          font-size: 15px;
          color: #1e3a8a;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .lvc-person p {
          margin: 7px 0;
          font-size: 13px;
          color: #475569;
          word-break: break-word;
        }

        .lvc-description {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 18px;
          font-size: 14px;
          line-height: 1.8;
          color: #334155;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .lvc-ai {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 13px;
          padding: 18px;
        }

        .lvc-ai-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 13px;
        }

        .lvc-ai-box {
          background: white;
          border-radius: 10px;
          padding: 15px;
          border: 1px solid #dbeafe;
        }

        .lvc-ai-box svg {
          color: #2563eb;
          margin-bottom: 7px;
        }

        .lvc-ai-box strong {
          display: block;
          font-size: 11px;
          color: #64748b;
          text-transform: uppercase;
          margin-bottom: 5px;
        }

        .lvc-ai-box span {
          font-size: 15px;
          font-weight: 800;
          color: #1e3a8a;
        }

        .lvc-doc {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 13px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          margin-bottom: 9px;
        }

        .lvc-doc-icon {
          width: 38px;
          height: 38px;
          border-radius: 9px;
          background: #dbeafe;
          color: #1d4ed8;
          display: flex;
          justify-content: center;
          align-items: center;
          flex-shrink: 0;
        }

        .lvc-doc-name {
          font-size: 13px;
          font-weight: 700;
          word-break: break-word;
        }

        .lvc-doc a {
          color: #1d4ed8;
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
          margin-left: auto;
        }

        .lvc-empty {
          color: #64748b;
          font-size: 13px;
        }

        .lvc-hearing,
        .lvc-history-item {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 11px;
          padding: 15px;
          margin-bottom: 10px;
          overflow-wrap: anywhere;
        }

        .lvc-hearing-title,
        .lvc-history-item h3 {
          color: #1e3a8a;
          font-weight: 800;
          margin: 0 0 8px;
        }

        .lvc-hearing-info {
          display: flex;
          gap: 15px;
          flex-wrap: wrap;
          color: #64748b;
          font-size: 12px;
        }

        .lvc-hearing-info span {
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }

        .lvc-history-item p {
          font-size: 13px;
          color: #475569;
          margin: 6px 0;
        }

        @media(max-width:800px) {
          .lvc-info-grid,
          .lvc-ai-grid {
            grid-template-columns: 1fr 1fr;
          }

          .lvc-people {
            grid-template-columns: 1fr;
          }
        }

        @media(max-width:600px) {
          .lawyer-view-case {
            padding: 14px;
          }

          .lvc-header {
            display: block;
          }

          .lvc-header h1 {
            font-size: 21px;
          }

          .lvc-status {
            display: inline-block;
            margin-top: 12px;
          }

          .lvc-info-grid,
          .lvc-ai-grid {
            grid-template-columns: 1fr;
          }

          .lvc-section {
            padding: 17px;
          }
        }
      `}</style>

      <div className="lvc-container">

        <button className="lvc-back" onClick={handleBack}>
          <FaArrowLeft />
          Back to Assigned Cases
        </button>

        <div className="lvc-header">
          <div>
            <h1>{caseType} Case</h1>
            <div className="lvc-case-id">
              Case ID: {caseNumber}
            </div>
          </div>

          <div className="lvc-status">{status}</div>
        </div>

        {/* CASE INFORMATION */}
        <div className="lvc-section">
          <h2 className="lvc-section-title">
            <FaFileAlt />
            Case Information
          </h2>

          <div className="lvc-info-grid">
            <div className="lvc-info-box">
              <span className="lvc-label">Case Number</span>
              <span className="lvc-value">{caseNumber}</span>
            </div>

            <div className="lvc-info-box">
              <span className="lvc-label">Case Type</span>
              <span className="lvc-value">{caseType}</span>
            </div>

            <div className="lvc-info-box">
              <span className="lvc-label">Case Subtype</span>
              <span className="lvc-value">{caseSubtype}</span>
            </div>

            <div className="lvc-info-box">
              <span className="lvc-label">Filing Date</span>
              <span className="lvc-value">
                {formatDate(caseData.filingDate || caseData.createdAt)}
              </span>
            </div>

            <div className="lvc-info-box">
              <span className="lvc-label">Priority</span>
              <span className="lvc-value">{priority}</span>
            </div>

            <div className="lvc-info-box">
              <span className="lvc-label">Status</span>
              <span className="lvc-value">{status}</span>
            </div>
          </div>
        </div>

        {/* PARTIES */}
        <div className="lvc-section">
          <h2 className="lvc-section-title">
            <FaUser />
            Parties
          </h2>

          <div className="lvc-people">
            <div className="lvc-person">
              <h3><FaUser /> Citizen / Applicant</h3>
              <p><b>Name:</b> {citizenName}</p>
              <p><b>Email:</b> {citizenEmail}</p>
              <p><b>CNIC:</b> {citizenCNIC}</p>
            </div>

            <div className="lvc-person">
              <h3><FaUserTie /> Defendant</h3>
              <p><b>Name:</b> {defendantName}</p>
            </div>
          </div>
        </div>

        {/* DESCRIPTION */}
        <div className="lvc-section">
          <h2 className="lvc-section-title">
            <FaFileAlt />
            Case Description
          </h2>

          <div className="lvc-description">
            {description}
          </div>
        </div>

        {/* AI ANALYSIS */}
        <div className="lvc-section">
          <h2 className="lvc-section-title">
            <FaRobot />
            AI Analysis
          </h2>

          <div className="lvc-ai">
            <div className="lvc-ai-grid">
              <div className="lvc-ai-box">
                <FaRobot />
                <strong>AI Case Type</strong>
                <span>{caseType}</span>
              </div>

              <div className="lvc-ai-box">
                <FaExclamationTriangle />
                <strong>AI Priority</strong>
                <span>{priority}</span>
              </div>

              <div className="lvc-ai-box">
                <FaClock />
                <strong>Estimated Duration</strong>
                <span>
                  {estimatedDuration !== undefined &&
                  estimatedDuration !== null
                    ? `${Number(estimatedDuration).toFixed(2)} days`
                    : "Not available"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* LAWYER INFORMATION */}
        <div className="lvc-section">
          <h2 className="lvc-section-title">
            <FaUserTie />
            Lawyer Assignment
          </h2>

          <div className="lvc-info-grid">
            <div className="lvc-info-box">
              <span className="lvc-label">Assigned Lawyer</span>
              <span className="lvc-value">{lawyerName}</span>
            </div>

            <div className="lvc-info-box">
              <span className="lvc-label">Request Status</span>
              <span className="lvc-value">
                {show(caseData.lawyerRequestStatus)}
              </span>
            </div>
          </div>
        </div>

        {/* JUDGE INFORMATION */}
        <div className="lvc-section">
          <h2 className="lvc-section-title">
            <FaUserTie />
            Judge Assignment
          </h2>

          <div className="lvc-info-grid">
            <div className="lvc-info-box">
              <span className="lvc-label">Assigned Judge</span>
              <span className="lvc-value">
                {show(caseData.assignedJudge)}
              </span>
            </div>

            <div className="lvc-info-box">
              <span className="lvc-label">Assignment Method</span>
              <span className="lvc-value">
                {caseData.aiRecommended ? "AI Recommended" : "Assigned"}
              </span>
            </div>
          </div>
        </div>

        {/* DOCUMENTS */}
        <div className="lvc-section">
          <h2 className="lvc-section-title">
            <FaFileAlt />
            Submitted Documents
          </h2>

          {documents.length === 0 ? (
            <div className="lvc-empty">
              No documents attached by the citizen.
            </div>
          ) : (
            documents.map((doc, index) => {
              const documentName =
                typeof doc === "string"
                  ? doc
                  : doc?.name || doc?.fileName || `Document ${index + 1}`;

              const documentUrl =
                typeof doc === "object"
                  ? doc?.url || doc?.downloadURL || doc?.fileUrl
                  : null;

              return (
                <div className="lvc-doc" key={index}>
                  <div className="lvc-doc-icon">
                    <FaFileAlt />
                  </div>

                  <div className="lvc-doc-name">
                    {documentName}
                  </div>

                  {documentUrl && (
                    <a
                      href={documentUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View Document
                    </a>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* HEARINGS */}
        <div className="lvc-section">
          <h2 className="lvc-section-title">
            <FaCalendarAlt />
            Hearings
          </h2>

          {hearings.length === 0 ? (
            <div className="lvc-empty">
              No hearing has been scheduled for this case yet.
            </div>
          ) : (
            hearings.map((hearing) => (
              <div className="lvc-hearing" key={hearing.id}>
                <div className="lvc-hearing-title">
                  {hearing.title ||
                    hearing.hearingTitle ||
                    hearing.type ||
                    "Court Hearing"}
                </div>

                <div className="lvc-hearing-info">
                  <span>
                    <FaCalendarAlt />
                    {formatDate(
                      hearing.date ||
                      hearing.hearingDate ||
                      hearing.scheduleDate
                    )}
                  </span>

                  <span>
                    <FaClock />
                    {show(hearing.time || hearing.hearingTime)}
                  </span>

                  <span>
                    {show(hearing.status)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* BLOCKCHAIN HISTORY */}
        <div className="lvc-section">
          <h2 className="lvc-section-title">
            <FaShieldAlt />
            Blockchain Case History
          </h2>

          {blockchainHistory.length === 0 ? (
            <p className="lvc-empty">
              No blockchain history available.
            </p>
          ) : (
            blockchainHistory.map((event, index) => (
              <div className="lvc-history-item" key={index}>
                <h3>{event.eventType || "Blockchain Event"}</h3>

                <p>
                  <b>Details:</b>{" "}
                  {event.details || "No details available"}
                </p>

                <p>
                  <b>Actor ID:</b>{" "}
                  {event.actorId || "N/A"}
                </p>

                <p>
                  <b>Date:</b>{" "}
                  {event.timestamp
                    ? new Date(event.timestamp).toLocaleString()
                    : "N/A"}
                </p>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
};

export default LawyerViewCase;
