import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import {
  FaArrowLeft,
  FaSearch,
  FaEye,
  FaFilter,
  FaSortAmountDown,
  FaBriefcase,
  FaCalendarAlt,
  FaRobot,
  FaClock,
  FaCheckCircle,
  FaExclamationTriangle
} from 'react-icons/fa';

import {
  ref,
  onValue,
  off
} from 'firebase/database';

import {
  onAuthStateChanged
} from 'firebase/auth';

import {
  query,
  orderByChild,
  equalTo
} from 'firebase/database';

import {
  auth,
  db
} from '../../../firebase';


const AllCases = () => {

  const navigate = useNavigate();

  // ============================================================
  // AUTH
  // ============================================================

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ============================================================
  // DATA
  // ============================================================

  const [cases, setCases] = useState([]);
  const [hearings, setHearings] = useState([]);

  const [casesLoading, setCasesLoading] =
    useState(true);

  const [hearingsLoading, setHearingsLoading] =
    useState(true);

  // ============================================================
  // SEARCH / FILTER
  // ============================================================

  const [searchTerm, setSearchTerm] =
    useState('');

  const [statusFilter, setStatusFilter] =
    useState('All');

  const [priorityFilter, setPriorityFilter] =
    useState('All');

  const [typeFilter, setTypeFilter] =
    useState('All');

  const [sortBy, setSortBy] =
    useState('newest');


  // ============================================================
  // AUTH LISTENER
  // ============================================================

  useEffect(() => {

    const unsubscribe =
      onAuthStateChanged(
        auth,
        (currentUser) => {

          if (currentUser) {

            setUser(currentUser);
            setLoading(false);

          } else {

            setUser(null);
            setLoading(false);

            navigate('/login');
          }
        },
        (error) => {

          console.error(
            'AUTH ERROR:',
            error
          );

          setUser(null);
          setLoading(false);

          navigate('/login');
        }
      );

    return () => unsubscribe();

  }, [navigate]);


  // ============================================================
  // LOAD ASSIGNED CASES
  //
  // IMPORTANT:
  //
  // Admin saves:
  //
  // assignedJudge   = real judge name
  // assignedJudgeId = Firebase UID
  //
  // Therefore use assignedJudgeId here.
  // ============================================================

  useEffect(() => {

    if (!user) {
      return;
    }

    setCasesLoading(true);

    const casesRef =
      ref(db, 'cases');

    const judgeCasesQuery =
      query(
        casesRef,
        orderByChild('assignedJudgeId'),
        equalTo(user.uid)
      );


    const unsubscribe =
      onValue(
        judgeCasesQuery,
        (snapshot) => {

          const data =
            snapshot.val();

          if (!data) {

            setCases([]);
            setCasesLoading(false);

            return;
          }


          const caseList =
            Object.entries(data)
              .map(
                ([id, caseData]) => ({
                  id,
                  ...(caseData || {})
                })
              );


          console.log(
            'CASES ASSIGNED TO JUDGE:',
            caseList
          );


          setCases(caseList);
          setCasesLoading(false);

        },
        (error) => {

          console.error(
            'ASSIGNED CASES ERROR:',
            error
          );

          setCases([]);
          setCasesLoading(false);
        }
      );


    return () => {

      off(
        judgeCasesQuery
      );

      unsubscribe();

    };

  }, [user]);


  // ============================================================
  // LOAD HEARINGS
  // ============================================================

  useEffect(() => {

    if (!user) {
      return;
    }

    setHearingsLoading(true);

    const hearingsRef =
      ref(db, 'hearings');


    const unsubscribe =
      onValue(
        hearingsRef,
        (snapshot) => {

          const data =
            snapshot.val();


          if (!data) {

            setHearings([]);
            setHearingsLoading(false);

            return;
          }


          const hearingList =
            Object.entries(data)
              .map(
                ([id, hearing]) => ({
                  id,
                  ...(hearing || {})
                })
              );


          setHearings(
            hearingList
          );

          setHearingsLoading(false);

        },
        (error) => {

          console.error(
            'HEARINGS ERROR:',
            error
          );

          setHearings([]);
          setHearingsLoading(false);
        }
      );


    return () => {

      off(
        hearingsRef
      );

      unsubscribe();

    };

  }, [user]);


  // ============================================================
  // HELPERS
  // ============================================================

  const normalizeStatus = (
    status
  ) => {

    return String(
      status || ''
    )
      .trim()
      .toLowerCase()
      .replace(/[_-]/g, ' ');
  };


  const getCaseTitle = (
    caseItem
  ) => {

    return (
      caseItem.title ||
      caseItem.caseTitle ||
      caseItem.subject ||
      caseItem.caseNumber ||
      'Court Case'
    );
  };


  const getCaseType = (
    caseItem
  ) => {

    return (
      caseItem.caseType ||
      caseItem.type ||
      caseItem.case_type ||
      'General'
    );
  };


  const getPriority = (
    caseItem
  ) => {

    return (
      caseItem.predictedPriority ||
      caseItem.priority ||
      caseItem.assignmentPriority ||
      'Normal'
    );
  };


  const getStatus = (
    caseItem
  ) => {

    return (
      caseItem.status ||
      'Pending'
    );
  };


  const getCaseNumber = (
    caseItem
  ) => {

    return (
      caseItem.caseNumber ||
      caseItem.caseId ||
      caseItem.id
    );
  };


  const getHearingCaseId = (
    hearing
  ) => {

    return (
      hearing.caseId ||
      hearing.caseID ||
      hearing.case_id ||
      hearing.case ||
      hearing.caseNumber ||
      ''
    );
  };


  // ============================================================
  // FIND HEARING FOR CASE
  // ============================================================

  const findHearingForCase = (
    caseItem
  ) => {

    const caseId =
      String(
        caseItem.id || ''
      );

    const caseNumber =
      String(
        caseItem.caseNumber ||
        caseItem.caseId ||
        ''
      );


    return hearings.find(
      (hearing) => {

        const hearingCaseId =
          String(
            getHearingCaseId(
              hearing
            )
          );


        if (
          hearingCaseId ===
          caseId
        ) {
          return true;
        }


        if (
          caseNumber &&
          hearingCaseId ===
          caseNumber
        ) {
          return true;
        }


        return false;
      }
    );
  };


  // ============================================================
  // FORMAT DATE
  // ============================================================

  const formatDate = (
    value
  ) => {

    if (!value) {
      return 'N/A';
    }


    try {

      const date =
        new Date(value);


      if (
        Number.isNaN(
          date.getTime()
        )
      ) {

        return String(value);
      }


      return date.toLocaleDateString(
        'en-US',
        {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }
      );

    } catch {

      return String(value);

    }
  };


  // ============================================================
  // GET CASE DATE
  // ============================================================

  const getCaseDate = (
    caseItem
  ) => {

    const value =
      caseItem.createdAt ||
      caseItem.created_at ||
      caseItem.filingDate ||
      caseItem.filing_date ||
      caseItem.timestamp ||
      '';


    if (
      typeof value ===
      'object' &&
      value !== null &&
      value.seconds
    ) {

      return (
        Number(value.seconds) *
        1000
      );
    }


    const parsed =
      new Date(value).getTime();


    return Number.isNaN(parsed)
      ? 0
      : parsed;
  };


  // ============================================================
  // FILTER OPTIONS
  // ============================================================

  const statusOptions =
    useMemo(() => {

      const values =
        cases
          .map(
            (item) =>
              getStatus(item)
          )
          .filter(Boolean);


      return [
        'All',
        ...Array.from(
          new Set(values)
        )
      ];

    }, [cases]);


  const priorityOptions =
    useMemo(() => {

      const values =
        cases
          .map(
            (item) =>
              getPriority(item)
          )
          .filter(Boolean);


      return [
        'All',
        ...Array.from(
          new Set(values)
        )
      ];

    }, [cases]);


  const typeOptions =
    useMemo(() => {

      const values =
        cases
          .map(
            (item) =>
              getCaseType(item)
          )
          .filter(Boolean);


      return [
        'All',
        ...Array.from(
          new Set(values)
        )
      ];

    }, [cases]);


  // ============================================================
  // FILTERED CASES
  // ============================================================

  const filteredCases =
    useMemo(() => {

      let result =
        [...cases];


      // --------------------------------------------------------
      // SEARCH
      // --------------------------------------------------------

      const search =
        searchTerm
          .trim()
          .toLowerCase();


      if (search) {

        result =
          result.filter(
            (caseItem) => {

              const title =
                getCaseTitle(
                  caseItem
                ).toLowerCase();

              const caseNumber =
                getCaseNumber(
                  caseItem
                )
                  .toString()
                  .toLowerCase();

              const type =
                getCaseType(
                  caseItem
                ).toLowerCase();

              const status =
                getStatus(
                  caseItem
                ).toLowerCase();

              const priority =
                getPriority(
                  caseItem
                ).toLowerCase();

              const citizen =
                String(
                  caseItem.citizenName ||
                  caseItem.citizen ||
                  ''
                ).toLowerCase();

              const defendant =
                String(
                  caseItem.defendantName ||
                  caseItem.defendant ||
                  ''
                ).toLowerCase();


              return (
                title.includes(search) ||
                caseNumber.includes(search) ||
                type.includes(search) ||
                status.includes(search) ||
                priority.includes(search) ||
                citizen.includes(search) ||
                defendant.includes(search)
              );
            }
          );
      }


      // --------------------------------------------------------
      // STATUS
      // --------------------------------------------------------

      if (
        statusFilter !==
        'All'
      ) {

        result =
          result.filter(
            (caseItem) =>
              String(
                getStatus(
                  caseItem
                )
              ).toLowerCase() ===
              String(
                statusFilter
              ).toLowerCase()
          );
      }


      // --------------------------------------------------------
      // PRIORITY
      // --------------------------------------------------------

      if (
        priorityFilter !==
        'All'
      ) {

        result =
          result.filter(
            (caseItem) =>
              String(
                getPriority(
                  caseItem
                )
              ).toLowerCase() ===
              String(
                priorityFilter
              ).toLowerCase()
          );
      }


      // --------------------------------------------------------
      // TYPE
      // --------------------------------------------------------

      if (
        typeFilter !==
        'All'
      ) {

        result =
          result.filter(
            (caseItem) =>
              String(
                getCaseType(
                  caseItem
                )
              ).toLowerCase() ===
              String(
                typeFilter
              ).toLowerCase()
          );
      }


      // --------------------------------------------------------
      // SORT
      // --------------------------------------------------------

      result.sort(
        (a, b) => {

          if (
            sortBy ===
            'oldest'
          ) {

            return (
              getCaseDate(a) -
              getCaseDate(b)
            );
          }


          if (
            sortBy ===
            'priority'
          ) {

            const priorityValue =
              (value) => {

                const text =
                  String(
                    value
                  ).toLowerCase();


                if (
                  text.includes(
                    'urgent'
                  )
                ) {
                  return 4;
                }

                if (
                  text.includes(
                    'high'
                  )
                ) {
                  return 3;
                }

                if (
                  text.includes(
                    'medium'
                  )
                ) {
                  return 2;
                }

                return 1;
              };


            return (
              priorityValue(
                getPriority(b)
              ) -
              priorityValue(
                getPriority(a)
              )
            );
          }


          return (
            getCaseDate(b) -
            getCaseDate(a)
          );
        }
      );


      return result;

    }, [
      cases,
      searchTerm,
      statusFilter,
      priorityFilter,
      typeFilter,
      sortBy
    ]);


  // ============================================================
  // STATISTICS
  // ============================================================

  const statistics =
    useMemo(() => {

      const total =
        cases.length;


      const pending =
        cases.filter(
          (item) => {

            const status =
              normalizeStatus(
                item.status
              );

            return (
              status === 'pending' ||
              status === 'assigned' ||
              status === 'under review'
            );
          }
        ).length;


      const inProgress =
        cases.filter(
          (item) => {

            const status =
              normalizeStatus(
                item.status
              );

            return (
              status === 'in progress' ||
              status === 'active'
            );
          }
        ).length;


      const completed =
        cases.filter(
          (item) => {

            const status =
              normalizeStatus(
                item.status
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


      const aiCases =
        cases.filter(
          (item) =>
            item.aiRecommended === true ||
            item.aiAssigned === true ||
            item.aiAnalyzed === true ||
            item.aiRecommendationScore !==
              undefined
        ).length;


      const urgent =
        cases.filter(
          (item) => {

            const priority =
              String(
                getPriority(item)
              ).toLowerCase();


            return (
              priority.includes(
                'urgent'
              ) ||
              priority.includes(
                'high'
              )
            );
          }
        ).length;


      return {
        total,
        pending,
        inProgress,
        completed,
        aiCases,
        urgent
      };

    }, [cases]);


  // ============================================================
  // VIEW CASE
  // ============================================================

  const handleViewCase = (
    caseItem
  ) => {

    navigate(
      `/judge-dashboard/case/${caseItem.id}`
    );
  };


  // ============================================================
  // VIEW HEARING
  // ============================================================

  const handleViewHearing = (
    hearing
  ) => {

    navigate(
      `/judge-dashboard/hearing/${hearing.id}`
    );
  };


  // ============================================================
  // RESET FILTERS
  // ============================================================

  const resetFilters = () => {

    setSearchTerm('');
    setStatusFilter('All');
    setPriorityFilter('All');
    setTypeFilter('All');
    setSortBy('newest');
  };


  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {

    return (

      <div className="all-cases-loading">

        <div className="all-cases-spinner"></div>

        <p>
          Loading Judge Cases...
        </p>

      </div>
    );
  }


  // ============================================================
  // UI
  // ============================================================

  return (

    <div className="all-cases-page">

      <style>{`

        * {
          box-sizing: border-box;
        }

        .all-cases-page {
          min-height: 100vh;
          background:
            linear-gradient(
              135deg,
              #f8fafc 0%,
              #eef6ff 100%
            );
          padding: 30px;
          color: #0f172a;
        }

        .all-cases-container {
          max-width: 1450px;
          margin: 0 auto;
        }

        /* =====================================================
           LOADING
        ===================================================== */

        .all-cases-loading {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #f8fafc;
          color: #475569;
        }

        .all-cases-spinner {
          width: 45px;
          height: 45px;
          border: 4px solid #dbeafe;
          border-top-color: #2563eb;
          border-radius: 50%;
          animation:
            allCasesSpin 1s linear infinite;
          margin-bottom: 15px;
        }

        @keyframes allCasesSpin {
          to {
            transform: rotate(360deg);
          }
        }

        /* =====================================================
           HEADER
        ===================================================== */

        .all-cases-header {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 25px;
        }

        .back-button {
          width: 45px;
          height: 45px;
          border: none;
          border-radius: 12px;
          background: white;
          color: #2563eb;
          box-shadow:
            0 4px 15px rgba(
              15,
              23,
              42,
              0.08
            );
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 17px;
        }

        .back-button:hover {
          background: #eff6ff;
        }

        .all-cases-header h1 {
          margin: 0 0 5px;
          font-size: 30px;
          font-weight: 800;
        }

        .all-cases-header p {
          margin: 0;
          color: #64748b;
          font-size: 14px;
        }

        /* =====================================================
           STATS
        ===================================================== */

        .all-cases-stats {
          display: grid;
          grid-template-columns:
            repeat(6, minmax(0, 1fr));
          gap: 15px;
          margin-bottom: 25px;
        }

        .all-cases-stat {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 18px;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow:
            0 4px 16px rgba(
              15,
              23,
              42,
              0.05
            );
        }

        .all-cases-stat-icon {
          width: 43px;
          height: 43px;
          border-radius: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #eff6ff;
          color: #2563eb;
          flex-shrink: 0;
        }

        .all-cases-stat strong {
          display: block;
          font-size: 22px;
          font-weight: 800;
        }

        .all-cases-stat span {
          color: #64748b;
          font-size: 11px;
        }

        /* =====================================================
           FILTER CARD
        ===================================================== */

        .filter-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 20px;
          margin-bottom: 25px;
          box-shadow:
            0 4px 16px rgba(
              15,
              23,
              42,
              0.05
            );
        }

        .filter-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 15px;
        }

        .filter-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 16px;
          font-weight: 800;
        }

        .filter-title svg {
          color: #2563eb;
        }

        .reset-button {
          border: none;
          background: transparent;
          color: #2563eb;
          cursor: pointer;
          font-size: 12px;
          font-weight: 700;
        }

        .filter-grid {
          display: grid;
          grid-template-columns:
            minmax(220px, 2fr)
            repeat(4, minmax(130px, 1fr));
          gap: 12px;
        }

        .search-box {
          position: relative;
        }

        .search-box svg {
          position: absolute;
          left: 13px;
          top: 50%;
          transform:
            translateY(-50%);
          color: #94a3b8;
        }

        .search-box input,
        .filter-select {
          width: 100%;
          height: 43px;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          background: white;
          padding: 0 12px;
          font-size: 13px;
          outline: none;
        }

        .search-box input {
          padding-left: 38px;
        }

        .search-box input:focus,
        .filter-select:focus {
          border-color: #60a5fa;
          box-shadow:
            0 0 0 3px #dbeafe;
        }

        /* =====================================================
           TABLE CARD
        ===================================================== */

        .cases-table-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          overflow: hidden;
          box-shadow:
            0 4px 16px rgba(
              15,
              23,
              42,
              0.05
            );
        }

        .table-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 20px;
          border-bottom: 1px solid #e2e8f0;
        }

        .table-header h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 800;
        }

        .result-count {
          color: #64748b;
          font-size: 12px;
        }

        .table-wrapper {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 950px;
        }

        thead {
          background: #f8fafc;
        }

        th {
          text-align: left;
          padding: 14px 16px;
          color: #64748b;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          white-space: nowrap;
        }

        td {
          padding: 15px 16px;
          border-top: 1px solid #f1f5f9;
          font-size: 13px;
          vertical-align: middle;
        }

        tbody tr:hover {
          background: #f8fafc;
        }

        .case-number {
          color: #2563eb;
          font-weight: 800;
        }

        .case-title {
          max-width: 250px;
          font-weight: 750;
          color: #0f172a;
        }

        .case-type {
          display: inline-block;
          padding: 5px 9px;
          border-radius: 8px;
          background: #eff6ff;
          color: #1d4ed8;
          font-size: 11px;
          font-weight: 700;
        }

        .status-badge {
          display: inline-block;
          padding: 5px 9px;
          border-radius: 8px;
          background: #dbeafe;
          color: #1d4ed8;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
        }

        .priority-badge {
          display: inline-block;
          padding: 5px 9px;
          border-radius: 8px;
          background: #dcfce7;
          color: #166534;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
        }

        .priority-high {
          background: #fee2e2;
          color: #b91c1c;
        }

        .priority-medium {
          background: #fef3c7;
          color: #92400e;
        }

        .priority-normal {
          background: #dcfce7;
          color: #166534;
        }

        .ai-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 8px;
          border-radius: 8px;
          background: #f3e8ff;
          color: #7e22ce;
          font-size: 10px;
          font-weight: 800;
        }

        .hearing-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 8px;
          border-radius: 8px;
          background: #ecfdf5;
          color: #047857;
          font-size: 10px;
          font-weight: 800;
        }

        .no-hearing {
          color: #94a3b8;
          font-size: 11px;
        }

        .action-buttons {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .action-button {
          width: 34px;
          height: 34px;
          border: none;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          text-decoration: none;
        }

        .view-button {
          background: #dbeafe;
          color: #2563eb;
        }

        .view-button:hover {
          background: #bfdbfe;
        }

        .hearing-button {
          background: #dcfce7;
          color: #15803d;
        }

        .hearing-button:hover {
          background: #bbf7d0;
        }

        /* =====================================================
           EMPTY
        ===================================================== */

        .empty-cases {
          text-align: center;
          padding: 60px 20px;
          color: #64748b;
        }

        .empty-cases svg {
          font-size: 42px;
          color: #94a3b8;
          margin-bottom: 15px;
        }

        .empty-cases h3 {
          margin: 0 0 6px;
          color: #334155;
          font-size: 18px;
        }

        .empty-cases p {
          margin: 0;
          font-size: 13px;
        }

        /* =====================================================
           RESPONSIVE
        ===================================================== */

        @media (max-width: 1200px) {

          .all-cases-stats {
            grid-template-columns:
              repeat(3, 1fr);
          }

          .filter-grid {
            grid-template-columns:
              repeat(2, 1fr);
          }

        }

        @media (max-width: 700px) {

          .all-cases-page {
            padding: 15px;
          }

          .all-cases-header h1 {
            font-size: 24px;
          }

          .all-cases-stats {
            grid-template-columns:
              repeat(2, 1fr);
          }

          .filter-grid {
            grid-template-columns: 1fr;
          }

          .filter-top {
            align-items: flex-start;
          }

        }

        @media (max-width: 450px) {

          .all-cases-stats {
            grid-template-columns: 1fr;
          }

        }

      `}</style>


      <div className="all-cases-container">


        {/* ======================================================
            HEADER
        ====================================================== */}

        <div className="all-cases-header">

          <button
            type="button"
            className="back-button"
            onClick={() =>
              navigate(
                '/judge-dashboard'
              )
            }
            title="Back to Dashboard"
          >
            <FaArrowLeft />
          </button>


          <div>

            <h1>
              All Assigned Cases
            </h1>

            <p>
              View and manage all cases assigned
              to you as a judge.
            </p>

          </div>

        </div>


        {/* ======================================================
            STATS
        ====================================================== */}

        <div className="all-cases-stats">


          <div className="all-cases-stat">

            <div className="all-cases-stat-icon">
              <FaBriefcase />
            </div>

            <div>

              <strong>
                {statistics.total}
              </strong>

              <span>
                Total Cases
              </span>

            </div>

          </div>


          <div className="all-cases-stat">

            <div className="all-cases-stat-icon">
              <FaClock />
            </div>

            <div>

              <strong>
                {statistics.pending}
              </strong>

              <span>
                Pending
              </span>

            </div>

          </div>


          <div className="all-cases-stat">

            <div className="all-cases-stat-icon">
              <FaBriefcase />
            </div>

            <div>

              <strong>
                {statistics.inProgress}
              </strong>

              <span>
                In Progress
              </span>

            </div>

          </div>


          <div className="all-cases-stat">

            <div className="all-cases-stat-icon">
              <FaCheckCircle />
            </div>

            <div>

              <strong>
                {statistics.completed}
              </strong>

              <span>
                Completed
              </span>

            </div>

          </div>


          <div className="all-cases-stat">

            <div className="all-cases-stat-icon">
              <FaRobot />
            </div>

            <div>

              <strong>
                {statistics.aiCases}
              </strong>

              <span>
                AI Assigned
              </span>

            </div>

          </div>


          <div className="all-cases-stat">

            <div className="all-cases-stat-icon">
              <FaExclamationTriangle />
            </div>

            <div>

              <strong>
                {statistics.urgent}
              </strong>

              <span>
                High / Urgent
              </span>

            </div>

          </div>

        </div>


        {/* ======================================================
            FILTERS
        ====================================================== */}

        <div className="filter-card">

          <div className="filter-top">

            <div className="filter-title">

              <FaFilter />

              Filters

            </div>


            <button
              type="button"
              className="reset-button"
              onClick={resetFilters}
            >
              Reset Filters
            </button>

          </div>


          <div className="filter-grid">


            {/* SEARCH */}

            <div className="search-box">

              <FaSearch />

              <input
                type="text"
                placeholder="Search case, citizen, defendant..."
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(
                    event.target.value
                  )
                }
              />

            </div>


            {/* STATUS */}

            <select
              className="filter-select"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
            >

              {
                statusOptions.map(
                  (status) => (

                    <option
                      key={status}
                      value={status}
                    >
                      Status: {status}
                    </option>

                  )
                )
              }

            </select>


            {/* PRIORITY */}

            <select
              className="filter-select"
              value={priorityFilter}
              onChange={(event) =>
                setPriorityFilter(
                  event.target.value
                )
              }
            >

              {
                priorityOptions.map(
                  (priority) => (

                    <option
                      key={priority}
                      value={priority}
                    >
                      Priority: {priority}
                    </option>

                  )
                )
              }

            </select>


            {/* TYPE */}

            <select
              className="filter-select"
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(
                  event.target.value
                )
              }
            >

              {
                typeOptions.map(
                  (type) => (

                    <option
                      key={type}
                      value={type}
                    >
                      Type: {type}
                    </option>

                  )
                )
              }

            </select>


            {/* SORT */}

            <select
              className="filter-select"
              value={sortBy}
              onChange={(event) =>
                setSortBy(
                  event.target.value
                )
              }
            >

              <option value="newest">
                <FaSortAmountDown />
                Newest First
              </option>

              <option value="oldest">
                Oldest First
              </option>

              <option value="priority">
                Highest Priority
              </option>

            </select>

          </div>

        </div>


        {/* ======================================================
            CASE TABLE
        ====================================================== */}

        <div className="cases-table-card">

          <div className="table-header">

            <h2>
              Assigned Cases
            </h2>

            <span className="result-count">

              Showing{' '}
              {filteredCases.length}
              {' '}of{' '}
              {cases.length}
              {' '}cases

            </span>

          </div>


          {
            casesLoading ? (

              <div className="empty-cases">

                <div className="all-cases-spinner"></div>

                <p>
                  Loading assigned cases...
                </p>

              </div>

            ) : filteredCases.length === 0 ? (

              <div className="empty-cases">

                <FaBriefcase />

                <h3>
                  No Cases Found
                </h3>

                <p>

                  {
                    cases.length === 0
                      ? 'No cases have been assigned to you yet.'
                      : 'No cases match your current filters.'
                  }

                </p>

              </div>

            ) : (

              <div className="table-wrapper">

                <table>

                  <thead>

                    <tr>

                      <th>
                        Case ID
                      </th>

                      <th>
                        Title
                      </th>

                      <th>
                        Type
                      </th>

                      <th>
                        Status
                      </th>

                      <th>
                        Priority
                      </th>

                      <th>
                        AI
                      </th>

                      <th>
                        Hearing
                      </th>

                      <th>
                        Action
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {
                      filteredCases.map(
                        (caseItem) => {

                          const hearing =
                            findHearingForCase(
                              caseItem
                            );


                          const priority =
                            String(
                              getPriority(
                                caseItem
                              )
                            ).toLowerCase();


                          const isAI =
                            caseItem.aiRecommended === true ||
                            caseItem.aiAssigned === true ||
                            caseItem.aiAnalyzed === true ||
                            caseItem.aiRecommendationScore !==
                              undefined;


                          return (

                            <tr
                              key={
                                caseItem.id
                              }
                            >


                              {/* CASE ID */}

                              <td>

                                <span className="case-number">

                                  {
                                    getCaseNumber(
                                      caseItem
                                    )
                                  }

                                </span>

                              </td>


                              {/* TITLE */}

                              <td>

                                <div className="case-title">

                                  {
                                    getCaseTitle(
                                      caseItem
                                    )
                                  }

                                </div>

                              </td>


                              {/* TYPE */}

                              <td>

                                <span className="case-type">

                                  {
                                    getCaseType(
                                      caseItem
                                    )
                                  }

                                </span>

                              </td>


                              {/* STATUS */}

                              <td>

                                <span className="status-badge">

                                  {
                                    getStatus(
                                      caseItem
                                    )
                                  }

                                </span>

                              </td>


                              {/* PRIORITY */}

                              <td>

                                <span
                                  className={
                                    `priority-badge ${
                                      priority.includes(
                                        'urgent'
                                      ) ||
                                      priority.includes(
                                        'high'
                                      )
                                        ? 'priority-high'
                                        : priority.includes(
                                            'medium'
                                          )
                                          ? 'priority-medium'
                                          : 'priority-normal'
                                    }`
                                  }
                                >

                                  {
                                    getPriority(
                                      caseItem
                                    )
                                  }

                                </span>

                              </td>


                              {/* AI */}

                              <td>

                                {
                                  isAI ? (

                                    <span className="ai-badge">

                                      <FaRobot />

                                      AI

                                    </span>

                                  ) : (

                                    <span
                                      style={{
                                        color:
                                          '#94a3b8',
                                        fontSize:
                                          '11px'
                                      }}
                                    >
                                      —
                                    </span>

                                  )
                                }

                              </td>


                              {/* HEARING */}

                              <td>

                                {
                                  hearing ? (

                                    <span className="hearing-badge">

                                      <FaCalendarAlt />

                                      {
                                        formatDate(
                                          hearing.date ||
                                          hearing.hearingDate ||
                                          hearing.scheduleDate
                                        )
                                      }

                                    </span>

                                  ) : (

                                    <span className="no-hearing">

                                      No Hearing

                                    </span>

                                  )
                                }

                              </td>


                              {/* ACTION */}

                              <td>

                                <div className="action-buttons">


                                  {/* VIEW CASE */}

                                  <button
                                    type="button"
                                    className={
                                      'action-button view-button'
                                    }
                                    title="View Case"
                                    onClick={() =>
                                      handleViewCase(
                                        caseItem
                                      )
                                    }
                                  >

                                    <FaEye />

                                  </button>


                                  {/* VIEW HEARING */}

                                  {
                                    hearing && (

                                      <button
                                        type="button"
                                        className={
                                          'action-button hearing-button'
                                        }
                                        title="View Hearing"
                                        onClick={() =>
                                          handleViewHearing(
                                            hearing
                                          )
                                        }
                                      >

                                        <FaCalendarAlt />

                                      </button>

                                    )
                                  }


                                </div>

                              </td>


                            </tr>

                          );

                        }
                      )
                    }

                  </tbody>

                </table>

              </div>

            )
          }

        </div>

      </div>

    </div>

  );
};


export default AllCases;