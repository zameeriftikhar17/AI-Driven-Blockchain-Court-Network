import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

import {
  FaFileAlt,
  FaClock,
  FaCheckCircle,
  FaUsers,
  FaPlus,
  FaBell,
  FaDatabase,
  FaArrowLeft,
  FaEye,
  FaTimes,
  FaCheck,
  FaRobot
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

import { onAuthStateChanged } from 'firebase/auth';

import { auth, db } from '../../../firebase';
import GlassCard from '../../common/GlassCard';

const ClerkDashboard = () => {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);

  const [stats, setStats] = useState({
    registered: 0,
    pending: 0,
    assigned: 0,
    verified: 0
  });

  const [recentCases, setRecentCases] = useState([]);
  const [pendingCases, setPendingCases] = useState([]);
  const [allCases, setAllCases] = useState([]);
  const [selectedStat, setSelectedStat] = useState(null);
  const [notifications, setNotifications] = useState([]);

  const [loading, setLoading] = useState(true);
  const [processingCase, setProcessingCase] = useState(null);
  const [error, setError] = useState(null);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // ============================================================
  // AUTHENTICATION
  // ============================================================

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log('AUTH USER:', currentUser);

      if (currentUser) {
        setUser(currentUser);
      } else {
        setUser(null);
        navigate('/login');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // ============================================================
  // HELPER: NORMALIZE STATUS
  // ============================================================

  const normalizeStatus = (status) => {
    return String(status || '')
      .trim()
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ');
  };

  // ============================================================
  // CHECK CLERK APPROVAL
  // ============================================================

  const isClerkApproved = (caseItem) => {
    const status = normalizeStatus(caseItem.status);

    const approvalStatus = normalizeStatus(
      caseItem.clerkApprovalStatus
    );

    return (
      caseItem.clerkApproved === true ||
      String(caseItem.clerkApproved).toLowerCase() === 'true' ||
      caseItem.clerkApproved === 1 ||
      String(caseItem.clerkApproved) === '1' ||
      approvalStatus === 'approved' ||
      status === 'clerk approved' ||
      status === 'clerk approved case' ||
      status === 'approved by clerk'
    );
  };

  // ============================================================
  // CHECK CLERK REJECTION
  // ============================================================

  const isClerkRejected = (caseItem) => {
    const status = normalizeStatus(caseItem.status);

    const approvalStatus = normalizeStatus(
      caseItem.clerkApprovalStatus
    );

    return (
      caseItem.clerkRejected === true ||
      String(caseItem.clerkRejected).toLowerCase() === 'true' ||
      approvalStatus === 'rejected' ||
      status.includes('rejected by clerk')
    );
  };

  // ============================================================
  // CHECK PENDING CLERK CASE
  // ============================================================

  const isPendingClerkApproval = (caseItem) => {
    if (!caseItem) {
      return false;
    }

    if (isClerkApproved(caseItem)) {
      return false;
    }

    if (isClerkRejected(caseItem)) {
      return false;
    }

    const status = normalizeStatus(caseItem.status);

    const approvalStatus = normalizeStatus(
      caseItem.clerkApprovalStatus
    );

    return (
      status === 'pending clerk approval' ||
      status === 'pending clerk review' ||
      status === 'pending review' ||
      status === 'pending' ||
      status === 'submitted' ||
      status === 'case submitted' ||
      approvalStatus === 'pending' ||
      approvalStatus === 'pending clerk approval' ||
      approvalStatus === 'pending review'
    );
  };

  // ============================================================
  // LOAD CASES + NOTIFICATIONS
  // ============================================================

  useEffect(() => {
    if (!user) {
      return;
    }

    setLoading(true);
    setError(null);

    const casesRef = ref(db, 'cases');

    const handleCases = (snapshot) => {
      try {
        const data = snapshot.val();

        console.log('=================================');
        console.log('FIREBASE CASES DATA:');
        console.log(data);
        console.log('=================================');

        if (!data) {
          setStats({
            registered: 0,
            pending: 0,
            assigned: 0,
            verified: 0
          });

          setRecentCases([]);
          setPendingCases([]);
          setAllCases([]);
          setLoading(false);
          return;
        }

        const casesArray = Object.entries(data).map(
          ([key, value]) => ({
            id: key,
            ...(value || {})
          })
        );

        // ======================================================
        // SORT CASES
        // ======================================================

        const getTime = (value) => {
          if (!value) {
            return 0;
          }

          if (
            typeof value === 'object' &&
            value.seconds
          ) {
            return value.seconds * 1000;
          }

          if (typeof value === 'number') {
            return value;
          }

          const parsed = new Date(value).getTime();

          return Number.isNaN(parsed) ? 0 : parsed;
        };

        casesArray.sort(
          (a, b) =>
            getTime(b.createdAt) -
            getTime(a.createdAt)
        );

        // Keep all Firebase cases available for clickable stat cards.
        setAllCases(casesArray);

        // ======================================================
        // REGISTERED
        // ======================================================

        const registered = casesArray.length;

        // ======================================================
        // PENDING CLERK APPROVAL
        // ======================================================

        const finalPendingCases =
          casesArray.filter(
            isPendingClerkApproval
          );

        // ======================================================
        // ASSIGNED CASES
        // ======================================================

        const assigned =
          casesArray.filter((caseItem) => {
            const status = normalizeStatus(
              caseItem.status
            );

            return (
              !!caseItem.assignedJudge ||
              !!caseItem.assignedJudgeId ||
              !!caseItem.judge ||
              !!caseItem.judgeId ||
              status === 'assigned' ||
              status === 'with judge' ||
              status === 'with judge' ||
              status === 'judge assigned'
            );
          }).length;

        // ======================================================
        // VERIFIED DOCUMENTS
        // ======================================================

        const verified =
          casesArray.filter((caseItem) => {
            return (
              caseItem.documentsVerified === true ||
              String(
                caseItem.documentsVerified
              ).toLowerCase() === 'true' ||
              caseItem.documentsVerified === 1 ||
              String(
                caseItem.documentsVerified
              ) === '1'
            );
          }).length;

        setStats({
          registered,
          pending: finalPendingCases.length,
          assigned,
          verified
        });

        setRecentCases(
          casesArray.slice(0, 5)
        );

        setPendingCases(
          finalPendingCases
        );

        setLoading(false);
        setError(null);
      } catch (err) {
        console.error(
          'CASE PROCESSING ERROR:',
          err
        );

        setError(
          'Failed to process case data.'
        );

        setLoading(false);
      }
    };

    const handleCasesError = (firebaseError) => {
      console.error(
        'FIREBASE CASE ERROR:',
        firebaseError
      );

      setError(
        `Failed to load cases: ${
          firebaseError.message
        }`
      );

      setStats({
        registered: 0,
        pending: 0,
        assigned: 0,
        verified: 0
      });

      setRecentCases([]);
      setPendingCases([]);
      setAllCases([]);
      setLoading(false);
    };

    onValue(
      casesRef,
      handleCases,
      handleCasesError
    );

    // ============================================================
    // NOTIFICATIONS
    // ============================================================

    const notificationsRef = ref(
      db,
      `notifications/${user.uid}`
    );

    const handleNotifications = (snapshot) => {
      const data = snapshot.val();

      if (!data) {
        setNotifications([]);
        return;
      }

      const getNotificationTime = (value) => {
        if (!value) {
          return 0;
        }

        if (
          typeof value === 'object' &&
          value.seconds
        ) {
          return value.seconds * 1000;
        }

        if (typeof value === 'number') {
          return value;
        }

        const parsed = new Date(value).getTime();

        return Number.isNaN(parsed)
          ? 0
          : parsed;
      };

      const notificationArray =
        Object.entries(data)
          .map(([key, value]) => ({
            id: key,
            ...(value || {})
          }))
          .sort(
            (a, b) =>
              getNotificationTime(b.timestamp) -
              getNotificationTime(a.timestamp)
          );

      setNotifications(
        notificationArray.slice(0, 5)
      );
    };

    const handleNotificationsError = (
      firebaseError
    ) => {
      console.error(
        'NOTIFICATION ERROR:',
        firebaseError
      );

      setNotifications([]);
    };

    onValue(
      notificationsRef,
      handleNotifications,
      handleNotificationsError
    );

    return () => {
      off(casesRef);
      off(notificationsRef);
    };
  }, [user]);

  // ============================================================
  // UNREAD NOTIFICATIONS
  // ============================================================

  const unreadCount =
    notifications.filter(
      (notification) =>
        !notification.read
    ).length;

  // ============================================================
  // CREATE NOTIFICATION
  // ============================================================

  const createNotification = async ({
    userId,
    message,
    caseId,
    type,
    extraData = {}
  }) => {
    if (!userId) {
      console.warn(
        'Notification skipped: userId missing'
      );
      return;
    }

    const notificationsRef =
      ref(
        db,
        `notifications/${userId}`
      );

    const notificationKey =
      push(
        notificationsRef
      ).key;

    if (!notificationKey) {
      throw new Error(
        'Could not create notification.'
      );
    }

    await set(
      ref(
        db,
        `notifications/${userId}/${notificationKey}`
      ),
      {
        message,
        caseId: caseId || '',
        type: type || 'general',
        read: false,
        timestamp: serverTimestamp(),
        ...extraData
      }
    );
  };

  // ============================================================
  // BLOCKCHAIN API HELPER
  // ============================================================

  const callBlockchain = async (path, payload) => {
    const response = await fetch(
      `http://localhost:8000${path}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    );

    const responseText = await response.text();

    let result;

    try {
      result = JSON.parse(responseText);
    } catch {
      result = { detail: responseText };
    }

    if (!response.ok) {
      throw new Error(
        result.detail ||
        result.error ||
        `Blockchain request failed (${response.status})`
      );
    }

    return result;
  };

  // ============================================================
  // APPROVE CASE
  // ============================================================

  const handleApproveCase = async (caseItem) => {
    if (!caseItem || !caseItem.id) {
      alert('Invalid case.');
      return;
    }

    if (processingCase) {
      return;
    }

    if (isClerkApproved(caseItem)) {
      alert(
        'This case has already been approved by the clerk.'
      );
      return;
    }

    const caseNumber =
      caseItem.caseNumber ||
      caseItem.caseId ||
      caseItem.id;

    const citizenId =
      caseItem.userId ||
      caseItem.citizenId ||
      caseItem.createdBy;

    const confirmed = window.confirm(
      `Approve Case ${caseNumber}?\n\nAfter approval, the citizen will be allowed to select a lawyer and send a lawyer request.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setProcessingCase(caseItem.id);
      setError(null);

      const approvalTime =
        new Date().toISOString();

      // ========================================================
      // VERIFY CASE ON HYPERLEDGER FABRIC FIRST
      // ========================================================

      console.log(
        'Verifying case on blockchain:',
        caseItem.id
      );

      await callBlockchain(
        '/blockchain/verify-case',
        {
          caseId: caseItem.id
        }
      );

      console.log(
        'Blockchain case verification successful.'
      );

      // ========================================================
      // MAIN CASE UPDATE
      // ========================================================

      const caseUpdate = {
        status: 'Clerk Approved',

        clerkApprovalStatus: 'Approved',
        clerkApproved: true,

        clerkApprovedBy:
          user.uid,

        clerkApprovedByName:
          user.displayName ||
          user.email ||
          'Clerk',

        clerkApprovedAt:
          approvalTime,

        lawyerSelectionAllowed: true,
        lawyerRequestAllowed: true,

        lawyerRequestStatus: 'Not Requested',

        lawyerRequestSent: false,

        lawyerAssigned: false,

        lawyerAssignedId: '',
        lawyerAssignedName: '',
        lawyerAssignedEmail: '',

        updatedAt: approvalTime
      };

      console.log(
        'APPROVING CASE:',
        caseItem.id,
        caseUpdate
      );

      await update(
        ref(
          db,
          `cases/${caseItem.id}`
        ),
        caseUpdate
      );

      // ========================================================
      // RECORD CLERK APPROVAL ON BLOCKCHAIN
      // ========================================================

      try {
        await callBlockchain(
          '/blockchain/record-case-event',
          {
            caseId: caseItem.id,
            eventType: 'CASE_APPROVED_BY_CLERK',
            details: 'Case successfully approved by Clerk.',
            actorId: user.uid
          }
        );

        console.log(
          'Clerk approval event recorded on blockchain.'
        );

      } catch (historyError) {
        console.error(
          'Blockchain approval history error:',
          historyError
        );
      }

      // ========================================================
      // REMOVE CASE FROM LOCAL PENDING LIST
      // ========================================================

      setPendingCases((previousCases) =>
        previousCases.filter(
          (item) =>
            item.id !== caseItem.id
        )
      );

      setStats((previousStats) => ({
        ...previousStats,
        pending:
          Math.max(
            0,
            previousStats.pending - 1
          )
      }));

      // ========================================================
      // CITIZEN NOTIFICATION
      // ========================================================

      if (citizenId) {
        await createNotification({
          userId: citizenId,

          caseId: caseItem.id,

          type:
            'case_clerk_approved',

          message:
            `Your case ${caseNumber} has been approved by the clerk. You can now select a lawyer and send a lawyer request.`,

          extraData: {
            action:
              'select_lawyer',

            lawyerSelectionAllowed:
              true,

            lawyerRequestAllowed:
              true,

            caseStatus:
              'Clerk Approved'
          }
        });
      } else {
        console.warn(
          'Citizen ID missing. Case approved but citizen notification could not be sent.'
        );
      }

      // ========================================================
      // CLERK NOTIFICATION
      // ========================================================

      await createNotification({
        userId: user.uid,

        caseId: caseItem.id,

        type:
          'clerk_case_approved',

        message:
          `Case ${caseNumber} was successfully approved.`,

        extraData: {
          action:
            'case_approved',

          caseStatus:
            'Clerk Approved'
        }
      });

      alert(
        'Case approved successfully.\n\nThe case is no longer pending.\n\nThe citizen can now select a lawyer and send a lawyer request.'
      );

    } catch (err) {
      console.error(
        'APPROVE CASE ERROR:',
        err
      );

      setError(
        err.message ||
          'Failed to approve case.'
      );

      alert(
        err.message ||
          'Failed to approve case.'
      );

    } finally {
      setProcessingCase(null);
    }
  };

  // ============================================================
  // OPEN REJECT MODAL
  // ============================================================

  const openRejectModal = (caseItem) => {
    setSelectedCase(caseItem);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  // ============================================================
  // CLOSE REJECT MODAL
  // ============================================================

  const closeRejectModal = () => {
    if (processingCase) {
      return;
    }

    setShowRejectModal(false);
    setSelectedCase(null);
    setRejectionReason('');
  };

  // ============================================================
  // REJECT CASE
  // ============================================================

  const handleRejectCase = async () => {
    if (!selectedCase) {
      return;
    }

    const reason =
      rejectionReason.trim();

    if (!reason) {
      alert(
        'Please enter the missing information/rejection reason.'
      );
      return;
    }

    if (processingCase) {
      return;
    }

    try {
      setProcessingCase(
        selectedCase.id
      );

      setError(null);

      const rejectionTime =
        new Date().toISOString();

      // ========================================================
      // RECORD REJECTION EVENT ON BLOCKCHAIN FIRST
      // ========================================================

      console.log(
        'Recording case rejection on blockchain:',
        selectedCase.id
      );

      await callBlockchain(
        '/blockchain/record-case-event',
        {
          caseId: selectedCase.id,
          eventType: 'CASE_REJECTED_BY_CLERK',
          details: `Case rejected by Clerk. Reason: ${reason}`,
          actorId: user.uid
        }
      );

      console.log(
        'Blockchain rejection event recorded successfully.'
      );

      const caseUpdate = {
        status:
          'Rejected by Clerk',

        clerkApprovalStatus:
          'Rejected',

        clerkApproved:
          false,

        clerkRejected:
          true,

        clerkRejectedBy:
          user.uid,

        clerkRejectedByName:
          user.displayName ||
          user.email ||
          'Clerk',

        clerkRejectionReason:
          reason,

        clerkRejectedAt:
          rejectionTime,

        lawyerSelectionAllowed:
          false,

        lawyerRequestAllowed:
          false,

        lawyerRequestStatus:
          'Not Allowed',

        lawyerRequestSent:
          false,

        updatedAt:
          rejectionTime
      };

      await update(
        ref(
          db,
          `cases/${selectedCase.id}`
        ),
        caseUpdate
      );

      // ========================================================
      // REMOVE FROM PENDING LIST
      // ========================================================

      setPendingCases((previousCases) =>
        previousCases.filter(
          (item) =>
            item.id !== selectedCase.id
        )
      );

      setStats((previousStats) => ({
        ...previousStats,
        pending:
          Math.max(
            0,
            previousStats.pending - 1
          )
      }));

      const citizenId =
        selectedCase.userId ||
        selectedCase.citizenId ||
        selectedCase.createdBy;

      const caseNumber =
        selectedCase.caseNumber ||
        selectedCase.caseId ||
        selectedCase.id;

      // ========================================================
      // CITIZEN NOTIFICATION
      // ========================================================

      if (citizenId) {
        await createNotification({
          userId: citizenId,

          caseId:
            selectedCase.id,

          type:
            'case_clerk_rejected',

          message:
            `Your case ${caseNumber} was rejected by the clerk. Missing information: ${reason}`,

          extraData: {
            action:
              'update_case',

            rejectionReason:
              reason,

            canResubmit:
              true,

            caseStatus:
              'Rejected by Clerk'
          }
        });
      }

      // ========================================================
      // CLERK NOTIFICATION
      // ========================================================

      await createNotification({
        userId: user.uid,

        caseId:
          selectedCase.id,

        type:
          'clerk_case_rejected',

        message:
          `Case ${caseNumber} was rejected and the citizen was notified.`,

        extraData: {
          action:
            'case_rejected',

          reason
        }
      });

      setShowRejectModal(false);
      setSelectedCase(null);
      setRejectionReason('');

      alert(
        'Case rejected successfully.\n\nCitizen has been notified about the missing information.'
      );

    } catch (err) {
      console.error(
        'REJECT CASE ERROR:',
        err
      );

      setError(
        err.message ||
          'Failed to reject case.'
      );

      alert(
        err.message ||
          'Failed to reject case.'
      );

    } finally {
      setProcessingCase(null);
    }
  };

  // ============================================================
  // CASES SHOWN WHEN A STAT CARD IS CLICKED
  // ============================================================

  const getSelectedStatCases = () => {
    if (selectedStat === 'Registered Cases') {
      return allCases;
    }

    if (selectedStat === 'Pending Review') {
      return allCases.filter(isPendingClerkApproval);
    }

    if (selectedStat === 'Assigned to Judges') {
      return allCases.filter((caseItem) => {
        const status = normalizeStatus(caseItem.status);

        return (
          !!caseItem.assignedJudge ||
          !!caseItem.assignedJudgeId ||
          !!caseItem.judge ||
          !!caseItem.judgeId ||
          status === 'assigned' ||
          status === 'with judge' ||
          status === 'judge assigned'
        );
      });
    }

    if (selectedStat === 'Verified Documents') {
      return allCases.filter((caseItem) => (
        caseItem.documentsVerified === true ||
        String(caseItem.documentsVerified).toLowerCase() === 'true' ||
        caseItem.documentsVerified === 1 ||
        String(caseItem.documentsVerified) === '1'
      ));
    }

    return [];
  };

  // ============================================================
  // STAT CARDS
  // ============================================================

  const statCards = [
    {
      icon: <FaFileAlt />,
      label: 'Registered Cases',
      value: stats.registered,
      color: '#4A6CF7'
    },
    {
      icon: <FaClock />,
      label: 'Pending Review',
      value: stats.pending,
      color: '#FF9A56'
    },
    {
      icon: <FaUsers />,
      label: 'Assigned to Judges',
      value: stats.assigned,
      color: '#00E676'
    },
    {
      icon: <FaCheckCircle />,
      label: 'Verified Documents',
      value: stats.verified,
      color: '#7C4DFF'
    }
  ];

  // ============================================================
  // STATUS STYLE
  // ============================================================

  const getStatusStyle = (status) => {
    const normalized =
      normalizeStatus(status);

    if (
      normalized.includes('approved')
    ) {
      return {
        background: '#DCFCE7',
        color: '#166534'
      };
    }

    if (
      normalized.includes('reject')
    ) {
      return {
        background: '#FEE2E2',
        color: '#991B1B'
      };
    }

    if (
      normalized.includes('lawyer')
    ) {
      return {
        background: '#DBEAFE',
        color: '#1D4ED8'
      };
    }

    if (
      normalized.includes('judge')
    ) {
      return {
        background: '#EDE9FE',
        color: '#6D28D9'
      };
    }

    return {
      background: '#FEF3C7',
      color: '#92400E'
    };
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (!user || loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'linear-gradient(135deg, #E3F2FD, #BBDEFB)'
        }}
      >
        <h2>
          Loading Clerk Dashboard...
        </h2>
      </div>
    );
  }

  // ============================================================
  // DASHBOARD
  // ============================================================

  return (
    <div className="dashboard-page">

      <style>{`

        .dashboard-page {
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

        .dashboard-container {
          max-width: 1200px;
          width: 100%;
          margin: auto;
        }

        .back-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 1.2rem;
          background: rgba(255,255,255,0.8);
          border: none;
          border-radius: 50px;
          color: #1A1A1A;
          cursor: pointer;
          margin-bottom: 1.5rem;
          font-weight: 600;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .dashboard-title h1 {
          font-size: 2.2rem;
          font-weight: 800;
          color: #1A1A1A;
          margin-bottom: 0.2rem;
        }

        .dashboard-title p {
          color: #6B7280;
          margin: 0;
        }

        .dashboard-actions {
          display: flex;
          gap: 0.8rem;
          align-items: center;
        }

        .notif-btn {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          background: white;
          border-radius: 50%;
          color: #1A1A1A;
          text-decoration: none;
        }

        .notif-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          background: #FF6B6B;
          color: white;
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0.2rem 0.5rem;
          border-radius: 50px;
          min-width: 18px;
          text-align: center;
        }

        .btn-primary-dash {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.7rem 1.5rem;
          background: linear-gradient(
            135deg,
            #4FC3F7,
            #0288D1
          );
          color: white;
          border-radius: 50px;
          font-weight: 600;
          text-decoration: none;
        }

        .stats-grid {
          display: grid;
          grid-template-columns:
            repeat(4, 1fr);
          gap: 1.2rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.2rem 1.5rem;
          background:
            rgba(255,255,255,0.9)
            !important;
          border-radius: 16px;
        }

        .stat-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          border-radius: 12px;
          font-size: 1.3rem;
        }

        .stat-info {
          display: flex;
          flex-direction: column;
        }

        .stat-value {
          font-size: 1.8rem;
          font-weight: 800;
          color: #1A1A1A;
          line-height: 1.2;
        }

        .stat-label {
          font-size: 0.85rem;
          color: #6B7280;
        }

        .section-card {
          padding: 1.5rem;
          background:
            rgba(255,255,255,0.9)
            !important;
          border-radius: 16px;
          margin-bottom: 1.5rem;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.2rem;
          flex-wrap: wrap;
        }

        .section-header h3 {
          margin: 0;
          color: #1A1A1A;
        }

        .pending-badge {
          background: #FFF3E0;
          color: #E65100;
          padding: 0.35rem 0.8rem;
          border-radius: 50px;
          font-weight: 700;
          font-size: 0.8rem;
        }

        .pending-case-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .pending-case {
          border: 1px solid #DDEAF3;
          border-radius: 14px;
          padding: 1.2rem;
          background: #F9FCFF;
        }

        .pending-case-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 0.8rem;
        }

        .case-main-info {
          flex: 1;
        }

        .case-id {
          font-size: 0.8rem;
          font-weight: 800;
          color: #0288D1;
          word-break: break-all;
        }

        .case-citizen {
          font-size: 1.05rem;
          font-weight: 700;
          color: #1A1A1A;
          margin-top: 0.2rem;
        }

        .case-type {
          color: #0288D1;
          font-size: 0.85rem;
          margin-top: 0.2rem;
        }

        .case-status {
          padding: 0.35rem 0.7rem;
          border-radius: 50px;
          font-size: 0.75rem;
          font-weight: 700;
          white-space: nowrap;
        }

        .case-description {
          color: #4B5563;
          line-height: 1.5;
          background: white;
          border-radius: 10px;
          padding: 0.8rem;
          margin-bottom: 0.8rem;
        }

        .case-meta {
          display: grid;
          grid-template-columns:
            repeat(4, 1fr);
          gap: 0.6rem;
          margin-bottom: 1rem;
        }

        .meta-box {
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          padding: 0.6rem;
        }

        .meta-label {
          display: block;
          color: #6B7280;
          font-size: 0.7rem;
          margin-bottom: 0.2rem;
        }

        .meta-value {
          font-weight: 700;
          color: #1F2937;
          font-size: 0.85rem;
        }

        .case-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.7rem;
          flex-wrap: wrap;
        }

        .approve-btn,
        .reject-btn,
        .view-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          border: none;
          border-radius: 9px;
          padding: 0.65rem 1rem;
          cursor: pointer;
          font-weight: 700;
        }

        .approve-btn {
          background: #16A34A;
          color: white;
        }

        .reject-btn {
          background: #DC2626;
          color: white;
        }

        .view-btn {
          background: #E3F2FD;
          color: #0277BD;
        }

        .approve-btn:disabled,
        .reject-btn:disabled,
        .view-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns:
            1fr 1fr;
          gap: 1.5rem;
        }

        .chart-card,
        .recent-card,
        .notifications-card {
          padding: 1.5rem;
          background:
            rgba(255,255,255,0.9)
            !important;
          border-radius: 16px;
        }

        .recent-registrations {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }

        .registration-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 0.8rem;
          background: rgba(0,0,0,0.02);
          border-radius: 8px;
        }

        .reg-id {
          font-weight: 600;
          color: #0288D1;
          font-size: 0.85rem;
        }

        .reg-title {
          color: #1A1A1A;
          font-size: 0.9rem;
          flex: 1;
        }

        .reg-status {
          padding: 0.15rem 0.6rem;
          border-radius: 50px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .quick-actions {
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.8rem 1.2rem;
          background: rgba(255,255,255,0.7);
          border-radius: 12px;
          color: #1A1A1A;
          text-decoration: none;
        }

        .notifications-card {
          margin-top: 1.5rem;
        }

        .notif-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .notif-list {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }

        .notif-item {
          display: flex;
          gap: 0.8rem;
          padding: 0.6rem 0.8rem;
          background: rgba(0,0,0,0.02);
          border-radius: 8px;
        }

        .notif-dot {
          width: 8px;
          height: 8px;
          min-width: 8px;
          border-radius: 50%;
          background: #0288D1;
          margin-top: 0.45rem;
        }

        .ai-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          background: #EDE9FE;
          color: #6D28D9;
          padding: 0.25rem 0.55rem;
          border-radius: 50px;
          font-size: 0.7rem;
          font-weight: 700;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          z-index: 9999;
        }

        .reject-modal {
          width: 100%;
          max-width: 520px;
          background: white;
          border-radius: 18px;
          padding: 1.5rem;
          box-shadow:
            0 20px 60px rgba(0,0,0,0.25);
        }

        .stat-details-modal {
          width: 100%;
          max-width: 850px;
          max-height: 85vh;
          overflow-y: auto;
          background: white;
          border-radius: 18px;
          padding: 1.5rem;
          box-shadow: 0 20px 60px rgba(0,0,0,0.25);
        }

        .stat-details-modal .modal-header h3 {
          color: #1A1A1A;
        }

        .stat-case-row {
          display: grid;
          grid-template-columns: 1.3fr 1fr 1fr auto;
          gap: 0.8rem;
          align-items: center;
          padding: 0.9rem;
          margin-bottom: 0.65rem;
          border: 1px solid #E5E7EB;
          border-radius: 10px;
          background: #F9FCFF;
        }

        .stat-case-id {
          color: #0288D1;
          font-weight: 700;
          font-size: 0.82rem;
          word-break: break-all;
        }

        .stat-case-field {
          color: #374151;
          font-size: 0.85rem;
          overflow-wrap: anywhere;
        }

        .stat-case-status {
          display: inline-block;
          padding: 0.3rem 0.55rem;
          border-radius: 20px;
          font-size: 0.72rem;
          font-weight: 700;
          white-space: nowrap;
        }

        @media (max-width: 650px) {
          .stat-case-row {
            grid-template-columns: 1fr;
          }
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .modal-header h3 {
          margin: 0;
          color: #991B1B;
        }

        .close-modal {
          border: none;
          background: #F3F4F6;
          width: 35px;
          height: 35px;
          border-radius: 50%;
          cursor: pointer;
        }

        .modal-label {
          display: block;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .modal-textarea {
          width: 100%;
          box-sizing: border-box;
          min-height: 130px;
          resize: vertical;
          padding: 0.9rem;
          border: 2px solid #E5E7EB;
          border-radius: 10px;
          font-family: inherit;
          font-size: 0.95rem;
        }

        .modal-textarea:focus {
          outline: none;
          border-color: #EF4444;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.7rem;
          margin-top: 1rem;
        }

        .modal-cancel {
          border: none;
          background: #E5E7EB;
          color: #1F2937;
          padding: 0.7rem 1.1rem;
          border-radius: 9px;
          font-weight: 700;
          cursor: pointer;
        }

        .modal-reject {
          border: none;
          background: #DC2626;
          color: white;
          padding: 0.7rem 1.1rem;
          border-radius: 9px;
          font-weight: 700;
          cursor: pointer;
        }

        @media (max-width: 992px) {
          .stats-grid {
            grid-template-columns:
              repeat(2, 1fr);
          }

          .dashboard-grid {
            grid-template-columns: 1fr;
          }

          .case-meta {
            grid-template-columns:
              repeat(2, 1fr);
          }
        }

        @media (max-width: 600px) {
          .dashboard-page {
            padding: 1rem;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .pending-case-top {
            flex-direction: column;
          }

          .case-meta {
            grid-template-columns: 1fr;
          }

          .case-actions {
            flex-direction: column;
          }

          .case-actions button {
            width: 100%;
          }

          .dashboard-actions {
            width: 100%;
          }

          .btn-primary-dash {
            flex: 1;
            justify-content: center;
          }

          .registration-item {
            flex-direction: column;
            align-items: flex-start;
          }
        }

      `}</style>

      <div className="dashboard-container">

        {/* BACK */}

        <button
          onClick={() => navigate(-1)}
          className="back-btn"
        >
          <FaArrowLeft />
          Back
        </button>

        {/* HEADER */}

        <div className="dashboard-header">

          <div className="dashboard-title">

            <h1>
              Welcome back,{' '}
              {user.displayName ||
                'Clerk'}
            </h1>

            <p>
              Manage case registration,
              approval and document
              verification
            </p>

          </div>

          <div className="dashboard-actions">

            <Link
              to="/notifications"
              className="notif-btn"
            >
              <FaBell />

              {unreadCount > 0 && (
                <span className="notif-badge">
                  {unreadCount}
                </span>
              )}
            </Link>

            <Link
              to="/clerk-dashboard/register-case"
              className="btn-primary-dash"
            >
              <FaPlus />
              Register Case
            </Link>

          </div>

        </div>

        {/* ERROR */}

        {error && (
          <div
            style={{
              background: '#FEE2E2',
              color: '#991B1B',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1.5rem'
            }}
          >
            {error}
          </div>
        )}

        {/* STATISTICS */}

        <div className="stats-grid">

          {statCards.map(
            (stat, index) => (
              <motion.div
                key={index}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedStat(stat.label)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setSelectedStat(stat.label);
                  }
                }}
                style={{ cursor: 'pointer' }}
                initial={{
                  opacity: 0,
                  y: 20
                }}
                animate={{
                  opacity: 1,
                  y: 0
                }}
                transition={{
                  delay:
                    index * 0.1
                }}
              >

                <GlassCard
                  glow
                  hover
                  className="stat-card"
                >

                  <div
                    className="stat-icon"
                    style={{
                      background:
                        `${stat.color}20`,
                      color:
                        stat.color
                    }}
                  >
                    {stat.icon}
                  </div>

                  <div className="stat-info">

                    <span className="stat-value">
                      {stat.value}
                    </span>

                    <span className="stat-label">
                      {stat.label}
                    </span>

                  </div>

                </GlassCard>

              </motion.div>
            )
          )}

        </div>

        {/* ======================================================
            PENDING CASES
        ====================================================== */}

        <GlassCard className="section-card">

          <div className="section-header">

            <h3>

              <FaClock
                style={{
                  marginRight:
                    '0.5rem',
                  color:
                    '#FF9A56'
                }}
              />

              Citizen Cases
              Pending Approval

            </h3>

            <span className="pending-badge">

              {pendingCases.length}
              {' '}
              Pending

            </span>

          </div>

          {pendingCases.length === 0 ? (

            <div
              style={{
                textAlign: 'center',
                padding: '2rem',
                color: '#6B7280'
              }}
            >

              <FaCheckCircle
                style={{
                  fontSize: '2.5rem',
                  color: '#16A34A',
                  marginBottom: '0.7rem'
                }}
              />

              <p>
                No citizen cases
                are waiting for
                approval.
              </p>

            </div>

          ) : (

            <div className="pending-case-list">

              {pendingCases.map(
                (caseItem) => {

                  const caseId =
                    caseItem.caseNumber ||
                    caseItem.caseId ||
                    caseItem.id;

                  const status =
                    caseItem.status ||
                    'Pending Clerk Approval';

                  return (

                    <motion.div
                      key={
                        caseItem.id
                      }
                      className="pending-case"
                      initial={{
                        opacity: 0,
                        y: 10
                      }}
                      animate={{
                        opacity: 1,
                        y: 0
                      }}
                    >

                      {/* HEADER */}

                      <div className="pending-case-top">

                        <div className="case-main-info">

                          <div className="case-id">
                            Case ID:
                            {' '}
                            {caseId}
                          </div>

                          <div className="case-citizen">
                            Citizen:
                            {' '}
                            {caseItem.userDisplayName ||
                              caseItem.citizenName ||
                              'Citizen'}
                          </div>

                          <div className="case-type">
                            {caseItem.caseType ||
                              caseItem.predictedCaseType ||
                              'Case Type Not Provided'}
                          </div>

                        </div>

                        <span
                          className="case-status"
                          style={
                            getStatusStyle(
                              status
                            )
                          }
                        >
                          {status}
                        </span>

                      </div>

                      {/* DESCRIPTION */}

                      <div className="case-description">

                        <strong>
                          Defendant:
                        </strong>

                        {' '}

                        {caseItem.defendantName ||
                          'Not provided'}

                        <br />

                        <strong>
                          Description:
                        </strong>

                        <br />

                        {caseItem.description ||
                          'No description provided.'}

                      </div>

                      {/* AI */}

                      <div
                        style={{
                          marginBottom:
                            '0.8rem'
                        }}
                      >

                        <span className="ai-badge">

                          <FaRobot />

                          AI Processed

                        </span>

                      </div>

                      {/* META */}

                      <div className="case-meta">

                        <div className="meta-box">

                          <span className="meta-label">
                            AI Case Type
                          </span>

                          <span className="meta-value">
                            {caseItem.predictedCaseType ||
                              'N/A'}
                          </span>

                        </div>

                        <div className="meta-box">

                          <span className="meta-label">
                            AI Priority
                          </span>

                          <span className="meta-value">
                            {caseItem.predictedPriority ||
                              'N/A'}
                          </span>

                        </div>

                        <div className="meta-box">

                          <span className="meta-label">
                            AI Duration
                          </span>

                          <span className="meta-value">

                            {caseItem.predictedDurationDays !==
                              undefined &&
                            caseItem.predictedDurationDays !==
                              null
                              ? `${Number(
                                  caseItem.predictedDurationDays
                                ).toFixed(
                                  2
                                )} days`
                              : 'N/A'}

                          </span>

                        </div>

                        <div className="meta-box">

                          <span className="meta-label">
                            Documents
                          </span>

                          <span className="meta-value">

                            {Array.isArray(
                              caseItem.documentNames
                            )
                              ? caseItem.documentNames.length
                              : Array.isArray(
                                  caseItem.documents
                                )
                              ? caseItem.documents.length
                              : 0}

                          </span>

                        </div>

                      </div>

                      {/* CITIZEN */}

                      <div
                        style={{
                          background:
                            '#F8FAFC',
                          borderRadius:
                            '8px',
                          padding:
                            '0.7rem',
                          marginBottom:
                            '1rem',
                          fontSize:
                            '0.85rem'
                        }}
                      >

                        <strong>
                          Citizen Email:
                        </strong>

                        {' '}

                        {caseItem.userEmail ||
                          caseItem.citizenEmail ||
                          'Not available'}

                      </div>

                      {/* ACTIONS */}

                      <div className="case-actions">

                        <button
                          type="button"
                          className="view-btn"
                          onClick={() => {

                            alert(
                              `Case ID: ${caseId}

Citizen: ${
                                caseItem.userDisplayName ||
                                caseItem.citizenName ||
                                'Citizen'
                              }

Email: ${
                                caseItem.userEmail ||
                                caseItem.citizenEmail ||
                                'N/A'
                              }

Defendant: ${
                                caseItem.defendantName ||
                                'N/A'
                              }

Case Type: ${
                                caseItem.caseType ||
                                'N/A'
                              }

Description:
${
                                caseItem.description ||
                                'N/A'
                              }`
                            );

                          }}
                          disabled={
                            processingCase ===
                            caseItem.id
                          }
                        >
                          <FaEye />
                          View
                        </button>

                        <button
                          type="button"
                          className="reject-btn"
                          onClick={() =>
                            openRejectModal(
                              caseItem
                            )
                          }
                          disabled={
                            processingCase ===
                            caseItem.id
                          }
                        >
                          <FaTimes />
                          Reject
                        </button>

                        <button
                          type="button"
                          className="approve-btn"
                          onClick={() =>
                            handleApproveCase(
                              caseItem
                            )
                          }
                          disabled={
                            processingCase ===
                            caseItem.id
                          }
                        >

                          <FaCheck />

                          {processingCase ===
                          caseItem.id
                            ? 'Processing...'
                            : 'Approve'}

                        </button>

                      </div>

                    </motion.div>

                  );
                }
              )}

            </div>

          )}

        </GlassCard>

        {/* ======================================================
            RECENT CASES + QUICK ACTIONS
        ====================================================== */}

        <div className="dashboard-grid">

          <GlassCard className="chart-card">

            <h3>
              Recent Registrations
            </h3>

            <div className="recent-registrations">

              {recentCases.length > 0 ? (

                recentCases.map(
                  (caseItem) => (

                    <div
                      key={
                        caseItem.id
                      }
                      className="registration-item"
                    >

                      <span className="reg-id">

                        {caseItem.caseNumber ||
                          caseItem.caseId ||
                          caseItem.id}

                      </span>

                      <span className="reg-title">

                        {caseItem.title ||
                          caseItem.caseTitle ||
                          caseItem.caseType ||
                          'Case'}

                      </span>

                      <span
                        className="reg-status"
                        style={
                          getStatusStyle(
                            caseItem.status
                          )
                        }
                      >

                        {caseItem.status ||
                          'Pending'}

                      </span>

                    </div>

                  )
                )

              ) : (

                <p>
                  No cases
                  registered yet.
                </p>

              )}

            </div>

          </GlassCard>

          <GlassCard className="recent-card">

            <h3>
              Quick Actions
            </h3>

            <div className="quick-actions">

              <Link
                to="/clerk-dashboard/register-case"
                className="action-btn"
              >
                <FaPlus />
                Register New Case
              </Link>

              <Link
                to="/clerk-dashboard/verify-documents"
                className="action-btn"
              >
                <FaDatabase />
                Verify Documents
              </Link>

            </div>

          </GlassCard>

        </div>

        {/* ======================================================
            NOTIFICATIONS
        ====================================================== */}

        <GlassCard className="notifications-card">

          <div className="notif-header">

            <h3>

              <FaBell
                style={{
                  marginRight:
                    '0.4rem'
                }}
              />

              Recent Notifications

            </h3>

            <Link
              to="/notifications"
              className="view-all"
            >
              View All
            </Link>

          </div>

          <div className="notif-list">

            {notifications.length > 0 ? (

              notifications.map(
                (notif) => (

                  <div
                    key={
                      notif.id
                    }
                    className="notif-item"
                  >

                    <div className="notif-dot"></div>

                    <div>

                      <p
                        style={{
                          margin: 0
                        }}
                      >
                        {notif.message}
                      </p>

                      <span
                        style={{
                          fontSize:
                            '0.75rem',
                          color:
                            '#6B7280'
                        }}
                      >
                        {notif.time ||
                          'Recent'}
                      </span>

                    </div>

                  </div>
                )
              )

            ) : (

              <p>
                No notifications.
              </p>

            )}

          </div>

        </GlassCard>

      </div>

      {/* ========================================================
          STAT DETAILS MODAL
      ======================================================== */}

      {selectedStat && (
        <div
          className="modal-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedStat(null);
            }
          }}
        >
          <div className="stat-details-modal">

            <div className="modal-header">
              <h3>{selectedStat}</h3>

              <button
                type="button"
                className="close-modal"
                onClick={() => setSelectedStat(null)}
                aria-label="Close case list"
              >
                <FaTimes />
              </button>
            </div>

            <p style={{ color: '#6B7280', marginTop: 0 }}>
              Total Cases: <strong>{getSelectedStatCases().length}</strong>
            </p>

            {getSelectedStatCases().length === 0 ? (

              <p style={{
                textAlign: 'center',
                padding: '2rem',
                color: '#6B7280'
              }}>
                No cases found in this category.
              </p>

            ) : (

              <>
                <div
                  className="stat-case-row"
                  style={{
                    background: '#EAF4FB',
                    fontWeight: 800
                  }}
                >
                  <span>Case ID</span>
                  <span>Citizen Name</span>
                  <span>Case Type</span>
                  <span>Status</span>
                </div>

                {getSelectedStatCases().map((caseItem) => {
                  const caseId =
                    caseItem.caseNumber ||
                    caseItem.caseId ||
                    caseItem.id;

                  const citizenName =
                    caseItem.userDisplayName ||
                    caseItem.citizenName ||
                    'Citizen';

                  const caseType =
                    caseItem.caseType ||
                    caseItem.predictedCaseType ||
                    'N/A';

                  const caseStatus =
                    caseItem.status ||
                    'N/A';

                  return (
                    <div
                      className="stat-case-row"
                      key={caseItem.id}
                    >
                      <span className="stat-case-id">
                        {caseId}
                      </span>

                      <span className="stat-case-field">
                        {citizenName}
                      </span>

                      <span className="stat-case-field">
                        {caseType}
                      </span>

                      <span
                        className="stat-case-status"
                        style={getStatusStyle(caseStatus)}
                      >
                        {caseStatus}
                      </span>
                    </div>
                  );
                })}
              </>
            )}

          </div>
        </div>
      )}

      {/* ========================================================
          REJECTION MODAL
      ======================================================== */}

      {showRejectModal &&
        selectedCase && (

          <div
            className="modal-overlay"
            onClick={(e) => {

              if (
                e.target ===
                e.currentTarget
              ) {
                closeRejectModal();
              }

            }}
          >

            <div className="reject-modal">

              <div className="modal-header">

                <h3>
                  Reject Case
                </h3>

                <button
                  type="button"
                  className="close-modal"
                  onClick={
                    closeRejectModal
                  }
                  disabled={
                    !!processingCase
                  }
                >
                  <FaTimes />
                </button>

              </div>

              <p
                style={{
                  color:
                    '#6B7280',
                  fontSize:
                    '0.9rem'
                }}
              >

                Case:
                {' '}

                <strong>

                  {selectedCase.caseNumber ||
                    selectedCase.caseId ||
                    selectedCase.id}

                </strong>

              </p>

              <label className="modal-label">

                Missing Information /
                Rejection Reason *

              </label>

              <textarea
                className="modal-textarea"
                value={
                  rejectionReason
                }
                onChange={(e) =>
                  setRejectionReason(
                    e.target.value
                  )
                }
                placeholder="Example: CNIC copy is missing, defendant address is incomplete, required document is not attached..."
                disabled={
                  !!processingCase
                }
              />

              <div className="modal-actions">

                <button
                  type="button"
                  className="modal-cancel"
                  onClick={
                    closeRejectModal
                  }
                  disabled={
                    !!processingCase
                  }
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="modal-reject"
                  onClick={
                    handleRejectCase
                  }
                  disabled={
                    !!processingCase ||
                    !rejectionReason.trim()
                  }
                >

                  <FaTimes
                    style={{
                      marginRight:
                        '0.4rem'
                    }}
                  />

                  {processingCase
                    ? 'Rejecting...'
                    : 'Reject & Notify Citizen'}

                </button>

              </div>

            </div>

          </div>

        )}

    </div>
  );
};

export default ClerkDashboard;