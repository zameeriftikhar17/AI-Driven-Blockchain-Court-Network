import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

import {
  FaUpload,
  FaFile,
  FaTimes,
  FaCheckCircle,
  FaArrowLeft,
  FaRobot,
  FaUser,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaGavel
} from 'react-icons/fa';

import {
  ref,
  push,
  set,
  serverTimestamp,
  onValue
} from 'firebase/database';

import { auth, db } from '../../../firebase';
import GlassCard from '../../common/GlassCard';

const LawyerFileNewCase = () => {
  const navigate = useNavigate();

  // ============================================================
  // LAWYER
  // ============================================================

  const user = auth.currentUser;

  // ============================================================
  // FORM DATA
  // ============================================================

  const [formData, setFormData] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    clientAddress: '',

    caseType: '',
    defendantName: '',
    description: '',

    documents: []
  });

  // ============================================================
  // CLERKS
  // ============================================================

  const [clerks, setClerks] = useState([]);
  const [clerksLoading, setClerksLoading] = useState(true);

  // ============================================================
  // LAWYER PROFILE
  // ============================================================

  const [lawyerProfile, setLawyerProfile] = useState(null);

  // ============================================================
  // SUBMISSION
  // ============================================================

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [submittedCaseId, setSubmittedCaseId] = useState('');

  // ============================================================
  // AI RESULTS
  // ============================================================

  const [predictedCaseType, setPredictedCaseType] =
    useState('');

  const [predictedPriority, setPredictedPriority] =
    useState('');

  const [predictedDuration, setPredictedDuration] =
    useState(null);

  // ============================================================
  // ERROR
  // ============================================================

  const [error, setError] = useState('');

  // ============================================================
  // AUTH
  // ============================================================

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // ============================================================
  // LOAD LAWYER PROFILE
  // ============================================================

  useEffect(() => {
    if (!user) return;

    const lawyerRef = ref(
      db,
      `users/${user.uid}`
    );

    const unsubscribe = onValue(
      lawyerRef,
      (snapshot) => {
        const data = snapshot.val();

        if (data) {
          setLawyerProfile({
            uid: user.uid,
            ...data
          });
        } else {
          setLawyerProfile({
            uid: user.uid,
            fullName:
              user.displayName || 'Lawyer',
            email:
              user.email || '',
            role: 'lawyer'
          });
        }
      },
      (firebaseError) => {
        console.error(
          'LAWYER PROFILE ERROR:',
          firebaseError
        );

        setLawyerProfile({
          uid: user.uid,
          fullName:
            user.displayName || 'Lawyer',
          email:
            user.email || '',
          role: 'lawyer'
        });
      }
    );

    return () => unsubscribe();
  }, [user]);

  // ============================================================
  // LOAD CLERKS
  // ============================================================

  useEffect(() => {
    if (!user) return;

    const usersRef = ref(
      db,
      'users'
    );

    const unsubscribe = onValue(
      usersRef,
      (snapshot) => {
        const data = snapshot.val();

        if (!data) {
          setClerks([]);
          setClerksLoading(false);
          return;
        }

        const clerkList = Object.keys(data)
          .map((key) => ({
            id: key,
            ...(data[key] || {})
          }))
          .filter(
            (item) =>
              String(
                item.role || ''
              ).toLowerCase() === 'clerk'
          );

        setClerks(clerkList);
        setClerksLoading(false);
      },
      (firebaseError) => {
        console.error(
          'CLERK FETCH ERROR:',
          firebaseError
        );

        setClerks([]);
        setClerksLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // ============================================================
  // CASE TYPES
  // ============================================================

  const caseTypes = [
    'Civil Dispute',
    'Family Matter',
    'Property Dispute',
    'Criminal Case',
    'Corporate Dispute',
    'Consumer Complaint',
    'Employment Dispute',
    'Other'
  ];

  // ============================================================
  // INPUT CHANGE
  // ============================================================

  const handleChange = (e) => {
    setFormData((previous) => ({
      ...previous,
      [e.target.name]: e.target.value
    }));
  };

  // ============================================================
  // FILE UPLOAD
  // ============================================================

  const handleFileUpload = (e) => {
    const files = Array.from(
      e.target.files || []
    );

    setFormData((previous) => ({
      ...previous,
      documents: [
        ...previous.documents,
        ...files
      ]
    }));

    e.target.value = '';
  };

  // ============================================================
  // REMOVE FILE
  // ============================================================

  const removeFile = (index) => {
    setFormData((previous) => ({
      ...previous,
      documents:
        previous.documents.filter(
          (_, fileIndex) =>
            fileIndex !== index
        )
    }));
  };

  // ============================================================
  // NOTIFICATION HELPER
  // ============================================================

  const createNotification = async (
    receiverId,
    notificationData
  ) => {
    if (!receiverId) return;

    const notificationRef = ref(
      db,
      `notifications/${receiverId}`
    );

    const notificationKey =
      push(notificationRef).key;

    if (!notificationKey) return;

    await set(
      ref(
        db,
        `notifications/${receiverId}/${notificationKey}`
      ),
      {
        ...notificationData,
        read: false,
        timestamp:
          serverTimestamp()
      }
    );
  };

  // ============================================================
  // SUBMIT CASE
  // ============================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');
    setLoading(true);

    // ==========================================================
    // VALIDATION
    // ==========================================================

    if (
      !formData.clientName.trim() ||
      !formData.clientEmail.trim() ||
      !formData.clientPhone.trim() ||
      !formData.caseType ||
      !formData.defendantName.trim() ||
      !formData.description.trim()
    ) {
      setError(
        'Please fill all required client and case fields.'
      );

      setLoading(false);
      return;
    }

    if (!user) {
      setError(
        'Lawyer is not logged in. Please login again.'
      );

      setLoading(false);
      return;
    }

    if (clerks.length === 0) {
      setError(
        'No clerk account is currently available. Please contact the administrator.'
      );

      setLoading(false);
      return;
    }

    try {
      // ========================================================
      // DESCRIPTION FEATURES
      // ========================================================

      const description =
        formData.description.trim();

      const words = description
        ? description.split(/\s+/)
        : [];

      const sentences = description
        .split(/[.!?]+/)
        .filter(
          (sentence) =>
            sentence.trim().length > 0
        );

      const paragraphs = description
        .split(/\n+/)
        .filter(
          (paragraph) =>
            paragraph.trim().length > 0
        );

      // ========================================================
      // AI CASE CLASSIFICATION
      // ========================================================

      const classificationPayload = {
        year:
          new Date().getFullYear(),

        page_count: 1,

        word_count:
          words.length,

        character_count:
          description.length,

        sentence_count:
          sentences.length,

        paragraph_count:
          paragraphs.length,

        avg_word_per_page:
          words.length,

        case_subtype:
          String(
            formData.caseType
          ),

        classification_confidence: 0,

        estimated_duration_days: 0,

        complexity_score: 0,

        case_age: 0,

        charges:
          String(
            formData.caseType
          ),

        number_of_parties: 2,

        total_citations: 0,

        cases_cited_count: 0,

        statutes_cited_count: 0,

        foreign_citations: 0,

        is_appeal: 0,

        appeal_level: 'none',

        has_urdu: 0,

        has_arabic: 0,

        has_multiple_parties: 1,

        has_headnotes:
          description.length > 0
            ? 1
            : 0,

        citation_pattern: 0,

        judges_mentioned: 'no',

        primary_judge: 'unknown',

        judge_count: 0,

        bench_size: 'single',

        expertise_constitutional: 'no',

        expertise_criminal: 'no',

        expertise_civil: 0,

        expertise_commercial: 0,

        expertise_family: 0,

        expertise_tax: 0,

        expertise_service: 0,

        expertise_election: 0,

        expertise_ip: 0,

        expertise_environmental: 0,

        primary_expertise_area:
          'unknown',

        expertise_diversity_score: 0,

        workload_score: 0,

        hearing_count: 0,

        adjournment_count: 0,

        previous_citations: 0,

        pending_references: 0,

        judgment_complexity: 0,

        historical_cases_count: 0,

        efficiency_score: 0,

        case_judge_match_score: 0,

        workload_capacity_score: 0,

        assignment_priority:
          'medium',

        description
      };

      const classificationResponse =
        await fetch(
          'http://192.168.43.223:8000/predict-case-classification',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',

              Accept:
                'application/json'
            },

            body:
              JSON.stringify(
                classificationPayload
              )
          }
        );

      if (
        !classificationResponse.ok
      ) {
        const errorText =
          await classificationResponse.text();

        throw new Error(
          `AI classification failed: ${errorText}`
        );
      }

      const classificationResult =
        await classificationResponse.json();

      const aiCaseType =
        classificationResult
          ?.predicted_case_type ||
        'Unknown';

      setPredictedCaseType(
        String(aiCaseType)
      );

      // ========================================================
      // AI PRIORITY
      // ========================================================

      const priorityPayload = {
        complexity_score: 0.5,

        case_age: 0,

        estimated_duration_days: 0,

        hearing_count: 0,

        adjournment_count: 0,

        pending_references: 0,

        judgment_complexity: 0.5,

        workload_score: 0,

        total_citations: 0,

        cases_cited_count: 0,

        statutes_cited_count: 0,

        foreign_citations: 0,

        number_of_parties: 2,

        page_count: 1,

        word_count:
          words.length,

        sentence_count:
          sentences.length,

        is_appeal: 0,

        case_type_civil:
          String(aiCaseType)
            .toLowerCase()
            .includes('civil')
            ? 1
            : 0,

        case_type_constitutional: 0,

        case_type_corporate:
          String(aiCaseType)
            .toLowerCase()
            .includes('corporate')
            ? 1
            : 0,

        case_type_criminal:
          String(aiCaseType)
            .toLowerCase()
            .includes('criminal')
            ? 1
            : 0,

        case_type_election: 0,

        case_type_family:
          String(aiCaseType)
            .toLowerCase()
            .includes('family')
            ? 1
            : 0,

        case_type_service: 0,

        case_type_tax: 0,

        case_type_uncategorized:
          String(aiCaseType)
            .toLowerCase()
            .includes('unknown')
            ? 1
            : 0
      };

      const priorityResponse =
        await fetch(
          'http://192.168.43.223:8000/predict-priority',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',

              Accept:
                'application/json'
            },

            body:
              JSON.stringify(
                priorityPayload
              )
          }
        );

      if (!priorityResponse.ok) {
        const errorText =
          await priorityResponse.text();

        throw new Error(
          `Priority prediction failed: ${errorText}`
        );
      }

      const priorityResult =
        await priorityResponse.json();

      const aiPriority =
        priorityResult
          ?.predicted_priority ??
        null;

      let priorityLabel =
        'Unknown';

      if (
        String(aiPriority) === '1'
      ) {
        priorityLabel = 'High';
      } else if (
        String(aiPriority) === '2'
      ) {
        priorityLabel = 'Medium';
      } else if (
        String(aiPriority) === '3'
      ) {
        priorityLabel = 'Low';
      } else if (
        aiPriority !== null &&
        aiPriority !== undefined
      ) {
        priorityLabel =
          String(aiPriority);
      }

      setPredictedPriority(
        priorityLabel
      );

      // ========================================================
      // AI DURATION
      // ========================================================

      const durationPayload = {
        year:
          new Date().getFullYear(),

        page_count: 1,

        word_count:
          words.length,

        character_count:
          description.length,

        sentence_count:
          sentences.length,

        avg_word_per_page:
          words.length,

        case_number: '',

        citation: '',

        judgment_date: '',

        judges: '',

        bench: '',

        headnotes:
          description,

        acts_referred: '',

        petitioner:
          formData.clientName,

        respondent:
          formData.defendantName,

        case_type:
          String(aiCaseType),

        case_subtype:
          String(
            formData.caseType
          ),

        classification_confidence:
          0.5,

        complexity_score:
          0.5,

        case_age: 0,

        charges:
          String(
            formData.caseType
          ),

        sections_applied: '',

        penalties: '',

        imprisonment: '',

        fines: '',

        appellant: '',

        number_of_parties: 2,

        total_citations: 0,

        cases_cited_count: 0,

        statutes_cited_count: 0,

        foreign_citations: 0,

        is_appeal: 0,

        appeal_level: 'none',

        has_multiple_parties: 1,

        has_headnotes:
          description.length > 0
            ? 1
            : 0,

        citation_pattern: '0'
      };

      const durationResponse =
        await fetch(
          'http://192.168.43.223:8000/predict-case-duration',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',

              Accept:
                'application/json'
            },

            body:
              JSON.stringify(
                durationPayload
              )
          }
        );

      if (!durationResponse.ok) {
        const errorText =
          await durationResponse.text();

        throw new Error(
          `Duration prediction failed: ${errorText}`
        );
      }

      const durationResult =
        await durationResponse.json();

      const durationDays =
        durationResult
          ?.predicted_duration_days ??
        null;

      setPredictedDuration(
        durationDays
      );

      // ========================================================
      // CREATE CASE
      // ========================================================

      const casesRef =
        ref(db, 'cases');

      const newCaseKey =
        push(casesRef).key;

      if (!newCaseKey) {
        throw new Error(
          'Could not generate case ID.'
        );
      }

      // ========================================================
      // LAWYER INFORMATION
      // ========================================================

      const lawyerName =
        lawyerProfile?.fullName ||
        user.displayName ||
        'Lawyer';

      const lawyerEmail =
        lawyerProfile?.email ||
        user.email ||
        '';

      // ========================================================
      // CASE DATA
      // ========================================================

      const caseData = {
        id: newCaseKey,

        // ======================================================
        // LAWYER WHO FILED THE CASE
        // ======================================================

        userId: user.uid,

        userEmail:
          lawyerEmail,

        userDisplayName:
          lawyerName,

        userRole:
          'lawyer',

        filedByRole:
          'lawyer',

        filedByLawyer:
          true,

        filedOnBehalfOfClient:
          true,

        // ======================================================
        // CLIENT INFORMATION
        // ======================================================

        clientId: null,

        clientName:
          formData.clientName.trim(),

        clientEmail:
          formData.clientEmail.trim(),

        clientPhone:
          formData.clientPhone.trim(),

        clientAddress:
          formData.clientAddress.trim(),

        // ======================================================
        // CASE INFORMATION
        // ======================================================

        caseType:
          formData.caseType,

        predictedCaseType:
          String(aiCaseType),

        predictedPriority:
          priorityLabel,

        predictedDurationDays:
          durationDays !== null
            ? Number(durationDays)
            : null,

        defendantName:
          formData.defendantName.trim(),

        description,

        documentNames:
          formData.documents.map(
            (file) => file.name
          ),

        // ======================================================
        // CLERK WORKFLOW
        // ======================================================

        status:
          'Pending Clerk Approval',

        clerkApprovalStatus:
          'Pending',

        clerkId: null,

        clerkName: null,

        clerkDecisionAt: null,

        clerkRejectionReason:
          null,

        // ======================================================
        // LAWYER WORKFLOW
        // ======================================================

        selectedLawyerId:
          user.uid,

        selectedLawyerName:
          lawyerName,

        selectedLawyerType:
          lawyerProfile?.specialization ||
          'General Lawyer',

        lawyerRequestStatus:
          'Not Required',

        assignedLawyer:
          user.uid,

        assignedLawyerName:
          lawyerName,

        lawyerRequestId:
          null,

        lawyerDecisionAt:
          null,

        // ======================================================
        // AI
        // ======================================================

        aiProcessed:
          true,

        aiModel:
          'Case Classification + Priority + Duration Models',

        aiProcessedAt:
          new Date().toISOString(),

        // ======================================================
        // TIMESTAMP
        // ======================================================

        createdAt:
          serverTimestamp()
      };

      // ========================================================
      // SAVE CASE
      // ========================================================

      await set(
        ref(
          db,
          `cases/${newCaseKey}`
        ),
        caseData
      );

      // ========================================================
      // SEND CASE REQUEST TO ALL CLERKS
      // ========================================================

      await Promise.all(
        clerks.map(
          async (clerk) => {
            const clerkName =
              clerk.fullName ||
              clerk.name ||
              clerk.displayName ||
              'Clerk';

            await createNotification(
              clerk.id,
              {
                type:
                  'clerk_case_review',

                caseId:
                  newCaseKey,

                title:
                  'New Lawyer Filed Case Requires Approval',

                message:
                  `Lawyer ${lawyerName} has filed Case ${newCaseKey} on behalf of client ${formData.clientName.trim()}. Please review and approve or reject the case.`,

                clerkName,

                filedByRole:
                  'lawyer',

                lawyerId:
                  user.uid,

                lawyerName,

                clientName:
                  formData.clientName.trim()
              }
            );
          }
        )
      );

      // ========================================================
      // NOTIFY LAWYER
      // ========================================================

      await createNotification(
        user.uid,
        {
          type:
            'lawyer_case_submitted_clerk_review',

          caseId:
            newCaseKey,

          title:
            'Case Submitted Successfully',

          message:
            `Your case ${newCaseKey} has been filed on behalf of ${formData.clientName.trim()} and sent to the clerk for approval.`,

          filedByRole:
            'lawyer',

          clientName:
            formData.clientName.trim()
        }
      );

      // ========================================================
      // SUCCESS
      // ========================================================

      setSubmittedCaseId(
        newCaseKey
      );

      setSuccess(true);

      setTimeout(() => {
        navigate(
          '/lawyer-dashboard'
        );
      }, 5000);

    } catch (err) {
      console.error(
        'LAWYER CASE SUBMISSION ERROR:',
        err
      );

      setError(
        err.message ||
        'Failed to submit case. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // UI
  // ============================================================

  return (
    <>
      <style>{`

        .lawyer-file-page {
          min-height: 100vh;

          padding: 2rem;

          display: flex;

          justify-content: center;

          align-items: center;

          background:
            linear-gradient(
              135deg,
              #E3F2FD,
              #BBDEFB,
              #90CAF9
            );
        }

        .lawyer-file-container {
          width: 100%;

          max-width: 900px;
        }

        .back-btn {
          display: inline-flex;

          align-items: center;

          gap: .5rem;

          padding: .7rem 1.2rem;

          border: none;

          border-radius: 30px;

          background:
            rgba(255,255,255,.85);

          cursor: pointer;

          margin-bottom: 1.5rem;

          font-weight: 600;

          color: #172033;
        }

        .back-btn:hover {
          background: white;

          transform:
            translateX(-2px);
        }

        .page-header {
          text-align: center;

          margin-bottom: 2rem;
        }

        .page-header h1 {
          font-size: 2.4rem;

          color: #172033;

          margin-bottom: .5rem;
        }

        .page-header p {
          color: #64748B;

          margin: 0;
        }

        .lawyer-badge {
          display: inline-flex;

          align-items: center;

          gap: 7px;

          margin-top: 12px;

          padding: 8px 14px;

          border-radius: 30px;

          background: #E3F2FD;

          color: #0277BD;

          font-size: .82rem;

          font-weight: 800;
        }

        .form-card {
          background:
            rgba(255,255,255,.94) !important;

          padding: 2.5rem;

          border-radius: 18px;
        }

        .case-form {
          display: flex;

          flex-direction: column;

          gap: 1.4rem;
        }

        .section-title {
          display: flex;

          align-items: center;

          gap: 9px;

          margin-top: 8px;

          padding-bottom: 10px;

          border-bottom:
            1px solid #E2E8F0;

          color: #172033;

          font-size: 1.15rem;

          font-weight: 800;
        }

        .section-title svg {
          color: #0288D1;
        }

        .client-info-box {
          padding: 16px;

          border-radius: 12px;

          background: #EAF7FF;

          border:
            1px solid #B3E5FC;

          color: #01579B;

          line-height: 1.5;

          font-size: .88rem;
        }

        .form-grid {
          display: grid;

          grid-template-columns:
            1fr 1fr;

          gap: 1.2rem;
        }

        .full-width {
          grid-column:
            1 / -1;
        }

        .form-group {
          display: flex;

          flex-direction: column;

          gap: .5rem;
        }

        .form-group label {
          font-weight: 700;

          color: #172033;

          font-size: .9rem;
        }

        .required {
          color: #D32F2F;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;

          box-sizing: border-box;

          padding: .9rem 1rem;

          border:
            2px solid #D1E8F5;

          border-radius: 12px;

          font-size: .95rem;

          background: white;

          outline: none;

          transition: .2s ease;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          border-color: #0288D1;

          box-shadow:
            0 0 0 3px
            rgba(2,136,209,.10);
        }

        .form-group textarea {
          min-height: 140px;

          resize: vertical;
        }

        .upload-area {
          padding: 2rem;

          border:
            2px dashed #B3DFF2;

          border-radius: 12px;

          text-align: center;

          background:
            #F8FCFF;
        }

        .upload-label {
          display: flex;

          flex-direction: column;

          align-items: center;

          gap: .5rem;

          cursor: pointer;

          color: #64748B;
        }

        .upload-label svg {
          font-size: 2rem;

          color: #0288D1;
        }

        .file-list {
          display: flex;

          flex-direction: column;

          gap: .5rem;

          margin-top: 1rem;
        }

        .file-item {
          display: flex;

          align-items: center;

          gap: .7rem;

          padding: .7rem 1rem;

          background:
            #F3F6FA;

          border-radius: 8px;

          color: #475569;
        }

        .file-item span {
          flex: 1;

          overflow: hidden;

          text-overflow: ellipsis;

          white-space: nowrap;
        }

        .remove-file {
          border: none;

          background: transparent;

          color: #D32F2F;

          cursor: pointer;

          padding: 5px;
        }

        .clerk-info {
          padding: 1rem;

          border-radius: 12px;

          background: #E3F2FD;

          color: #01579B;

          display: flex;

          align-items: center;

          gap: .7rem;

          font-size: .9rem;

          line-height: 1.5;
        }

        .form-actions {
          display: flex;

          justify-content: flex-end;

          gap: 1rem;

          margin-top: 1rem;
        }

        .btn-secondary,
        .btn-primary {
          padding: .9rem 1.8rem;

          border: none;

          border-radius: 12px;

          font-weight: 700;

          cursor: pointer;

          transition: .2s ease;
        }

        .btn-secondary {
          background: #EEEEEE;

          color: #222;
        }

        .btn-secondary:hover {
          background: #E0E0E0;
        }

        .btn-primary {
          background:
            linear-gradient(
              135deg,
              #4FC3F7,
              #0288D1
            );

          color: white;

          min-width: 210px;
        }

        .btn-primary:hover {
          transform:
            translateY(-2px);

          box-shadow:
            0 8px 20px
            rgba(2,136,209,.25);
        }

        .btn-primary:disabled,
        .btn-secondary:disabled {
          opacity: .6;

          cursor: not-allowed;

          transform: none;
        }

        .error-message {
          padding: 1rem;

          background: #FFEBEE;

          color: #C62828;

          border-radius: 10px;

          border-left:
            4px solid #D32F2F;

          line-height: 1.5;
        }

        .success-message {
          text-align: center;

          padding: 2rem;
        }

        .success-icon {
          font-size: 4rem;

          color: #00C853;

          margin-bottom: 1rem;
        }

        .ai-result {
          margin-top: 1.5rem;

          padding: 1.2rem;

          background: #E3F2FD;

          border-radius: 12px;

          line-height: 1.7;

          text-align: left;
        }

        .ai-result-title {
          display: flex;

          align-items: center;

          gap: 8px;

          color: #01579B;

          font-weight: 800;

          margin-bottom: 10px;
        }

        .case-id-text {
          margin-top: 1rem;

          padding: .8rem;

          background: #F3F6FA;

          border-radius: 8px;

          word-break: break-all;
        }

        .workflow-note {
          padding: 1rem;

          background: #F8FAFC;

          border-radius: 10px;

          color: #475569;

          font-size: .85rem;

          line-height: 1.6;

          border-left:
            4px solid #0288D1;
        }

        @media (max-width: 700px) {

          .lawyer-file-page {
            padding: 1rem;
          }

          .form-card {
            padding: 1.3rem;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .full-width {
            grid-column: auto;
          }

          .form-actions {
            flex-direction: column;
          }

          .form-actions button {
            width: 100%;
          }

          .page-header h1 {
            font-size: 1.8rem;
          }
        }

      `}</style>

      <div className="lawyer-file-page">

        <div className="lawyer-file-container">

          <motion.div
            initial={{
              opacity: 0,
              y: 20
            }}
            animate={{
              opacity: 1,
              y: 0
            }}
            transition={{
              duration: .6
            }}
          >

            {/* BACK */}

            <button
              type="button"
              onClick={() =>
                navigate(
                  '/lawyer-dashboard'
                )
              }
              className="back-btn"
            >
              <FaArrowLeft />

              Back to Lawyer Dashboard
            </button>

            {/* HEADER */}

            <div className="page-header">

              <h1>
                File New Case
              </h1>

              <p>
                File a case on behalf of your client
              </p>

              <div className="lawyer-badge">

                <FaGavel />

                Lawyer Case Filing

              </div>

            </div>

            <GlassCard
              className="form-card"
            >

              {success ? (

                /* ==================================================
                   SUCCESS
                ================================================== */

                <motion.div
                  className="success-message"

                  initial={{
                    opacity: 0,
                    scale: .8
                  }}

                  animate={{
                    opacity: 1,
                    scale: 1
                  }}
                >

                  <FaCheckCircle
                    className="success-icon"
                  />

                  <h2>
                    Case Filed Successfully!
                  </h2>

                  <p>
                    The case has been filed on
                    behalf of your client and
                    sent to the clerk for approval.
                  </p>

                  <div className="ai-result">

                    <div className="ai-result-title">

                      <FaRobot />

                      AI Analysis Result

                    </div>

                    <strong>
                      AI Case Type:
                    </strong>

                    <br />

                    {predictedCaseType}

                    <br />
                    <br />

                    <strong>
                      AI Priority:
                    </strong>

                    <br />

                    {predictedPriority}

                    <br />
                    <br />

                    <strong>
                      AI Estimated Duration:
                    </strong>

                    <br />

                    {predictedDuration !== null
                      ? `${Number(
                          predictedDuration
                        ).toFixed(2)} days`
                      : 'Not available'
                    }

                  </div>

                  <p className="case-id-text">

                    Case ID:{' '}

                    <strong>
                      {submittedCaseId}
                    </strong>

                  </p>

                  <p>
                    Status:
                    {' '}
                    <strong>
                      Pending Clerk Approval
                    </strong>
                  </p>

                  <p>
                    Redirecting to lawyer dashboard...
                  </p>

                </motion.div>

              ) : (

                /* ==================================================
                   FORM
                ================================================== */

                <form
                  onSubmit={
                    handleSubmit
                  }

                  className="case-form"
                >

                  {error && (
                    <div className="error-message">
                      {error}
                    </div>
                  )}

                  {/* ==================================================
                     LAWYER INFO
                  ================================================== */}

                  <div className="section-title">

                    <FaGavel />

                    Lawyer Information

                  </div>

                  <div className="client-info-box">

                    You are filing this case as a
                    lawyer. The case will be linked
                    to your lawyer account and sent
                    to the registered clerks for
                    approval.

                    <br />

                    <strong>
                      Lawyer:
                    </strong>{' '}

                    {lawyerProfile?.fullName ||
                      user?.displayName ||
                      'Lawyer'}

                  </div>

                  {/* ==================================================
                     CLIENT INFORMATION
                  ================================================== */}

                  <div className="section-title">

                    <FaUser />

                    Client Information

                  </div>

                  <div className="form-grid">

                    {/* CLIENT NAME */}

                    <div className="form-group">

                      <label>
                        Client Full Name
                        <span className="required">
                          {' '}*
                        </span>
                      </label>

                      <input
                        type="text"

                        name="clientName"

                        value={
                          formData.clientName
                        }

                        onChange={
                          handleChange
                        }

                        placeholder="Enter client's full name"

                        required
                      />

                    </div>

                    {/* CLIENT EMAIL */}

                    <div className="form-group">

                      <label>
                        Client Email
                        <span className="required">
                          {' '}*
                        </span>
                      </label>

                      <input
                        type="email"

                        name="clientEmail"

                        value={
                          formData.clientEmail
                        }

                        onChange={
                          handleChange
                        }

                        placeholder="Enter client's email"

                        required
                      />

                    </div>

                    {/* CLIENT PHONE */}

                    <div className="form-group">

                      <label>
                        Client Phone
                        <span className="required">
                          {' '}*
                        </span>
                      </label>

                      <input
                        type="tel"

                        name="clientPhone"

                        value={
                          formData.clientPhone
                        }

                        onChange={
                          handleChange
                        }

                        placeholder="Enter client's phone number"

                        required
                      />

                    </div>

                    {/* CLIENT ADDRESS */}

                    <div className="form-group">

                      <label>
                        Client Address
                      </label>

                      <input
                        type="text"

                        name="clientAddress"

                        value={
                          formData.clientAddress
                        }

                        onChange={
                          handleChange
                        }

                        placeholder="Enter client's address"
                      />

                    </div>

                  </div>

                  {/* ==================================================
                     CASE INFORMATION
                  ================================================== */}

                  <div className="section-title">

                    <FaGavel />

                    Case Information

                  </div>

                  <div className="form-grid">

                    {/* CASE TYPE */}

                    <div className="form-group">

                      <label>
                        Case Type
                        <span className="required">
                          {' '}*
                        </span>
                      </label>

                      <select
                        name="caseType"

                        value={
                          formData.caseType
                        }

                        onChange={
                          handleChange
                        }

                        required
                      >

                        <option value="">
                          Select Case Type
                        </option>

                        {caseTypes.map(
                          (type) => (
                            <option
                              key={type}
                              value={type}
                            >
                              {type}
                            </option>
                          )
                        )}

                      </select>

                    </div>

                    {/* DEFENDANT */}

                    <div className="form-group">

                      <label>
                        Defendant Name
                        <span className="required">
                          {' '}*
                        </span>
                      </label>

                      <input
                        type="text"

                        name="defendantName"

                        value={
                          formData.defendantName
                        }

                        onChange={
                          handleChange
                        }

                        placeholder="Enter defendant's full name"

                        required
                      />

                    </div>

                    {/* DESCRIPTION */}

                    <div className="form-group full-width">

                      <label>
                        Case Description
                        <span className="required">
                          {' '}*
                        </span>
                      </label>

                      <textarea
                        name="description"

                        value={
                          formData.description
                        }

                        onChange={
                          handleChange
                        }

                        placeholder="Describe the case in detail..."

                        required
                      />

                    </div>

                  </div>

                  {/* ==================================================
                     CLERK WORKFLOW
                  ================================================== */}

                  <div className="clerk-info">

                    <FaCheckCircle />

                    <span>

                      After submission, the case
                      will automatically be sent
                      to the registered clerks.
                      The clerk must approve the
                      case before the next court
                      workflow starts.

                    </span>

                  </div>

                  {/* ==================================================
                     DOCUMENTS
                  ================================================== */}

                  <div className="section-title">

                    <FaFile />

                    Case Documents

                  </div>

                  <div className="form-group">

                    <label>
                      Upload Documents
                    </label>

                    <div className="upload-area">

                      <input
                        type="file"

                        id="lawyerFileUpload"

                        multiple

                        onChange={
                          handleFileUpload
                        }

                        style={{
                          display: 'none'
                        }}
                      />

                      <label
                        htmlFor="lawyerFileUpload"

                        className="upload-label"
                      >

                        <FaUpload />

                        <span>
                          Click to upload
                        </span>

                        <small>
                          PDF, DOC, DOCX, JPG, PNG
                        </small>

                      </label>

                    </div>

                    {formData.documents.length > 0 && (

                      <div className="file-list">

                        {formData.documents.map(
                          (file, index) => (

                            <div
                              key={
                                `${file.name}-${index}`
                              }

                              className="file-item"
                            >

                              <FaFile />

                              <span>
                                {file.name}
                              </span>

                              <button
                                type="button"

                                className="remove-file"

                                onClick={() =>
                                  removeFile(
                                    index
                                  )
                                }
                              >

                                <FaTimes />

                              </button>

                            </div>

                          )
                        )}

                      </div>

                    )}

                  </div>

                  {/* ==================================================
                     WORKFLOW NOTE
                  ================================================== */}

                  <div className="workflow-note">

                    <strong>
                      Case Workflow:
                    </strong>

                    <br />

                    Lawyer files case on behalf of
                    client → AI analyzes case →
                    Clerk reviews case → Clerk
                    approves/rejects → approved
                    case continues to the court
                    workflow.

                  </div>

                  {/* ==================================================
                     ACTIONS
                  ================================================== */}

                  <div className="form-actions">

                    <button
                      type="button"

                      className="btn-secondary"

                      onClick={() =>
                        navigate(
                          '/lawyer-dashboard'
                        )
                      }

                      disabled={loading}
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"

                      className="btn-primary"

                      disabled={
                        loading ||
                        clerksLoading ||
                        clerks.length === 0
                      }
                    >

                      {loading
                        ? 'AI Processing & Filing...'
                        : 'File Case for Client'
                      }

                    </button>

                  </div>

                  {/* NO CLERK */}

                  {!clerksLoading &&
                    clerks.length === 0 && (

                      <div className="error-message">

                        No clerk account is currently
                        available. Please contact the
                        administrator.

                      </div>

                    )}

                </form>

              )}

            </GlassCard>

          </motion.div>

        </div>

      </div>
    </>
  );
};

export default LawyerFileNewCase;