import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  FaArrowLeft,
  FaUserTie,
  FaUser,
  FaIdCard,
  FaEnvelope,
  FaPhone,
  FaCertificate,
  FaBuilding,
  FaBriefcase,
  FaGraduationCap,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaSave,
  FaSpinner
} from 'react-icons/fa';

import {
  ref,
  onValue,
  set,
  update
} from 'firebase/database';

import {
  createUserWithEmailAndPassword
} from 'firebase/auth';

import { db, auth } from '../../../firebase';

import Swal from 'sweetalert2';

const LawyerRegistration = () => {

  const navigate = useNavigate();
  const { id } = useParams();

  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(isEdit);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({

    fullName: '',
    cnic: '',
    email: '',
    phone: '',

    password: '',
    confirmPassword: '',

    licenseNumber: '',
    barAssociation: '',
    specialization: '',
    yearsOfExperience: '',

    court: '',
    chamber: '',
    qualification: '',
    barEnrollmentDate: '',

    address: '',
    status: 'Active'

  });


  // ============================================================
  // LOAD LAWYER FOR EDIT
  // ============================================================

  useEffect(() => {

    if (!id) {
      setPageLoading(false);
      return;
    }

    const lawyerRef = ref(db, `users/${id}`);

    const unsubscribe = onValue(
      lawyerRef,
      (snapshot) => {

        const data = snapshot.val();

        if (!data || data.role !== 'lawyer') {

          setPageLoading(false);

          Swal.fire({
            icon: 'error',
            title: 'Lawyer Not Found',
            text: 'The requested lawyer record could not be found.',
            confirmButtonColor: '#0284c7'
          }).then(() => {

            navigate('/admin-dashboard/lawyers');

          });

          return;
        }


        setFormData({

          fullName: data.fullName || '',
          cnic: data.cnic || '',
          email: data.email || '',
          phone: data.phone || '',

          // Password is NOT loaded from database.
          password: '',
          confirmPassword: '',

          licenseNumber: data.licenseNumber || '',
          barAssociation: data.barAssociation || '',
          specialization: data.specialization || '',

          yearsOfExperience:
            data.yearsOfExperience ?? '',

          court: data.court || '',
          chamber: data.chamber || '',
          qualification: data.qualification || '',

          barEnrollmentDate:
            data.barEnrollmentDate || '',

          address: data.address || '',
          status: data.status || 'Active'

        });

        setPageLoading(false);

      },
      (error) => {

        console.error(error);

        setPageLoading(false);

        Swal.fire({
          icon: 'error',
          title: 'Loading Failed',
          text: 'Unable to load lawyer information.',
          confirmButtonColor: '#0284c7'
        }).then(() => {

          navigate('/admin-dashboard/lawyers');

        });

      }
    );

    return () => unsubscribe();

  }, [id, navigate]);


  // ============================================================
  // HANDLE CHANGE
  // ============================================================

  const handleChange = (e) => {

    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {

      setErrors((prev) => ({
        ...prev,
        [name]: ''
      }));

    }

  };


  // ============================================================
  // VALIDATION
  // ============================================================

  const validate = () => {

    const newErrors = {};

    const name =
      formData.fullName.trim();

    const cnic =
      formData.cnic.trim();

    const email =
      formData.email.trim().toLowerCase();

    const phone =
      formData.phone.trim();

    const license =
      formData.licenseNumber.trim();

    const bar =
      formData.barAssociation.trim();

    const specialization =
      formData.specialization;


    // ----------------------------------------------------------
    // NAME
    // ----------------------------------------------------------

    if (!name) {

      newErrors.fullName =
        'Full name is required.';

    } else if (name.length < 3) {

      newErrors.fullName =
        'Full name must contain at least 3 characters.';

    } else if (!/^[A-Za-z\s.'-]+$/.test(name)) {

      newErrors.fullName =
        'Full name can only contain letters, spaces and basic punctuation.';

    }


    // ----------------------------------------------------------
    // CNIC
    // ----------------------------------------------------------

    if (!cnic) {

      newErrors.cnic =
        'CNIC is required.';

    } else if (!/^\d{5}-\d{7}-\d$/.test(cnic)) {

      newErrors.cnic =
        'Use CNIC format XXXXX-XXXXXXX-X.';

    }


    // ----------------------------------------------------------
    // EMAIL
    // ----------------------------------------------------------

    if (!email) {

      newErrors.email =
        'Email address is required.';

    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {

      newErrors.email =
        'Enter a valid email address.';

    }


    // ----------------------------------------------------------
    // PHONE
    // ----------------------------------------------------------

    if (!phone) {

      newErrors.phone =
        'Phone number is required.';

    } else if (!/^03\d{2}-?\d{7}$/.test(phone)) {

      newErrors.phone =
        'Enter a valid Pakistani phone number.';

    }


    // ----------------------------------------------------------
    // PASSWORD
    // ----------------------------------------------------------

    if (!isEdit) {

      if (!formData.password) {

        newErrors.password =
          'Password is required.';

      } else if (formData.password.length < 6) {

        newErrors.password =
          'Password must contain at least 6 characters.';

      }


      if (!formData.confirmPassword) {

        newErrors.confirmPassword =
          'Please confirm the password.';

      } else if (
        formData.password !==
        formData.confirmPassword
      ) {

        newErrors.confirmPassword =
          'Passwords do not match.';

      }

    }


    // ----------------------------------------------------------
    // LICENSE
    // ----------------------------------------------------------

    if (!license) {

      newErrors.licenseNumber =
        'Bar license number is required.';

    } else if (license.length < 3) {

      newErrors.licenseNumber =
        'Enter a valid license number.';

    }


    // ----------------------------------------------------------
    // BAR
    // ----------------------------------------------------------

    if (!bar) {

      newErrors.barAssociation =
        'Bar association is required.';

    }


    // ----------------------------------------------------------
    // SPECIALIZATION
    // ----------------------------------------------------------

    if (!specialization) {

      newErrors.specialization =
        'Please select a specialization.';

    }


    // ----------------------------------------------------------
    // EXPERIENCE
    // ----------------------------------------------------------

    if (
      formData.yearsOfExperience !== '' &&
      (
        isNaN(Number(formData.yearsOfExperience)) ||
        Number(formData.yearsOfExperience) < 0 ||
        Number(formData.yearsOfExperience) > 70
      )
    ) {

      newErrors.yearsOfExperience =
        'Experience must be between 0 and 70 years.';

    }


    // ----------------------------------------------------------
    // QUALIFICATION
    // ----------------------------------------------------------

    if (
      formData.qualification.trim().length > 0 &&
      formData.qualification.trim().length < 2
    ) {

      newErrors.qualification =
        'Enter a valid qualification.';

    }


    // ----------------------------------------------------------
    // ADDRESS
    // ----------------------------------------------------------

    if (
      formData.address.trim().length > 0 &&
      formData.address.trim().length < 5
    ) {

      newErrors.address =
        'Please enter a more complete address.';

    }


    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;

  };


  // ============================================================
  // CHECK DUPLICATES
  // ============================================================

  const checkDuplicates = async () => {

    return new Promise((resolve) => {

      const usersRef =
        ref(db, 'users');

      onValue(
        usersRef,
        (snapshot) => {

          const data =
            snapshot.val() || {};

          const cnic =
            formData.cnic
              .trim()
              .toLowerCase();

          const email =
            formData.email
              .trim()
              .toLowerCase();

          const license =
            formData.licenseNumber
              .trim()
              .toLowerCase();

          let duplicate = {};


          Object.entries(data).forEach(
            ([userId, user]) => {

              if (userId === id) {
                return;
              }

              if (
                !user ||
                user.role !== 'lawyer'
              ) {
                return;
              }


              if (
                user.cnic &&
                String(user.cnic)
                  .trim()
                  .toLowerCase() === cnic
              ) {

                duplicate.cnic =
                  'This CNIC is already registered to another lawyer.';

              }


              if (
                user.email &&
                String(user.email)
                  .trim()
                  .toLowerCase() === email
              ) {

                duplicate.email =
                  'This email is already registered to another lawyer.';

              }


              if (
                user.licenseNumber &&
                String(user.licenseNumber)
                  .trim()
                  .toLowerCase() === license
              ) {

                duplicate.licenseNumber =
                  'This license number is already registered to another lawyer.';

              }

            }
          );


          setErrors((prev) => ({
            ...prev,
            ...duplicate
          }));


          resolve(
            Object.keys(duplicate).length === 0
          );

        },
        {
          onlyOnce: true
        }
      );

    });

  };


  // ============================================================
  // SUBMIT
  // ============================================================

  const handleSubmit = async (e) => {

    e.preventDefault();


    if (!validate()) {

      Swal.fire({
        icon: 'warning',
        title: 'Check Form',
        text: 'Please correct the highlighted fields before submitting.',
        confirmButtonColor: '#0284c7'
      });

      return;

    }


    setLoading(true);


    try {

      // --------------------------------------------------------
      // CHECK DUPLICATES
      // --------------------------------------------------------

      const noDuplicate =
        await checkDuplicates();


      if (!noDuplicate) {

        Swal.fire({
          icon: 'warning',
          title: 'Duplicate Information',
          text: 'A lawyer with the same CNIC, email or license number already exists.',
          confirmButtonColor: '#0284c7'
        });

        setLoading(false);

        return;

      }


      // ========================================================
      // EDIT EXISTING LAWYER
      // ========================================================

      if (isEdit) {

        const cleanData = {

          fullName:
            formData.fullName.trim(),

          cnic:
            formData.cnic.trim(),

          email:
            formData.email.trim().toLowerCase(),

          phone:
            formData.phone.trim(),

          licenseNumber:
            formData.licenseNumber.trim(),

          barAssociation:
            formData.barAssociation.trim(),

          specialization:
            formData.specialization,

          yearsOfExperience:
            formData.yearsOfExperience === ''
              ? ''
              : Number(
                  formData.yearsOfExperience
                ),

          court:
            formData.court.trim(),

          chamber:
            formData.chamber.trim(),

          qualification:
            formData.qualification.trim(),

          barEnrollmentDate:
            formData.barEnrollmentDate,

          address:
            formData.address.trim(),

          status:
            formData.status,

          role:
            'lawyer',

          id:
            id,

          updatedAt:
            new Date().toISOString()

        };


        await update(
          ref(db, `users/${id}`),
          cleanData
        );


        await Swal.fire({
          icon: 'success',
          title: 'Lawyer Updated',
          text: 'Lawyer information has been updated successfully.',
          confirmButtonColor: '#0284c7'
        });


        navigate(
          '/admin-dashboard/lawyers'
        );

        return;

      }


      // ========================================================
      // CREATE NEW FIREBASE AUTH ACCOUNT
      // ========================================================

      const email =
        formData.email
          .trim()
          .toLowerCase();

      const password =
        formData.password;


      const userCredential =
        await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );


      const firebaseUser =
        userCredential.user;


      const lawyerId =
        firebaseUser.uid;


      const now =
        new Date().toISOString();


      // ========================================================
      // LAWYER DATABASE RECORD
      // ========================================================

      const lawyerData = {

        id:
          lawyerId,

        uid:
          lawyerId,

        fullName:
          formData.fullName.trim(),

        cnic:
          formData.cnic.trim(),

        email:
          email,

        phone:
          formData.phone.trim(),

        licenseNumber:
          formData.licenseNumber.trim(),

        barAssociation:
          formData.barAssociation.trim(),

        specialization:
          formData.specialization,

        yearsOfExperience:
          formData.yearsOfExperience === ''
            ? ''
            : Number(
                formData.yearsOfExperience
              ),

        court:
          formData.court.trim(),

        chamber:
          formData.chamber.trim(),

        qualification:
          formData.qualification.trim(),

        barEnrollmentDate:
          formData.barEnrollmentDate,

        address:
          formData.address.trim(),

        status:
          formData.status,

        role:
          'lawyer',

        createdAt:
          now,

        updatedAt:
          now

      };


      await set(
        ref(db, `users/${lawyerId}`),
        lawyerData
      );


      // ========================================================
      // SUCCESS
      // ========================================================

      await Swal.fire({
        icon: 'success',
        title: 'Lawyer Registered',
        html: `
          <div style="text-align:left">
            <p><strong>Lawyer:</strong> ${formData.fullName}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Login:</strong> Firebase Authentication</p>
          </div>
        `,
        confirmButtonColor: '#0284c7'
      });


      navigate(
        '/admin-dashboard/lawyers'
      );


    } catch (error) {

      console.error(
        'LAWYER REGISTRATION ERROR:',
        error
      );


      let message =
        error.message ||
        'Unable to register lawyer.';


      // Firebase Auth errors

      if (
        error.code ===
        'auth/email-already-in-use'
      ) {

        message =
          'This email is already registered in Firebase Authentication.';

      } else if (
        error.code ===
        'auth/invalid-email'
      ) {

        message =
          'The email address is invalid.';

      } else if (
        error.code ===
        'auth/weak-password'
      ) {

        message =
          'Password is too weak. Use at least 6 characters.';

      } else if (
        error.code ===
        'auth/network-request-failed'
      ) {

        message =
          'Network error. Please check your internet connection.';

      }


      Swal.fire({
        icon: 'error',
        title: 'Registration Failed',
        text: message,
        confirmButtonColor: '#0284c7'
      });


    } finally {

      setLoading(false);

    }

  };


  // ============================================================
  // LOADING
  // ============================================================

  if (pageLoading) {

    return (

      <div className="lawyer-loading">

        <style>{`

          .lawyer-loading {
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
            font-size: 34px;
            color: #0284c7;
            animation: spin 1s linear infinite;
          }

          .loading-box p {
            margin-top: 12px;
            font-size: 14px;
            color: #64748b;
          }

          @keyframes spin {
            from {
              transform: rotate(0deg);
            }

            to {
              transform: rotate(360deg);
            }
          }

        `}</style>


        <div className="loading-box">

          <FaSpinner
            className="loading-spinner"
          />

          <p>
            Loading lawyer information...
          </p>

        </div>

      </div>

    );

  }


  // ============================================================
  // UI
  // ============================================================

  return (

    <div className="lawyer-registration">

      <style>{`

        * {
          box-sizing: border-box;
        }

        .lawyer-registration {
          min-height: 100vh;
          padding: 30px;
          background: #eef8ff;
          font-family: Arial, Helvetica, sans-serif;
          color: #111827;
        }

        .registration-container {
          max-width: 1100px;
          margin: 0 auto;
        }

        .registration-top {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
        }

        .back-button {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #dbeafe;
          border-radius: 10px;
          background: #fff;
          color: #111827;
          cursor: pointer;
          font-size: 16px;
          transition: .2s;
          box-shadow: 0 3px 12px rgba(0,0,0,.06);
        }

        .back-button:hover {
          background: #0284c7;
          color: #fff;
          border-color: #0284c7;
          transform: translateX(-2px);
        }

        .registration-heading h1 {
          margin: 0;
          font-size: 29px;
          font-weight: 800;
          letter-spacing: -.4px;
        }

        .registration-heading p {
          margin: 6px 0 0;
          font-size: 14px;
          color: #64748b;
        }

        .registration-card {
          background: #fff;
          border: 1px solid #d9edf9;
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 10px 35px rgba(0,0,0,.07);
        }

        .registration-card-header {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 24px 30px;
          background: linear-gradient(
            135deg,
            #e0f2fe,
            #f8fcff
          );
          border-bottom: 1px solid #dbeafe;
        }

        .registration-icon {
          width: 56px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          background: #0284c7;
          color: #fff;
          font-size: 23px;
          box-shadow: 0 5px 15px rgba(2,132,199,.22);
        }

        .registration-card-header h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 800;
        }

        .registration-card-header p {
          margin: 5px 0 0;
          font-size: 13px;
          color: #64748b;
        }

        .registration-form {
          padding: 30px;
        }

        .section-title {
          grid-column: 1/-1;
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 4px;
          padding-bottom: 10px;
          border-bottom: 1px solid #e5e7eb;
          font-size: 15px;
          font-weight: 800;
          color: #111827;
        }

        .section-line {
          width: 4px;
          height: 18px;
          background: #0284c7;
          border-radius: 5px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2,minmax(0,1fr));
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .form-group.full {
          grid-column: 1/-1;
        }

        .form-label {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 13px;
          font-weight: 700;
          color: #1f2937;
        }

        .form-label svg {
          color: #0284c7;
          font-size: 12px;
        }

        .required {
          color: #dc2626;
          margin-left: 2px;
        }

        .input-wrapper {
          position: relative;
        }

        .input-wrapper .form-input {
          padding-right: 45px;
        }

        .password-toggle {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          border: none;
          background: transparent;
          color: #64748b;
          cursor: pointer;
          font-size: 16px;
        }

        .form-input,
        .form-select,
        .form-textarea {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 9px;
          outline: none;
          font-family: inherit;
          font-size: 14px;
          color: #111827;
          background: #fff;
          transition: .2s;
        }

        .form-input,
        .form-select {
          height: 46px;
          padding: 0 13px;
        }

        .form-textarea {
          min-height: 105px;
          padding: 12px 13px;
          resize: vertical;
        }

        .form-input:focus,
        .form-select:focus,
        .form-textarea:focus {
          border-color: #0284c7;
          box-shadow: 0 0 0 3px rgba(2,132,199,.1);
        }

        .form-input.error,
        .form-select.error,
        .form-textarea.error {
          border-color: #dc2626;
          background: #fffafa;
        }

        .error-message {
          font-size: 11px;
          font-weight: 600;
          color: #dc2626;
        }

        .form-help {
          font-size: 11px;
          color: #94a3b8;
        }

        .registration-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 20px 30px;
          background: #fafafa;
          border-top: 1px solid #e5e7eb;
        }

        .footer-note {
          font-size: 12px;
          color: #64748b;
        }

        .footer-actions {
          display: flex;
          gap: 10px;
        }

        .cancel-button {
          padding: 12px 22px;
          border: 1px solid #d1d5db;
          border-radius: 9px;
          background: #fff;
          color: #374151;
          font-weight: 700;
          cursor: pointer;
        }

        .save-button {
          min-width: 155px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 22px;
          border: none;
          border-radius: 9px;
          background: #0284c7;
          color: #fff;
          font-weight: 700;
          cursor: pointer;
        }

        .save-button:hover {
          background: #0369a1;
        }

        .save-button:disabled {
          opacity: .65;
          cursor: not-allowed;
        }

        .save-spinner {
          animation: spin 1s linear infinite;
        }

        @media(max-width:750px) {

          .lawyer-registration {
            padding: 15px;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .form-group.full,
          .section-title {
            grid-column: auto;
          }

          .registration-form {
            padding: 20px;
          }

          .registration-card-header {
            padding: 20px;
          }

          .registration-footer {
            align-items: stretch;
            flex-direction: column;
            padding: 18px 20px;
          }

          .footer-actions {
            width: 100%;
          }

          .cancel-button,
          .save-button {
            flex: 1;
          }

        }

      `}</style>


      <div className="registration-container">


        {/* TOP */}

        <div className="registration-top">

          <button
            type="button"
            className="back-button"
            onClick={() =>
              navigate('/admin-dashboard/lawyers')
            }
          >

            <FaArrowLeft />

          </button>


          <div className="registration-heading">

            <h1>
              {isEdit
                ? 'Edit Lawyer'
                : 'Lawyer Registration'}
            </h1>

            <p>
              {isEdit
                ? 'Update lawyer professional and personal information'
                : 'Register a new lawyer in the Court Management System'}
            </p>

          </div>

        </div>


        {/* CARD */}

        <div className="registration-card">


          {/* HEADER */}

          <div className="registration-card-header">

            <div className="registration-icon">

              <FaUserTie />

            </div>


            <div>

              <h2>
                {isEdit
                  ? 'Edit Lawyer Information'
                  : 'New Lawyer Information'}
              </h2>

              <p>
                Enter complete and accurate lawyer information
              </p>

            </div>

          </div>


          {/* FORM */}

          <form
            className="registration-form"
            onSubmit={handleSubmit}
            noValidate
          >

            <div className="form-grid">


              {/* PERSONAL */}

              <div className="section-title">

                <span className="section-line"></span>

                Personal Information

              </div>


              {/* NAME */}

              <div className="form-group">

                <label className="form-label">

                  <FaUser />

                  Full Name

                  <span className="required">
                    *
                  </span>

                </label>


                <input
                  className={`form-input ${
                    errors.fullName
                      ? 'error'
                      : ''
                  }`}
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Enter lawyer full name"
                />


                {errors.fullName && (

                  <span className="error-message">
                    {errors.fullName}
                  </span>

                )}

              </div>


              {/* CNIC */}

              <div className="form-group">

                <label className="form-label">

                  <FaIdCard />

                  CNIC

                  <span className="required">
                    *
                  </span>

                </label>


                <input
                  className={`form-input ${
                    errors.cnic
                      ? 'error'
                      : ''
                  }`}
                  type="text"
                  name="cnic"
                  value={formData.cnic}
                  onChange={handleChange}
                  placeholder="XXXXX-XXXXXXX-X"
                />


                {errors.cnic && (

                  <span className="error-message">
                    {errors.cnic}
                  </span>

                )}

              </div>


              {/* EMAIL */}

              <div className="form-group">

                <label className="form-label">

                  <FaEnvelope />

                  Email Address

                  <span className="required">
                    *
                  </span>

                </label>


                <input
                  className={`form-input ${
                    errors.email
                      ? 'error'
                      : ''
                  }`}
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="lawyer@example.com"
                />


                {errors.email && (

                  <span className="error-message">
                    {errors.email}
                  </span>

                )}

              </div>


              {/* PHONE */}

              <div className="form-group">

                <label className="form-label">

                  <FaPhone />

                  Phone Number

                  <span className="required">
                    *
                  </span>

                </label>


                <input
                  className={`form-input ${
                    errors.phone
                      ? 'error'
                      : ''
                  }`}
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="03XX-XXXXXXX"
                />


                {errors.phone && (

                  <span className="error-message">
                    {errors.phone}
                  </span>

                )}

              </div>


              {/* LOGIN */}

              <div className="section-title">

                <span className="section-line"></span>

                Login Credentials

              </div>


              {/* PASSWORD */}

              <div className="form-group">

                <label className="form-label">

                  <FaLock />

                  Password

                  {!isEdit && (
                    <span className="required">
                      *
                    </span>
                  )}

                </label>


                <div className="input-wrapper">

                  <input
                    className={`form-input ${
                      errors.password
                        ? 'error'
                        : ''
                    }`}
                    type={
                      showPassword
                        ? 'text'
                        : 'password'
                    }
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder={
                      isEdit
                        ? 'Leave blank to keep current password'
                        : 'Enter login password'
                    }
                  />


                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setShowPassword(
                        !showPassword
                      )
                    }
                  >

                    {showPassword
                      ? <FaEyeSlash />
                      : <FaEye />}

                  </button>

                </div>


                {errors.password && (

                  <span className="error-message">
                    {errors.password}
                  </span>

                )}


                {!isEdit && (

                  <span className="form-help">
                    Minimum 6 characters.
                  </span>

                )}

              </div>


              {/* CONFIRM PASSWORD */}

              <div className="form-group">

                <label className="form-label">

                  <FaLock />

                  Confirm Password

                  {!isEdit && (
                    <span className="required">
                      *
                    </span>
                  )}

                </label>


                <div className="input-wrapper">

                  <input
                    className={`form-input ${
                      errors.confirmPassword
                        ? 'error'
                        : ''
                    }`}
                    type={
                      showConfirmPassword
                        ? 'text'
                        : 'password'
                    }
                    name="confirmPassword"
                    value={
                      formData.confirmPassword
                    }
                    onChange={handleChange}
                    placeholder="Confirm password"
                  />


                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setShowConfirmPassword(
                        !showConfirmPassword
                      )
                    }
                  >

                    {showConfirmPassword
                      ? <FaEyeSlash />
                      : <FaEye />}

                  </button>

                </div>


                {errors.confirmPassword && (

                  <span className="error-message">
                    {errors.confirmPassword}
                  </span>

                )}

              </div>


              {/* PROFESSIONAL */}

              <div className="section-title">

                <span className="section-line"></span>

                Professional Information

              </div>


              {/* LICENSE */}

              <div className="form-group">

                <label className="form-label">

                  <FaCertificate />

                  Bar License Number

                  <span className="required">
                    *
                  </span>

                </label>


                <input
                  className={`form-input ${
                    errors.licenseNumber
                      ? 'error'
                      : ''
                  }`}
                  type="text"
                  name="licenseNumber"
                  value={
                    formData.licenseNumber
                  }
                  onChange={handleChange}
                  placeholder="Enter bar license number"
                />


                {errors.licenseNumber && (

                  <span className="error-message">
                    {errors.licenseNumber}
                  </span>

                )}

              </div>


              {/* BAR */}

              <div className="form-group">

                <label className="form-label">

                  <FaBuilding />

                  Bar Association

                  <span className="required">
                    *
                  </span>

                </label>


                <input
                  className={`form-input ${
                    errors.barAssociation
                      ? 'error'
                      : ''
                  }`}
                  type="text"
                  name="barAssociation"
                  value={
                    formData.barAssociation
                  }
                  onChange={handleChange}
                  placeholder="e.g. Sialkot Bar Association"
                />


                {errors.barAssociation && (

                  <span className="error-message">
                    {errors.barAssociation}
                  </span>

                )}

              </div>


              {/* SPECIALIZATION */}

              <div className="form-group">

                <label className="form-label">

                  <FaBriefcase />

                  Specialization

                  <span className="required">
                    *
                  </span>

                </label>


                <select
                  className={`form-select ${
                    errors.specialization
                      ? 'error'
                      : ''
                  }`}
                  name="specialization"
                  value={
                    formData.specialization
                  }
                  onChange={handleChange}
                >

                  <option value="">
                    Select specialization
                  </option>

                  <option value="Criminal Law">
                    Criminal Law
                  </option>

                  <option value="Civil Law">
                    Civil Law
                  </option>

                  <option value="Family Law">
                    Family Law
                  </option>

                  <option value="Corporate Law">
                    Corporate Law
                  </option>

                  <option value="Constitutional Law">
                    Constitutional Law
                  </option>

                  <option value="Tax Law">
                    Tax Law
                  </option>

                  <option value="Property Law">
                    Property Law
                  </option>

                  <option value="Cyber Law">
                    Cyber Law
                  </option>

                  <option value="Human Rights Law">
                    Human Rights Law
                  </option>

                  <option value="Other">
                    Other
                  </option>

                </select>


                {errors.specialization && (

                  <span className="error-message">
                    {errors.specialization}
                  </span>

                )}

              </div>


              {/* EXPERIENCE */}

              <div className="form-group">

                <label className="form-label">

                  Years of Experience

                </label>


                <input
                  className={`form-input ${
                    errors.yearsOfExperience
                      ? 'error'
                      : ''
                  }`}
                  type="number"
                  min="0"
                  max="70"
                  name="yearsOfExperience"
                  value={
                    formData.yearsOfExperience
                  }
                  onChange={handleChange}
                  placeholder="Enter years"
                />


                {errors.yearsOfExperience && (

                  <span className="error-message">
                    {errors.yearsOfExperience}
                  </span>

                )}

              </div>


              {/* COURT */}

              <div className="form-group">

                <label className="form-label">

                  <FaBuilding />

                  Court / District

                </label>


                <input
                  className="form-input"
                  type="text"
                  name="court"
                  value={formData.court}
                  onChange={handleChange}
                  placeholder="e.g. District Courts Sialkot"
                />

              </div>


              {/* CHAMBER */}

              <div className="form-group">

                <label className="form-label">

                  <FaBuilding />

                  Chamber / Office

                </label>


                <input
                  className="form-input"
                  type="text"
                  name="chamber"
                  value={formData.chamber}
                  onChange={handleChange}
                  placeholder="Enter chamber or office"
                />

              </div>


              {/* QUALIFICATION */}

              <div className="form-group">

                <label className="form-label">

                  <FaGraduationCap />

                  Qualification

                </label>


                <input
                  className={`form-input ${
                    errors.qualification
                      ? 'error'
                      : ''
                  }`}
                  type="text"
                  name="qualification"
                  value={
                    formData.qualification
                  }
                  onChange={handleChange}
                  placeholder="e.g. LLB, LLM"
                />


                {errors.qualification && (

                  <span className="error-message">
                    {errors.qualification}
                  </span>

                )}

              </div>


              {/* ENROLLMENT */}

              <div className="form-group">

                <label className="form-label">

                  <FaCalendarAlt />

                  Bar Enrollment Date

                </label>


                <input
                  className="form-input"
                  type="date"
                  name="barEnrollmentDate"
                  value={
                    formData.barEnrollmentDate
                  }
                  onChange={handleChange}
                />

              </div>


              {/* STATUS */}

              <div className="form-group">

                <label className="form-label">

                  Status

                </label>


                <select
                  className="form-select"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >

                  <option value="Active">
                    Active
                  </option>

                  <option value="Inactive">
                    Inactive
                  </option>

                </select>

              </div>


              {/* CONTACT */}

              <div className="section-title">

                <span className="section-line"></span>

                Contact Information

              </div>


              {/* ADDRESS */}

              <div className="form-group full">

                <label className="form-label">

                  <FaMapMarkerAlt />

                  Address

                </label>


                <textarea
                  className={`form-textarea ${
                    errors.address
                      ? 'error'
                      : ''
                  }`}
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Enter complete address"
                />


                {errors.address && (

                  <span className="error-message">
                    {errors.address}
                  </span>

                )}

              </div>


            </div>


            {/* FOOTER */}

            <div className="registration-footer">

              <div className="footer-note">

                <span className="required">
                  *
                </span>

                {' '}Required fields

              </div>


              <div className="footer-actions">

                <button
                  type="button"
                  className="cancel-button"
                  onClick={() =>
                    navigate(
                      '/admin-dashboard/lawyers'
                    )
                  }
                  disabled={loading}
                >
                  Cancel
                </button>


                <button
                  type="submit"
                  className="save-button"
                  disabled={loading}
                >

                  {loading
                    ? (
                      <FaSpinner
                        className="save-spinner"
                      />
                    )
                    : (
                      <FaSave />
                    )
                  }


                  {loading
                    ? (
                      isEdit
                        ? 'Updating Lawyer...'
                        : 'Registering Lawyer...'
                    )
                    : (
                      isEdit
                        ? 'Update Lawyer'
                        : 'Register Lawyer'
                    )
                  }

                </button>

              </div>

            </div>


          </form>

        </div>

      </div>

    </div>

  );

};

export default LawyerRegistration;