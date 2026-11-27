import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import {
  FaArrowLeft,
  FaSearch,
  FaEdit,
  FaEye,
  FaUserTie,
  FaToggleOn,
  FaToggleOff,
  FaFileAlt,
  FaGavel,
  FaUser,
  FaBuilding,
  FaRobot,
  FaTrash
} from 'react-icons/fa';

import {
  ref,
  onValue,
  off,
  update,
  remove
} from 'firebase/database';

import {
  auth,
  db
} from '../../../firebase';

const CaseManagement = () => {

  const navigate = useNavigate();
  const user = auth.currentUser;

  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');

  const [statusFilter, setStatusFilter] =
    useState('All');


  // ============================================================
  // AUTH CHECK
  // ============================================================

  useEffect(() => {

    if (!user) {
      navigate('/login');
    }

  }, [user, navigate]);


  // ============================================================
  // LOAD CASES FROM FIREBASE
  // ============================================================

  useEffect(() => {

    if (!user) return;

    const casesRef =
      ref(db, 'cases');

    const unsubscribe = onValue(
      casesRef,

      (snapshot) => {

        const data =
          snapshot.val();

        if (data) {

          const casesArray =
            Object.keys(data).map(
              (key) => ({

                id: key,

                caseId:
                  data[key].caseId ||
                  key,

                ...data[key]

              })
            );

          setCases(casesArray);

        } else {

          setCases([]);

        }

        setLoading(false);
      },

      (error) => {

        console.error(
          'Firebase cases error:',
          error
        );

        setLoading(false);
      }
    );

    return () => {
      off(casesRef);
    };

  }, [user]);


  // ============================================================
  // CHANGE CASE STATUS
  // ============================================================

  const toggleStatus = async (item) => {

    let newStatus =
      'Pending';

    if (
      item.status === 'Pending'
    ) {

      newStatus =
        'In Progress';

    } else if (
      item.status === 'In Progress'
    ) {

      newStatus =
        'Completed';

    } else {

      newStatus =
        'Pending';

    }

    try {

      await update(
        ref(
          db,
          `cases/${item.id}`
        ),
        {
          status: newStatus
        }
      );

    } catch (error) {

      console.error(
        'Status update failed:',
        error
      );

      alert(
        'Failed to update case status.'
      );

    }

  };


  // ============================================================
  // DELETE CASE
  // ============================================================

  const deleteCase = async (item) => {

    const caseName =
      item.caseId ||
      item.id ||
      'this case';

    const confirmed =
      window.confirm(
        `Are you sure you want to delete case "${caseName}"?\n\nThis action cannot be undone.`
      );

    if (!confirmed) {
      return;
    }

    try {

      await remove(
        ref(
          db,
          `cases/${item.id}`
        )
      );

      alert(
        'Case deleted successfully.'
      );

    } catch (error) {

      console.error(
        'Case deletion failed:',
        error
      );

      alert(
        'Failed to delete case. Please try again.'
      );

    }

  };


  // ============================================================
  // GET CASE TITLE
  // ============================================================

  const getCaseTitle = (item) => {

    return (
      item.title ||
      item.caseTitle ||
      item.subject ||
      `${item.predictedCaseType || 'General'} Case`
    );

  };


  // ============================================================
  // GET CASE TYPE
  // ============================================================

  const getCaseType = (item) => {

    return (
      item.caseType ||
      item.predictedCaseType ||
      item.type ||
      'General'
    );

  };


  // ============================================================
  // GET CITIZEN NAME
  // ============================================================

  const getCitizenName = (item) => {

    return (
      item.userDisplayName ||
      item.client ||
      item.citizen ||
      item.userEmail ||
      'Unknown Citizen'
    );

  };


  // ============================================================
  // GET LAWYER NAME
  // ============================================================

  const getLawyerName = (item) => {

    return (
      item.assignedLawyerName ||
      item.assignedLawyer ||
      item.lawyerName ||
      item.lawyer ||
      'Not Assigned'
    );

  };


  // ============================================================
  // GET JUDGE NAME
  // ============================================================

  const getJudgeName = (item) => {

    return (
      item.assignedJudgeName ||
      item.assignedJudge ||
      item.judgeName ||
      item.judge ||
      'Not Assigned'
    );

  };


  // ============================================================
  // GET COURT
  // ============================================================

  const getCourtName = (item) => {

    return (
      item.court ||
      item.courtName ||
      item.courtId ||
      'Not Assigned'
    );

  };


  // ============================================================
  // GET PRIORITY
  // ============================================================

  const getPriority = (item) => {

    return (
      item.predictedPriority ||
      item.priority ||
      'Medium'
    );

  };


  // ============================================================
  // SEARCH + FILTER
  // ============================================================

  const filteredCases =
    cases.filter((item) => {

      const searchText =
        search
          .toLowerCase()
          .trim();

      const searchableText = [

        item.caseId,

        item.id,

        getCaseTitle(item),

        getCaseType(item),

        getCitizenName(item),

        getLawyerName(item),

        getJudgeName(item),

        getCourtName(item),

        item.defendantName,

        getPriority(item)

      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();


      const matchesSearch =
        searchText === '' ||
        searchableText.includes(
          searchText
        );


      const matchesStatus =
        statusFilter === 'All' ||
        (
          item.status ||
          'Pending'
        ) === statusFilter;


      return (
        matchesSearch &&
        matchesStatus
      );

    });


  // ============================================================
  // PRIORITY CLASS
  // ============================================================

  const getPriorityClass = (
    priority
  ) => {

    const value =
      String(priority)
        .toLowerCase();

    if (value === 'high')
      return 'high';

    if (value === 'low')
      return 'low';

    return 'medium';

  };


  // ============================================================
  // STATUS CLASS
  // ============================================================

  const getStatusClass = (
    status
  ) => {

    return (
      status || 'Pending'
    )
      .toLowerCase()
      .replace(/\s+/g, '-');

  };


  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {

    return (

      <div className="case-loading">

        <div className="loading-card">

          <FaFileAlt
            className="loading-icon"
          />

          <h3>
            Loading Cases...
          </h3>

          <p>
            Please wait while cases
            are loaded.
          </p>

        </div>

      </div>

    );

  }


  // ============================================================
  // UI
  // ============================================================

  return (

    <>

      <style>{`

        * {
          box-sizing: border-box;
        }

        .case-management-page {
          min-height: 100vh;

          padding: 25px;

          background:
            linear-gradient(
              135deg,
              #E3F2FD 0%,
              #BBDEFB 50%,
              #90CAF9 100%
            );
        }


        /* ==========================
           HEADER
        ========================== */

        .case-page-header {
          width: 100%;
          max-width: 1500px;

          margin: 0 auto 20px auto;

          background:
            rgba(
              255,
              255,
              255,
              0.82
            );

          backdrop-filter:
            blur(15px);

          border-radius: 18px;

          padding: 22px;

          box-shadow:
            0 8px 30px
            rgba(0,0,0,0.08);
        }


        .case-header-left {
          display: flex;

          flex-direction: column;

          gap: 15px;
        }


        .back-button {
          width: fit-content;

          display: inline-flex;

          align-items: center;

          gap: 8px;

          color: #1A1A1A;

          text-decoration: none;

          font-weight: 600;

          transition: 0.3s;
        }


        .back-button:hover {
          color: #0288D1;

          transform:
            translateX(-4px);
        }


        .case-heading {
          display: flex;

          align-items: center;

          gap: 15px;
        }


        .case-heading-icon {
          width: 55px;
          height: 55px;

          flex-shrink: 0;

          display: flex;

          align-items: center;
          justify-content: center;

          border-radius: 50%;

          background:
            rgba(
              79,
              195,
              247,
              0.16
            );

          color: #0288D1;

          font-size: 1.5rem;
        }


        .case-heading h1 {
          margin: 0;

          color: #1A1A1A;

          font-size: 2rem;

          font-weight: 800;
        }


        .case-heading p {
          margin: 5px 0 0;

          color: #6B7280;

          font-size: 0.95rem;
        }


        /* ==========================
           TOOLBAR
        ========================== */

        .case-toolbar {
          width: 100%;
          max-width: 1500px;

          margin: 0 auto 20px auto;

          display: flex;

          align-items: center;

          justify-content:
            space-between;

          gap: 15px;

          background:
            rgba(
              255,
              255,
              255,
              0.82
            );

          backdrop-filter:
            blur(15px);

          padding: 15px 20px;

          border-radius: 16px;

          box-shadow:
            0 8px 30px
            rgba(0,0,0,0.08);
        }


        .case-search {
          flex: 1;

          position: relative;

          min-width: 200px;
        }


        .case-search svg {
          position: absolute;

          left: 15px;
          top: 50%;

          transform:
            translateY(-50%);

          color: #6B7280;
        }


        .case-search input {
          width: 100%;

          padding:
            12px
            15px
            12px
            43px;

          border:
            2px solid
            #D1E8F5;

          border-radius: 50px;

          outline: none;

          font-size: 0.95rem;

          background: white;

          transition: 0.3s;
        }


        .case-search input:focus {
          border-color:
            #4FC3F7;

          box-shadow:
            0 0 0 4px
            rgba(
              79,
              195,
              247,
              0.15
            );
        }


        .case-filters {
          display: flex;

          align-items: center;

          gap: 12px;

          flex-wrap: wrap;
        }


        .case-filter {
          padding:
            11px 16px;

          border:
            2px solid
            #D1E8F5;

          border-radius: 50px;

          background: white;

          cursor: pointer;

          outline: none;

          font-size: 0.9rem;
        }


        .case-count {
          white-space: nowrap;

          color: #6B7280;

          font-size: 0.9rem;
        }


        .case-count strong {
          color: #1A1A1A;
        }


        /* ==========================
           TABLE
        ========================== */

        .cases-table-container {
          width: 100%;
          max-width: 1500px;

          margin: 0 auto;

          background:
            rgba(
              255,
              255,
              255,
              0.9
            );

          backdrop-filter:
            blur(20px);

          border-radius: 18px;

          box-shadow:
            0 8px 32px
            rgba(0,0,0,0.08);

          padding: 15px;

          overflow-x: auto;
        }


        .cases-table {
          width: 100%;

          min-width: 1050px;

          border-collapse:
            collapse;

          font-size: 0.88rem;
        }


        .cases-table th {
          padding:
            14px 10px;

          text-align: left;

          color: #1A1A1A;

          font-weight: 700;

          background:
            #F8FAFC;

          border-bottom:
            2px solid
            #E5E7EB;

          white-space: nowrap;
        }


        .cases-table td {
          padding:
            13px 10px;

          border-bottom:
            1px solid
            #EEF2F7;

          vertical-align: middle;
        }


        .cases-table tbody tr {
          transition: 0.2s;
        }


        .cases-table tbody tr:hover {
          background:
            rgba(
              79,
              195,
              247,
              0.05
            );
        }


        /* ==========================
           CASE DATA
        ========================== */

        .case-id {
          color: #0288D1;

          font-weight: 700;
        }


        .case-title {
          max-width: 220px;

          color: #1A1A1A;

          font-weight: 600;

          line-height: 1.4;
        }


        .case-type-badge {
          display: inline-block;

          padding:
            5px 10px;

          border-radius: 50px;

          background:
            rgba(
              79,
              195,
              247,
              0.12
            );

          color: #0288D1;

          font-size: 0.75rem;

          font-weight: 600;

          text-transform:
            capitalize;
        }


        .defendant {
          color: #374151;

          font-size: 0.85rem;
        }


        .assigned-badge {
          color: #0288D1;

          font-weight: 600;
        }


        .not-assigned {
          color: #9CA3AF;

          font-style: italic;
        }


        .citizen-info {
          display: flex;

          flex-direction: column;

          gap: 3px;
        }


        .citizen-name {
          color: #1A1A1A;

          font-weight: 600;
        }


        .citizen-email {
          color: #6B7280;

          font-size: 0.72rem;
        }


        /* ==========================
           PRIORITY
        ========================== */

        .priority-badge {
          display: inline-block;

          padding:
            5px 10px;

          border-radius: 50px;

          font-size: 0.75rem;

          font-weight: 700;
        }


        .priority-badge.high {
          background:
            #FEE2E2;

          color: #B91C1C;
        }


        .priority-badge.medium {
          background:
            #FEF3C7;

          color: #92400E;
        }


        .priority-badge.low {
          background:
            #D1FAE5;

          color: #065F46;
        }


        /* ==========================
           STATUS
        ========================== */

        .case-status-badge {
          display: inline-block;

          padding:
            5px 10px;

          border-radius: 50px;

          font-size: 0.75rem;

          font-weight: 700;

          white-space: nowrap;
        }


        .case-status-badge.pending {
          background:
            #FEF3C7;

          color: #92400E;
        }


        .case-status-badge.pending-clerk-approval {
          background:
            #FEF3C7;

          color: #92400E;
        }


        .case-status-badge.in-progress {
          background:
            #DBEAFE;

          color: #1E40AF;
        }


        .case-status-badge.completed {
          background:
            #D1FAE5;

          color: #065F46;
        }


        .case-status-badge.assigned {
          background:
            #EDE9FE;

          color: #6D28D9;
        }


        /* ==========================
           ACTIONS
        ========================== */

        .case-actions {
          display: flex;

          align-items: center;

          gap: 6px;

          white-space: nowrap;
        }


        .case-actions button {
          width: 34px;
          height: 34px;

          display: inline-flex;

          align-items: center;
          justify-content: center;

          border: none;

          border-radius: 8px;

          cursor: pointer;

          transition: 0.25s;

          font-size: 0.85rem;
        }


        .case-actions button:hover {
          transform:
            translateY(-2px)
            scale(1.04);
        }


        .view-btn {
          background:
            rgba(
              79,
              195,
              247,
              0.12
            );

          color: #0288D1;
        }


        .edit-btn {
          background:
            rgba(
              255,
              154,
              86,
              0.12
            );

          color: #EA580C;
        }


        .assign-btn {
          background:
            rgba(
              124,
              77,
              255,
              0.12
            );

          color: #7C4DFF;
        }


        .status-btn {
          background:
            rgba(
              0,
              230,
              118,
              0.12
            );

          color: #00A85A;
        }


        /* ==========================
           DELETE BUTTON
        ========================== */

        .delete-btn {
          background:
            rgba(
              239,
              68,
              68,
              0.12
            );

          color: #DC2626;
        }


        .delete-btn:hover {
          background:
            rgba(
              239,
              68,
              68,
              0.2
            );

          color: #B91C1C;
        }


        /* ==========================
           EMPTY
        ========================== */

        .no-cases {
          text-align: center;

          padding:
            50px 20px;

          color: #6B7280;

          font-size: 1rem;
        }


        .empty-icon {
          font-size: 2.5rem;

          color: #90CAF9;

          margin-bottom: 10px;
        }


        /* ==========================
           LOADING
        ========================== */

        .case-loading {
          min-height: 100vh;

          display: flex;

          align-items: center;
          justify-content: center;

          padding: 20px;

          background:
            linear-gradient(
              135deg,
              #E3F2FD,
              #BBDEFB,
              #90CAF9
            );
        }


        .loading-card {
          background:
            rgba(
              255,
              255,
              255,
              0.9
            );

          padding: 40px;

          border-radius: 18px;

          text-align: center;

          box-shadow:
            0 8px 30px
            rgba(0,0,0,0.1);
        }


        .loading-icon {
          font-size: 3rem;

          color: #0288D1;

          margin-bottom: 15px;
        }


        .loading-card h3 {
          margin: 0;

          color: #1A1A1A;
        }


        .loading-card p {
          color: #6B7280;
        }


        /* ==========================
           TABLET
        ========================== */

        @media (max-width: 992px) {

          .case-management-page {
            padding: 18px;
          }


          .case-toolbar {
            flex-direction: column;

            align-items: stretch;
          }


          .case-search {
            width: 100%;
          }


          .case-filters {
            justify-content:
              space-between;
          }


          .cases-table-container {
            overflow-x: auto;

            -webkit-overflow-scrolling:
              touch;
          }

        }


        /* ==========================
           MOBILE
        ========================== */

        @media (max-width: 768px) {

          .case-management-page {
            padding: 10px;
          }


          .case-page-header {
            padding: 15px;

            border-radius: 14px;
          }


          .case-heading {
            align-items:
              flex-start;
          }


          .case-heading-icon {
            width: 45px;
            height: 45px;

            font-size: 1.2rem;
          }


          .case-heading h1 {
            font-size: 1.45rem;
          }


          .case-heading p {
            font-size: 0.78rem;
          }


          .case-toolbar {
            padding: 12px;

            border-radius: 14px;
          }


          .case-filters {
            width: 100%;

            display: grid;

            grid-template-columns:
              1fr 1fr;

            gap: 8px;
          }


          .case-filter {
            width: 100%;

            padding: 10px;

            font-size: 0.8rem;
          }


          .case-count {
            display: flex;

            align-items: center;

            justify-content: center;

            background:
              #F8FAFC;

            border-radius: 50px;

            padding: 8px;
          }


          .cases-table-container {
            padding: 8px;

            border-radius: 14px;
          }


          .cases-table {
            min-width: 1050px;

            font-size: 0.8rem;
          }


          .cases-table th,
          .cases-table td {
            padding:
              10px 8px;
          }


          .case-actions button {
            width: 32px;
            height: 32px;
          }

        }


        /* ==========================
           SMALL MOBILE
        ========================== */

        @media (max-width: 480px) {

          .case-management-page {
            padding: 7px;
          }


          .case-page-header {
            padding: 12px;
          }


          .back-button {
            font-size: 0.8rem;
          }


          .case-heading {
            gap: 10px;
          }


          .case-heading h1 {
            font-size: 1.25rem;
          }


          .case-heading p {
            font-size: 0.72rem;
          }


          .case-heading-icon {
            width: 40px;
            height: 40px;

            font-size: 1rem;
          }


          .case-filters {
            grid-template-columns:
              1fr;
          }


          .case-count {
            width: 100%;
          }

        }

      `}</style>


      <div className="case-management-page">


        {/* ======================================================
            HEADER
        ====================================================== */}

        <div className="case-page-header">

          <div className="case-header-left">

            <Link
              to="/admin-dashboard"
              className="back-button"
            >

              <FaArrowLeft />

              Back to Dashboard

            </Link>


            <div className="case-heading">

              <div className="case-heading-icon">

                <FaFileAlt />

              </div>


              <div>

                <h1>
                  Case Management
                </h1>

                <p>
                  Manage, assign and
                  monitor court cases
                </p>

              </div>

            </div>

          </div>

        </div>


        {/* ======================================================
            TOOLBAR
        ====================================================== */}

        <div className="case-toolbar">


          <div className="case-search">

            <FaSearch />

            <input
              type="text"

              placeholder="Search case, citizen, lawyer, judge..."

              value={search}

              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
            />

          </div>


          <div className="case-filters">


            <select
              className="case-filter"

              value={statusFilter}

              onChange={(e) =>
                setStatusFilter(
                  e.target.value
                )
              }
            >

              <option value="All">
                All Status
              </option>

              <option value="Pending">
                Pending
              </option>

              <option value="Pending Clerk Approval">
                Pending Clerk Approval
              </option>

              <option value="In Progress">
                In Progress
              </option>

              <option value="Assigned">
                Assigned
              </option>

              <option value="Completed">
                Completed
              </option>

            </select>


            <div className="case-count">

              Total Cases:
              {' '}

              <strong>
                {cases.length}
              </strong>

            </div>

          </div>

        </div>


        {/* ======================================================
            TABLE
        ====================================================== */}

        <div className="cases-table-container">


          {filteredCases.length === 0 ? (

            <div className="no-cases">

              <FaFileAlt
                className="empty-icon"
              />

              <div>
                No cases found.
              </div>

            </div>

          ) : (

            <table className="cases-table">


              <thead>

                <tr>

                  <th>
                    Case ID
                  </th>

                  <th>
                    Case
                  </th>

                  <th>
                    Type
                  </th>

                  <th>
                    Citizen
                  </th>

                  <th>
                    Defendant
                  </th>

                  <th>
                    Lawyer
                  </th>

                  <th>
                    Judge
                  </th>

                  <th>
                    Court
                  </th>

                  <th>
                    Priority
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Actions
                  </th>

                </tr>

              </thead>


              <tbody>


                {filteredCases.map(
                  (item) => (

                    <tr
                      key={item.id}
                    >


                      {/* CASE ID */}

                      <td>

                        <strong
                          className="case-id"
                        >

                          {item.caseId ||
                            item.id}

                        </strong>

                      </td>


                      {/* CASE TYPE */}

                      <td>

                        <div
                          className="case-title"
                        >

                          {getCaseType(
                            item
                          )}

                        </div>

                      </td>


                      {/* TYPE */}

                      <td>

                        <span
                          className="case-type-badge"
                        >

                          {getCaseType(
                            item
                          )}

                        </span>

                      </td>


                      {/* CITIZEN */}

                      <td>

                        <div
                          className="citizen-info"
                        >

                          <span
                            className="citizen-name"
                          >

                            <FaUser />

                            {' '}

                            {getCitizenName(
                              item
                            )}

                          </span>


                          {item.userEmail && (

                            <span
                              className="citizen-email"
                            >

                              {item.userEmail}

                            </span>

                          )}

                        </div>

                      </td>


                      {/* DEFENDANT */}

                      <td>

                        {item.defendantName ? (

                          <span
                            className="defendant"
                          >

                            {item.defendantName}

                          </span>

                        ) : (

                          <span
                            className="not-assigned"
                          >

                            Not Provided

                          </span>

                        )}

                      </td>


                      {/* LAWYER */}

                      <td>

                        {getLawyerName(
                          item
                        ) !==
                        'Not Assigned' ? (

                          <span
                            className="assigned-badge"
                          >

                            <FaUserTie />

                            {' '}

                            {getLawyerName(
                              item
                            )}

                          </span>

                        ) : (

                          <span
                            className="not-assigned"
                          >

                            Not Assigned

                          </span>

                        )}

                      </td>


                      {/* JUDGE */}

                      <td>

                        {getJudgeName(
                          item
                        ) !==
                        'Not Assigned' ? (

                          <span
                            className="assigned-badge"
                          >

                            <FaGavel />

                            {' '}

                            {getJudgeName(
                              item
                            )}

                          </span>

                        ) : (

                          <span
                            className="not-assigned"
                          >

                            Not Assigned

                          </span>

                        )}

                      </td>


                      {/* COURT */}

                      <td>

                        {getCourtName(
                          item
                        ) !==
                        'Not Assigned' ? (

                          <span
                            className="assigned-badge"
                          >

                            <FaBuilding />

                            {' '}

                            {getCourtName(
                              item
                            )}

                          </span>

                        ) : (

                          <span
                            className="not-assigned"
                          >

                            Not Assigned

                          </span>

                        )}

                      </td>


                      {/* PRIORITY */}

                      <td>

                        <span
                          className={
                            `priority-badge ${
                              getPriorityClass(
                                getPriority(
                                  item
                                )
                              )
                            }`
                          }
                        >

                          {getPriority(
                            item
                          )}

                        </span>

                      </td>


                      {/* STATUS */}

                      <td>

                        <span
                          className={
                            `case-status-badge ${
                              getStatusClass(
                                item.status
                              )
                            }`
                          }
                        >

                          {item.status ||
                            'Pending'}

                        </span>

                      </td>


                      {/* ACTIONS */}

                      <td>

                        <div
                          className="case-actions"
                        >


                          {/* VIEW */}

                          <button
                            type="button"

                            className="view-btn"

                            title="View Case"

                            onClick={() =>
                              navigate(
                                `/admin-dashboard/cases/view/${item.id}`
                              )
                            }
                          >

                            <FaEye />

                          </button>


                          {/* EDIT */}

                          <button
                            type="button"

                            className="edit-btn"

                            title="Edit Case"

                            onClick={() =>
                              navigate(
                                `/admin-dashboard/cases/edit/${item.id}`
                              )
                            }
                          >

                            <FaEdit />

                          </button>


                          {/* AI JUDGE RECOMMENDATION */}

                          <button
                            type="button"

                            className="assign-btn"

                            title="AI Judge Recommendation"

                            onClick={() =>
                              navigate(
                                `/admin-dashboard/cases/recommend-judge/${item.id}`
                              )
                            }
                          >

                            <FaRobot />

                          </button>


                          {/* STATUS */}

                          <button
                            type="button"

                            className="status-btn"

                            title="Change Status"

                            onClick={() =>
                              toggleStatus(
                                item
                              )
                            }
                          >

                            {item.status ===
                            'Completed' ? (

                              <FaToggleOff />

                            ) : (

                              <FaToggleOn />

                            )}

                          </button>


                          {/* DELETE - LAST ACTION */}

                          <button
                            type="button"

                            className="delete-btn"

                            title="Delete Case"

                            onClick={() =>
                              deleteCase(
                                item
                              )
                            }
                          >

                            <FaTrash />

                          </button>


                        </div>

                      </td>


                    </tr>

                  )
                )}

              </tbody>

            </table>

          )}

        </div>

      </div>

    </>

  );

};


export default CaseManagement;