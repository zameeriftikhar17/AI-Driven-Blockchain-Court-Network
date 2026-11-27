import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

import {
  FaFileAlt,
  FaClock,
  FaCheckCircle,
  FaExclamationTriangle,
  FaPlus,
  FaBell,
  FaList,
  FaRobot,
  FaUserTie,
  FaPaperPlane,
  FaUserEdit,
  FaTimes,
  FaSave
} from 'react-icons/fa';

import {
  ref,
  onValue,
  update,
  push,
  set,
  serverTimestamp
} from 'firebase/database';

import {
  onAuthStateChanged
} from 'firebase/auth';

import { auth, db } from '../../../firebase';

import GlassCard from '../../common/GlassCard';
import { CaseStatusChart } from '../../charts/CaseStatusChart';

const CitizenDashboard = () => {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
    pending: 0
  });

  const [recentCases, setRecentCases] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [lawyers, setLawyers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [lawyersLoading, setLawyersLoading] = useState(true);

  const [selectedLawyers, setSelectedLawyers] = useState({});
  const [sendingLawyerRequest, setSendingLawyerRequest] = useState(null);

  /* ============================================================
     EDIT PROFILE STATE
  ============================================================ */

  const [showEditProfile, setShowEditProfile] = useState(false);

  const [profileLoading, setProfileLoading] = useState(false);

  const [profileData, setProfileData] = useState({
    fullName: '',
    phone: '',
    address: '',
    city: ''
  });

  /* ============================================================
     AUTH
  ============================================================ */

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        (currentUser) => {

          if (currentUser) {
            setUser(currentUser);
            setAuthLoading(false);
          } else {
            setUser(null);
            setAuthLoading(false);
            setLoading(false);
            navigate('/login');
          }
        }
      );

    return unsubscribe;
  }, [navigate]);

  /* ============================================================
     LOAD CITIZEN PROFILE
  ============================================================ */

  useEffect(() => {

    if (
      authLoading ||
      !user
    ) {
      return;
    }

    const userRef = ref(
      db,
      `users/${user.uid}`
    );

    const unsubscribe =
      onValue(
        userRef,
        (snapshot) => {

          const data = snapshot.val();

          if (data) {

            setProfileData({
              fullName:
                data.fullName ||
                data.name ||
                user.displayName ||
                '',

              phone:
                data.phone ||
                data.phoneNumber ||
                '',

              address:
                data.address ||
                '',

              city:
                data.city ||
                ''
            });
          } else {

            setProfileData({
              fullName:
                user.displayName ||
                '',

              phone: '',
              address: '',
              city: ''
            });
          }
        },
        (error) => {

          console.error(
            'PROFILE FETCH ERROR:',
            error
          );

        }
      );

    return unsubscribe;

  }, [user, authLoading]);

  /* ============================================================
     OPEN EDIT PROFILE
  ============================================================ */

  const handleOpenEditProfile = () => {

    setShowEditProfile(true);

  };

  /* ============================================================
     CLOSE EDIT PROFILE
  ============================================================ */

  const handleCloseEditProfile = () => {

    setShowEditProfile(false);

  };

  /* ============================================================
     PROFILE INPUT CHANGE
  ============================================================ */

  const handleProfileChange = (e) => {

    const {
      name,
      value
    } = e.target;

    setProfileData(
      (previous) => ({
        ...previous,
        [name]: value
      })
    );

  };

  /* ============================================================
     UPDATE PROFILE
  ============================================================ */

  const handleUpdateProfile = async (e) => {

    e.preventDefault();

    if (!user) {
      alert('User is not logged in.');
      return;
    }

    if (
      !profileData.fullName.trim()
    ) {
      alert('Please enter your full name.');
      return;
    }

    setProfileLoading(true);

    try {

      await update(
        ref(
          db,
          `users/${user.uid}`
        ),
        {
          fullName:
            profileData.fullName.trim(),

          phone:
            profileData.phone.trim(),

          address:
            profileData.address.trim(),

          city:
            profileData.city.trim(),

          updatedAt:
            serverTimestamp()
        }
      );

      alert(
        'Profile updated successfully.'
      );

      setShowEditProfile(false);

    } catch (error) {

      console.error(
        'PROFILE UPDATE ERROR:',
        error
      );

      alert(
        error.message ||
        'Failed to update profile.'
      );

    } finally {

      setProfileLoading(false);

    }
  };

  /* ============================================================
     LOAD CITIZEN CASES
  ============================================================ */

  useEffect(() => {

    if (
      authLoading ||
      !user
    ) {
      return;
    }

    setLoading(true);

    const casesRef =
      ref(db, 'cases');

    const unsubscribe =
      onValue(
        casesRef,
        (snapshot) => {

          const data =
            snapshot.val();

          if (!data) {

            setRecentCases([]);

            setStats({
              total: 0,
              active: 0,
              completed: 0,
              pending: 0
            });

            setLoading(false);

            return;
          }

          const allCases =
            Object.entries(data)
              .map(
                ([id, caseData]) => ({
                  id,
                  ...(caseData || {})
                })
              );

          const currentValues = [
            user.uid,
            user.email,
            user.displayName
          ]
            .filter(Boolean)
            .map((value) =>
              String(value)
                .trim()
                .toLowerCase()
            );

          const citizenCases =
            allCases.filter(
              (caseItem) => {

                const values = [
                  caseItem.userId,
                  caseItem.userID,
                  caseItem.citizenId,
                  caseItem.citizenID,
                  caseItem.createdBy,
                  caseItem.createdById,
                  caseItem.ownerId,
                  caseItem.applicantId
                ]
                  .filter(Boolean)
                  .map((value) =>
                    String(value)
                      .trim()
                      .toLowerCase()
                  );

                return values.some(
                  (value) =>
                    currentValues.includes(
                      value
                    )
                );
              }
            );

          const normalizeStatus =
            (value) =>
              String(value || '')
                .trim()
                .toLowerCase()
                .replace(/[_-]/g, ' ');

          const activeCases =
            citizenCases.filter(
              (item) => {

                const status =
                  normalizeStatus(
                    item.status
                  );

                return [
                  'active',
                  'in progress',
                  'ongoing',
                  'under review',
                  'under consideration',
                  'clerk approved lawyer selection required',
                  'pending lawyer approval'
                ].includes(status);
              }
            );

          const completedCases =
            citizenCases.filter(
              (item) => {

                const status =
                  normalizeStatus(
                    item.status
                  );

                return [
                  'completed',
                  'closed',
                  'decided',
                  'resolved',
                  'judgment issued'
                ].includes(status);
              }
            );

          const pendingCases =
            citizenCases.filter(
              (item) => {

                const status =
                  normalizeStatus(
                    item.status
                  );

                return [
                  'pending',
                  'pending clerk approval',
                  'submitted',
                  'filed',
                  'awaiting review',
                  'rejected by clerk'
                ].includes(status);
              }
            );

          setStats({
            total:
              citizenCases.length,

            active:
              activeCases.length,

            completed:
              completedCases.length,

            pending:
              pendingCases.length
          });

          const sorted =
            [...citizenCases].sort(
              (a, b) =>
                getTime(b.createdAt) -
                getTime(a.createdAt)
            );

          setRecentCases(
            sorted.slice(0, 5)
          );

          setLoading(false);

        },

        (error) => {

          console.error(
            'CASE FETCH ERROR:',
            error
          );

          setRecentCases([]);

          setStats({
            total: 0,
            active: 0,
            completed: 0,
            pending: 0
          });

          setLoading(false);

        }
      );

    return unsubscribe;

  }, [user, authLoading]);

  /* ============================================================
     LOAD LAWYERS
  ============================================================ */

  useEffect(() => {

    if (
      authLoading ||
      !user
    ) {
      return;
    }

    const usersRef =
      ref(db, 'users');

    const unsubscribe =
      onValue(
        usersRef,
        (snapshot) => {

          const data =
            snapshot.val();

          if (!data) {

            setLawyers([]);
            setLawyersLoading(false);

            return;
          }

          const lawyerList =
            Object.entries(data)
              .map(
                ([id, value]) => ({
                  id,
                  ...(value || {})
                })
              )
              .filter(
                (item) =>
                  String(
                    item.role || ''
                  ).toLowerCase() ===
                  'lawyer'
              );

          setLawyers(
            lawyerList
          );

          setLawyersLoading(false);

        },

        (error) => {

          console.error(
            'LAWYER FETCH ERROR:',
            error
          );

          setLawyers([]);
          setLawyersLoading(false);

        }
      );

    return unsubscribe;

  }, [user, authLoading]);

  /* ============================================================
     LOAD NOTIFICATIONS
  ============================================================ */

  useEffect(() => {

    if (
      authLoading ||
      !user
    ) {
      return;
    }

    const notificationRef =
      ref(
        db,
        `notifications/${user.uid}`
      );

    const unsubscribe =
      onValue(
        notificationRef,
        (snapshot) => {

          const data =
            snapshot.val();

          if (!data) {

            setNotifications([]);

            return;
          }

          const notificationArray =
            Object.entries(data)
              .map(
                ([id, value]) => ({
                  id,
                  ...(value || {})
                })
              )
              .sort(
                (a, b) =>
                  getTime(
                    b.timestamp
                  ) -
                  getTime(
                    a.timestamp
                  )
              );

          setNotifications(
            notificationArray.slice(0, 5)
          );

        },

        (error) => {

          console.error(
            'NOTIFICATION ERROR:',
            error
          );

          setNotifications([]);

        }
      );

    return unsubscribe;

  }, [user, authLoading]);

  /* ============================================================
     TIME HELPER
  ============================================================ */

  const getTime = (value) => {

    if (!value) return 0;

    if (
      typeof value === 'object' &&
      value.seconds
    ) {

      return (
        Number(value.seconds) *
        1000
      );

    }

    if (
      typeof value === 'number'
    ) {

      return value;

    }

    const parsed =
      new Date(value).getTime();

    return Number.isNaN(parsed)
      ? 0
      : parsed;

  };

  /* ============================================================
     CREATE NOTIFICATION
  ============================================================ */

  const notifyUser =
    async (
      userId,
      data
    ) => {

      if (!userId) return;

      const notificationRef =
        ref(
          db,
          `notifications/${userId}`
        );

      const notificationId =
        push(notificationRef).key;

      if (!notificationId) return;

      await set(
        ref(
          db,
          `notifications/${userId}/${notificationId}`
        ),
        {
          ...data,
          read: false,
          timestamp:
            serverTimestamp()
        }
      );
    };

  /* ============================================================
     SELECT LAWYER
  ============================================================ */

  const handleLawyerChange =
    (caseId, lawyerId) => {

      setSelectedLawyers(
        (previous) => ({
          ...previous,
          [caseId]: lawyerId
        })
      );

    };

  /* ============================================================
     SEND LAWYER REQUEST
  ============================================================ */

  const handleSendLawyerRequest =
    async (caseItem) => {

      const lawyerId =
        selectedLawyers[
          caseItem.id
        ];

      if (!lawyerId) {

        alert(
          'Please select a lawyer first.'
        );

        return;
      }

      if (
        caseItem.clerkApprovalStatus !==
        'Approved'
      ) {

        alert(
          'This case has not been approved by the clerk yet.'
        );

        return;
      }

      const selectedLawyer =
        lawyers.find(
          (lawyer) =>
            lawyer.id ===
            lawyerId
        );

      if (!selectedLawyer) {

        alert(
          'Selected lawyer could not be found.'
        );

        return;
      }

      const lawyerName =
        selectedLawyer.fullName ||
        selectedLawyer.name ||
        selectedLawyer.displayName ||
        'Lawyer';

      const lawyerType =
        selectedLawyer.specialization ||
        selectedLawyer.lawyerType ||
        selectedLawyer.type ||
        selectedLawyer.category ||
        'General Lawyer';

      setSendingLawyerRequest(
        caseItem.id
      );

      try {

        const requestsRef =
          ref(
            db,
            `lawyerRequests/${lawyerId}`
          );

        const requestId =
          push(requestsRef).key;

        if (!requestId) {

          throw new Error(
            'Could not create lawyer request.'
          );

        }

        await set(
          ref(
            db,
            `lawyerRequests/${lawyerId}/${requestId}`
          ),
          {
            id:
              requestId,

            caseId:
              caseItem.id,

            citizenId:
              user.uid,

            citizenName:
              user.displayName ||
              profileData.fullName ||
              'Citizen',

            citizenEmail:
              user.email ||
              '',

            lawyerId,

            lawyerName,

            lawyerType,

            caseType:
              caseItem.caseType,

            predictedCaseType:
              caseItem.predictedCaseType,

            priority:
              caseItem.predictedPriority,

            durationDays:
              caseItem.predictedDurationDays,

            defendantName:
              caseItem.defendantName,

            description:
              caseItem.description,

            status:
              'Pending',

            createdAt:
              serverTimestamp()
          }
        );

        await update(
          ref(
            db,
            `cases/${caseItem.id}`
          ),
          {
            selectedLawyerId:
              lawyerId,

            selectedLawyerName:
              lawyerName,

            selectedLawyerType:
              lawyerType,

            lawyerRequestStatus:
              'Pending',

            lawyerRequestId:
              requestId,

            status:
              'Pending Lawyer Approval',

            lawyerDecisionAt:
              null
          }
        );

        await notifyUser(
          lawyerId,
          {
            type:
              'lawyer_case_request',

            title:
              'New Case Request',

            caseId:
              caseItem.id,

            requestId,

            citizenId:
              user.uid,

            message:
              `${profileData.fullName || user.displayName || 'A citizen'} has sent you a request for Case ${caseItem.id}. Please review and respond.`
          }
        );

        await notifyUser(
          user.uid,
          {
            type:
              'lawyer_request_sent',

            title:
              'Lawyer Request Sent',

            caseId:
              caseItem.id,

            lawyerId,

            lawyerName,

            message:
              `Your request for Case ${caseItem.id} has been sent to ${lawyerName}.`
          }
        );

        alert(
          `Request sent to ${lawyerName}.`
        );

        setSelectedLawyers(
          (previous) => ({
            ...previous,
            [caseItem.id]: ''
          })
        );

      } catch (err) {

        console.error(
          'LAWYER REQUEST ERROR:',
          err
        );

        alert(
          err.message ||
          'Failed to send lawyer request.'
        );

      } finally {

        setSendingLawyerRequest(
          null
        );

      }
    };

  /* ============================================================
     HELPERS
  ============================================================ */

  const unreadCount =
    notifications.filter(
      (item) =>
        item.read !== true
    ).length;

  const statCards = [
    {
      icon: <FaFileAlt />,
      label: 'Total Cases',
      value: stats.total,
      color: '#4A6CF7'
    },
    {
      icon: <FaClock />,
      label: 'Active Cases',
      value: stats.active,
      color: '#FF9A56'
    },
    {
      icon: <FaCheckCircle />,
      label: 'Completed',
      value: stats.completed,
      color: '#00B86B'
    },
    {
      icon: <FaExclamationTriangle />,
      label: 'Pending',
      value: stats.pending,
      color: '#FF6B6B'
    }
  ];

  const getStatusClass =
    (status) =>
      String(
        status || 'unknown'
      )
        .trim()
        .toLowerCase()
        .replace(/[_\s]+/g, '-')
        .replace(/-+/g, '-');

  const formatCaseType =
    (type) => {

      if (!type) {
        return 'Not available';
      }

      return String(type)
        .replace(
          /[_-]/g,
          ' '
        )
        .replace(
          /\b\w/g,
          (letter) =>
            letter.toUpperCase()
        );
    };

  const formatDuration =
    (days) => {

      const number =
        Number(days);

      if (
        !Number.isFinite(
          number
        ) ||
        number <= 0
      ) {
        return 'Not available';
      }

      return `${Math.round(
        number
      )} days`;
    };

  const getPriorityClass =
    (priority) =>
      String(
        priority || 'unknown'
      )
        .trim()
        .toLowerCase()
        .replace(
          /\s+/g,
          '-'
        );

  /* ============================================================
     LOADING
  ============================================================ */

  if (
    authLoading ||
    !user ||
    loading
  ) {

    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'linear-gradient(135deg,#E3F2FD,#BBDEFB)'
        }}
      >
        <h2>
          Loading Citizen Dashboard...
        </h2>
      </div>
    );
  }

  /* ============================================================
     UI
  ============================================================ */

  return (
    <>
      <style>{`

        * {
          box-sizing: border-box;
        }

        .citizen-page {
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

        .citizen-container {
          max-width: 1250px;
          margin: auto;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
          margin-bottom: 2rem;
        }

        .dashboard-title h1 {
          margin: 0;
          color: #172033;
          font-size: 2.2rem;
        }

        .dashboard-title p {
          margin-top: .4rem;
          color: #64748B;
        }

        .dashboard-actions {
          display: flex;
          align-items: center;
          gap: .7rem;
          flex-wrap: wrap;
        }

        .btn {
          min-height: 45px;
          padding: 0 1.2rem;
          border-radius: 50px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: .5rem;
          text-decoration: none;
          font-weight: 700;
          border: none;
          cursor: pointer;
        }

        .primary-btn {
          color: white;
          background:
            linear-gradient(
              135deg,
              #4FC3F7,
              #0288D1
            );
        }

        .secondary-btn {
          color: #172033;
          background: white;
        }

        .edit-profile-btn {
          color: white;
          background:
            linear-gradient(
              135deg,
              #7E57C2,
              #5E35B1
            );
        }

        .notification-btn {
          width: 45px;
          height: 45px;
          border-radius: 50%;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #172033;
          text-decoration: none;
          position: relative;
        }

        .notification-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          background: #EF4444;
          color: white;
          min-width: 19px;
          height: 19px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: .7rem;
        }

        .stats-grid {
          display: grid;
          grid-template-columns:
            repeat(4,1fr);
          gap: 1.2rem;
          margin-bottom: 1.5rem;
        }

        .stat-card {
          padding: 1.4rem;
          background:
            rgba(255,255,255,.9) !important;
          border-radius: 16px;
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .stat-icon {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.3rem;
        }

        .stat-value {
          display: block;
          font-size: 1.8rem;
          font-weight: 800;
          color: #172033;
        }

        .stat-label {
          color: #64748B;
          font-size: .85rem;
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns:
            1fr 1fr;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .card {
          padding: 1.5rem;
          background:
            rgba(255,255,255,.92) !important;
          border-radius: 16px;
        }

        .card h3 {
          color: #172033;
          margin-top: 0;
        }

        .case-item {
          border: 1px solid #E2E8F0;
          border-radius: 13px;
          padding: 1rem;
          margin-bottom: .8rem;
          background: white;
        }

        .case-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: .7rem;
        }

        .case-id {
          color: #0288D1;
          font-weight: 800;
        }

        .case-status {
          padding: .35rem .65rem;
          border-radius: 50px;
          background: #FFF3E0;
          color: #E65100;
          font-size: .72rem;
          font-weight: 700;
        }

        .case-status.rejected-by-clerk {
          background: #FFEBEE;
          color: #C62828;
        }

        .case-status.clerk-approved-lawyer-selection-required {
          background: #E8F5E9;
          color: #2E7D32;
        }

        .case-status.pending-lawyer-approval {
          background: #E3F2FD;
          color: #0277BD;
        }

        .ai-details {
          display: grid;
          grid-template-columns:
            repeat(3,1fr);
          gap: .6rem;
          margin-top: .8rem;
        }

        .ai-detail {
          padding: .7rem;
          border-radius: 9px;
          background: #F8FAFC;
        }

        .ai-detail small {
          display: block;
          color: #94A3B8;
          font-size: .65rem;
          margin-bottom: .2rem;
        }

        .ai-detail strong {
          font-size: .82rem;
        }

        .priority-high {
          color: #DC2626;
        }

        .priority-medium {
          color: #D97706;
        }

        .priority-low {
          color: #008A50;
        }

        .lawyer-box {
          margin-top: 1rem;
          padding: 1rem;
          background: #E3F2FD;
          border-radius: 12px;
        }

        .lawyer-box-title {
          color: #0288D1;
          font-weight: 800;
          margin-bottom: .6rem;
        }

        .lawyer-controls {
          display: flex;
          gap: .6rem;
        }

        .lawyer-select {
          flex: 1;
          padding: .7rem;
          border: 1px solid #CBD5E1;
          border-radius: 9px;
          background: white;
        }

        .send-btn {
          border: none;
          border-radius: 9px;
          padding: .7rem 1rem;
          background: #0288D1;
          color: white;
          font-weight: 700;
          cursor: pointer;
        }

        .send-btn:disabled {
          opacity: .5;
          cursor: not-allowed;
        }

        .rejection-box {
          margin-top: .8rem;
          padding: .8rem;
          background: #FFEBEE;
          color: #C62828;
          border-radius: 9px;
        }

        .notification-list {
          display: flex;
          flex-direction: column;
          gap: .6rem;
        }

        .notification {
          padding: .8rem;
          border-radius: 9px;
          background: #F8FAFC;
        }

        .notification.unread {
          background: #E3F2FD;
          border-left: 3px solid #0288D1;
        }

        /* ========================================================
           EDIT PROFILE MODAL
        ======================================================== */

        .profile-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, .55);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          z-index: 9999;
          backdrop-filter: blur(4px);
        }

        .profile-modal {
          width: 100%;
          max-width: 550px;
          background: white;
          border-radius: 20px;
          padding: 1.8rem;
          box-shadow:
            0 25px 60px rgba(15,23,42,.25);
        }

        .profile-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .profile-modal-header h2 {
          margin: 0;
          color: #172033;
        }

        .profile-close {
          width: 38px;
          height: 38px;
          border: none;
          border-radius: 50%;
          background: #F1F5F9;
          color: #475569;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 1rem;
        }

        .profile-close:hover {
          background: #E2E8F0;
        }

        .profile-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .profile-field {
          display: flex;
          flex-direction: column;
          gap: .4rem;
        }

        .profile-field label {
          font-weight: 700;
          color: #334155;
          font-size: .9rem;
        }

        .profile-field input,
        .profile-field textarea {
          width: 100%;
          padding: .8rem .9rem;
          border: 1px solid #CBD5E1;
          border-radius: 10px;
          outline: none;
          font-size: .95rem;
          color: #172033;
          background: white;
        }

        .profile-field input:focus,
        .profile-field textarea:focus {
          border-color: #0288D1;
          box-shadow:
            0 0 0 3px rgba(2,136,209,.12);
        }

        .profile-field textarea {
          min-height: 85px;
          resize: vertical;
        }

        .profile-email {
          background: #F1F5F9 !important;
          color: #64748B !important;
        }

        .profile-help {
          font-size: .75rem;
          color: #94A3B8;
        }

        .profile-actions {
          display: flex;
          justify-content: flex-end;
          gap: .7rem;
          margin-top: .5rem;
        }

        .profile-cancel {
          border: none;
          padding: .75rem 1.2rem;
          border-radius: 10px;
          background: #F1F5F9;
          color: #334155;
          font-weight: 700;
          cursor: pointer;
        }

        .profile-save {
          border: none;
          padding: .75rem 1.2rem;
          border-radius: 10px;
          background: #0288D1;
          color: white;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: .5rem;
        }

        .profile-save:disabled {
          opacity: .6;
          cursor: not-allowed;
        }

        @media(max-width: 1000px) {

          .stats-grid {
            grid-template-columns:
              repeat(2,1fr);
          }

          .dashboard-grid {
            grid-template-columns: 1fr;
          }

        }

        @media(max-width: 600px) {

          .citizen-page {
            padding: 1rem;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .dashboard-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .dashboard-actions {
            width: 100%;
            flex-wrap: wrap;
          }

          .ai-details {
            grid-template-columns: 1fr;
          }

          .lawyer-controls {
            flex-direction: column;
          }

          .send-btn {
            width: 100%;
          }

          .profile-modal {
            padding: 1.2rem;
          }

          .profile-actions {
            flex-direction: column;
          }

          .profile-cancel,
          .profile-save {
            width: 100%;
            justify-content: center;
          }

        }

      `}</style>

      <div className="citizen-page">

        <div className="citizen-container">

          {/* ====================================================
              HEADER
          ==================================================== */}

          <motion.div
            className="dashboard-header"
            initial={{
              opacity: 0,
              y: 20
            }}
            animate={{
              opacity: 1,
              y: 0
            }}
          >

            <div className="dashboard-title">

              <h1>
                Welcome back,{' '}
                {profileData.fullName ||
                  user.displayName ||
                  'Citizen'}
              </h1>

              <p>
                Here's an overview of
                your cases and activities
              </p>

            </div>

            <div className="dashboard-actions">

              {/* NEW EDIT PROFILE BUTTON */}

              <button
                type="button"
                className="btn edit-profile-btn"
                onClick={
                  handleOpenEditProfile
                }
              >
                <FaUserEdit />
                Edit Profile
              </button>

              <Link
                to="/my-cases"
                className="btn secondary-btn"
              >
                <FaList />
                My Cases
              </Link>

              <Link
                to="/notifications"
                className="notification-btn"
              >

                <FaBell />

                {unreadCount > 0 && (
                  <span className="notification-badge">
                    {unreadCount}
                  </span>
                )}

              </Link>

              <Link
                to="/file-new-case"
                className="btn primary-btn"
              >
                <FaPlus />
                File New Case
              </Link>

            </div>

          </motion.div>

          {/* ====================================================
              STATS
          ==================================================== */}

          <div className="stats-grid">

            {statCards.map(
              (stat, index) => (

                <motion.div
                  key={index}
                  initial={{
                    opacity: 0,
                    y: 15
                  }}
                  animate={{
                    opacity: 1,
                    y: 0
                  }}
                >

                  <GlassCard
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

                    <div>

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

          {/* ====================================================
              MAIN GRID
          ==================================================== */}

          <div className="dashboard-grid">

            <GlassCard className="card">

              <h3>
                Case Status Overview
              </h3>

              <CaseStatusChart
                stats={stats}
              />

            </GlassCard>

            <GlassCard className="card">

              <h3>
                Recent Cases
              </h3>

              {recentCases.length === 0 ? (

                <p>
                  No cases found.
                </p>

              ) : (

                recentCases.map(
                  (caseItem) => (

                    <div
                      key={caseItem.id}
                      className="case-item"
                    >

                      <div className="case-top">

                        <div>

                          <div className="case-id">
                            {caseItem.id}
                          </div>

                          <strong>
                            {caseItem.caseType ||
                              'Case'}
                          </strong>

                        </div>

                        <span
                          className={
                            `case-status ${
                              getStatusClass(
                                caseItem.status
                              )
                            }`
                          }
                        >
                          {caseItem.status ||
                            'Unknown'}
                        </span>

                      </div>

                    </div>

                  )
                )

              )}

            </GlassCard>

          </div>

          {/* ====================================================
              ALL IMPORTANT CASES
          ==================================================== */}

          <GlassCard className="card">

            <h3>
              My Cases & Case Processing
            </h3>

            {recentCases.length === 0 ? (

              <p>
                No cases found.
              </p>

            ) : (

              recentCases.map(
                (caseItem) => (

                  <div
                    key={`full-${caseItem.id}`}
                    className="case-item"
                  >

                    <div className="case-top">

                      <div>

                        <div className="case-id">
                          Case ID: {caseItem.id}
                        </div>

                        <h3>
                          {caseItem.caseType ||
                            'Case'}
                        </h3>

                        <p>
                          Defendant:{' '}
                          {caseItem.defendantName ||
                            'Not available'}
                        </p>

                      </div>

                      <span
                        className={
                          `case-status ${
                            getStatusClass(
                              caseItem.status
                            )
                          }`
                        }
                      >
                        {caseItem.status ||
                          'Unknown'}
                      </span>

                    </div>

                    {/* AI */}

                    <div className="ai-details">

                      <div className="ai-detail">

                        <small>
                          <FaRobot /> AI Case Type
                        </small>

                        <strong>
                          {formatCaseType(
                            caseItem.predictedCaseType
                          )}
                        </strong>

                      </div>

                      <div className="ai-detail">

                        <small>
                          AI Priority
                        </small>

                        <strong
                          className={
                            `priority-${getPriorityClass(
                              caseItem.predictedPriority
                            )}`
                          }
                        >
                          {caseItem.predictedPriority ||
                            'Not available'}
                        </strong>

                      </div>

                      <div className="ai-detail">

                        <small>
                          Estimated Duration
                        </small>

                        <strong>
                          {formatDuration(
                            caseItem.predictedDurationDays
                          )}
                        </strong>

                      </div>

                    </div>

                    {/* REJECTED */}

                    {caseItem.clerkApprovalStatus ===
                      'Rejected' && (

                      <div className="rejection-box">

                        <strong>
                          Clerk Rejection Reason:
                        </strong>

                        <br />

                        {caseItem.clerkRejectionReason ||
                          'Information/documents are missing.'}

                      </div>

                    )}

                    {/* LAWYER SELECTION */}

                    {caseItem.clerkApprovalStatus ===
                      'Approved' &&

                      (
                        caseItem.lawyerRequestStatus ===
                          'Not Started' ||
                        !caseItem.lawyerRequestStatus
                      ) && (

                      <div className="lawyer-box">

                        <div className="lawyer-box-title">

                          <FaUserTie />

                          {' '}
                          Select Lawyer

                        </div>

                        <p>
                          Your case has been approved
                          by the clerk. Now select a
                          lawyer to send your case
                          request.
                        </p>

                        {lawyersLoading ? (

                          <p>
                            Loading lawyers...
                          </p>

                        ) : lawyers.length === 0 ? (

                          <p>
                            No registered lawyers found.
                          </p>

                        ) : (

                          <div className="lawyer-controls">

                            <select
                              className="lawyer-select"
                              value={
                                selectedLawyers[
                                  caseItem.id
                                ] || ''
                              }
                              onChange={(e) =>
                                handleLawyerChange(
                                  caseItem.id,
                                  e.target.value
                                )
                              }
                            >

                              <option value="">
                                Select a lawyer
                              </option>

                              {lawyers.map(
                                (lawyer) => {

                                  const name =
                                    lawyer.fullName ||
                                    lawyer.name ||
                                    lawyer.displayName ||
                                    'Lawyer';

                                  const type =
                                    lawyer.specialization ||
                                    lawyer.lawyerType ||
                                    lawyer.type ||
                                    lawyer.category ||
                                    'General Lawyer';

                                  return (
                                    <option
                                      key={lawyer.id}
                                      value={lawyer.id}
                                    >
                                      {name} - {type}
                                    </option>
                                  );
                                }
                              )}

                            </select>

                            <button
                              className="send-btn"
                              disabled={
                                !selectedLawyers[
                                  caseItem.id
                                ] ||
                                sendingLawyerRequest ===
                                  caseItem.id
                              }
                              onClick={() =>
                                handleSendLawyerRequest(
                                  caseItem
                                )
                              }
                            >

                              <FaPaperPlane />

                              {sendingLawyerRequest ===
                              caseItem.id
                                ? 'Sending...'
                                : 'Send Request'}

                            </button>

                          </div>

                        )}

                      </div>

                    )}

                    {/* LAWYER REQUEST PENDING */}

                    {caseItem.lawyerRequestStatus ===
                      'Pending' && (

                      <div
                        style={{
                          marginTop: '1rem',
                          padding: '1rem',
                          background: '#E3F2FD',
                          color: '#0277BD',
                          borderRadius: '10px'
                        }}
                      >

                        <FaClock />

                        <strong>
                          {' '}
                          Lawyer Request Pending
                        </strong>

                        <p>
                          Your request has been sent to{' '}
                          {caseItem.selectedLawyerName ||
                            'the selected lawyer'}.
                        </p>

                      </div>

                    )}

                    {/* LAWYER ASSIGNED */}

                    {caseItem.assignedLawyer && (

                      <div
                        style={{
                          marginTop: '1rem',
                          padding: '1rem',
                          background: '#E8F5E9',
                          color: '#2E7D32',
                          borderRadius: '10px'
                        }}
                      >

                        <FaCheckCircle />

                        <strong>
                          {' '}Lawyer Assigned
                        </strong>

                        <p>
                          Lawyer:{' '}
                          {caseItem.assignedLawyerName ||
                            caseItem.selectedLawyerName ||
                            'Assigned Lawyer'}
                        </p>

                      </div>

                    )}

                  </div>

                )
              )

            )}

          </GlassCard>

          {/* ====================================================
              NOTIFICATIONS
          ==================================================== */}

          <GlassCard
            className="card"
            style={{
              marginTop: '1.5rem'
            }}
          >

            <h3>
              <FaBell /> Recent Notifications
            </h3>

            <div className="notification-list">

              {notifications.length === 0 ? (

                <p>
                  No notifications.
                </p>

              ) : (

                notifications.map(
                  (notification) => (

                    <div
                      key={notification.id}
                      className={
                        `notification ${
                          notification.read
                            ? ''
                            : 'unread'
                        }`
                      }
                    >

                      <strong>
                        {notification.title ||
                          'Notification'}
                      </strong>

                      <p>
                        {notification.message}
                      </p>

                    </div>

                  )
                )

              )}

            </div>

          </GlassCard>

        </div>

      </div>

      {/* ========================================================
          EDIT PROFILE MODAL
      ======================================================== */}

      {showEditProfile && (

        <div
          className="profile-overlay"
          onClick={(e) => {

            if (
              e.target === e.currentTarget
            ) {
              handleCloseEditProfile();
            }

          }}
        >

          <motion.div
            className="profile-modal"
            initial={{
              opacity: 0,
              scale: .95,
              y: 15
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0
            }}
          >

            <div className="profile-modal-header">

              <h2>
                <FaUserEdit /> Edit Profile
              </h2>

              <button
                type="button"
                className="profile-close"
                onClick={
                  handleCloseEditProfile
                }
              >
                <FaTimes />
              </button>

            </div>

            <form
              className="profile-form"
              onSubmit={
                handleUpdateProfile
              }
            >

              {/* FULL NAME */}

              <div className="profile-field">

                <label>
                  Full Name
                </label>

                <input
                  type="text"
                  name="fullName"
                  value={
                    profileData.fullName
                  }
                  onChange={
                    handleProfileChange
                  }
                  placeholder="Enter your full name"
                  required
                />

              </div>

              {/* EMAIL */}

              <div className="profile-field">

                <label>
                  Email
                </label>

                <input
                  type="email"
                  value={
                    user.email || ''
                  }
                  className="profile-email"
                  readOnly
                />

                <span className="profile-help">
                  Email is linked with your
                  Firebase authentication account.
                </span>

              </div>

              {/* PHONE */}

              <div className="profile-field">

                <label>
                  Phone Number
                </label>

                <input
                  type="tel"
                  name="phone"
                  value={
                    profileData.phone
                  }
                  onChange={
                    handleProfileChange
                  }
                  placeholder="Enter phone number"
                />

              </div>

              {/* CITY */}

              <div className="profile-field">

                <label>
                  City
                </label>

                <input
                  type="text"
                  name="city"
                  value={
                    profileData.city
                  }
                  onChange={
                    handleProfileChange
                  }
                  placeholder="Enter your city"
                />

              </div>

              {/* ADDRESS */}

              <div className="profile-field">

                <label>
                  Address
                </label>

                <textarea
                  name="address"
                  value={
                    profileData.address
                  }
                  onChange={
                    handleProfileChange
                  }
                  placeholder="Enter your address"
                />

              </div>

              {/* BUTTONS */}

              <div className="profile-actions">

                <button
                  type="button"
                  className="profile-cancel"
                  onClick={
                    handleCloseEditProfile
                  }
                  disabled={profileLoading}
                >
                  <FaTimes /> Cancel
                </button>

                <button
                  type="submit"
                  className="profile-save"
                  disabled={profileLoading}
                >

                  <FaSave />

                  {profileLoading
                    ? 'Updating...'
                    : 'Update Profile'}

                </button>

              </div>

            </form>

          </motion.div>

        </div>

      )}

    </>
  );
};

export default CitizenDashboard;