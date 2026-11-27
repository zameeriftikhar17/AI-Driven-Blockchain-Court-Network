import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { get } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";
import { ref, onValue, set, update } from "firebase/database";

import {
  FaArrowLeft,
  FaFileAlt,
  FaUser,
  FaUserTie,
  FaRobot,
  FaShieldAlt,
  FaCalendarAlt,
  FaGavel,
  FaClock,
  FaCheckCircle,
  FaBalanceScale,
  FaExclamationTriangle,
} from "react-icons/fa";

import { auth, db } from "../../../firebase";

const JudgeCaseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(null);
const [caseData, setCaseData] = useState(null);
const [hearings, setHearings] = useState([]);
const [blockchainHistory, setBlockchainHistory] = useState([]);
const [lawyerResponses, setLawyerResponses] = useState([]);
const [updatingResponseId, setUpdatingResponseId] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
const [orderTitle, setOrderTitle] = useState("");
const [orderDetails, setOrderDetails] = useState("");
const [savingOrder, setSavingOrder] = useState(false);
const [courtOrder, setCourtOrder] = useState(null);
const [verificationResult, setVerificationResult] = useState("");

  // =========================================================
  // AUTH
  // =========================================================
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

  // =========================================================
  // LOAD CASE
  // =========================================================
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

        // Judge authorization
        const isAssignedJudge =
          data.assignedJudgeId === user.uid ||
          data.judgeId === user.uid;

        if (!isAssignedJudge) {
          setCaseData(null);
          setError(
            "You are not authorized to view this case."
          );
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
// =========================================================
// LOAD SAVED COURT ORDER
// =========================================================
useEffect(() => {
  if (!id) return;

  const orderRef = ref(db, `courtOrders/${id}`);

  const unsubscribe = onValue(orderRef, (snapshot) => {
    if (snapshot.exists()) {
      setCourtOrder(snapshot.val());
    } else {
      setCourtOrder(null);
    }
  });

  return () => unsubscribe();
}, [id]);


// =========================================================
// LOAD LAWYER RESPONSES
// =========================================================
useEffect(() => {
  if (!user?.uid || !id) return;

  const responsesRef = ref(db, "lawyerResponses");

  const unsubscribe = onValue(
    responsesRef,
    (snapshot) => {
      const data = snapshot.val() || {};

      const loadedResponses = Object.entries(data)
        .map(([responseId, item]) => ({
          id: responseId,
          ...(item || {}),
        }))
        .filter((item) => String(item.caseId) === String(id));

      setLawyerResponses(loadedResponses);
    },
    (err) => {
      console.error("LAWYER RESPONSES ERROR:", err);
      setLawyerResponses([]);
    }
  );

  return () => unsubscribe();
}, [user, id]);

  // =========================================================
  // LOAD HEARINGS
  // =========================================================
  useEffect(() => {
    if (!user?.uid || !id) return;

    const hearingsRef = ref(db, "hearings");

    const unsubscribe = onValue(
      hearingsRef,
      (snapshot) => {
        const data = snapshot.val() || {};

        const caseIds = [
          id,
          caseData?.id,
          caseData?.caseId,
          caseData?.caseNumber,
        ]
          .filter(Boolean)
          .map(String);

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

            const caseMatch =
              hearingCaseId &&
              caseIds.includes(String(hearingCaseId));

            const judgeMatch =
              hearing.judgeId === user.uid ||
              hearing.assignedJudgeId === user.uid ||
              hearing.judgeUID === user.uid;

            return caseMatch && judgeMatch;
          });

        setHearings(loadedHearings);
      },
      (err) => {
        console.error("HEARING ERROR:", err);
        setHearings([]);
      }
    );

    return () => unsubscribe();
  }, [user, id, caseData]);


  // =========================================================
