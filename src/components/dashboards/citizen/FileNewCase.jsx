
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

import {
  FaUpload,
  FaFile,
  FaTimes,
  FaCheckCircle,
  FaArrowLeft,
  FaRobot,
  FaSpinner
} from 'react-icons/fa';

import {
  ref,
  push,
  set,
  update,
  serverTimestamp,
  onValue
} from 'firebase/database';

import { auth, db } from '../../../firebase';

import GlassCard from '../../common/GlassCard';

const FileNewCase = () => {
  
  const navigate = useNavigate();

  // ============================================================
  // FORM
  // ============================================================

  const [formData, setFormData] = useState({
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
  // GENERAL STATES
  // ============================================================

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submittedCaseId, setSubmittedCaseId] = useState('');

  // ============================================================
  // AI RESULTS
  // ============================================================

  const [predictedCaseType, setPredictedCaseType] = useState('');
  const [predictedPriority, setPredictedPriority] = useState('');
  const [predictedDuration, setPredictedDuration] = useState(null);

  // ============================================================
  // BLOCKCHAIN STATE - NEW
  // ============================================================

  const [blockchainRegistered, setBlockchainRegistered] = useState(false);

  // ============================================================
  // ERROR
  // ============================================================

  const [error, setError] = useState('');

  // ============================================================
  // CURRENT USER
  // ============================================================

  const user = auth.currentUser;

  // ============================================================
  // FASTAPI URL
  // ============================================================

  const API_BASE_URL =
    window.location.protocol === 'file:'
      ? 'http://192.168.43.223:8000'
      : (
          window.location.hostname === 'localhost' ||
          window.location.hostname === '127.0.0.1'
        )
        ? 'http://127.0.0.1:8000'
        : 'http://192.168.43.223:8000';

  // ============================================================
  // GENERATE SHA-256 DOCUMENT HASH - NEW
  // ============================================================

  const generateDocumentHash = async (description, documents) => {
    if (!window.crypto?.subtle) {
      throw new Error(
        'Secure SHA-256 hashing is not supported in this browser. Please use localhost or HTTPS.'
      );
    }

    const fileBuffers = [];

    for (const file of documents) {
      const buffer = await file.arrayBuffer();

      fileBuffers.push({
        name: file.name,
        type: file.type,
        size: file.size,
        content: Array.from(new Uint8Array(buffer))
      });
    }

    const documentData = JSON.stringify({
      description,
      documents: fileBuffers
    });

    const encoder = new TextEncoder();

    const data = encoder.encode(documentData);

    const hashBuffer = await window.crypto.subtle.digest(
      'SHA-256',
      data
    );

    return Array.from(new Uint8Array(hashBuffer))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  };

  // ============================================================
  // AUTH CHECK
  // ============================================================

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // ============================================================
  // LOAD CLERKS
  // ============================================================

  useEffect(() => {
    if (!user) return;

    const usersRef = ref(db, 'users');

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
              String(item.role || '')
                .toLowerCase()
                .trim() === 'clerk'
          );

        console.log('CLERKS FETCHED:', clerkList);

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
  // INPUT
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
    const files = Array.from(e.target.files || []);

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
// UPLOAD DOCUMENTS TO FASTAPI
// ============================================================

const uploadDocuments = async (caseId, documents) => {
  if (!documents || documents.length === 0) {
    return [];
  }

  const uploadData = new FormData();

  uploadData.append('caseId', caseId);

  documents.forEach((file) => {
    uploadData.append('files', file);
  });

  const response = await fetch(
    'http://127.0.0.1:8000/upload-case-documents',
    {
      method: 'POST',
      body: uploadData
    }
  );

  if (!response.ok) {
    throw new Error('Document upload failed');
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error('Document upload unsuccessful');
  }

  return result.documents.map((document) => ({
    ...document,
    url: `http://127.0.0.1:8000${document.url}`
  }));
};

  // ============================================================
  // NOTIFICATION HELPER
  // ============================================================

  const createNotification = async (
    receiverId,
    notificationData
  ) => {
    if (!receiverId) {
      return null;
    }

    const notificationRef =
      ref(
        db,
        `notifications/${receiverId}`
      );

    const notificationKey =
      push(notificationRef).key;

    if (!notificationKey) {
      return null;
    }

    await set(
      ref(
        db,
        `notifications/${receiverId}/${notificationKey}`
      ),
      {
        ...notificationData,
        read: false,
        timestamp: serverTimestamp()
      }
    );

    return notificationKey;
  };

  // ============================================================
  // SUBMIT CASE
  // ============================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');
    setLoading(true);
    setBlockchainRegistered(false);

    // ==========================================================
    // VALIDATION
    // ==========================================================

    if (
      !formData.defendantName.trim() ||
      !formData.description.trim()
    ) {
      setError(
        'Please fill all required fields.'
      );

      setLoading(false);
      return;
    }

    if (!user) {
      setError(
        'User is not logged in. Please login again.'
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

    let newCaseKey = null;
    let caseSaved = false;

    try {
      // ========================================================
      // TEXT FEATURES
      // ========================================================

      const description =
        formData.description.trim();

      const words =
        description
          ? description.split(/\s+/)
          : [];

      const sentences =
        description
          .split(/[.!?]+/)
          .filter(
            (sentence) =>
              sentence.trim().length > 0
          );

      const paragraphs =
        description
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

        page_count:
          1,

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
          'unknown',

        classification_confidence:
          0,

        estimated_duration_days:
          0,

        complexity_score:
          0,

        case_age:
          0,

        charges:
          '',

        number_of_parties:
          2,

        total_citations:
          0,

        cases_cited_count:
          0,

        statutes_cited_count:
          0,

        foreign_citations:
          0,

        is_appeal:
          0,

        appeal_level:
          'none',

        has_urdu:
          /[\u0600-\u06FF]/.test(
            description
          )
            ? 1
            : 0,

        has_arabic:
          0,

        has_multiple_parties:
          1,

        has_headnotes:
          description.length > 0
            ? 1
            : 0,

        citation_pattern:
          0,

        judges_mentioned:
          'no',

        primary_judge:
          'unknown',

        judge_count:
          0,

        bench_size:
          'single',

        expertise_constitutional:
          'no',

        expertise_criminal:
          'no',

        expertise_civil:
          0,

        expertise_commercial:
          0,

        expertise_family:
          0,

        expertise_tax:
          0,

        expertise_service:
          0,

        expertise_election:
          0,

        expertise_ip:
          0,

        expertise_environmental:
          0,

        primary_expertise_area:
          'unknown',

        expertise_diversity_score:
          0,

        workload_score:
          0,

        hearing_count:
          0,

        adjournment_count:
          0,

        previous_citations:
          0,

        pending_references:
          0,

        judgment_complexity:
          0,

        historical_cases_count:
          0,

        efficiency_score:
          0,

        case_judge_match_score:
          0,

        workload_capacity_score:
          0,

        assignment_priority:
          'medium',

        description
      };

      console.log(
        '========================================'
      );

      console.log(
        'SENDING CASE DESCRIPTION TO AI'
      );

      console.log(
        'API:',
        `${API_BASE_URL}/predict-case-classification`
      );

      // ========================================================
      // CALL CLASSIFICATION API
      // ========================================================

      const classificationResponse =
        await fetch(
          `${API_BASE_URL}/predict-case-classification`,
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

      if (!classificationResponse.ok) {
        const errorText =
          await classificationResponse.text();

        throw new Error(
          `AI classification failed: ${errorText}`
        );
      }

      const classificationResult =
        await classificationResponse.json();

      console.log(
        'AI Classification Result:',
        classificationResult
      );

      if (
        classificationResult?.success === false
      ) {
        throw new Error(
          classificationResult?.error ||
          'AI classification failed.'
        );
      }

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

      const normalizedCaseType =
        String(aiCaseType)
          .toLowerCase();

      const priorityPayload = {
        complexity_score:
          0.5,

        case_age:
          0,

        estimated_duration_days:
          0,

        hearing_count:
          0,

        adjournment_count:
          0,

        pending_references:
          0,

        judgment_complexity:
          0.5,

        workload_score:
          0,

        total_citations:
          0,

        cases_cited_count:
          0,

        statutes_cited_count:
          0,

        foreign_citations:
          0,

        number_of_parties:
          2,

        page_count:
          1,

        word_count:
          words.length,

        sentence_count:
          sentences.length,

        is_appeal:
          0,

        case_type_civil:
          normalizedCaseType.includes(
            'civil'
          )
            ? 1
            : 0,

        case_type_constitutional:
          normalizedCaseType.includes(
            'constitutional'
          )
            ? 1
            : 0,

        case_type_corporate:
          normalizedCaseType.includes(
            'corporate'
          )
            ? 1
            : 0,

        case_type_criminal:
          normalizedCaseType.includes(
            'criminal'
          )
            ? 1
            : 0,

        case_type_election:
          normalizedCaseType.includes(
            'election'
          )
            ? 1
            : 0,

        case_type_family:
          normalizedCaseType.includes(
            'family'
          )
            ? 1
            : 0,

        case_type_service:
          normalizedCaseType.includes(
            'service'
          )
            ? 1
            : 0,

        case_type_tax:
          normalizedCaseType.includes(
            'tax'
          )
            ? 1
            : 0,

        case_type_uncategorized:
          normalizedCaseType.includes(
            'unknown'
          )
            ? 1
            : 0
      };

      console.log(
        'Sending data to AI priority model...'
      );

      const priorityResponse =
        await fetch(
          `${API_BASE_URL}/predict-priority`,
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

      console.log(
        'AI Priority Result:',
        priorityResult
      );

      if (
        priorityResult?.success === false
      ) {
        throw new Error(
          priorityResult?.error ||
          'AI priority prediction failed.'
        );
      }

      const aiPriority =
        priorityResult
          ?.predicted_priority ??
        null;

      let priorityLabel =
        'Unknown';

      if (
        String(aiPriority) === '1'
      ) {
        priorityLabel =
          'High';
      } else if (
        String(aiPriority) === '2'
      ) {
        priorityLabel =
          'Medium';
      } else if (
        String(aiPriority) === '3'
      ) {
        priorityLabel =
          'Low';
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


// ========================================================
// EXTRACT UPLOADED DOCUMENT CONTENT FOR AI DURATION
// ========================================================

let extractedDocumentText = '';
let extractedPageCount = 0;
let extractedWordCount = 0;
let extractedCharacterCount = 0;
let extractedSentenceCount = 0;

if (formData.documents && formData.documents.length > 0) {
  try {
    const extractionFormData = new FormData();

    formData.documents.forEach((file) => {
      extractionFormData.append('files', file);
    });

    const extractionResponse = await fetch(
      `${API_BASE_URL}/extract-case-documents`,
      {
        method: 'POST',
        body: extractionFormData
      }
    );

    if (!extractionResponse.ok) {
      throw new Error('Document extraction failed');
    }

    const extractionResult = await extractionResponse.json();

    if (extractionResult.success) {
      const documents = extractionResult.documents || [];

      extractedDocumentText = documents
        .map((doc) => doc.text || '')
        .filter(Boolean)
        .join('\n\n');

      extractedPageCount = documents.reduce(
        (total, doc) => total + (doc.page_count || 0), 0
      );

      extractedWordCount = documents.reduce(
        (total, doc) => total + (doc.word_count || 0), 0
      );

      extractedCharacterCount = documents.reduce(
        (total, doc) => total + (doc.character_count || 0), 0
      );

      extractedSentenceCount = documents.reduce(
        (total, doc) => total + (doc.sentence_count || 0), 0
      );
    }

    console.log('Extracted Document Details:', {
      extractedPageCount,
      extractedWordCount,
      extractedCharacterCount,
      extractedSentenceCount
    });

  } catch (error) {
    console.error('Document extraction error:', error);
  }
}

      const durationPayload = {
        year:
          new Date().getFullYear(),

        page_count:
  extractedPageCount || 1,

       word_count:
  words.length + extractedWordCount,

        character_count:
  description.length + extractedCharacterCount,

       sentence_count:
  sentences.length + extractedSentenceCount,

      avg_word_per_page:
  (words.length + extractedWordCount) /
  (extractedPageCount || 1),

        case_number:
          '',

        citation:
          '',

        judgment_date:
          '',

        judges:
          '',

        bench:
          '',

        headnotes:
  `${description}\n\n${extractedDocumentText}`,

        acts_referred:
          '',

        petitioner:
          user.displayName ||
          'Citizen',

        respondent:
          formData.defendantName,

        case_type:
          String(aiCaseType),

        case_subtype:
          'unknown',

        classification_confidence:
          0.5,

        complexity_score:
          0.5,

        case_age:
          0,

        charges:
          '',

        sections_applied:
          '',

        penalties:
          '',

        imprisonment:
          '',

        fines:
          '',

        appellant:
          '',

        number_of_parties:
          2,

        total_citations:
          0,

        cases_cited_count:
          0,

        statutes_cited_count:
          0,

        foreign_citations:
          0,

        is_appeal:
          0,

        appeal_level:
          'none',

        has_multiple_parties:
          1,

        has_headnotes:
          description.length > 0
            ? 1
            : 0,

        citation_pattern:
          '0'
      };

      console.log(
        'Sending data to AI duration model...'
      );

      const durationResponse =
        await fetch(
          `${API_BASE_URL}/predict-case-duration`,
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

      console.log(
        'AI Duration Result:',
        durationResult
      );

      if (
        durationResult?.success === false
      ) {
        throw new Error(
          durationResult?.error ||
          'AI duration prediction failed.'
        );
      }

      const durationDays =
  durationResult?.predicted_duration_days ?? null;

      setPredictedDuration(
        durationDays
      );

      // ========================================================
      // CREATE CASE ID
      // ========================================================

      const casesRef =
        ref(db, 'cases');

      newCaseKey =
        push(casesRef).key;

      if (!newCaseKey) {
        throw new Error(
          'Could not generate case ID.'
        );
      }

      // ========================================================
      // GENERATE DOCUMENT HASH - NEW
      // ========================================================

      console.log(
        'Generating SHA-256 document hash...'
      );

      const documentHash =
        await generateDocumentHash(
          description,
          formData.documents
        );
/// UPLOAD DOCUMENTS TO FASTAPI

const uploadedDocuments = await uploadDocuments(
  newCaseKey,
  formData.documents
);

console.log(
  'Uploaded Documents:',
  uploadedDocuments
);
      console.log(
        'Document SHA-256 Hash:',
        documentHash
      );

      // ========================================================
      // CASE DATA
      // ========================================================

      const caseData = {
        id:
          newCaseKey,

        userId:
          user.uid,

        userEmail:
          user.email || '',

        userDisplayName:
          user.displayName ||
          'Citizen',

        // ======================================================
        // AI
        // ======================================================

        caseType:
          String(aiCaseType),

        predictedCaseType:
          String(aiCaseType),

        predictedPriority:
          priorityLabel,

        predictedDurationDays:
          durationDays !== null
            ? Number(durationDays)
            : null,

        // ======================================================
        // BASIC CASE
        // ======================================================

        defendantName:
          formData.defendantName.trim(),

        description,

        documents: uploadedDocuments,

documentNames: uploadedDocuments.map(
  (document) => document.name
),

        // BLOCKCHAIN DATA

// Original hash — same hash registered on Hyperledger Fabric
updatedDocumentHash: documentHash,
documentHash,

blockchainStatus:
  'PENDING',

        blockchainRegisteredAt:
          null,

        blockchainMessage:
          'Waiting for blockchain registration',

        // ======================================================
        // CLERK
        // ======================================================

        status:
          'Pending Clerk Approval',

        clerkApprovalStatus:
          'Pending',

        clerkId:
          null,

        clerkName:
          null,

        clerkDecisionAt:
          null,

        clerkRejectionReason:
          null,

        // ======================================================
        // LAWYER
        // ======================================================

        selectedLawyerId:
          null,

        selectedLawyerName:
          null,

        selectedLawyerType:
          null,

        lawyerRequestStatus:
          'Not Requested',

        lawyerRequestId:
          null,

        assignedLawyer:
          null,

        assignedLawyerName:
          null,

        lawyerDecisionAt:
          null,

        // ======================================================
        // AI META
        // ======================================================

        aiProcessed:
          true,

        aiModel:
          'Case Classification + Priority + Duration Models',

        aiProcessedAt:
          new Date().toISOString(),

        // ======================================================
        // CREATED
        // ======================================================

        createdAt:
          serverTimestamp()
      };

      // ========================================================
      // SAVE CASE TO FIREBASE
      // ========================================================

      await set(
        ref(
          db,
          `cases/${newCaseKey}`
        ),
        caseData
      );

      caseSaved = true;

      console.log(
        'Case saved in Firebase:',
        newCaseKey
      );

      // ========================================================
      // REGISTER CASE ON HYPERLEDGER FABRIC - NEW
      // ========================================================

      console.log(
        'Registering case on Hyperledger Fabric...'
      );

      const blockchainResponse =
        await fetch(
          `${API_BASE_URL}/blockchain/register-case`,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',

              Accept:
                'application/json'
            },

            body: JSON.stringify({
              caseId: newCaseKey,

              caseType: String(aiCaseType),

              documentHash,

              registeredBy: user.uid
            })
          }
        );

      if (!blockchainResponse.ok) {
        const blockchainError =
          await blockchainResponse.text();

        throw new Error(
          `Blockchain registration failed: ${blockchainError}`
        );
      }

      const blockchainResult =
        await blockchainResponse.json();

      console.log(
        'Blockchain Registration Result:',
        blockchainResult
      );

      if (
        blockchainResult?.status !== 'success'
      ) {
        throw new Error(
          blockchainResult?.message ||
          'Blockchain registration was not successful.'
        );
      }

// REGISTER EACH DOCUMENT ON HYPERLEDGER FABRIC
for (const document of uploadedDocuments) {
  const documentResponse = await fetch(
    `${API_BASE_URL}/blockchain/register-document`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        caseId: newCaseKey,
        documentHash: document.documentHash,
        fileName: document.fileName || document.name,
        uploadedBy: user.uid,
      }),
    }
  );

  if (!documentResponse.ok) {
    const errorText = await documentResponse.text();
    throw new Error(
      `Document blockchain registration failed: ${errorText}`
    );
  }

  const documentResult = await documentResponse.json();

  if (documentResult?.success !== true) {
    throw new Error('Document blockchain registration unsuccessful');
  }

  console.log(
    'Document registered on blockchain:',
    document.fileName || document.name
  );
}

      // ========================================================
      // UPDATE FIREBASE BLOCKCHAIN STATUS - NEW
      // ========================================================

      await update(
        ref(
          db,
          `cases/${newCaseKey}`
        ),
        {
          blockchainStatus:
            'REGISTERED',

          blockchainRegisteredAt:
            new Date().toISOString(),

          blockchainMessage:
            'Case successfully registered on Hyperledger Fabric'
        }
      );

      setBlockchainRegistered(true);


// Record case registration in blockchain history
try {
  const historyResponse = await fetch(
    `${API_BASE_URL}/blockchain/record-case-event`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        caseId: newCaseKey,
        eventType: 'CASE_REGISTERED',
        details: `New ${aiCaseType} case successfully registered on Hyperledger Fabric.`,
        actorId: user.uid,
      }),
    }
  );

  if (!historyResponse.ok) {
    const errorText = await historyResponse.text();
    console.error('Case registration history failed:', errorText);
  } else {
    console.log('Case registration history saved.');
  }
} catch (historyError) {
  console.error('Case registration history error:', historyError);
}


      console.log(
        'Case successfully registered on blockchain.'
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

                requestType:
                  'case_approval',

                caseId:
                  newCaseKey,

                title:
                  'New Case Requires Approval',

                message:
                  `${user.displayName || 'A citizen'} submitted Case ${newCaseKey}. AI classified it as ${aiCaseType}. Please review and approve or reject the case.`,

                caseType:
                  String(aiCaseType),

                priority:
                  priorityLabel,

                estimatedDurationDays:
                  durationDays !== null
                    ? Number(durationDays)
                    : null,

                clerkName
              }
            );
          }
        )
      );

      // ========================================================
      // CITIZEN NOTIFICATION
      // ========================================================

      await createNotification(
        user.uid,
        {
          type:
            'case_submitted_clerk_review',

          caseId:
            newCaseKey,

          lawyerRequestStatus:
            'Not Requested',

          title:
            'Case Submitted Successfully',

          message:
            `Your Case ${newCaseKey} has been submitted successfully. AI classified it as ${aiCaseType}. The case has been registered on blockchain and sent to the clerk for approval. You can select and request a lawyer from Case Detail.`,

          caseType:
            String(aiCaseType),

          priority:
            priorityLabel,

          estimatedDurationDays:
            durationDays !== null
              ? Number(durationDays)
              : null
        }
      );

      // ========================================================
      // SUCCESS
      // ========================================================

      setSubmittedCaseId(
        newCaseKey
      );

      setSuccess(true);

      setTimeout(
        () => {
          navigate(
            '/citizen-dashboard'
          );
        },
        5000
      );

    } catch (err) {
      console.error(
        'CASE SUBMISSION ERROR:',
        err
      );

      // ========================================================
      // SAVE BLOCKCHAIN FAILURE STATUS - NEW
      // ========================================================

      if (caseSaved && newCaseKey) {
        try {
          await update(
            ref(
              db,
              `cases/${newCaseKey}`
            ),
            {
              blockchainStatus:
                'FAILED',

              blockchainMessage:
                err?.message ||
                'Blockchain registration failed'
            }
          );
        } catch (firebaseUpdateError) {
          console.error(
            'BLOCKCHAIN STATUS UPDATE ERROR:',
            firebaseUpdateError
          );
        }
      }

      setError(
        err?.message ||
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

        .dashboard-page {
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

        .dashboard-container {
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
        }

        .back-btn:hover {
          background: white;
          transform: translateX(-2px);
        }

        .page-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .page-header h1 {
          font-size: 2.4rem;
          color: #1A1A1A;
          margin-bottom: .5rem;
        }

        .page-header p {
          color: #6B7280;
        }

        .form-card {
          background:
            rgba(255,255,255,.95) !important;

          padding: 2.5rem;

          border-radius: 18px;
        }

        .case-form {
          display: flex;
          flex-direction: column;
          gap: 1.4rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: .5rem;
        }

        .form-group label {
          font-weight: 600;
          color: #1A1A1A;
        }

        .form-group input,
        .form-group textarea {
          width: 100%;
          box-sizing: border-box;

          padding: .9rem 1rem;

          border:
            2px solid #D1E8F5;

          border-radius: 12px;

          font-size: 1rem;

          background: white;

          outline: none;

          transition: .3s;
        }

        .form-group input:focus,
        .form-group textarea:focus {
          border-color: #0288D1;

          box-shadow:
            0 0 0 3px
            rgba(2,136,209,.08);
        }

        .form-group textarea {
          min-height: 160px;
          resize: vertical;
        }

        .clerk-info {
          padding: 1rem;

          border-radius: 12px;

          background:
            #E3F2FD;

          color: #01579B;

          display: flex;
          align-items: center;

          gap: .7rem;

          line-height: 1.5;
        }

        .ai-info {
          padding: 1rem;

          border-radius: 12px;

          background:
            linear-gradient(
              135deg,
              #E8F5E9,
              #E3F2FD
            );

          color: #1A1A1A;

          display: flex;
          align-items: flex-start;

          gap: .8rem;

          line-height: 1.5;

          border:
            1px solid #D1E8F5;
        }

        .ai-info svg {
          color: #0288D1;

          font-size: 1.3rem;

          margin-top: .1rem;

          flex-shrink: 0;
        }

        .upload-area {
          padding: 2rem;

          border:
            2px dashed #D1E8F5;

          border-radius: 12px;

          text-align: center;

          background:
            #FAFDFF;
        }

        .upload-label {
          display: flex;

          flex-direction: column;

          align-items: center;

          gap: .5rem;

          cursor: pointer;

          color: #6B7280;
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
        }

        .file-item span {
          flex: 1;
          word-break: break-word;
        }

        .remove-file {
          border: none;

          background: transparent;

          color: #D32F2F;

          cursor: pointer;

          font-size: 1rem;
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

          transition: .3s;
        }

        .btn-secondary {
          background: #EEEEEE;
          color: #222;
        }

        .btn-secondary:hover {
          background: #DDDDDD;
        }

        .btn-primary {
          background:
            linear-gradient(
              135deg,
              #4FC3F7,
              #0288D1
            );

          color: white;

          box-shadow:
            0 5px 15px
            rgba(2,136,209,.2);
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);

          box-shadow:
            0 8px 20px
            rgba(2,136,209,.3);
        }

        .btn-primary:disabled {
          opacity: .6;
          cursor: not-allowed;
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

          background:
            #E3F2FD;

          border-radius: 12px;

          line-height: 1.7;

          text-align: left;
        }

        .ai-result strong {
          color: #01579B;
        }

        .case-id-text {
          margin-top: 1rem;

          padding: .7rem;

          background:
            #F3F6FA;

          border-radius: 8px;

          word-break: break-all;
        }

        @media (max-width: 700px) {

          .dashboard-page {
            padding: 1rem;
          }

          .form-card {
            padding: 1.3rem;
          }

          .page-header h1 {
            font-size: 2rem;
          }

          .form-actions {
            flex-direction: column;
          }

          .form-actions button {
            width: 100%;
          }

        }

      `}</style>

      <div className="dashboard-page">

        <div className="dashboard-container">

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
              onClick={() =>
                navigate(-1)
              }
              className="back-btn"
            >
              <FaArrowLeft />

              Back
            </button>

            {/* HEADER */}

            <div className="page-header">

              <h1>
                File New Case
              </h1>

              <p>
                Submit your case for AI analysis
                and clerk approval
              </p>

            </div>

            <GlassCard
              className="form-card"
            >

              {/* SUCCESS */}

              {success ? (

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
                    Case Submitted Successfully!
                  </h2>

                  <p>
                    Your case has been analyzed
                    by AI and submitted successfully.
                  </p>

                  {/* AI RESULT */}

                  <div className="ai-result">

                    <strong>
                      <FaRobot />
                      {' '}
                      AI Case Type:
                    </strong>

                    <br />

                    {predictedCaseType ||
                      'Unknown'}

                    <br />
                    <br />

                    <strong>
                      AI Priority:
                    </strong>

                    <br />

                    {predictedPriority ||
                      'Unknown'}

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

                  {/* BLOCKCHAIN SUCCESS - NEW */}

                  <div
                    className="clerk-info"
                    style={{
                      marginTop: '1rem',
                      textAlign: 'left',
                      background: '#E8F5E9',
                      color: '#1B5E20'
                    }}
                  >

                    <FaCheckCircle />

                    <span>
                      {blockchainRegistered
                        ? 'Blockchain Verified: Your case hash has been successfully registered on Hyperledger Fabric.'
                        : 'Blockchain registration status unavailable.'
                      }
                    </span>

                  </div>

                  {/* CASE ID */}

                  <p className="case-id-text">

                    Case ID:{' '}

                    <strong>
                      {submittedCaseId}
                    </strong>

                  </p>

                  {/* CLERK */}

                  <div
                    className="clerk-info"
                    style={{
                      marginTop: '1rem',
                      textAlign: 'left'
                    }}
                  >

                    <FaCheckCircle />

                    <span>
                      Your case has been sent
                      to the registered clerk
                      for approval.
                    </span>

                  </div>

                  {/* LAWYER */}

                  <div
                    className="ai-info"
                    style={{
                      marginTop: '1rem',
                      textAlign: 'left'
                    }}
                  >

                    <FaRobot />

                    <span>
                      After opening the case
                      from Case Detail, you can
                      select a lawyer and send
                      a lawyer request.
                    </span>

                  </div>

                  <p>
                    Redirecting to dashboard...
                  </p>

                </motion.div>

              ) : (

                <form
                  onSubmit={handleSubmit}
                  className="case-form"
                >

                  {/* ERROR */}

                  {error && (
                    <div
                      className="error-message"
                    >
                      {error}
                    </div>
                  )}

                  {/* DEFENDANT */}

                  <div className="form-group">

                    <label>
                      Defendant Name *
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

                  <div className="form-group">

                    <label>
                      Case Description *
                    </label>

                    <textarea
                      name="description"

                      value={
                        formData.description
                      }

                      onChange={
                        handleChange
                      }

                      placeholder="Describe your case in detail. Explain what happened, the dispute, people involved, relevant events, and any other important information..."

                      required
                    />

                  </div>

                  {/* CLERK INFO */}

                  <div
                    className="clerk-info"
                  >

                    <FaCheckCircle />

                    <span>

                      After submission, your
                      case will automatically be
                      analyzed by AI and sent to
                      registered clerks for approval.

                    </span>

                  </div>

                  {/* AI INFO */}

                  <div
                    className="ai-info"
                  >

                    <FaRobot />

                    <span>

                      AI will classify your case,
                      predict its priority and
                      estimate the expected case
                      duration.

                    </span>

                  </div>

                  {/* DOCUMENTS */}

                  <div className="form-group">

                    <label>
                      Upload Documents
                    </label>

                    <div
                      className="upload-area"
                    >

                      <input
                        type="file"

                        id="fileUpload"

                        multiple

                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"

                        onChange={
                          handleFileUpload
                        }

                        style={{
                          display: 'none'
                        }}
                      />

                      <label
                        htmlFor="fileUpload"

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

                      <div
                        className="file-list"
                      >

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

                  {/* ACTIONS */}

                  <div
                    className="form-actions"
                  >

                    <button
                      type="button"

                      className="btn-secondary"

                      onClick={() =>
                        navigate(
                          '/citizen-dashboard'
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

                      {loading ? (

                        <>

                          <FaSpinner />

                          {' '}

                          AI & Blockchain Processing...

                        </>

                      ) : (

                        <>

                          <FaUpload />

                          {' '}

                          Submit Case

                        </>

                      )}

                    </button>

                  </div>

                  {/* NO CLERK */}

                  {!clerksLoading &&
                    clerks.length === 0 && (

                      <div
                        className="error-message"
                      >

                        No clerk account is
                        currently available.
                        Please contact the
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

export default FileNewCase;
