import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

import {
  FaBriefcase,
  FaCheckCircle,
  FaBell,
  FaGavel,
  FaEye,
  FaCheck,
  FaTimes,
  FaUserTie,
  FaEdit,
  FaSave,
  FaPlus,
  FaCalendarAlt
} from 'react-icons/fa';

import {
  ref,
  onValue,
  update
} from 'firebase/database';

import { onAuthStateChanged } from 'firebase/auth';

import { auth, db } from '../../../firebase';
import GlassCard from '../../common/GlassCard';


const LawyerDashboard = () => {

  const navigate = useNavigate();

  // ============================================================
  // ROUTES
  // ============================================================

  const FILE_CASE_ROUTE = '/lawyer/file-case';
  const HEARINGS_ROUTE = '/lawyer/hearings';


  // ============================================================
  // AUTH / PROFILE
  // ============================================================

  const [user, setUser] = useState(null);
  const [lawyerProfile, setLawyerProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);


  // ============================================================
  // DASHBOARD DATA
  // ============================================================

  const [stats, setStats] = useState({
    assigned: 0,
    upcoming: 0,
    completed: 0
  });

  const [recentCases, setRecentCases] = useState([]);
  const [upcomingHearings, setUpcomingHearings] = useState([]);

  // REAL-TIME NOTIFICATIONS
  const [notifications, setNotifications] = useState([]);
  const [notificationLoading, setNotificationLoading] = useState(true);

  const [requests, setRequests] = useState([]);

  const [loadingCases, setLoadingCases] = useState(true);


  // ============================================================
  // EDIT PROFILE
  // ============================================================

  const [showEditProfile, setShowEditProfile] = useState(false);

  const [profileForm, setProfileForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    specialization: '',
    address: '',
    barCouncilNumber: ''
  });

  const [savingProfile, setSavingProfile] = useState(false);


  // ============================================================
  // AUTHENTICATION
  // ============================================================

  useEffect(() => {

    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {

        console.log('LAWYER AUTH USER:', currentUser);

        if (currentUser) {

          setUser(currentUser);
          setAuthLoading(false);

        } else {

          setUser(null);
          setAuthLoading(false);

          navigate('/login');

        }

      },
      (error) => {

        console.error('AUTH ERROR:', error);

        setUser(null);
        setAuthLoading(false);

        navigate('/login');

      }
    );

    return () => unsubscribe();

  }, [navigate]);


  // ============================================================
  // LOAD LAWYER PROFILE
  // users/{uid}
  // ============================================================

  useEffect(() => {

    if (authLoading || !user) {
      return;
    }

    console.log(
      'LOADING LAWYER PROFILE:',
      user.uid
    );

    const userRef = ref(
      db,
      `users/${user.uid}`
    );

    const unsubscribe = onValue(
      userRef,
      (snapshot) => {

        const data = snapshot.val();

        console.log(
          'LAWYER PROFILE DATA:',
          data
        );

        if (data) {

          const profileData = {
            uid: user.uid,
            ...data
          };

          setLawyerProfile(profileData);

          setProfileForm({

            fullName:
              data.fullName ||
              user.displayName ||
              'Lawyer',

            email:
              data.email ||
              user.email ||
              '',

            phone:
              data.phone ||
              '',

            specialization:
              data.specialization ||
              '',

            address:
              data.address ||
              '',

            barCouncilNumber:
              data.barCouncilNumber ||
              ''

          });

        } else {

          const defaultProfile = {

            uid: user.uid,

            fullName:
              user.displayName ||
              'Lawyer',

            email:
              user.email ||
              '',

            role: 'lawyer'

          };

          setLawyerProfile(defaultProfile);

          setProfileForm({

            fullName:
              user.displayName ||
              'Lawyer',

            email:
              user.email ||
              '',

            phone: '',
            specialization: '',
            address: '',
            barCouncilNumber: ''

          });

        }

      },
      (error) => {

        console.error(
          'LAWYER PROFILE ERROR:',
          error
        );

        setLawyerProfile({

          uid: user.uid,

          fullName:
            user.displayName ||
            'Lawyer',

          email:
            user.email ||
            '',

          role: 'lawyer'

        });

      }
    );

    return () => unsubscribe();

  }, [user, authLoading]);


  // ============================================================
  // LOAD LAWYER CASES + HEARINGS
  // REAL-TIME
  // ============================================================

  useEffect(() => {

    if (authLoading || !user) {
      return;
    }

    console.log(
      'LOADING LAWYER CASES:',
      user.uid
    );

    setLoadingCases(true);

    const casesRef = ref(
      db,
      'cases'
    );

    const unsubscribeCases = onValue(
      casesRef,
      (snapshot) => {

        const data = snapshot.val();

        let allCases = [];

        if (data) {

          allCases =
            Object.entries(data).map(
              ([id, caseData]) => ({
                id,
                ...(caseData || {})
              })
            );

        }

        console.log(
          'ALL CASES:',
          allCases
        );


        // ======================================================
        // FILTER LAWYER CASES
        // ======================================================

        const lawyerCases =
          allCases.filter(
            (caseItem) => {

              const assignedLawyer =
                String(
                  caseItem.assignedLawyer ||
                  caseItem.assignedLawyerId ||
                  ''
                ).trim();

              return (
                assignedLawyer ===
                String(user.uid).trim()
              );

            }
          );


        console.log(
          'LAWYER CASES:',
          lawyerCases
        );


        // ======================================================
        // NORMALIZE STATUS
        // ======================================================

        const normalizeStatus = (status) => {

          return String(status || '')
            .trim()
            .toLowerCase()
            .replace(/[_-]/g, ' ');

        };


        // ======================================================
        // STATISTICS
        // ======================================================

        const assigned =
          lawyerCases.length;


        const completed =
          lawyerCases.filter(
            (caseItem) => {

              const status =
                normalizeStatus(
                  caseItem.status
                );

              return (
                status === 'completed' ||
                status === 'closed' ||
                status === 'resolved' ||
                status === 'decided' ||
                status === 'judgment issued'
              );

            }
          ).length;


        // ======================================================
        // FIND UPCOMING HEARINGS
        // ======================================================

        const getCaseHearingDate =
          (caseItem) => {

            return (
              caseItem.hearingDate ||
              caseItem.nextHearingDate ||
              caseItem.next_hearing_date ||
              caseItem.hearing_date ||
              caseItem.nextHearing ||
              ''
            );

          };


        const getCaseHearingTime =
          (caseItem) => {

            return (
              caseItem.hearingTime ||
              caseItem.nextHearingTime ||
              caseItem.next_hearing_time ||
              caseItem.hearing_time ||
              ''
            );

          };


        const today =
          new Date();

        today.setHours(
          0,
          0,
          0,
          0
        );


        const hearingCases =
          lawyerCases.filter(
            (caseItem) => {

              const hearingDate =
                getCaseHearingDate(
                  caseItem
                );

              if (!hearingDate) {
                return false;
              }

              const parsedDate =
                new Date(
                  hearingDate
                );

              if (
                Number.isNaN(
                  parsedDate.getTime()
                )
              ) {
                return false;
              }

              parsedDate.setHours(
                0,
                0,
                0,
                0
              );

              return (
                parsedDate >= today
              );

            }
          );


        hearingCases.sort(
          (a, b) => {

            const dateA =
              new Date(
                getCaseHearingDate(a)
              ).getTime();

            const dateB =
              new Date(
                getCaseHearingDate(b)
              ).getTime();

            return dateA - dateB;

          }
        );


        setUpcomingHearings(
          hearingCases
        );


        setStats({

          assigned,

          upcoming:
            hearingCases.length,

          completed

        });


        // ======================================================
        // SORT RECENT CASES
        // ======================================================

        const sortedCases =
          [...lawyerCases].sort(
            (a, b) => {

              const dateA =
                a.createdAt ||
                a.created_at ||
                a.filingDate ||
                a.timestamp ||
                '';

              const dateB =
                b.createdAt ||
                b.created_at ||
                b.filingDate ||
                b.timestamp ||
                '';

              return String(dateB)
                .localeCompare(
                  String(dateA)
                );

            }
          );


        setRecentCases(
          sortedCases.slice(0, 5)
        );

        setLoadingCases(false);

      },
      (error) => {

        console.error(
          'CASES ERROR:',
          error
        );

        setRecentCases([]);
        setUpcomingHearings([]);

        setStats({
          assigned: 0,
          upcoming: 0,
          completed: 0
        });

        setLoadingCases(false);

      }
    );

    return () => unsubscribeCases();

  }, [user, authLoading]);


  // ============================================================
  // REAL-TIME NOTIFICATIONS
  // notifications/{uid}
  // ============================================================

  useEffect(() => {

    if (authLoading || !user) {
      return;
    }

    console.log(
      'STARTING REAL-TIME NOTIFICATION LISTENER:',
      user.uid
    );

    setNotificationLoading(true);

    const notifRef =
      ref(
        db,
        `notifications/${user.uid}`
      );


    const unsubscribe =
      onValue(
        notifRef,
        (snapshot) => {

          console.log(
            'REAL-TIME NOTIFICATION UPDATE RECEIVED'
          );

          const data =
            snapshot.val();


          // ----------------------------------------------------
          // NO NOTIFICATIONS
          // ----------------------------------------------------

          if (!data) {

            console.log(
              'NO NOTIFICATIONS FOUND'
            );

            setNotifications([]);
            setNotificationLoading(false);

            return;

          }


          // ----------------------------------------------------
          // CONVERT FIREBASE OBJECT TO ARRAY
          // ----------------------------------------------------

          const notificationArray =
            Object.entries(data)
              .map(
                ([id, notification]) => ({

                  id,

                  ...(notification || {})

                })
              );


          // ----------------------------------------------------
          // SORT LATEST FIRST
          // ----------------------------------------------------

          notificationArray.sort(
            (a, b) => {

              const dateA =
                new Date(
                  a.timestamp ||
                  a.createdAt ||
                  0
                ).getTime();

              const dateB =
                new Date(
                  b.timestamp ||
                  b.createdAt ||
                  0
                ).getTime();

              return dateB - dateA;

            }
          );


          console.log(
            'REAL-TIME NOTIFICATIONS:',
            notificationArray
          );


          // ----------------------------------------------------
          // SHOW LATEST 10
          // ----------------------------------------------------

          setNotifications(
            notificationArray.slice(0, 10)
          );

          setNotificationLoading(false);

        },
        (error) => {

          console.error(
            'REAL-TIME NOTIFICATION ERROR:',
            error
          );

          setNotifications([]);
          setNotificationLoading(false);

        }
      );


    // ----------------------------------------------------------
    // CLEANUP REAL-TIME LISTENER
    // ----------------------------------------------------------

    return () => {

      console.log(
        'STOPPING NOTIFICATION LISTENER'
      );

      unsubscribe();

    };

  }, [user, authLoading]);


  // ============================================================
  // LOAD LAWYER REQUESTS
  // lawyerRequests/{uid}
  // ============================================================

  useEffect(() => {

    if (authLoading || !user) {
      return;
    }

    const requestRef =
      ref(
        db,
        `lawyerRequests/${user.uid}`
      );

    const unsubscribe = onValue(
      requestRef,
      (snapshot) => {

        const data =
          snapshot.val();

        if (!data) {

          setRequests([]);

          return;

        }

        const requestArray =
          Object.entries(data).map(
            ([id, request]) => ({

              id,

              ...(request || {})

            })
          );


        const pendingRequests =
          requestArray.filter(
            (request) => {

              const status =
                String(
                  request.status || ''
                )
                  .trim()
                  .toLowerCase();

              return (
                status === 'pending'
              );

            }
          );


        pendingRequests.sort(
          (a, b) => {

            const dateA =
              new Date(
                a.createdAt ||
                a.timestamp ||
                0
              ).getTime();

            const dateB =
              new Date(
                b.createdAt ||
                b.timestamp ||
                0
              ).getTime();

            return dateB - dateA;

          }
        );


        setRequests(
          pendingRequests
        );

      },
      (error) => {

        console.error(
          'REQUEST ERROR:',
          error
        );

        setRequests([]);

      }
    );

    return () => unsubscribe();

  }, [user, authLoading]);


  // ============================================================
  // ACCEPT LAWYER REQUEST
  // ============================================================

  const handleAcceptRequest =
    async (request) => {

      try {

        if (!user) {

          alert(
            'User session not found.'
          );

          return;

        }


        const lawyerName =
          lawyerProfile?.fullName ||
          user.displayName ||
          'Lawyer';


        const now =
          new Date().toISOString();


        await update(
          ref(
            db,
            `lawyerRequests/${user.uid}/${request.id}`
          ),
          {

            status: 'Accepted',

            respondedAt: now

          }
        );


        if (request.caseId) {

          await update(
            ref(
              db,
              `cases/${request.caseId}`
            ),
            {

              assignedLawyer:
                user.uid,

              assignedLawyerName:
                lawyerName,

              lawyerRequestStatus:
                'Accepted',

              status:
                'Pending',

              lawyerAcceptedAt:
                now

            }
          );

        }


        // ------------------------------------------------------
        // CITIZEN NOTIFICATION
        // ------------------------------------------------------

        if (request.citizenId) {

          const notificationId =
            `${Date.now()}_${user.uid}`;


          await update(
            ref(
              db,
              `notifications/${request.citizenId}/${notificationId}`
            ),
            {

              message:
                `Lawyer ${lawyerName} has accepted your request for Case ${request.caseId || 'your case'}.`,

              title:
                'Lawyer Request Accepted',

              caseId:
                request.caseId || '',

              lawyerId:
                user.uid,

              lawyerName:
                lawyerName,

              type:
                'lawyer_request_accepted',

              read:
                false,

              timestamp:
                now

            }
          );

        }


        alert(
          'Request accepted successfully!'
        );

      } catch (error) {

        console.error(
          'ACCEPT REQUEST ERROR:',
          error
        );

        alert(
          `Unable to accept request: ${error.message}`
        );

      }

    };


  // ============================================================
  // REJECT LAWYER REQUEST
  // ============================================================

  const handleRejectRequest =
    async (request) => {

      try {

        if (!user) {

          alert(
            'User session not found.'
          );

          return;

        }


        const lawyerName =
          lawyerProfile?.fullName ||
          user.displayName ||
          'Lawyer';


        const now =
          new Date().toISOString();


        await update(
          ref(
            db,
            `lawyerRequests/${user.uid}/${request.id}`
          ),
          {

            status: 'Rejected',

            respondedAt: now

          }
        );


        if (request.caseId) {

          await update(
            ref(
              db,
              `cases/${request.caseId}`
            ),
            {

              lawyerRequestStatus:
                'Rejected',

              status:
                'Pending Lawyer Selection',

              rejectedLawyerId:
                user.uid,

              rejectedLawyerName:
                lawyerName,

              lawyerRejectedAt:
                now

            }
          );

        }


        // ------------------------------------------------------
        // CITIZEN NOTIFICATION
        // ------------------------------------------------------

        if (request.citizenId) {

          const notificationId =
            `${Date.now()}_${user.uid}`;


          await update(
            ref(
              db,
              `notifications/${request.citizenId}/${notificationId}`
            ),
            {

              message:
                `Lawyer ${lawyerName} has rejected your request for Case ${request.caseId || 'your case'}.`,

              title:
                'Lawyer Request Rejected',

              caseId:
                request.caseId || '',

              lawyerId:
                user.uid,

              lawyerName:
                lawyerName,

              type:
                'lawyer_request_rejected',

              read:
                false,

              timestamp:
                now

            }
          );

        }


        alert(
          'Request rejected.'
        );

      } catch (error) {

        console.error(
          'REJECT REQUEST ERROR:',
          error
        );

        alert(
          `Unable to reject request: ${error.message}`
        );

      }

    };


  // ============================================================
  // OPEN EDIT PROFILE
  // ============================================================

  const handleEditProfile = () => {

    setProfileForm({

      fullName:
        lawyerProfile?.fullName ||
        user?.displayName ||
        '',

      email:
        lawyerProfile?.email ||
        user?.email ||
        '',

      phone:
        lawyerProfile?.phone ||
        '',

      specialization:
        lawyerProfile?.specialization ||
        '',

      address:
        lawyerProfile?.address ||
        '',

      barCouncilNumber:
        lawyerProfile?.barCouncilNumber ||
        ''

    });

    setShowEditProfile(true);

  };


  // ============================================================
  // PROFILE INPUT
  // ============================================================

  const handleProfileChange =
    (e) => {

      const {
        name,
        value
      } = e.target;

      setProfileForm(
        (prev) => ({

          ...prev,

          [name]: value

        })
      );

    };


  // ============================================================
  // UPDATE PROFILE
  // ============================================================

  const handleUpdateProfile =
    async (e) => {

      e.preventDefault();

      if (!user) {
        return;
      }


      if (
        !profileForm.fullName.trim()
      ) {

        alert(
          'Please enter your full name.'
        );

        return;

      }


      if (
        !profileForm.email.trim()
      ) {

        alert(
          'Please enter your email.'
        );

        return;

      }


      try {

        setSavingProfile(true);


        await update(
          ref(
            db,
            `users/${user.uid}`
          ),
          {

            fullName:
              profileForm.fullName.trim(),

            email:
              profileForm.email.trim(),

            phone:
              profileForm.phone.trim(),

            specialization:
              profileForm.specialization.trim(),

            address:
              profileForm.address.trim(),

            barCouncilNumber:
              profileForm.barCouncilNumber.trim(),

            updatedAt:
              new Date().toISOString()

          }
        );


        setLawyerProfile(
          (prev) => ({

            ...prev,

            fullName:
              profileForm.fullName.trim(),

            email:
              profileForm.email.trim(),

            phone:
              profileForm.phone.trim(),

            specialization:
              profileForm.specialization.trim(),

            address:
              profileForm.address.trim(),

            barCouncilNumber:
              profileForm.barCouncilNumber.trim()

          })
        );


        setShowEditProfile(false);


        alert(
          'Profile updated successfully!'
        );

      } catch (error) {

        console.error(
          'PROFILE UPDATE ERROR:',
          error
        );

        alert(
          `Unable to update profile: ${error.message}`
        );

      } finally {

        setSavingProfile(false);

      }

    };


  // ============================================================
  // HELPERS
  // ============================================================

  const unreadCount =
    notifications.filter(
      (notification) =>
        notification.read !== true
    ).length;


  const getStatusClass =
    (status) => {

      return String(
        status || 'unknown'
      )
        .trim()
        .toLowerCase()
        .replace(/[_\s]+/g, '-')
        .replace(/-+/g, '-');

    };


  const getCaseTitle =
    (caseItem) => {

      return (
        caseItem.title ||
        caseItem.caseTitle ||
        caseItem.caseType ||
        'Case'
      );

    };


  const getHearingDate =
    (caseItem) => {

      return (
        caseItem.hearingDate ||
        caseItem.nextHearingDate ||
        caseItem.next_hearing_date ||
        caseItem.hearing_date ||
        caseItem.nextHearing ||
        ''
      );

    };


  const getHearingTime =
    (caseItem) => {

      return (
        caseItem.hearingTime ||
        caseItem.nextHearingTime ||
        caseItem.next_hearing_time ||
        caseItem.hearing_time ||
        ''
      );

    };


  const formatHearingDate =
    (date) => {

      if (!date) {
        return 'Date not available';
      }


      const parsedDate =
        new Date(date);


      if (
        Number.isNaN(
          parsedDate.getTime()
        )
      ) {

        return date;

      }


      return parsedDate.toLocaleDateString(
        'en-PK',
        {

          day: '2-digit',
          month: 'short',
          year: 'numeric'

        }
      );

    };


  // ============================================================
  // FORMAT NOTIFICATION TIME
  // ============================================================

  const formatNotificationTime =
    (timestamp) => {

      if (!timestamp) {
        return 'Just now';
      }


      const date =
        new Date(timestamp);


      if (
        Number.isNaN(
          date.getTime()
        )
      ) {

        return String(timestamp);

      }


      return date.toLocaleString(
        'en-PK',
        {

          day: '2-digit',
          month: 'short',
          year: 'numeric',

          hour: '2-digit',
          minute: '2-digit'

        }
      );

    };


  // ============================================================
  // STAT CARDS
  // ============================================================

  const statCards = [

    {
      icon:
        <FaBriefcase />,

      label:
        'Assigned Cases',

      value:
        stats.assigned,

      color:
        '#4A6CF7',

      path:
        '/lawyer/assigned-cases'
    },


    {
      icon:
        <FaCalendarAlt />,

      label:
        'Upcoming Hearings',

      value:
        stats.upcoming,

      color:
        '#FF9A56',

      path:
        HEARINGS_ROUTE
    },


    {
      icon:
        <FaCheckCircle />,

      label:
        'Completed Cases',

      value:
        stats.completed,

      color:
        '#00A651',

      path:
        '/lawyer/assigned-cases'
    }

  ];


  // ============================================================
  // QUICK ACTIONS
  // ============================================================

  const quickActions = [

    {
      icon:
        <FaPlus />,

      label:
        'File New Case',

      path:
        FILE_CASE_ROUTE,

      color:
        '#0288D1'
    },


    {
      icon:
        <FaGavel />,

      label:
        'View All Cases',

      path:
        '/lawyer/assigned-cases',

      color:
        '#4A6CF7'
    },


    {
      icon:
        <FaCalendarAlt />,

      label:
        'View Hearing Schedule',

      path:
        HEARINGS_ROUTE,

      color:
        '#FF9A56'
    }

  ];


  // ============================================================
  // AUTH LOADING SCREEN
  // ============================================================

  if (authLoading) {

    return (

      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'linear-gradient(135deg,#E3F2FD,#90CAF9)',
          fontFamily:
            'Arial, sans-serif'
        }}
      >

        <div
          style={{
            background: 'white',
            padding: '30px 40px',
            borderRadius: '16px',
            boxShadow:
              '0 15px 40px rgba(0,0,0,.12)',
            textAlign: 'center'
          }}
        >

          <div
            style={{
              fontSize: '18px',
              fontWeight: '700',
              color: '#172033'
            }}
          >
            Loading Lawyer Dashboard...
          </div>

          <div
            style={{
              marginTop: '8px',
              color: '#64748B',
              fontSize: '14px'
            }}
          >
            Checking your account
          </div>

        </div>

      </div>

    );

  }


  // ============================================================
  // MAIN UI
  // ============================================================

  return (

    <>

      <style>{`

        * {
          box-sizing: border-box;
        }

        .lawyer-dashboard-page {
          min-height: 100vh;
          padding: 32px;

          background:
            radial-gradient(
              circle at 10% 10%,
              rgba(255,255,255,.9),
              transparent 28%
            ),
            linear-gradient(
              135deg,
              #E3F2FD 0%,
              #BBDEFB 50%,
              #90CAF9 100%
            );
        }

        .dashboard-container {
          position: relative;
          max-width: 1250px;
          margin: auto;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          margin-bottom: 28px;
        }

        .dashboard-title h1 {
          margin: 0 0 6px;
          color: #172033;
          font-size: 2.2rem;
          font-weight: 800;
        }

        .dashboard-title p {
          margin: 0;
          color: #64748B;
          font-size: 1rem;
          font-weight: 500;
        }

        .lawyer-profile {
          margin-top: 8px;
          display: flex;
          align-items: center;
          gap: 7px;
          color: #0288D1;
          font-size: .85rem;
          font-weight: 700;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .file-new-case-btn,
        .edit-profile-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 17px;
          border: none;
          border-radius: 10px;
          color: white;
          text-decoration: none;
          font-size: .85rem;
          font-weight: 700;
          cursor: pointer;
          transition: .25s ease;
        }

        .file-new-case-btn {
          background: #00A651;
          box-shadow:
            0 7px 18px
            rgba(0,166,81,.22);
        }

        .file-new-case-btn:hover {
          background: #008A44;
          transform: translateY(-2px);
        }

        .edit-profile-btn {
          background: #0288D1;
          box-shadow:
            0 7px 18px
            rgba(2,136,209,.22);
        }

        .edit-profile-btn:hover {
          background: #0277BD;
          transform: translateY(-2px);
        }

        .notif-btn {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background:
            rgba(255,255,255,.9);

          display: flex;
          align-items: center;
          justify-content: center;

          color: #172033;
          text-decoration: none;
          position: relative;

          box-shadow:
            0 8px 22px
            rgba(15,23,42,.10);

          transition: .25s ease;
        }

        .notif-btn:hover {
          transform: translateY(-3px);
          background: white;
        }

        .notif-badge {
          position: absolute;
          top: -5px;
          right: -5px;

          min-width: 21px;
          height: 21px;

          display: flex;
          align-items: center;
          justify-content: center;

          background: #EF4444;
          color: white;

          border-radius: 50%;
          padding: 2px 6px;

          font-size: 11px;
          font-weight: 800;

          border: 2px solid white;
        }

        .stats-grid {
          display: grid;
          grid-template-columns:
            repeat(3, 1fr);
          gap: 18px;
          margin-bottom: 24px;
        }

        .stat-link {
          text-decoration: none;
        }

        .stat-card {
          min-height: 120px;
          padding: 22px;

          display: flex;
          align-items: center;
          gap: 15px;

          background:
            rgba(255,255,255,.92) !important;

          border:
            1px solid
            rgba(255,255,255,.9) !important;

          border-radius: 18px;

          box-shadow:
            0 12px 35px
            rgba(15,23,42,.10) !important;

          transition: .25s ease;
        }

        .stat-card:hover {
          transform: translateY(-5px);
        }

        .stat-icon {
          width: 55px;
          height: 55px;
          min-width: 55px;

          border-radius: 15px;

          display: flex;
          align-items: center;
          justify-content: center;

          font-size: 1.35rem;
        }

        .stat-info {
          display: flex;
          flex-direction: column;
        }

        .stat-value {
          color: #172033;
          font-size: 1.9rem;
          font-weight: 800;
          line-height: 1.1;
        }

        .stat-label {
          margin-top: 5px;
          color: #64748B;
          font-size: .84rem;
          font-weight: 600;
        }

        .request-card,
        .chart-card,
        .recent-card,
        .notifications-card,
        .hearing-card {

          padding: 22px;

          background:
            rgba(255,255,255,.92) !important;

          border-radius: 18px;

          box-shadow:
            0 12px 35px
            rgba(15,23,42,.10) !important;

        }

        .request-card {
          margin-bottom: 24px;
        }

        .request-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          margin-bottom: 18px;
        }

        .request-header h3,
        .card-header h3,
        .recent-card h3,
        .hearing-card h3 {

          margin: 0;
          color: #172033;

        }

        .request-count {
          padding: 6px 12px;
          border-radius: 30px;
          background: #E3F2FD;
          color: #0288D1;
          font-size: .8rem;
          font-weight: 800;
        }

        .request-item {
          padding: 18px;
          border:
            1px solid #D1E8F5;
          border-radius: 14px;
          margin-bottom: 12px;
          background: #F8FCFF;
        }

        .request-item:last-child {
          margin-bottom: 0;
        }

        .request-info {
          display: grid;
          grid-template-columns:
            repeat(2, 1fr);
          gap: 10px;
          margin-bottom: 15px;
        }

        .request-info div {
          color: #475569;
          font-size: .9rem;
        }

        .request-info strong {
          color: #0288D1;
        }

        .request-description {
          color: #475569;
          margin-bottom: 16px;
          line-height: 1.5;
        }

        .request-actions {
          display: flex;
          gap: 10px;
        }

        .accept-btn,
        .reject-btn {
          border: none;
          padding: 10px 17px;
          border-radius: 9px;
          color: white;
          cursor: pointer;
          font-weight: 700;

          display: inline-flex;
          align-items: center;
          gap: 7px;

          transition: .2s ease;
        }

        .accept-btn {
          background: #00A651;
        }

        .accept-btn:hover {
          background: #008A44;
          transform: translateY(-2px);
        }

        .reject-btn {
          background: #D32F2F;
        }

        .reject-btn:hover {
          background: #B71C1C;
          transform: translateY(-2px);
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns:
            1fr 1fr;
          gap: 22px;
          margin-bottom: 22px;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 18px;
        }

        .view-all-link {
          display: inline-flex;
          align-items: center;
          gap: 5px;

          color: #0288D1;
          text-decoration: none;

          font-size: .85rem;
          font-weight: 700;
        }

        .assigned-cases-list,
        .hearing-list {
          display: flex;
          flex-direction: column;
          gap: 9px;
        }

        .case-item,
        .hearing-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;

          padding: 12px;
          background: #F5F7FA;
          border-radius: 10px;
        }

        .case-info {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .case-id {
          color: #0288D1;
          font-size: .8rem;
          font-weight: 800;
          white-space: nowrap;
        }

        .case-title {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;

          color: #172033;
          font-size: .85rem;
          font-weight: 600;
        }

        .status-badge {
          padding: 5px 9px;
          border-radius: 20px;

          background: #E3F2FD;
          color: #0288D1;

          font-size: .72rem;
          font-weight: 800;

          white-space: nowrap;
        }

        .status-badge.completed,
        .status-badge.closed,
        .status-badge.resolved,
        .status-badge.decided {

          background: #E8F5E9;
          color: #008A50;

        }

        .status-badge.pending,
        .status-badge.submitted,
        .status-badge.filed,
        .status-badge.pending-lawyer-selection {

          background: #FFF3E0;
          color: #D97706;

        }

        .hearing-item {
          background: #FFF8EF;
          border: 1px solid #FFE1C2;
        }

        .hearing-info {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .hearing-icon {
          width: 42px;
          height: 42px;
          min-width: 42px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #FFF0E1;
          color: #F57C00;
        }

        .hearing-details {
          min-width: 0;
        }

        .hearing-case-id {
          color: #0288D1;
          font-size: .78rem;
          font-weight: 800;
        }

        .hearing-case-title {
          color: #172033;
          font-size: .85rem;
          font-weight: 700;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .hearing-date {
          margin-top: 3px;
          color: #64748B;
          font-size: .76rem;
        }

        .hearing-time {
          padding: 6px 9px;
          border-radius: 8px;
          background: #FFEBD7;
          color: #C65D00;
          font-size: .75rem;
          font-weight: 800;
          white-space: nowrap;
        }

        .quick-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 18px;
        }

        .action-btn {
          padding: 13px;
          border-radius: 10px;
          text-decoration: none;
          color: #222;
          font-weight: 700;
          transition: .2s ease;
        }

        .action-btn:hover {
          transform: translateX(4px);
        }

        /* ======================================================
           NOTIFICATIONS
        ====================================================== */

        .notification-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .notification-item {
          display: flex;
          gap: 10px;
          padding: 14px;
          border-radius: 10px;
          background: #F8FAFC;
          border: 1px solid #EEF2F7;
          transition: .2s ease;
        }

        .notification-item:hover {
          transform: translateX(2px);
          background: #F1F8FC;
        }

        .notification-item.unread {
          background: #EAF7FF;
          border-left:
            4px solid #0288D1;
        }

        .notification-dot {
          width: 9px;
          height: 9px;
          min-width: 9px;
          margin-top: 6px;
          border-radius: 50%;
          background: #CBD5E1;
        }

        .notification-item.unread
        .notification-dot {
          background: #0288D1;
        }

        .notification-content {
          flex: 1;
          min-width: 0;
        }

        .notification-title {
          margin: 0 0 4px;
          color: #172033;
          font-size: .88rem;
          font-weight: 800;
        }

        .notification-message {
          margin: 0 0 5px;
          color: #475569;
          font-size: .84rem;
          line-height: 1.45;
        }

        .notification-case {
          display: inline-block;
          margin-bottom: 5px;
          padding: 3px 7px;
          border-radius: 6px;
          background: #E3F2FD;
          color: #0288D1;
          font-size: .7rem;
          font-weight: 800;
        }

        .notification-time {
          color: #94A3B8;
          font-size: .72rem;
        }

        .notification-live {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 9px;
          border-radius: 20px;
          background: #E8F5E9;
          color: #008A44;
          font-size: .7rem;
          font-weight: 800;
        }

        .notification-live-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #00A651;
        }

        .no-data {
          margin: 0;
          padding: 20px 5px;
          color: #64748B;
          text-align: center;
        }

        .profile-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;

          background:
            rgba(15,23,42,.55);

          display: flex;
          align-items: center;
          justify-content: center;

          padding: 20px;
        }

        .profile-modal {
          width: 100%;
          max-width: 650px;
          max-height: 90vh;

          overflow-y: auto;

          background: white;
          border-radius: 18px;

          box-shadow:
            0 25px 70px
            rgba(15,23,42,.25);
        }

        .profile-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;

          padding: 20px 24px;

          border-bottom:
            1px solid #E2E8F0;

          background: #F8FCFF;
        }

        .profile-modal-header h2 {
          margin: 0;
          color: #172033;
          font-size: 1.3rem;
        }

        .close-profile-btn {
          width: 36px;
          height: 36px;

          border: none;
          border-radius: 8px;

          background: #F1F5F9;
          color: #475569;

          cursor: pointer;

          display: flex;
          align-items: center;
          justify-content: center;
        }

        .profile-form {
          padding: 24px;
        }

        .profile-form-grid {
          display: grid;
          grid-template-columns:
            1fr 1fr;
          gap: 16px;
        }

        .profile-form-group {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .profile-form-group.full-width {
          grid-column: 1 / -1;
        }

        .profile-form-group label {
          color: #334155;
          font-size: .82rem;
          font-weight: 700;
        }

        .profile-form-group input,
        .profile-form-group textarea {
          width: 100%;
          padding: 12px 13px;
          border:
            1px solid #CBD5E1;
          border-radius: 9px;
          outline: none;
          font-family: inherit;
          font-size: .9rem;
          color: #172033;
          background: #fff;
        }

        .profile-form-group textarea {
          min-height: 85px;
          resize: vertical;
        }

        .profile-form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 22px;
          padding-top: 18px;
          border-top:
            1px solid #E2E8F0;
        }

        .profile-cancel-btn,
        .profile-save-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;

          padding: 11px 18px;

          border: none;
          border-radius: 9px;

          font-weight: 700;
          cursor: pointer;
        }

        .profile-cancel-btn {
          background: #F1F5F9;
          color: #475569;
        }

        .profile-save-btn {
          background: #0288D1;
          color: white;
        }

        .profile-save-btn:disabled {
          opacity: .6;
          cursor: not-allowed;
        }

        @media (max-width: 1000px) {

          .stats-grid {
            grid-template-columns:
              repeat(3, 1fr);
          }

        }

        @media (max-width: 800px) {

          .dashboard-grid {
            grid-template-columns: 1fr;
          }

          .dashboard-header {
            align-items: flex-start;
          }

        }

        @media (max-width: 600px) {

          .lawyer-dashboard-page {
            padding: 18px;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .dashboard-header {
            flex-direction: column;
          }

          .dashboard-title h1 {
            font-size: 1.7rem;
          }

          .request-info {
            grid-template-columns: 1fr;
          }

          .request-actions {
            flex-direction: column;
          }

          .accept-btn,
          .reject-btn {
            justify-content: center;
          }

          .case-item,
          .hearing-item {
            align-items: flex-start;
            flex-direction: column;
          }

          .header-actions {
            width: 100%;
            justify-content: space-between;
          }

          .file-new-case-btn,
          .edit-profile-btn {
            flex: 1;
          }

          .profile-form-grid {
            grid-template-columns: 1fr;
          }

          .profile-form-group.full-width {
            grid-column: auto;
          }

          .profile-form-actions {
            flex-direction: column;
          }

          .profile-cancel-btn,
          .profile-save-btn {
            width: 100%;
          }

        }

      `}</style>


      <div className="lawyer-dashboard-page">

        <div className="dashboard-container">


          {/* ==================================================
              HEADER
          ================================================== */}

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

                {lawyerProfile?.fullName ||
                  user?.displayName ||
                  'Lawyer'}

              </h1>

              <p>
                Manage your cases, client requests and hearings
              </p>

              {lawyerProfile?.specialization && (

                <div className="lawyer-profile">

                  <FaUserTie />

                  {lawyerProfile.specialization}

                </div>

              )}

            </div>


            <div className="header-actions">

              <Link
                to={FILE_CASE_ROUTE}
                className="file-new-case-btn"
              >

                <FaPlus />

                File New Case

              </Link>


              <button
                type="button"
                className="edit-profile-btn"
                onClick={
                  handleEditProfile
                }
              >

                <FaEdit />

                Edit Profile

              </button>


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

            </div>

          </motion.div>


          {/* ==================================================
              STATS
          ================================================== */}

          <div className="stats-grid">

            {statCards.map(
              (stat, index) => (

                <motion.div
                  key={stat.label}

                  initial={{
                    opacity: 0,
                    y: 20
                  }}

                  animate={{
                    opacity: 1,
                    y: 0
                  }}

                  transition={{
                    delay: index * .1
                  }}
                >

                  <Link
                    to={stat.path}
                    className="stat-link"
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


                      <div className="stat-info">

                        <span className="stat-value">

                          {loadingCases
                            ? '...'
                            : stat.value}

                        </span>

                        <span className="stat-label">

                          {stat.label}

                        </span>

                      </div>

                    </GlassCard>

                  </Link>

                </motion.div>

              )
            )}

          </div>


          {/* ==================================================
              CLIENT LAWYER REQUESTS
          ================================================== */}

          <GlassCard
            className="request-card"
          >

            <div className="request-header">

              <h3>
                Client Lawyer Requests
              </h3>

              <span className="request-count">

                {requests.length} Pending

              </span>

            </div>


            {requests.length === 0 ? (

              <p className="no-data">

                No pending lawyer requests.

              </p>

            ) : (

              requests.map(
                (request) => (

                  <div
                    key={request.id}
                    className="request-item"
                  >

                    <div className="request-info">

                      <div>

                        <strong>
                          Citizen:
                        </strong>{' '}

                        {request.citizenName ||
                          request.citizen ||
                          'Citizen'}

                      </div>


                      <div>

                        <strong>
                          Case ID:
                        </strong>{' '}

                        {request.caseId ||
                          'N/A'}

                      </div>


                      <div>

                        <strong>
                          Case Type:
                        </strong>{' '}

                        {request.caseType ||
                          'N/A'}

                      </div>


                      <div>

                        <strong>
                          Priority:
                        </strong>{' '}

                        {request.priority ||
                          'N/A'}

                      </div>


                      <div>

                        <strong>
                          Lawyer Type:
                        </strong>{' '}

                        {request.lawyerType ||
                          'N/A'}

                      </div>

                    </div>


                    <div className="request-description">

                      <strong>
                        Description:
                      </strong>

                      <br />

                      {request.description ||
                        'No description provided.'}

                    </div>


                    <div className="request-actions">

                      <button
                        type="button"
                        className="accept-btn"

                        onClick={() =>
                          handleAcceptRequest(
                            request
                          )
                        }
                      >

                        <FaCheck />

                        Accept Request

                      </button>


                      <button
                        type="button"
                        className="reject-btn"

                        onClick={() =>
                          handleRejectRequest(
                            request
                          )
                        }
                      >

                        <FaTimes />

                        Reject Request

                      </button>

                    </div>

                  </div>

                )
              )

            )}

          </GlassCard>


          {/* ==================================================
              HEARINGS + RECENT CASES
          ================================================== */}

          <div className="dashboard-grid">


            {/* UPCOMING HEARINGS */}

            <GlassCard
              className="hearing-card"
            >

              <div className="card-header">

                <h3>
                  Upcoming Hearings
                </h3>

                <Link
                  to={HEARINGS_ROUTE}
                  className="view-all-link"
                >

                  View All

                  <FaEye />

                </Link>

              </div>


              <div className="hearing-list">

                {loadingCases ? (

                  <p className="no-data">
                    Loading hearings...
                  </p>

                ) : upcomingHearings.length > 0 ? (

                  upcomingHearings
                    .slice(0, 5)
                    .map(
                      (caseItem) => (

                        <div
                          key={caseItem.id}
                          className="hearing-item"
                        >

                          <div className="hearing-info">

                            <div className="hearing-icon">

                              <FaCalendarAlt />

                            </div>


                            <div className="hearing-details">

                              <div className="hearing-case-id">

                                {caseItem.id}

                              </div>


                              <div className="hearing-case-title">

                                {getCaseTitle(
                                  caseItem
                                )}

                              </div>


                              <div className="hearing-date">

                                {formatHearingDate(
                                  getHearingDate(
                                    caseItem
                                  )
                                )}

                              </div>

                            </div>

                          </div>


                          <div className="hearing-time">

                            {getHearingTime(
                              caseItem
                            ) || 'Time TBA'}

                          </div>

                        </div>

                      )
                    )

                ) : (

                  <p className="no-data">

                    No upcoming hearings.

                  </p>

                )}

              </div>

            </GlassCard>


            {/* RECENT CASES */}

            <GlassCard
              className="chart-card"
            >

              <div className="card-header">

                <h3>
                  Recent Assigned Cases
                </h3>

                <Link
                  to="/lawyer/assigned-cases"
                  className="view-all-link"
                >

                  View All

                  <FaEye />

                </Link>

              </div>


              <div className="assigned-cases-list">

                {loadingCases ? (

                  <p className="no-data">
                    Loading cases...
                  </p>

                ) : recentCases.length > 0 ? (

                  recentCases.map(
                    (caseItem) => (

                      <div
                        key={caseItem.id}
                        className="case-item"
                      >

                        <div className="case-info">

                          <span className="case-id">

                            {caseItem.id}

                          </span>

                          <span className="case-title">

                            {getCaseTitle(
                              caseItem
                            )}

                          </span>

                        </div>


                        <span
                          className={
                            `status-badge ${
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

                    )
                  )

                ) : (

                  <p className="no-data">

                    No assigned cases yet.

                  </p>

                )}

              </div>

            </GlassCard>

          </div>


          {/* ==================================================
              QUICK ACTIONS
          ================================================== */}

          <GlassCard
            className="recent-card"
            style={{
              marginBottom: '22px'
            }}
          >

            <h3>
              Quick Actions
            </h3>


            <div className="quick-actions">

              {quickActions.map(
                (action) => (

                  <Link
                    key={action.label}
                    to={action.path}
                    className="action-btn"

                    style={{
                      backgroundColor:
                        `${action.color}10`,

                      border:
                        `1px solid ${action.color}40`
                    }}
                  >

                    <span
                      style={{
                        color:
                          action.color,

                        marginRight:
                          '.5rem'
                      }}
                    >

                      {action.icon}

                    </span>

                    {action.label}

                  </Link>

                )
              )}

            </div>

          </GlassCard>


          {/* ==================================================
              REAL-TIME NOTIFICATIONS
          ================================================== */}

          <GlassCard
            className="notifications-card"
          >

            <div className="card-header">

              <h3>
                Recent Notifications
              </h3>


              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >

                <span className="notification-live">

                  <span className="notification-live-dot" />

                  Live

                </span>


                <Link
                  to="/notifications"
                  className="view-all-link"
                >

                  View All

                </Link>

              </div>

            </div>


            <div className="notification-list">

              {notificationLoading ? (

                <p className="no-data">

                  Loading notifications...

                </p>

              ) : notifications.length === 0 ? (

                <p className="no-data">

                  No notifications.

                </p>

              ) : (

                notifications.map(
                  (notification) => (

                    <div
                      key={notification.id}
                      className={
                        `notification-item ${
                          notification.read !== true
                            ? 'unread'
                            : ''
                        }`
                      }
                    >

                      <div className="notification-dot" />


                      <div className="notification-content">

                        <p className="notification-title">

                          {notification.title ||
                            'Notification'}

                        </p>


                        {notification.caseId && (

                          <span className="notification-case">

                            Case ID: {notification.caseId}

                          </span>

                        )}


                        <p className="notification-message">

                          {notification.message ||
                            'You have a new notification.'}

                        </p>


                        <span className="notification-time">

                          {formatNotificationTime(
                            notification.timestamp ||
                            notification.createdAt
                          )}

                        </span>

                      </div>

                    </div>

                  )
                )

              )}

            </div>

          </GlassCard>

        </div>

      </div>


      {/* ======================================================
          EDIT PROFILE MODAL
      ====================================================== */}

      {showEditProfile && (

        <div
          className="profile-modal-overlay"

          onClick={() =>
            setShowEditProfile(false)
          }
        >

          <div
            className="profile-modal"

            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="profile-modal-header">

              <h2>
                Edit Lawyer Profile
              </h2>


              <button
                type="button"
                className="close-profile-btn"

                onClick={() =>
                  setShowEditProfile(false)
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

              <div className="profile-form-grid">


                <div className="profile-form-group">

                  <label>
                    Full Name *
                  </label>

                  <input
                    type="text"
                    name="fullName"

                    value={
                      profileForm.fullName
                    }

                    onChange={
                      handleProfileChange
                    }

                    placeholder="Enter your full name"

                    required
                  />

                </div>


                <div className="profile-form-group">

                  <label>
                    Email *
                  </label>

                  <input
                    type="email"
                    name="email"

                    value={
                      profileForm.email
                    }

                    onChange={
                      handleProfileChange
                    }

                    placeholder="Enter your email"

                    required
                  />

                </div>


                <div className="profile-form-group">

                  <label>
                    Phone Number
                  </label>

                  <input
                    type="text"
                    name="phone"

                    value={
                      profileForm.phone
                    }

                    onChange={
                      handleProfileChange
                    }

                    placeholder="Enter phone number"
                  />

                </div>


                <div className="profile-form-group">

                  <label>
                    Specialization
                  </label>

                  <input
                    type="text"
                    name="specialization"

                    value={
                      profileForm.specialization
                    }

                    onChange={
                      handleProfileChange
                    }

                    placeholder="e.g. Criminal Law"
                  />

                </div>


                <div className="profile-form-group">

                  <label>
                    Bar Council Number
                  </label>

                  <input
                    type="text"
                    name="barCouncilNumber"

                    value={
                      profileForm.barCouncilNumber
                    }

                    onChange={
                      handleProfileChange
                    }

                    placeholder="Enter Bar Council number"
                  />

                </div>


                <div className="profile-form-group full-width">

                  <label>
                    Address
                  </label>

                  <textarea
                    name="address"

                    value={
                      profileForm.address
                    }

                    onChange={
                      handleProfileChange
                    }

                    placeholder="Enter your address"
                  />

                </div>

              </div>


              <div className="profile-form-actions">

                <button
                  type="button"
                  className="profile-cancel-btn"

                  onClick={() =>
                    setShowEditProfile(false)
                  }
                >

                  <FaTimes />

                  Cancel

                </button>


                <button
                  type="submit"
                  className="profile-save-btn"

                  disabled={
                    savingProfile
                  }
                >

                  <FaSave />

                  {savingProfile
                    ? 'Saving...'
                    : 'Update Profile'}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </>

  );

};


export default LawyerDashboard;