// LOAD BLOCKCHAIN CASE HISTORY
// =========================================================
useEffect(() => {
  const caseId = caseData?.id || id;

  if (!caseId) return;

  const loadBlockchainHistory = async () => {
    try {
      const response = await fetch(
        `http://localhost:8000/blockchain/case-history/${encodeURIComponent(caseId)}`
      );

      if (!response.ok) {
        throw new Error("Failed to load blockchain history");
      }

      const data = await response.json();
      setBlockchainHistory(data || []);

    } catch (error) {
      console.error("Blockchain History Error:", error);
      setBlockchainHistory([]);
    }
  };

  loadBlockchainHistory();
}, [caseData, id]);

  // =========================================================
  // SAVE COURT ORDER TO FIREBASE + BLOCKCHAIN
  // =========================================================
  const saveCourtOrder = async () => {
    if (!orderTitle.trim() || !orderDetails.trim()) {
      alert("Please enter order title and details.");
      return;
    }

    if (!user?.uid || !caseData?.id) {
      alert("Case or Judge information is missing.");
      return;
    }

    setSavingOrder(true);

    try {
      const orderText = `${orderTitle.trim()}\n${orderDetails.trim()}`;

      // Generate SHA-256 hash
      const encoder = new TextEncoder();
      const data = encoder.encode(orderText);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);

      const orderHash = Array.from(new Uint8Array(hashBuffer))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");

      // Save order in Firebase first
      const orderData = {
        caseId: caseData.id,
        orderTitle: orderTitle.trim(),
        orderDetails: orderDetails.trim(),
        orderHash,
        judgeId: user.uid,
        createdAt: new Date().toISOString(),
        blockchainStatus: "PENDING",
      };

      await set(ref(db, `courtOrders/${caseData.id}`), orderData);

      // Record order hash on Hyperledger Fabric
      const response = await fetch(
        "http://localhost:8000/blockchain/record-order",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            caseId: caseData.id,
            orderHash,
            actorId: user.uid,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Blockchain recording failed.");
      }

      await update(ref(db, `courtOrders/${caseData.id}`), {
        blockchainStatus: "RECORDED",
      });

      setCourtOrder({
  ...orderData,
  blockchainStatus: "RECORDED",
});
      setOrderTitle("");
      setOrderDetails("");

      alert("Court order saved and recorded on blockchain successfully!");
    } catch (err) {
      console.error("COURT ORDER ERROR:", err);

      try {
        await update(ref(db, `courtOrders/${caseData.id}`), {
          blockchainStatus: "FAILED",
        });
      } catch (firebaseError) {
        console.error("Firebase status update error:", firebaseError);
      }

      alert("Order could not be recorded on blockchain. Please try again.");
    } finally {
      setSavingOrder(false);
    }
  };

  const verifyCourtOrder = async () => {
  try {
    const response = await fetch(
      `http://localhost:8000/blockchain/get-order/${encodeURIComponent(caseData.id)}`
    );

    if (!response.ok) {
      throw new Error("Could not retrieve blockchain order.");
    }

    const blockchainOrder = await response.json();

    if (blockchainOrder.orderHash === courtOrder.orderHash) {
      setVerificationResult("VERIFIED - Order is authentic!");
    } else {
      setVerificationResult("MISMATCH - Order hash does not match!");
    }

  } catch (error) {
    console.error("Verification error:", error);
    setVerificationResult("Verification failed. Please try again.");
  }
};

