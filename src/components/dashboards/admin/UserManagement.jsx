import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import {
  FaArrowLeft,
  FaSearch,
  FaEdit,
  FaEye,
  FaToggleOn,
  FaToggleOff,
  FaUsers,
  FaTrash
} from 'react-icons/fa';

import {
  ref,
  onValue,
  off,
  update,
  remove
} from "firebase/database";

import {
  auth,
  db
} from "../../../firebase";


const UserManagement = () => {

  const navigate = useNavigate();

  const user = auth.currentUser;

  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');

  const [roleFilter, setRoleFilter] = useState('All');

  const [statusFilter, setStatusFilter] = useState('All');


  // ============================================================
  // AUTH CHECK
  // ============================================================

  useEffect(() => {

    if (!user) {
      navigate('/login');
    }

  }, [user, navigate]);


  // ============================================================
  // LOAD USERS FROM FIREBASE
  // ============================================================

  useEffect(() => {

    if (!user) return;

    const usersRef = ref(db, 'users');

    const unsubscribe = onValue(

      usersRef,

      (snapshot) => {

        const data = snapshot.val();

        if (data) {

          const usersArray =
            Object.keys(data).map(key => ({

              id: key,

              userId:
                key
                  .slice(0, 8)
                  .toUpperCase(),

              ...data[key]

            }));

          setUsers(usersArray);

        } else {

          setUsers([]);

        }

        setLoading(false);

      },

      (error) => {

        console.error(
          'Users loading error:',
          error
        );

        setLoading(false);

      }

    );


    return () => {

      off(usersRef);

    };

  }, [user]);


  // ============================================================
  // TOGGLE USER STATUS
  // ============================================================

  const toggleStatus = async (userItem) => {

    const newStatus =
      userItem.status === 'Active'
        ? 'Inactive'
        : 'Active';


    try {

      await update(

        ref(
          db,
          `users/${userItem.id}`
        ),

        {
          status: newStatus
        }

      );

    } catch (err) {

      console.error(
        'Status update error:',
        err
      );

      alert(
        'Failed to update user status.'
      );

    }

  };


  // ============================================================
  // DELETE USER
  // ============================================================

  const deleteUser = async (userItem) => {

    const userName =
      userItem.fullName ||
      userItem.email ||
      userItem.userId ||
      'this user';


    const confirmed =
      window.confirm(

        `Are you sure you want to delete "${userName}"?\n\nThis action cannot be undone.`

      );


    if (!confirmed) {

      return;

    }


    try {

      await remove(

        ref(
          db,
          `users/${userItem.id}`
        )

      );


      alert(
        'User deleted successfully.'
      );


    } catch (err) {

      console.error(
        'User deletion error:',
        err
      );


      alert(
        'Failed to delete user. Please try again.'
      );

    }

  };


  // ============================================================
  // FILTER USERS
  // ============================================================

  const filteredUsers = users.filter(
    (userItem) => {

      const searchText =
        search
          .toLowerCase()
          .trim();


      const matchesSearch =

        (userItem.userId || '')
          .toLowerCase()
          .includes(searchText)

        ||

        (userItem.fullName || '')
          .toLowerCase()
          .includes(searchText)

        ||

        (userItem.email || '')
          .toLowerCase()
          .includes(searchText)

        ||

        (userItem.phone || '')
          .toLowerCase()
          .includes(searchText);


      const matchesRole =
        roleFilter === 'All' ||

        (userItem.role || '')
          .toLowerCase() ===
        roleFilter.toLowerCase();


      const matchesStatus =
        statusFilter === 'All' ||

        (userItem.status || '') ===
        statusFilter;


      return (
        matchesSearch &&
        matchesRole &&
        matchesStatus
      );

    }
  );


  // ============================================================
  // FORMAT DATE
  // ============================================================

  const formatDate = (timestamp) => {

    if (!timestamp) {
      return 'N/A';
    }


    if (typeof timestamp === 'string') {

      return timestamp.split('T')[0];

    }


    try {

      return new Date(timestamp)
        .toISOString()
        .split('T')[0];

    } catch {

      return 'N/A';

    }

  };


  // ============================================================
  // PAGE
  // ============================================================

  return (

    <>

      <style>{`

        :root {

          --sky: #4FC3F7;

          --sky-dark: #0288D1;

          --black: #1A1A1A;

          --white: #FFFFFF;

          --gray: #6B7280;

          --shadow:
            0 8px 32px
            rgba(0,0,0,0.08);

          --radius: 16px;

          --transition-smooth:
            cubic-bezier(
              0.4,
              0,
              0.2,
              1
            );

        }


        /* ======================================================
           MAIN PAGE
        ====================================================== */

        .user-management-page {

          min-height: 100vh;

          padding: 2rem;

          background:
            linear-gradient(
              135deg,
              #E3F2FD 0%,
              #BBDEFB 50%,
              #90CAF9 100%
            );

          animation:
            gradientShift
            12s
            ease-in-out
            infinite
            alternate;

        }


        @keyframes gradientShift {

          0% {
            background-position:
              0% 50%;
          }

          50% {
            background-position:
              100% 50%;
          }

          100% {
            background-position:
              0% 50%;
          }

        }


        /* ======================================================
           HEADER
        ====================================================== */

        .user-page-header {

          margin-bottom: 2rem;

          background:
            rgba(
              255,
              255,
              255,
              0.7
            );

          backdrop-filter:
            blur(10px);

          padding:
            1.5rem 2rem;

          border-radius:
            var(--radius);

          box-shadow:
            var(--shadow);

        }


        .user-header-left {

          display: flex;

          flex-direction: column;

          gap: 0.5rem;

        }


        .back-button {

          display: inline-flex;

          align-items: center;

          gap: 0.5rem;

          width: fit-content;

          color:
            var(--black);

          text-decoration: none;

          font-weight: 500;

          transition: 0.3s;

        }


        .back-button:hover {

          color:
            var(--sky-dark);

          transform:
            translateX(-4px);

        }


        .user-heading {

          display: flex;

          align-items: center;

          gap: 1rem;

        }


        .user-heading-icon {

          display: flex;

          align-items: center;

          justify-content: center;

          width: 48px;

          height: 48px;

          background:
            rgba(
              79,
              195,
              247,
              0.15
            );

          border-radius: 50%;

          color:
            var(--sky-dark);

          font-size: 1.5rem;

        }


        .user-heading h1 {

          font-size: 2.2rem;

          font-weight: 800;

          color:
            var(--black);

          margin: 0;

        }


        .user-heading p {

          color:
            var(--gray);

          margin: 0;

        }


        /* ======================================================
           TOOLBAR
        ====================================================== */

        .user-toolbar {

          display: flex;

          justify-content:
            space-between;

          align-items: center;

          gap: 1.5rem;

          flex-wrap: wrap;

          margin-bottom: 2rem;

          background:
            rgba(
              255,
              255,
              255,
              0.7
            );

          backdrop-filter:
            blur(10px);

          padding:
            1rem 1.5rem;

          border-radius:
            var(--radius);

          box-shadow:
            var(--shadow);

        }


        .user-search {

          flex: 1;

          position: relative;

          min-width: 200px;

        }


        .user-search svg {

          position: absolute;

          left: 1rem;

          top: 50%;

          transform:
            translateY(-50%);

          color:
            var(--gray);

        }


        .user-search input {

          width: 100%;

          padding:
            0.6rem
            1rem
            0.6rem
            2.8rem;

          border:
            2px solid
            #D1E8F5;

          border-radius:
            50px;

          font-size:
            0.95rem;

          background:
            var(--white);

          transition:
            0.3s;

        }


        .user-search input:focus {

          outline: none;

          border-color:
            var(--sky);

          box-shadow:
            0 0 0 4px
            rgba(
              79,
              195,
              247,
              0.2
            );

        }


        .user-filters {

          display: flex;

          align-items: center;

          gap: 0.8rem;

          flex-wrap: wrap;

        }


        .user-filter {

          padding:
            0.6rem 1.2rem;

          border:
            2px solid
            #D1E8F5;

          border-radius:
            50px;

          background:
            var(--white);

          font-size:
            0.9rem;

          cursor: pointer;

          transition:
            0.3s;

        }


        .user-filter:focus {

          outline: none;

          border-color:
            var(--sky);

        }


        .user-count {

          color:
            var(--gray);

          font-size:
            0.95rem;

          white-space:
            nowrap;

        }


        .user-count strong {

          color:
            var(--black);

        }


        /* ======================================================
           TABLE CONTAINER
        ====================================================== */

        .users-table-container {

          background:
            rgba(
              255,
              255,
              255,
              0.85
            );

          backdrop-filter:
            blur(20px);

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.9
            );

          border-radius:
            var(--radius);

          box-shadow:
            var(--shadow);

          overflow-x: auto;

          padding:
            1.5rem;

        }


        .users-table {

          width: 100%;

          min-width: 950px;

          border-collapse:
            collapse;

          font-size:
            0.9rem;

        }


        .users-table th {

          padding:
            0.8rem 0.6rem;

          text-align:
            left;

          font-weight:
            600;

          color:
            var(--black);

          border-bottom:
            2px solid
            rgba(
              0,
              0,
              0,
              0.05
            );

          white-space:
            nowrap;

        }


        .users-table td {

          padding:
            0.8rem 0.6rem;

          border-bottom:
            1px solid
            rgba(
              0,
              0,
              0,
              0.04
            );

          vertical-align:
            middle;

        }


        .users-table tr:hover {

          background:
            rgba(
              79,
              195,
              247,
              0.04
            );

        }


        /* ======================================================
           USER ID
        ====================================================== */

        .user-id {

          color:
            var(--sky-dark);

          font-weight:
            600;

        }


        /* ======================================================
           ROLE BADGES
        ====================================================== */

        .role-badge {

          display: inline-block;

          padding:
            0.15rem 0.7rem;

          border-radius:
            50px;

          font-size:
            0.75rem;

          font-weight:
            600;

          text-transform:
            capitalize;

        }


        .role-badge.citizen {

          background:
            #DBEAFE;

          color:
            #1E40AF;

        }


        .role-badge.lawyer {

          background:
            #D1FAE5;

          color:
            #065F46;

        }


        .role-badge.judge {

          background:
            #FEF3C7;

          color:
            #92400E;

        }


        .role-badge.clerk {

          background:
            #FCE7F3;

          color:
            #9D174D;

        }


        .role-badge.admin {

          background:
            #FEE2E2;

          color:
            #991B1B;

        }


        /* ======================================================
           STATUS BADGES
        ====================================================== */

        .status-badge {

          display: inline-block;

          padding:
            0.15rem 0.7rem;

          border-radius:
            50px;

          font-size:
            0.75rem;

          font-weight:
            600;

          text-transform:
            capitalize;

        }


        .status-badge.active {

          background:
            #D1FAE5;

          color:
            #065F46;

        }


        .status-badge.inactive {

          background:
            #FEE2E2;

          color:
            #991B1B;

        }


        /* ======================================================
           ACTIONS
        ====================================================== */

        .user-actions {

          display: flex;

          gap:
            0.4rem;

          flex-wrap:
            nowrap;

          align-items:
            center;

        }


        .user-actions button {

          display: inline-flex;

          align-items:
            center;

          justify-content:
            center;

          width: 32px;

          height: 32px;

          border: none;

          border-radius: 6px;

          cursor: pointer;

          transition:
            0.3s;

          font-size:
            0.85rem;

          flex-shrink: 0;

        }


        /* ======================================================
           VIEW BUTTON
        ====================================================== */

        .view-btn {

          background:
            rgba(
              79,
              195,
              247,
              0.1
            );

          color:
            var(--sky-dark);

        }


        .view-btn:hover {

          background:
            rgba(
              79,
              195,
              247,
              0.2
            );

          transform:
            scale(1.05);

        }


        /* ======================================================
           EDIT BUTTON
        ====================================================== */

        .edit-btn {

          background:
            rgba(
              255,
              154,
              86,
              0.1
            );

          color:
            #FF9A56;

        }


        .edit-btn:hover {

          background:
            rgba(
              255,
              154,
              86,
              0.2
            );

          transform:
            scale(1.05);

        }


        /* ======================================================
           STATUS BUTTON
        ====================================================== */

        .status-btn {

          background:
            rgba(
              0,
              230,
              118,
              0.1
            );

          color:
            #00E676;

        }


        .status-btn:hover {

          background:
            rgba(
              0,
              230,
              118,
              0.2
            );

          transform:
            scale(1.05);

        }


        /* ======================================================
           DELETE BUTTON
        ====================================================== */

        .delete-btn {

          background:
            rgba(
              239,
              68,
              68,
              0.1
            );

          color:
            #DC2626;

        }


        .delete-btn:hover {

          background:
            rgba(
              239,
              68,
              68,
              0.2
            );

          color:
            #B91C1C;

          transform:
            scale(1.05);

        }


        /* ======================================================
           EMPTY
        ====================================================== */

        .no-users {

          text-align:
            center;

          padding:
            2rem;

          color:
            var(--gray);

        }


        /* ======================================================
           LOADING
        ====================================================== */

        .loading-text {

          text-align:
            center;

          padding:
            2rem;

          color:
            var(--gray);

        }


        /* ======================================================
           TABLET
        ====================================================== */

        @media (max-width: 992px) {

          .user-toolbar {

            flex-direction:
              column;

            align-items:
              stretch;

          }


          .user-filters {

            justify-content:
              space-between;

          }


          .users-table {

            font-size:
              0.8rem;

          }


          .users-table th,
          .users-table td {

            padding:
              0.4rem 0.3rem;

          }

        }


        /* ======================================================
           MOBILE
        ====================================================== */

        @media (max-width: 768px) {

          .user-management-page {

            padding:
              1rem;

          }


          .user-page-header {

            padding:
              1rem;

          }


          .user-heading h1 {

            font-size:
              1.8rem;

          }


          .users-table {

            font-size:
              0.7rem;

            min-width:
              950px;

          }


          .users-table th,
          .users-table td {

            padding:
              0.4rem;

          }


          .user-actions button {

            width:
              28px;

            height:
              28px;

            font-size:
              0.75rem;

          }

        }


        /* ======================================================
           SMALL MOBILE
        ====================================================== */

        @media (max-width: 480px) {

          .user-heading {

            flex-direction:
              column;

            align-items:
              flex-start;

          }


          .user-filters {

            flex-direction:
              column;

            align-items:
              stretch;

          }


          .user-filter {

            width:
              100%;

          }


          .user-count {

            text-align:
              center;

          }

        }

      `}</style>


      <div className="user-management-page">


        {/* ======================================================
            HEADER
        ====================================================== */}

        <div className="user-page-header">

          <div className="user-header-left">


            <Link
              to="/admin-dashboard"
              className="back-button"
            >

              <FaArrowLeft />

              Back to Dashboard

            </Link>


            <div className="user-heading">

              <div className="user-heading-icon">

                <FaUsers />

              </div>


              <div>

                <h1>
                  User Management
                </h1>

                <p>
                  Manage and monitor
                  registered system users
                </p>

              </div>

            </div>

          </div>

        </div>


        {/* ======================================================
            TOOLBAR
        ====================================================== */}

        <div className="user-toolbar">


          {/* SEARCH */}

          <div className="user-search">

            <FaSearch />

            <input
              type="text"

              placeholder="Search user, ID, email or phone..."

              value={search}

              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }

            />

          </div>


          {/* FILTERS */}

          <div className="user-filters">


            {/* ROLE FILTER */}

            <select
              className="user-filter"

              value={roleFilter}

              onChange={(e) =>
                setRoleFilter(
                  e.target.value
                )
              }

            >

              <option value="All">
                All Roles
              </option>

              <option value="Citizen">
                Citizen
              </option>

              <option value="Lawyer">
                Lawyer
              </option>

              <option value="Judge">
                Judge
              </option>

              <option value="Clerk">
                Clerk
              </option>

              <option value="Admin">
                Admin
              </option>

            </select>


            {/* STATUS FILTER */}

            <select
              className="user-filter"

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

              <option value="Active">
                Active
              </option>

              <option value="Inactive">
                Inactive
              </option>

            </select>


            {/* TOTAL */}

            <div className="user-count">

              Total Users:

              {' '}

              <strong>
                {users.length}
              </strong>

            </div>

          </div>

        </div>


        {/* ======================================================
            USERS TABLE
        ====================================================== */}

        <div className="users-table-container">


          {loading ? (

            <div className="loading-text">

              Loading users...

            </div>

          ) : (

            <table className="users-table">


              <thead>

                <tr>

                  <th>
                    User ID
                  </th>

                  <th>
                    Name
                  </th>

                  <th>
                    Email
                  </th>

                  <th>
                    Phone
                  </th>

                  <th>
                    Role
                  </th>

                  <th>
                    Registration Date
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


                {filteredUsers.map(
                  (userItem) => (

                    <tr
                      key={
                        userItem.id
                      }
                    >


                      {/* USER ID */}

                      <td>

                        <strong
                          className="user-id"
                        >

                          {userItem.userId}

                        </strong>

                      </td>


                      {/* NAME */}

                      <td>

                        {userItem.fullName ||
                          'N/A'}

                      </td>


                      {/* EMAIL */}

                      <td>

                        {userItem.email ||
                          'N/A'}

                      </td>


                      {/* PHONE */}

                      <td>

                        {userItem.phone ||
                          'N/A'}

                      </td>


                      {/* ROLE */}

                      <td>

                        <span
                          className={
                            `role-badge ${
                              (
                                userItem.role ||
                                'citizen'
                              ).toLowerCase()
                            }`
                          }
                        >

                          {userItem.role ||
                            'Citizen'}

                        </span>

                      </td>


                      {/* REGISTRATION DATE */}

                      <td>

                        {formatDate(
                          userItem.createdAt
                        )}

                      </td>


                      {/* STATUS */}

                      <td>

                        <span
                          className={
                            `status-badge ${
                              (
                                userItem.status ||
                                'Active'
                              ).toLowerCase()
                            }`
                          }
                        >

                          {userItem.status ||
                            'Active'}

                        </span>

                      </td>


                      {/* ACTIONS */}

                      <td>

                        <div
                          className="user-actions"
                        >


                          {/* VIEW */}

                          <button
                            type="button"

                            className="view-btn"

                            title="View User"

                            onClick={() =>
                              navigate(
                                `/admin-dashboard/users/view/${userItem.id}`
                              )
                            }

                          >

                            <FaEye />

                          </button>


                          {/* EDIT */}

                          <button
                            type="button"

                            className="edit-btn"

                            title="Edit User"

                            onClick={() =>
                              navigate(
                                `/admin-dashboard/users/edit/${userItem.id}`
                              )
                            }

                          >

                            <FaEdit />

                          </button>


                          {/* STATUS */}

                          <button
                            type="button"

                            className="status-btn"

                            title="Change Status"

                            onClick={() =>
                              toggleStatus(
                                userItem
                              )
                            }

                          >

                            {userItem.status ===
                            'Active'

                              ? <FaToggleOn />

                              : <FaToggleOff />

                            }

                          </button>


                          {/* DELETE */}

                          <button
                            type="button"

                            className="delete-btn"

                            title="Delete User"

                            onClick={() =>
                              deleteUser(
                                userItem
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


          {/* NO USERS */}

          {!loading &&
            filteredUsers.length === 0 && (

              <div
                className="no-users"
              >

                No users found.

              </div>

            )}

        </div>

      </div>

    </>

  );

};


export default UserManagement;