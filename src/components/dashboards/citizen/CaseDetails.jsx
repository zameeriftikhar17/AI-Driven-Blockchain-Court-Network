import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  FaArrowLeft,
  FaBriefcase,
  FaUser,
  FaUserTie,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaPhone,
  FaEnvelope,
  FaGavel,
  FaClock,
  FaFileAlt,
  FaExclamationTriangle,
  FaSpinner,
  FaCheckCircle,
  FaCalendarCheck,
  FaTimes
} from 'react-icons/fa';

import {
  ref,
  onValue,
  off,
  push,
  set,
  update,
  get,
  serverTimestamp
} from 'firebase/database';

import { auth, db } from '../../../firebase';
import Swal from 'sweetalert2';

const CaseDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [citizenProfile, setCitizenProfile] = useState(null);

  // Hearing states
  const [hearings, setHearings] = useState([]);
  const [hearingLoading, setHearingLoading] = useState(false);
  const [showHearings, setShowHearings] = useState(false);

  // Lawyer request states
  const [lawyers, setLawyers] = useState([]);
  const [lawyersLoading, setLawyersLoading] = useState(true);
  const [selectedLawyerId, setSelectedLawyerId] = useState('');
  const [sendingLawyerRequest, setSendingLawyerRequest] = useState(false);

  // ============================================================
  // LOAD EXACT CASE FROM FIREBASE
  // ============================================================

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const caseRef = ref(db, `cases/${id}`);

    const unsubscribe = onValue(
      caseRef,
      (snapshot) => {
        const data = snapshot.val();

        console.log('CASE DETAIL DATA:', data);
        console.log('COURT VALUE:', data?.court, data?.courtName);
console.log('DISTRICT VALUE:', data?.district, data?.location);
        console.log('PREDICTED DURATION:', data?.predictedDurationDays);

        if (!data) {
          setCaseData(null);
          setLoading(false);

          Swal.fire({
            icon: 'error',
            title: 'Case Not Found',
            text: 'The requested case could not be found.',
            confirmButtonColor: '#0284c7'
          }).then(() => {
            navigate(-1);
          });

          return;
        }

        setCaseData({
          ...data,
          id: data.id || id
        });

        setLoading(false);
      },
      (error) => {
        console.error('CASE DETAIL ERROR:', error);

        setLoading(false);

        Swal.fire({
          icon: 'error',
          title: 'Loading Failed',
          text: 'Unable to load case information.',
          confirmButtonColor: '#0284c7'
        });
      }
    );

    return () => {
      off(caseRef);
    };
  }, [id, navigate]);


  // ============================================================
  // LOAD CITIZEN PROFILE FROM FIREBASE
  // ============================================================

  useEffect(() => {
    const citizenId =
      caseData?.citizenId ||
      caseData?.userId ||
      caseData?.clientId;

    if (!citizenId) {
      setCitizenProfile(null);
      return;
    }

    const loadCitizenProfile = async () => {
      try {
        const userRef = ref(db, `users/${citizenId}`);
        const snapshot = await get(userRef);

        if (snapshot.exists()) {
          setCitizenProfile(snapshot.val());
          console.log('CITIZEN PROFILE:', snapshot.val());
        } else {
          setCitizenProfile(null);
          console.log('Citizen profile not found.');
        }
      } catch (error) {
        console.error('CITIZEN PROFILE ERROR:', error);
        setCitizenProfile(null);
      }
    };

    loadCitizenProfile();
  }, [caseData]);


  // ============================================================
  // LOAD LAWYERS IN REAL TIME
  // ============================================================
  useEffect(() => {
    const usersRef = ref(db, 'users');

    const unsubscribe = onValue(
      usersRef,
      (snapshot) => {
        const data = snapshot.val();

        if (!data) {
          setLawyers([]);
          setLawyersLoading(false);
          return;
        }

        const lawyerList = Object.entries(data)
          .filter(([uid, userData]) => {
            if (!userData || typeof userData !== 'object') return false;

            const role = String(
              userData.role ||
              userData.userRole ||
              ''
            ).trim().toLowerCase();

            return role === 'lawyer';
          })
          .map(([uid, userData]) => ({
            id: uid,
            ...userData
          }));

        setLawyers(lawyerList);
        setLawyersLoading(false);
      },
      (error) => {
        console.error('LAWYERS LOAD ERROR:', error);
        setLawyers([]);
        setLawyersLoading(false);
      }
    );

    return () => off(usersRef);
  }, []);

  // Keep the current case lawyer selected when available.
  useEffect(() => {
    if (!caseData) return;

    const existingLawyerId =
      caseData.assignedLawyer ||
      caseData.assignedLawyerId ||
      caseData.lawyerId ||
      caseData.selectedLawyerId ||
      '';

    if (existingLawyerId) {
      setSelectedLawyerId(String(existingLawyerId));
    }
  }, [caseData]);

  // ============================================================
  // SEND LAWYER REQUEST
  // IMPORTANT:
  // LawyerDashboard reads:
  // lawyerRequests/{lawyerUid}/{requestId}
  // ============================================================
  const handleSendLawyerRequest = async () => {
    if (!id || !caseData) return;

    const lawyerId =
      selectedLawyerId ||
      caseData.lawyerId ||
      caseData.selectedLawyerId ||
      '';

    if (!lawyerId) {
      Swal.fire({
        icon: 'warning',
        title: 'Select a Lawyer',
        text: 'Please select a lawyer before sending the request.',
        confirmButtonColor: '#0284c7'
      });
      return;
    }

    const selectedLawyer = lawyers.find(
      (lawyer) => String(lawyer.id) === String(lawyerId)
    );

    const lawyerName =
      selectedLawyer?.fullName ||
      selectedLawyer?.name ||
      selectedLawyer?.displayName ||
      caseData.lawyerName ||
      'Lawyer';

    const lawyerType =
      selectedLawyer?.specialization ||
      selectedLawyer?.lawyerType ||
      selectedLawyer?.speciality ||
      caseData.lawyerType ||
      '';

    const citizenId =
      caseData.citizenId ||
      caseData.userId ||
      caseData.clientId ||
      auth.currentUser?.uid ||
      '';

    const citizenName =
  caseData.citizenName ||
  caseData.clientName ||
  caseData.applicantName ||
  caseData.userDisplayName ||
  auth.currentUser?.displayName ||
  'Citizen';

   const citizenEmail =
  caseData.citizenEmail ||
  caseData.clientEmail ||
  caseData.userEmail ||
  auth.currentUser?.email ||
  '';

    try {
      setSendingLawyerRequest(true);

      // Generate request ID INSIDE THE SELECTED LAWYER'S NODE.
      const lawyerRequestsRef = ref(
        db,
        `lawyerRequests/${lawyerId}`
      );

      const requestRef = push(lawyerRequestsRef);
      const requestId = requestRef.key;

      if (!requestId) {
        throw new Error('Unable to create lawyer request ID.');
      }

      const requestData = {
        id: requestId,
        caseId: id,
        caseNumber:
          caseData.caseNumber ||
          caseData.caseId ||
          id,
        caseType:
          caseData.predictedCaseType ||
          caseData.caseType ||
          'Not available',
        caseTitle:
          caseData.title ||
          caseData.subject ||
          'Court Case',
        description:
          caseData.description ||
          caseData.caseDescription ||
          caseData.details ||
          caseData.problemDescription ||
          '',
        priority:
          caseData.priority ||
          'Normal',
        lawyerId,
        lawyerName,
        lawyerType,
        citizenId,
        citizenName,
        citizenEmail,
        status: 'Pending',
        requestStatus: 'Pending',
        createdAt: serverTimestamp(),
        respondedAt: null,
        lawyerDecisionAt: null,
        rejectionReason: null
      };

      // IMPORTANT FIX:
      // Save under lawyerRequests/{lawyerUid}/{requestId}
      await set(
        ref(
          db,
          `lawyerRequests/${lawyerId}/${requestId}`
        ),
        requestData
      );

      await update(
        ref(db, `cases/${id}`),
        {
          selectedLawyerId: lawyerId,
          selectedLawyerName: lawyerName,
          selectedLawyerType: lawyerType,
          lawyerId,
          lawyerName,
          lawyerType,
          lawyerRequestId: requestId,
          lawyerRequestStatus: 'Pending',
          assignedLawyer: null,
          assignedLawyerName: null
        }
      );

      // Send notification to the lawyer.
      const notificationRef = push(
        ref(db, `notifications/${lawyerId}`)
      );

      await set(notificationRef, {
        id: notificationRef.key,
        type: 'lawyer_case_request',
        requestType: 'case_assignment',
        title: 'New Case Request',
        message:
          `${citizenName} has selected you as a lawyer for Case ` +
          `${caseData.caseNumber || caseData.caseId || id}. ` +
          `Please review the case and accept or reject the request.`,
        caseId: id,
        caseNumber:
          caseData.caseNumber ||
          caseData.caseId ||
          id,
        requestId,
        lawyerId,
        citizenId,
        read: false,
        createdAt: serverTimestamp()
      });

      Swal.fire({
        icon: 'success',
        title: 'Request Sent',
        text:
          `${lawyerName} has received the lawyer request. ` +
          `They can now accept or reject it from the Lawyer Dashboard.`,
        confirmButtonColor: '#0284c7'
      });
    } catch (error) {
      console.error('SEND LAWYER REQUEST ERROR:', error);

      Swal.fire({
        icon: 'error',
        title: 'Request Failed',
        text:
          error?.message ||
          'Unable to send the lawyer request.',
        confirmButtonColor: '#0284c7'
      });
    } finally {
      setSendingLawyerRequest(false);
    }
  };

  // ============================================================
  // LOAD HEARINGS
  // ============================================================

  const loadHearings = () => {
    if (!id) return;

    setHearingLoading(true);
    setShowHearings(true);

    const hearingsRef = ref(db, 'hearings');

    onValue(
      hearingsRef,
      (snapshot) => {
        const data = snapshot.val();

        console.log('ALL HEARINGS:', data);

        if (!data) {
          setHearings([]);
          setHearingLoading(false);
          return;
        }

        const hearingList = [];

        Object.entries(data).forEach(([hearingId, hearing]) => {
          if (!hearing || typeof hearing !== 'object') return;

          /*
           * Check different possible case ID field names.
           * This makes the page compatible with different
           * Firebase hearing structures.
           */

          const hearingCaseId =
            hearing.caseId ||
            hearing.caseID ||
            hearing.case_id ||
            hearing.case ||
            hearing.caseNumber ||
            '';

          /*
           * Current case can have either Firebase key ID
           * or caseNumber.
           */

          const currentCaseNumber =
            caseData?.caseNumber ||
            caseData?.caseId ||
            id;

          const matchesCase =
            String(hearingCaseId) === String(id) ||
            String(hearingCaseId) === String(currentCaseNumber);

          if (matchesCase) {
            hearingList.push({
              ...hearing,
              hearingId
            });
          }
        });

        // Sort hearings by date
        hearingList.sort((a, b) => {
          const dateA = new Date(
            a.date ||
            a.hearingDate ||
            a.scheduleDate ||
            0
          );

          const dateB = new Date(
            b.date ||
            b.hearingDate ||
            b.scheduleDate ||
            0
          );

          return dateA - dateB;
        });

        setHearings(hearingList);
        setHearingLoading(false);
      },
      (error) => {
        console.error('HEARING LOAD ERROR:', error);

        setHearings([]);
        setHearingLoading(false);

        Swal.fire({
          icon: 'error',
          title: 'Unable to Load Hearings',
          text: 'Hearing schedule could not be loaded.',
          confirmButtonColor: '#0284c7'
        });
      }
    );
  };

  // ============================================================
  // CLOSE HEARING SECTION
  // ============================================================

  const closeHearings = () => {
    setShowHearings(false);
  };

  // ============================================================
  // BACK
  // ============================================================

  const handleBack = () => {
    navigate(-1);
  };

  // ============================================================
  // HELPERS
  // ============================================================

  const displayValue = (value) => {
    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return 'Not available';
    }

    return String(value);
  };

  const formatDate = (value) => {
    if (!value) {
      return 'Not available';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusClass = (status) => {
    const value = String(status || '').toLowerCase();

    if (
      value.includes('accepted') ||
      value.includes('approved') ||
      value.includes('completed') ||
      value.includes('scheduled')
    ) {
      return 'status-success';
    }

    if (
      value.includes('pending') ||
      value.includes('waiting')
    ) {
      return 'status-warning';
    }

    if (
      value.includes('rejected') ||
      value.includes('cancelled') ||
      value.includes('cancel')
    ) {
      return 'status-danger';
    }

    if (
      value.includes('active') ||
      value.includes('progress')
    ) {
      return 'status-info';
    }

    return 'status-default';
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="case-loading">

        <style>{`
          .case-loading {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #eef8ff;
            font-family: Arial, Helvetica, sans-serif;
          }

          .loading-box {
            text-align: center;
            color: #111827;
          }

          .loading-spinner {
            font-size: 38px;
            color: #0284c7;
            animation: caseSpin 1s linear infinite;
          }

          .loading-box p {
            margin-top: 12px;
            color: #64748b;
            font-size: 14px;
          }

          @keyframes caseSpin {
            from {
              transform: rotate(0deg);
            }

            to {
              transform: rotate(360deg);
            }
          }
        `}</style>

        <div className="loading-box">
          <FaSpinner className="loading-spinner" />

          <p>
            Loading case details...
          </p>
        </div>

      </div>
    );
  }

  // ============================================================
  // CASE NOT FOUND
  // ============================================================

  if (!caseData) {
    return (
      <div className="case-empty">

        <style>{`
          .case-empty {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #eef8ff;
            font-family: Arial, Helvetica, sans-serif;
          }

          .empty-box {
            background: #fff;
            padding: 35px;
            border-radius: 16px;
            text-align: center;
            box-shadow: 0 10px 35px rgba(0,0,0,.08);
          }

          .empty-box h2 {
            margin-bottom: 10px;
            color: #111827;
          }

          .empty-box p {
            color: #64748b;
            margin-bottom: 20px;
          }

          .back-btn {
            border: none;
            background: #0284c7;
            color: #fff;
            padding: 11px 20px;
            border-radius: 9px;
            cursor: pointer;
            font-weight: 700;
          }
        `}</style>

        <div className="empty-box">

          <h2>
            Case Not Found
          </h2>

          <p>
            The requested case does not exist.
          </p>

          <button
            className="back-btn"
            onClick={handleBack}
          >
            <FaArrowLeft />
            {' '}
            Back
          </button>

        </div>

      </div>
    );
  }

  // ============================================================
  // EXACT CASE FIELDS
  // ============================================================

  const caseId =
    caseData.id || id;

  const caseNumber =
    caseData.caseNumber ||
    caseData.caseId ||
    caseId;

  const title =
    caseData.title ||
    caseData.subject ||
    'Court Case';

  const caseType =
    caseData.predictedCaseType ||
    caseData.caseType ||
    'Not available';

  const priority =
    caseData.priority ||
    'Normal';

  const status =
    caseData.status ||
    'Pending';

 
  const citizenName =
    caseData.citizenName ||
    caseData.clientName ||
    caseData.applicantName ||
    caseData.userDisplayName ||
    citizenProfile?.fullName ||
    'Not available';

  const citizenEmail =
    caseData.citizenEmail ||
    caseData.clientEmail ||
    caseData.userEmail ||
    citizenProfile?.email ||
    'Not available';

  const citizenPhone =
    caseData.citizenPhone ||
    caseData.clientPhone ||
    citizenProfile?.phone ||
    'Not available';


  const lawyerName =
    caseData.lawyerName ||
    'Not assigned';

  const lawyerId =
    caseData.lawyerId ||
    'Not assigned';

  const lawyerType =
    caseData.lawyerType ||
    'Not available';

  const lawyerRequestStatus =
    caseData.status === 'Accepted'
      ? 'Accepted'
      : caseData.lawyerRequestStatus || 'Pending';
const durationDays =
  caseData?.predictedDurationDays ??
  caseData?.durationDays ??
  caseData?.predictedDuration ??
  null;

console.log('FINAL DURATION VALUE:', durationDays);

  const createdAt =
    caseData.createdAt ||
    caseData.submittedAt;

  const respondedAt =
    caseData.respondedAt;

  const court =
    caseData.court ||
    caseData.courtName;

  const district =
    caseData.district ||
    caseData.location;

  const description =
    caseData.description ||
    caseData.caseDescription ||
    caseData.details ||
    caseData.problemDescription;

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="case-detail-page">

      <style>{`

        * {
          box-sizing: border-box;
        }

        .case-detail-page {
          min-height: 100vh;
          padding: 30px;
          background:
            linear-gradient(
              135deg,
              #eef8ff,
              #e0f2fe,
              #f8fcff
            );
          font-family:
            Arial,
            Helvetica,
            sans-serif;
          color: #111827;
        }

        .case-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        /* HEADER */

        .case-header {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 25px;
        }

        .back-button {
          width: 44px;
          height: 44px;
          border: 1px solid #dbeafe;
          border-radius: 10px;
          background: #fff;
          color: #111827;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 16px;
          transition: .2s;
          box-shadow:
            0 4px 14px
            rgba(0,0,0,.06);
        }

        .back-button:hover {
          background: #0284c7;
          color: #fff;
          border-color: #0284c7;
          transform: translateX(-2px);
        }

        .header-text h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 800;
        }

        .header-text p {
          margin: 6px 0 0;
          color: #64748b;
          font-size: 14px;
        }

        /* MAIN CARD */

        .case-main-card {
          background: #fff;
          border: 1px solid #d9edf9;
          border-radius: 18px;
          overflow: hidden;
          box-shadow:
            0 10px 35px
            rgba(0,0,0,.07);
        }

        .case-main-header {
          padding: 24px 28px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          background:
            linear-gradient(
              135deg,
              #e0f2fe,
              #f8fcff
            );
          border-bottom: 1px solid #dbeafe;
        }

        .case-title-area {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .case-icon {
          width: 55px;
          height: 55px;
          border-radius: 14px;
          background: #0284c7;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          box-shadow:
            0 5px 15px
            rgba(2,132,199,.2);
        }

        .case-title-area h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 800;
        }

        .case-number {
          margin-top: 5px;
          color: #0284c7;
          font-size: 13px;
          font-weight: 700;
        }

        /* STATUS */

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 13px;
          border-radius: 30px;
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
        }

        .status-success {
          background: #dcfce7;
          color: #15803d;
        }

        .status-warning {
          background: #fef3c7;
          color: #b45309;
        }

        .status-danger {
          background: #fee2e2;
          color: #b91c1c;
        }

        .status-info {
          background: #dbeafe;
          color: #1d4ed8;
        }

        .status-default {
          background: #f1f5f9;
          color: #475569;
        }

        /* CONTENT */

        .case-content {
          padding: 28px;
        }

        .section {
          margin-bottom: 30px;
        }

        .section:last-child {
          margin-bottom: 0;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
          font-size: 16px;
          font-weight: 800;
          color: #111827;
        }

        .section-line {
          width: 4px;
          height: 19px;
          background: #0284c7;
          border-radius: 5px;
        }

        /* INFO GRID */

        .info-grid {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 15px;
        }

        .info-item {
          padding: 15px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 11px;
        }

        .info-label {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #64748b;
          font-size: 11px;
          font-weight: 700;
          margin-bottom: 7px;
          text-transform: uppercase;
        }

        .info-label svg {
          color: #0284c7;
        }

        .info-value {
          color: #111827;
          font-size: 14px;
          font-weight: 700;
          word-break: break-word;
        }

        /* LAWYER */

        .lawyer-box {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 15px;
        }

        .lawyer-card {
          padding: 18px;
          background: #f8fcff;
          border: 1px solid #dbeafe;
          border-radius: 12px;
        }

        .lawyer-card-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }

        .lawyer-card-header svg {
          color: #0284c7;
        }

        .lawyer-card-header strong {
          font-size: 14px;
        }

        .lawyer-name {
          font-size: 16px;
          font-weight: 800;
          color: #111827;
        }

        .lawyer-id {
          margin-top: 6px;
          color: #64748b;
          font-size: 12px;
          word-break: break-all;
        }

        .lawyer-status {
          margin-top: 10px;
        }

        /* DESCRIPTION */

        .description-box {
          padding: 18px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          color: #374151;
          line-height: 1.7;
          font-size: 14px;
          white-space: pre-wrap;
        }

        /* DOCUMENTS */

        .document-box {
          padding: 18px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
        }

        .document-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid #e5e7eb;
        }

        .document-row:last-child {
          border-bottom: none;
        }

        .document-icon {
          width: 38px;
          height: 38px;
          border-radius: 9px;
          background: #e0f2fe;
          color: #0284c7;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .document-name {
          font-size: 13px;
          font-weight: 700;
          color: #374151;
        }

        /* HEARING */

        .hearing-section {
          margin-top: 10px;
          padding: 20px;
          background: #f8fcff;
          border: 1px solid #bae6fd;
          border-radius: 14px;
        }

        .hearing-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 18px;
        }

        .hearing-heading {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #111827;
          font-size: 16px;
          font-weight: 800;
        }

        .hearing-heading svg {
          color: #0284c7;
        }

        .hearing-close {
          width: 34px;
          height: 34px;
          border: none;
          border-radius: 8px;
          background: #fee2e2;
          color: #b91c1c;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .hearing-close:hover {
          background: #fecaca;
        }

        .hearing-loading {
          text-align: center;
          padding: 25px;
          color: #64748b;
        }

        .hearing-loading svg {
          color: #0284c7;
          font-size: 28px;
          animation: caseSpin 1s linear infinite;
        }

        .hearing-empty {
          padding: 20px;
          text-align: center;
          background: #fff;
          border: 1px dashed #cbd5e1;
          border-radius: 10px;
          color: #64748b;
          font-size: 14px;
        }

        .hearing-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 18px;
          margin-bottom: 12px;
          box-shadow: 0 4px 14px rgba(0,0,0,.04);
        }

        .hearing-card:last-child {
          margin-bottom: 0;
        }

        .hearing-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 15px;
        }

        .hearing-number {
          font-size: 15px;
          font-weight: 800;
          color: #111827;
        }

        .hearing-grid {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .hearing-info {
          padding: 12px;
          background: #f8fafc;
          border-radius: 9px;
          border: 1px solid #e5e7eb;
        }

        .hearing-label {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #64748b;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          margin-bottom: 6px;
        }

        .hearing-label svg {
          color: #0284c7;
        }

        .hearing-value {
          font-size: 13px;
          font-weight: 700;
          color: #111827;
          word-break: break-word;
        }

        /* ACTIONS */

        .actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
        }

        .action-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 11px 18px;
          border-radius: 9px;
          border: none;
          cursor: pointer;
          font-size: 13px;
          font-weight: 700;
          transition: .2s;
        }

        .action-back {
          background: #f1f5f9;
          color: #374151;
        }

        .action-back:hover {
          background: #e2e8f0;
        }

        .action-print {
          background: #0284c7;
          color: #fff;
        }

        .action-print:hover {
          background: #0369a1;
        }

        .action-hearing {
          background: #0f766e;
          color: #fff;
        }

        .action-hearing:hover {
          background: #115e59;
        }

        /* LAWYER REQUEST */
        .lawyer-request-box {
          margin-top: 16px;
          padding: 18px;
          background: #f8fcff;
          border: 1px solid #bae6fd;
          border-radius: 12px;
        }

        .lawyer-request-title {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          font-size: 14px;
          font-weight: 800;
          color: #111827;
        }

        .lawyer-request-title svg {
          color: #0284c7;
        }

        .lawyer-request-row {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .lawyer-select {
          flex: 1;
          min-width: 0;
          padding: 11px 12px;
          border: 1px solid #cbd5e1;
          border-radius: 9px;
          background: #fff;
          color: #111827;
          font-size: 13px;
          outline: none;
        }

        .lawyer-select:focus {
          border-color: #0284c7;
          box-shadow: 0 0 0 3px rgba(2,132,199,.10);
        }

        .send-lawyer-request-btn {
          border: none;
          padding: 11px 16px;
          border-radius: 9px;
          background: #0284c7;
          color: #fff;
          cursor: pointer;
          font-size: 13px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          white-space: nowrap;
        }

        .send-lawyer-request-btn:hover {
          background: #0369a1;
        }

        .send-lawyer-request-btn:disabled {
          opacity: .6;
          cursor: not-allowed;
        }

        .lawyer-request-note {
          margin: 10px 0 0;
          color: #64748b;
          font-size: 12px;
          line-height: 1.5;
        }

        /* RESPONSIVE */

        @media(max-width:900px) {

          .info-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .lawyer-box {
            grid-template-columns: 1fr;
          }

          .hearing-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

        }

        @media(max-width:650px) {

          .case-detail-page {
            padding: 15px;
          }

          .case-main-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .case-content {
            padding: 20px;
          }

          .info-grid {
            grid-template-columns: 1fr;
          }

          .hearing-grid {
            grid-template-columns: 1fr;
          }

          .actions {
            flex-direction: column;
          }

          .action-button {
            justify-content: center;
          }

          .lawyer-request-row {
            flex-direction: column;
            align-items: stretch;
          }

          .send-lawyer-request-btn {
            width: 100%;
          }

          .header-text h1 {
            font-size: 23px;
          }

          .hearing-card-top {
            flex-direction: column;
            align-items: flex-start;
          }

        }

      `}</style>

      <div className="case-container">

        {/* HEADER */}

        <div className="case-header">

          <button
            type="button"
            className="back-button"
            onClick={handleBack}
          >
            <FaArrowLeft />
          </button>

          <div className="header-text">

            <h1>
              Case Details
            </h1>

            <p>
              View complete case information
            </p>

          </div>

        </div>

        {/* MAIN CARD */}

        <div className="case-main-card">

          {/* HEADER */}

          <div className="case-main-header">

            <div className="case-title-area">

              <div className="case-icon">
                <FaBriefcase />
              </div>

              <div>

                <h2>
                  {displayValue(title)}
                </h2>

                <div className="case-number">
                  Case ID: {displayValue(caseNumber)}
                </div>

              </div>

            </div>

            <span
              className={
                `status-badge ${
                  getStatusClass(status)
                }`
              }
            >

              {status === 'Accepted' && (
                <FaCheckCircle />
              )}

              {displayValue(status)}

            </span>

          </div>

          {/* CONTENT */}

          <div className="case-content">

            {/* CASE INFORMATION */}

            <div className="section">

              <div className="section-title">
                <span className="section-line" />
                Case Information
              </div>

              <div className="info-grid">

                <div className="info-item">

                  <div className="info-label">
                    <FaBriefcase />
                    Case Type
                  </div>

                  <div className="info-value">
                    {displayValue(caseType)}
                  </div>

                </div>

                <div className="info-item">

                  <div className="info-label">
                    <FaExclamationTriangle />
                    Priority
                  </div>

                  <div className="info-value">
                    {displayValue(priority)}
                  </div>

                </div>

                <div className="info-item">

                  <div className="info-label">
                    <FaCalendarAlt />
                    Created
                  </div>

                  <div className="info-value">
                    {formatDate(createdAt)}
                  </div>

                </div>

                <div className="info-item">

                  <div className="info-label">
                    <FaClock />
                    Duration
                  </div>

                  <div className="info-value">

                    {durationDays !== undefined &&
                    durationDays !== null &&
                    durationDays !== ''
                      ? `${Number(durationDays).toFixed(0)} days`
                      : 'Not available'}

                  </div>

                </div>

                <div className="info-item">

                  <div className="info-label">
                    <FaGavel />
                    Court
                  </div>

                  <div className="info-value">
                    {displayValue(court)}
                  </div>

                </div>

                

              </div>

            </div>

            {/* CITIZEN */}

            <div className="section">

              <div className="section-title">
                <span className="section-line" />
                Citizen / Client Information
              </div>

              <div className="info-grid">

                <div className="info-item">

                  <div className="info-label">
                    <FaUser />
                    Name
                  </div>

                  <div className="info-value">
                    {displayValue(citizenName)}
                  </div>

                </div>

                <div className="info-item">

                  <div className="info-label">
                    <FaEnvelope />
                    Email
                  </div>

                  <div className="info-value">
                    {displayValue(citizenEmail)}
                  </div>

                </div>

                <div className="info-item">

                  <div className="info-label">
                    <FaPhone />
                    Phone
                  </div>

                  <div className="info-value">
                    {displayValue(citizenPhone)}
                  </div>

                </div>

              </div>

            </div>

            {/* LAWYER */}

            <div className="section">

              <div className="section-title">
                <span className="section-line" />
                Lawyer Information
              </div>

              <div className="lawyer-box">

                <div className="lawyer-card">

                  <div className="lawyer-card-header">

                    <FaUserTie />

                    <strong>
                      Assigned Lawyer
                    </strong>

                  </div>

                  <div className="lawyer-name">
                    {displayValue(lawyerName)}
                  </div>

                  <div className="lawyer-id">
                    Lawyer ID: {displayValue(lawyerId)}
                  </div>

                  <div className="lawyer-status">

                    Request Status:{' '}

                    <span
                      className={
                        `status-badge ${
                          getStatusClass(
                            lawyerRequestStatus
                          )
                        }`
                      }
                    >

                      {lawyerRequestStatus === 'Accepted' && (
                        <FaCheckCircle />
                      )}

                      {displayValue(
                        lawyerRequestStatus
                      )}

                    </span>

                  </div>

                </div>

                <div className="lawyer-card">

                  <div className="lawyer-card-header">

                    <FaGavel />

                    <strong>
                      Lawyer Specialization
                    </strong>

                  </div>

                  <div className="lawyer-name">
                    {displayValue(lawyerType)}
                  </div>

                  {respondedAt && (
                    <div className="lawyer-id">
                      Responded: {formatDate(respondedAt)}
                    </div>
                  )}

                </div>

              </div>

            </div>

            <div className="lawyer-request-box">
              <div className="lawyer-request-title">
                <FaUserTie />
                Send / Re-send Lawyer Request
              </div>

              <div className="lawyer-request-row">
                <select
                  className="lawyer-select"
                  value={selectedLawyerId}
                  onChange={(e) =>
                    setSelectedLawyerId(e.target.value)
                  }
                  disabled={
                    lawyersLoading ||
                    sendingLawyerRequest
                  }
                >
                  <option value="">
                    {lawyersLoading
                      ? 'Loading lawyers...'
                      : 'Select a lawyer'}
                  </option>

                  {lawyers.map((lawyer) => (
                    <option
                      key={lawyer.id}
                      value={lawyer.id}
                    >
                      {lawyer.fullName ||
                        lawyer.name ||
                        lawyer.displayName ||
                        'Lawyer'}
                      {(lawyer.specialization ||
                        lawyer.lawyerType)
                        ? ` - ${
                            lawyer.specialization ||
                            lawyer.lawyerType
                          }`
                        : ''}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  className="send-lawyer-request-btn"
                  onClick={handleSendLawyerRequest}
                  disabled={
                    sendingLawyerRequest ||
                    !selectedLawyerId
                  }
                >
                  {sendingLawyerRequest ? (
                    <FaSpinner />
                  ) : (
                    <FaUserTie />
                  )}
                  {sendingLawyerRequest
                    ? 'Sending...'
                    : 'Send Request'}
                </button>
              </div>

              <p className="lawyer-request-note">
                The selected lawyer will receive the request in
                the Lawyer Dashboard and can accept or reject it.
              </p>
            </div>

            {/* DESCRIPTION */}

            <div className="section">

              <div className="section-title">
                <span className="section-line" />
                Case Description
              </div>

              <div className="description-box">

                {displayValue(description)}

              </div>

            </div>

            {/* DOCUMENTS */}

            <div className="section">

              <div className="section-title">
                <span className="section-line" />
                Case Documents
              </div>

              <div className="document-box">

                {caseData.documents &&
                typeof caseData.documents === 'object' &&
                Object.keys(caseData.documents).length > 0 ? (

                  Object.entries(
                    caseData.documents
                  ).map(([key, document]) => (

                    <div
                      className="document-row"
                      key={key}
                    >

                      <div className="document-icon">
                        <FaFileAlt />
                      </div>

                      <div>

                        <div className="document-name">

                          {document?.name ||
                            document?.fileName ||
                            key}

                        </div>

                        {document?.url && (

                          <a
                            href={document.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: '#0284c7',
                              fontSize: '12px'
                            }}
                          >
                            Open Document
                          </a>

                        )}

                      </div>

                    </div>

                  ))

                ) : (

                  <div
                    style={{
                      color: '#64748b',
                      fontSize: '13px'
                    }}
                  >
                    No documents attached to this case.
                  </div>

                )}

              </div>

            </div>

            {/* =====================================================
                HEARING SCHEDULE
            ====================================================== */}

            {showHearings && (

              <div className="section">

                <div className="hearing-section">

                  <div className="hearing-header">

                    <div className="hearing-heading">

                      <FaCalendarCheck />

                      Hearing Schedule

                    </div>

                    <button
                      type="button"
                      className="hearing-close"
                      onClick={closeHearings}
                      title="Close"
                    >
                      <FaTimes />
                    </button>

                  </div>

                  {hearingLoading ? (

                    <div className="hearing-loading">

                      <FaSpinner />

                      <div style={{ marginTop: '8px' }}>
                        Loading hearing schedule...
                      </div>

                    </div>

                  ) : hearings.length === 0 ? (

                    <div className="hearing-empty">

                      <FaCalendarAlt
                        style={{
                          fontSize: '25px',
                          color: '#94a3b8',
                          marginBottom: '8px'
                        }}
                      />

                      <div>
                        No hearing has been scheduled
                        for this case yet.
                      </div>

                    </div>

                  ) : (

                    hearings.map((hearing, index) => {

                      const hearingDate =
                        hearing.date ||
                        hearing.hearingDate ||
                        hearing.scheduleDate;

                      const hearingTime =
                        hearing.time ||
                        hearing.hearingTime ||
                        hearing.scheduleTime;

                      const hearingJudge =
                        hearing.judgeName ||
                        hearing.judge ||
                        hearing.judge_name;

                      const hearingCourt =
                        hearing.court ||
                        hearing.courtName;

                      const hearingPurpose =
                        hearing.purpose ||
                        hearing.reason ||
                        hearing.description ||
                        hearing.hearingPurpose;

                      const hearingType =
                        hearing.type ||
                        hearing.hearingType;

                      const hearingStatus =
                        hearing.status ||
                        'Scheduled';

                      return (

                        <div
                          className="hearing-card"
                          key={hearing.hearingId}
                        >

                          <div className="hearing-card-top">

                            <div className="hearing-number">

                              Hearing {index + 1}

                            </div>

                            <span
                              className={
                                `status-badge ${
                                  getStatusClass(
                                    hearingStatus
                                  )
                                }`
                              }
                            >

                              {displayValue(
                                hearingStatus
                              )}

                            </span>

                          </div>

                          <div className="hearing-grid">

                            <div className="hearing-info">

                              <div className="hearing-label">

                                <FaCalendarAlt />

                                Date

                              </div>

                              <div className="hearing-value">

                                {formatDate(
                                  hearingDate
                                )}

                              </div>

                            </div>

                            <div className="hearing-info">

                              <div className="hearing-label">

                                <FaClock />

                                Time

                              </div>

                              <div className="hearing-value">

                                {displayValue(
                                  hearingTime
                                )}

                              </div>

                            </div>

                            <div className="hearing-info">

                              <div className="hearing-label">

                                <FaGavel />

                                Judge

                              </div>

                              <div className="hearing-value">

                                {displayValue(
                                  hearingJudge
                                )}

                              </div>

                            </div>

                            <div className="hearing-info">

                              <div className="hearing-label">

                                <FaGavel />

                                Court

                              </div>

                              <div className="hearing-value">

                                {displayValue(
                                  hearingCourt ||
                                  court
                                )}

                              </div>

                            </div>

                            <div className="hearing-info">

                              <div className="hearing-label">

                                <FaBriefcase />

                                Hearing Type

                              </div>

                              <div className="hearing-value">

                                {displayValue(
                                  hearingType
                                )}

                              </div>

                            </div>

                            <div className="hearing-info">

                              <div className="hearing-label">

                                <FaFileAlt />

                                Purpose

                              </div>

                              <div className="hearing-value">

                                {displayValue(
                                  hearingPurpose
                                )}

                              </div>

                            </div>

                          </div>

                        </div>

                      );

                    })

                  )}

                </div>

              </div>

            )}

            {/* ACTIONS */}

            <div className="actions">

              <button
                type="button"
                className="action-button action-back"
                onClick={handleBack}
              >
                <FaArrowLeft />
                Back
              </button>

              {/* VIEW HEARING SCHEDULE */}

              <button
                type="button"
                className="action-button action-hearing"
                onClick={loadHearings}
              >
                <FaCalendarCheck />
                View Hearing Schedule
              </button>

              {/* PRINT */}

              <button
                type="button"
                className="action-button action-print"
                onClick={() => window.print()}
              >
                <FaFileAlt />
                Print Case
              </button>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
};

export default CaseDetail;