const markResponseReviewed = async (responseId) => {
  try {
    setUpdatingResponseId(responseId);

    await update(ref(db, `lawyerResponses/${responseId}`), {
      reviewStatus: "Reviewed",
      reviewedBy: user.uid,
      reviewedAt: Date.now(),
    });

  } catch (error) {
    console.error("REVIEW STATUS ERROR:", error);
    alert("Unable to update response status.");
  } finally {
    setUpdatingResponseId("");
  }
};

  // =========================================================
  // HELPERS
  // =========================================================
  const show = (value, fallback = "Not available") => {
    if (
      value === undefined ||
      value === null ||
      value === ""
    ) {
      return fallback;
    }

    return String(value);
  };

  const formatDate = (value) => {
    if (!value) return "Not available";

    try {
      if (
        typeof value === "object" &&
        value.seconds
      ) {
        return new Date(
          value.seconds * 1000
        ).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      }

      const date = new Date(value);

      if (isNaN(date.getTime())) {
        return String(value);
      }

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

  const status =
    caseData?.status ||
    "Pending";

  const citizenName =
    caseData?.userDisplayName ||
    caseData?.citizenName ||
    caseData?.userName ||
    "Citizen";

  const citizenEmail =
    caseData?.userEmail ||
    caseData?.citizenEmail ||
    "Not available";

  const defendantName =
    caseData?.defendantName ||
    caseData?.respondent ||
    "Not available";

  const description =
    caseData?.description ||
    "No case description available.";

  const lawyerName =
    caseData?.assignedLawyerName ||
    caseData?.selectedLawyerName ||
    caseData?.lawyerName ||
    "Not assigned";

  const lawyerStatus =
    caseData?.lawyerRequestStatus ||
    "Not Started";

  const assignedJudge =
    caseData?.assignedJudge ||
    "Not available";

  const documents =
    Array.isArray(caseData?.documentNames)
      ? caseData.documentNames
      : Array.isArray(caseData?.documents)
      ? caseData.documents.map(
          (doc) =>
            doc?.name ||
            doc?.fileName ||
            String(doc)
        )
      : caseData?.documents &&
        typeof caseData.documents === "object"
      ? Object.values(
          caseData.documents
        ).map(
          (doc) =>
            doc?.name ||
            doc?.fileName ||
            "Document"
        )
      : [];

  const aiConfidence =
    caseData?.classificationConfidence ??
    caseData?.classification_confidence;

  const complexityScore =
    caseData?.complexityScore ??
    caseData?.complexity_score;

  const numberOfParties =
    caseData?.numberOfParties ??
    caseData?.number_of_parties;

  const estimatedDuration =
    caseData?.predictedDurationDays ??
    caseData?.estimatedDurationDays ??
    caseData?.estimated_duration_days;

  const isAppeal =
    caseData?.isAppeal ??
    caseData?.is_appeal;

  const appealLevel =
    caseData?.appealLevel ??
    caseData?.appeal_level;

  const hearingCount =
    caseData?.hearingCount ??
    caseData?.hearing_count ??
    caseData?.hearingCountTotal ??
    hearings.length;

  const adjournmentCount =
    caseData?.adjournmentCount ??
    caseData?.adjournment_count ??
    0;

  // =========================================================
  // BACK
  // =========================================================
  const handleBack = () => {
    if (location.state?.from === "ai-assigned") {
      navigate("/judge-dashboard/ai-assigned-cases");
      return;
    }

    navigate("/judge-dashboard/all-cases");
  };

  // =========================================================
  // LOADING
  // =========================================================
  if (loading) {
    return (
      <div className="jcd-loading">
        <div className="jcd-spinner"></div>
        <p>Loading Case Details...</p>

        <style>{`
          .jcd-loading {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            background: #f5f9ff;
            color: #334155;
          }

          .jcd-spinner {
            width: 45px;
            height: 45px;
            border: 4px solid #dbeafe;
            border-top-color: #1e40af;
            border-radius: 50%;
            animation: jcdSpin .8s linear infinite;
            margin-bottom: 15px;
          }

          @keyframes jcdSpin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  // =========================================================
  // ERROR
  // =========================================================
  if (error || !caseData) {
    return (
      <div className="jcd-error-page">
        <div className="jcd-error-card">
          <FaFileAlt />

          <h2>
            {error || "Case Not Found"}
          </h2>

          <button onClick={handleBack}>
            <FaArrowLeft />
            Back to Cases
          </button>
        </div>

        <style>{`
          .jcd-error-page {
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            background: #f5f9ff;
            padding: 20px;
          }

          .jcd-error-card {
            background: white;
            padding: 40px;
            border-radius: 18px;
            text-align: center;
            box-shadow: 0 8px 30px rgba(0,0,0,.08);
          }

          .jcd-error-card svg {
            font-size: 40px;
            color: #64748b;
          }

          .jcd-error-card h2 {
            color: #334155;
            margin: 15px 0 20px;
          }

          .jcd-error-card button {
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
    <div className="judge-case-detail">

      <style>{`

        .judge-case-detail {
          min-height: 100vh;
          background: #f5f9ff;
          padding: 25px;
          color: #1e293b;
        }

        .jcd-container {
          max-width: 1100px;
          margin: auto;
        }

        .jcd-back {
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

        .jcd-back:hover {
          background: #eff6ff;
        }

        /* HEADER */

        .jcd-header {
          background: linear-gradient(
            135deg,
            #102a56,
            #1e40af
          );
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

        .jcd-header h1 {
          margin: 0;
          font-size: 25px;
        }

        .jcd-case-id {
          margin-top: 7px;
          opacity: .85;
          font-size: 13px;
        }

        .jcd-status {
          padding: 8px 15px;
          border-radius: 20px;
          background: rgba(255,255,255,.16);
          font-weight: 800;
          font-size: 12px;
        }

        /* SECTION */

        .jcd-section {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 22px;
          margin-bottom: 18px;
          box-shadow: 0 5px 18px rgba(15,23,42,.04);
        }

        .jcd-section-title {
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

        /* INFO */

        .jcd-info-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 13px;
        }

        .jcd-info-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 11px;
          padding: 15px;
        }

        .jcd-label {
          display: block;
          color: #64748b;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          margin-bottom: 6px;
        }

        .jcd-value {
          color: #1e293b;
          font-size: 14px;
          font-weight: 700;
          word-break: break-word;
        }

        /* PEOPLE */

        .jcd-people {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }

        .jcd-person {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 17px;
        }

        .jcd-person h3 {
          margin: 0 0 12px;
          font-size: 15px;
          color: #1e3a8a;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .jcd-person p {
          margin: 7px 0;
          font-size: 13px;
          color: #475569;
        }

        /* DESCRIPTION */

        .jcd-description {
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

        /* AI */

        .jcd-ai {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 13px;
          padding: 18px;
        }

        .jcd-ai-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 13px;
        }

        .jcd-ai-box {
          background: white;
          border-radius: 10px;
          padding: 15px;
          border: 1px solid #dbeafe;
        }

        .jcd-ai-box .ai-icon {
          color: #2563eb;
          margin-bottom: 7px;
        }

        .jcd-ai-box strong {
          display: block;
          font-size: 11px;
          color: #64748b;
          text-transform: uppercase;
          margin-bottom: 5px;
        }

        .jcd-ai-box span {
          font-size: 15px;
          font-weight: 800;
          color: #1e3a8a;
        }

        /* DOCUMENTS */

        .jcd-doc {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 13px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          margin-bottom: 9px;
        }

        .jcd-doc:last-child {
          margin-bottom: 0;
        }

        .jcd-doc-icon {
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

        .jcd-doc-name {
          font-size: 13px;
          font-weight: 700;
          word-break: break-word;
        }

        .jcd-empty {
          color: #64748b;
          font-size: 13px;
        }

        /* HEARINGS */

        .jcd-hearing {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 11px;
          padding: 15px;
          margin-bottom: 10px;
        }

        .jcd-hearing-title {
          color: #1e3a8a;
          font-weight: 800;
          margin-bottom: 8px;
        }

        .jcd-hearing-info {
          display: flex;
          gap: 15px;
          flex-wrap: wrap;
          color: #64748b;
          font-size: 12px;
        }

        .jcd-hearing-info span {
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }

/* COURT ORDER FORM */

.jcd-form-group {
  margin-bottom: 18px;
}

.jcd-form-group label {
  display: block;
  color: #334155;
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 8px;
}

.jcd-form-group input,
.jcd-form-group textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 13px 15px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  background: #f8fafc;
  color: #1e293b;
  font-size: 14px;
  font-family: inherit;
  outline: none;
}

.jcd-form-group input:focus,
.jcd-form-group textarea:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
  background: #fff;
}

.jcd-form-group textarea {
  min-height: 150px;
  resize: vertical;
  line-height: 1.6;
}

.jcd-order-save {
  padding: 13px 22px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #1e3a8a, #2563eb);
  color: white;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.jcd-order-save:hover {
  opacity: 0.9;
}

.jcd-order-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.jcd-order-success {
  margin-top: 16px;
  padding: 12px;
  border-radius: 10px;
  background: #ecfdf5;
  color: #065f46;
  font-weight: 700;
}

        @media(max-width:800px) {

          .jcd-info-grid {
            grid-template-columns: 1fr 1fr;
          }

          .jcd-ai-grid {
            grid-template-columns: 1fr 1fr;
          }

          .jcd-people {
            grid-template-columns: 1fr;
          }
        }

        @media(max-width:600px) {

          .judge-case-detail {
            padding: 14px;
          }

          .jcd-header {
            display: block;
          }

          .jcd-header h1 {
            font-size: 21px;
          }

          .jcd-status {
            display: inline-block;
            margin-top: 12px;
          }

          .jcd-info-grid,
          .jcd-ai-grid {
            grid-template-columns: 1fr;
          }

          .jcd-section {
            padding: 17px;
          }
        }
.jcd-verify-success {
  margin-top: 12px;
  padding: 12px 16px;
  background: #e8f8ee;
  color: #16803c;
  border: 1px solid #a7e5bb;
  border-radius: 8px;
  font-weight: 600;
}

.jcd-verify-error {
  margin-top: 12px;
  padding: 12px 16px;
  background: #fdecec;
  color: #c62828;
  border: 1px solid #f5b5b5;
  border-radius: 8px;
  font-weight: 600;
}
      `}</style>

      <div className="jcd-container">

        {/* BACK */}

        <button
          className="jcd-back"
          onClick={handleBack}
        >
          <FaArrowLeft />
          Back to Cases
        </button>

        {/* HEADER */}

        <div className="jcd-header">

          <div>
            <h1>
              {caseType} Case
            </h1>

            <div className="jcd-case-id">
              Case ID: {caseNumber}
            </div>
          </div>

          <div className="jcd-status">
            {status}
          </div>

        </div>

        {/* =====================================================
            CASE INFORMATION
        ====================================================== */}

        <div className="jcd-section">

          <h2 className="jcd-section-title">
            <FaFileAlt />
            Case Information
          </h2>

          <div className="jcd-info-grid">

            <div className="jcd-info-box">
              <span className="jcd-label">
                Case Number
              </span>

              <span className="jcd-value">
                {caseNumber}
              </span>
            </div>

            <div className="jcd-info-box">
              <span className="jcd-label">
                Case Type
              </span>

              <span className="jcd-value">
                {caseType}
              </span>
            </div>

            <div className="jcd-info-box">
              <span className="jcd-label">
                Case Subtype
              </span>

              <span className="jcd-value">
                {caseSubtype}
              </span>
            </div>

            <div className="jcd-info-box">
              <span className="jcd-label">
                Filing Date
              </span>

              <span className="jcd-value">
                {formatDate(
                  caseData.filingDate ||
                  caseData.createdAt
                )}
              </span>
            </div>

            <div className="jcd-info-box">
              <span className="jcd-label">
                Priority
              </span>

              <span className="jcd-value">
                {priority}
              </span>
            </div>

            <div className="jcd-info-box">
              <span className="jcd-label">
                Status
              </span>

              <span className="jcd-value">
                {status}
              </span>
            </div>

          </div>

        </div>

        {/* =====================================================
            PARTIES
        ====================================================== */}

        <div className="jcd-section">

          <h2 className="jcd-section-title">
            <FaUser />
            Parties
          </h2>

          <div className="jcd-people">

            <div className="jcd-person">

              <h3>
                <FaUser />
                Citizen / Applicant
              </h3>

              <p>
                <b>Name:</b>{" "}
                {citizenName}
              </p>

              <p>
                <b>Email:</b>{" "}
                {citizenEmail}
              </p>

            </div>

            <div className="jcd-person">

              <h3>
                <FaUserTie />
                Defendant
              </h3>

              <p>
                <b>Name:</b>{" "}
                {defendantName}
              </p>

            </div>

          </div>

        </div>

        {/* =====================================================
            DESCRIPTION
        ====================================================== */}

        <div className="jcd-section">

          <h2 className="jcd-section-title">
            <FaFileAlt />
            Case Description
          </h2>

          <div className="jcd-description">
            {description}
          </div>

        </div>

        {/* =====================================================
            AI ANALYSIS
        ====================================================== */}

        <div className="jcd-section">

          <h2 className="jcd-section-title">
            <FaRobot />
            AI Analysis
          </h2>

          <div className="jcd-ai">

            <div className="jcd-ai-grid">

              <div className="jcd-ai-box">

                <FaRobot className="ai-icon" />

                <strong>
                  AI Case Type
                </strong>

                <span>
                  {caseType}
                </span>

              </div>

              <div className="jcd-ai-box">

                <FaExclamationTriangle className="ai-icon" />

                <strong>
                  AI Priority
                </strong>

                <span>
                  {priority}
                </span>

              </div>

              <div className="jcd-ai-box">

                <FaClock className="ai-icon" />

                <strong>
                  Estimated Duration
                </strong>

                <span>
                  {estimatedDuration !==
                    undefined &&
                  estimatedDuration !==
                    null
                    ? `${Number(
                        estimatedDuration
                      ).toFixed(2)} days`
                    : "Not available"}
                </span>

              </div>

              

            </div>

          </div>

        </div>

        {/* =====================================================
            CASE TYPE / APPEAL
        ====================================================== */}

        <div className="jcd-section">

          <h2 className="jcd-section-title">
            <FaBalanceScale />
            Case Classification
          </h2>

          <div className="jcd-info-grid">

            <div className="jcd-info-box">

             <span className="jcd-label">
                Hearings
              </span>

              <span className="jcd-value">
                {hearingCount}
              </span>

            </div>

            <div className="jcd-info-box">

              <span className="jcd-label">
                Adjournments
              </span>

              <span className="jcd-value">
                {adjournmentCount}
              </span>

            </div>

           

            

          </div>

        </div>

        {/* =====================================================
            LAWYER
        ====================================================== */}

        <div className="jcd-section">

          <h2 className="jcd-section-title">
            <FaUserTie />
            Lawyer
          </h2>

          <div className="jcd-info-grid">

            <div className="jcd-info-box">

              <span className="jcd-label">
                Lawyer Name
              </span>

              <span className="jcd-value">
                {lawyerName}
              </span>

            </div>

           

          </div>

        </div>

{/* =====================================================
    LAWYER LEGAL RESPONSES
====================================================== */}
<div className="jcd-section">
  <h2 className="jcd-section-title">
    <FaFileAlt />
    Lawyer Legal Responses
  </h2>

  {lawyerResponses.length === 0 ? (
    <div className="jcd-empty">
      No legal response has been submitted for this case yet.
    </div>
  ) : (
    lawyerResponses.map((item) => (
      <div className="jcd-hearing" key={item.id}>
        <div className="jcd-hearing-title">
          {item.lawyerName || "Assigned Lawyer"}
        </div>

        <div className="jcd-description">
          {item.response || "No response text available."}
        </div>

        <div className="jcd-hearing-info" style={{ marginTop: "12px" }}>
          <span>
            <b>Status:</b> {item.status || "Submitted"}
          </span>

          <span>
            <b>Submitted:</b>{" "}
            {item.createdAt
              ? typeof item.createdAt === "number"
                ? new Date(item.createdAt).toLocaleString()
                : item.createdAt.seconds
                ? new Date(item.createdAt.seconds * 1000).toLocaleString()
                : String(item.createdAt)
              : "Not available"}
          </span>
        </div>
        <div style={{ marginTop: "15px" }}>
  <p>
    <b>Review Status:</b>{" "}
    {item.reviewStatus || "Pending Review"}
  </p>

  {item.reviewStatus !== "Reviewed" && (
    <button
      type="button"
      className="jcd-order-save"
      onClick={() => markResponseReviewed(item.id)}
      disabled={updatingResponseId === item.id}
    >
      {updatingResponseId === item.id
        ? "Updating..."
        : "Mark as Reviewed"}
    </button>
  )}

  {item.reviewStatus === "Reviewed" && (
    <span style={{ color: "green", fontWeight: "bold" }}>
      <FaCheckCircle /> Reviewed
    </span>
  )}
</div>
      </div>
    ))
  )}
</div>

        {/* =====================================================
            JUDGE
        ====================================================== */}

        <div className="jcd-section">

          <h2 className="jcd-section-title">
            <FaGavel />
            Judge Assignment
          </h2>

          <div className="jcd-info-grid">

            <div className="jcd-info-box">

              <span className="jcd-label">
                Assigned Judge
              </span>

              <span className="jcd-value">
                {assignedJudge}
              </span>

            </div>

            <div className="jcd-info-box">

              <span className="jcd-label">
                Assignment Method
              </span>

              <span className="jcd-value">
                {caseData.aiRecommended
                  ? "AI Recommended"
                  : "Assigned"}
              </span>

            </div>

          </div>

        </div>

        {/* =====================================================
            DOCUMENTS
        ====================================================== */}

        <div className="jcd-section">

          <h2 className="jcd-section-title">
            <FaFileAlt />
            Submitted Documents
          </h2>

          {documents.length === 0 ? (

            <div className="jcd-empty">
              No documents attached by the citizen.
            </div>

          ) : (

            documents.map(
              (documentName, index) => (

                <div
                  className="jcd-doc"
                  key={`${documentName}-${index}`}
                >

                  <div className="jcd-doc-icon">
                    <FaFileAlt />
                  </div>

                  <div className="jcd-doc-name">
                    {documentName}
                  </div>

                </div>

              )
            )

          )}

        </div>

        {/* =====================================================
            HEARINGS
        ====================================================== */}

        <div className="jcd-section">

          <h2 className="jcd-section-title">
            <FaCalendarAlt />
            Hearings
          </h2>

          {hearings.length === 0 ? (

            <div className="jcd-empty">
              No hearing has been scheduled
              for this case yet.
            </div>

          ) : (

            hearings.map((hearing) => (

              <div
                className="jcd-hearing"
                key={hearing.id}
              >

                <div className="jcd-hearing-title">
                  {hearing.title ||
                    hearing.hearingTitle ||
                    hearing.type ||
                    "Court Hearing"}
                </div>

                <div className="jcd-hearing-info">

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

                    {show(
                      hearing.time ||
                      hearing.hearingTime
                    )}
                  </span>

                  <span>
                    <FaCheckCircle />

                    {show(
                      hearing.status
                    )}
                  </span>

                </div>

              </div>

            ))

          )}

        </div>
{/* =====================================================
    COURT ORDER
====================================================== */}

<div className="jcd-section">
  <h2 className="jcd-section-title">
    <FaFileAlt />
    Court Order / Judgment
  </h2>

  <div className="jcd-form-group">
    <label>Order Title</label>
    <input
      type="text"
      value={orderTitle}
      onChange={(e) => setOrderTitle(e.target.value)}
      placeholder="Enter court order title"
    />
  </div>

  <div className="jcd-form-group">
    <label>Order Details</label>
    <textarea
      value={orderDetails}
      onChange={(e) => setOrderDetails(e.target.value)}
      placeholder="Write court order or judgment details..."
      rows={6}
    />
  </div>

  <button
  className="jcd-order-save"
  type="button"
  onClick={saveCourtOrder}
  disabled={savingOrder}
>
    {savingOrder ? "Saving..." : "Save Court Order"}
  </button>

 {courtOrder && (
  <div className="jcd-order-success">
    <h3>{courtOrder.orderTitle}</h3>

    <p>{courtOrder.orderDetails}</p>

    <p>
  Blockchain Status: {courtOrder.blockchainStatus}
</p>

<button
  className="jcd-order-save"
  type="button"
  onClick={verifyCourtOrder}
>
  Verify Blockchain Order
</button>
{verificationResult && (
  <p
    className={
      verificationResult.startsWith("VERIFIED")
        ? "jcd-verify-success"
        : "jcd-verify-error"
    }
  >
    {verificationResult}
  </p>
)}
  </div>
)}
</div>

{/* BLOCKCHAIN CASE HISTORY */}
<div className="jcd-section">
  <h2 className="jcd-section-title">
    <FaShieldAlt />
    Blockchain Case History
  </h2>

  {blockchainHistory.length === 0 ? (
    <p>No blockchain history available.</p>
  ) : (
    blockchainHistory.map((event, index) => (
      <div className="jcd-order-success" key={index}>
        <h3>{event.eventType || "Blockchain Event"}</h3>
        <p>{event.details || "No details available"}</p>
        <p>Actor ID: {event.actorId || "N/A"}</p>
        <p>
          Date: {event.timestamp
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


export default JudgeCaseDetail;