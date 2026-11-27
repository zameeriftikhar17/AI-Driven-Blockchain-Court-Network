
import React, { useEffect, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FaArrowLeft,
  FaGavel,
  FaUsers,
  FaFileAlt,
  FaVideo,
  FaMicrophone,
  FaClock,
  FaCalendarAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaHourglassHalf,
  FaPaperPlane,
  FaPrint,
  FaShare,
  FaDownload,
  FaUpload,
  FaUserPlus,
  FaUserMinus,
  FaEye,
  FaPlus,
  FaBalanceScale,
  FaSave,
  FaTimes
} from "react-icons/fa";

import {
  ref,
  onValue,
  update
} from "firebase/database";

import { onAuthStateChanged } from "firebase/auth";
import Swal from "sweetalert2";

import { auth, db } from "../../../firebase";
import GlassCard from "../../common/GlassCard";

const ManageHearing = () => {
  const { hearingId: paramHearingId, id: paramId } = useParams();
  const navigate = useNavigate();

  const hearingId = paramHearingId || paramId;

  const [authLoading, setAuthLoading] = useState(true);
  const [hearing, setHearing] = useState(null);
  const [hearingPath, setHearingPath] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState("overview");

  const [noteInput, setNoteInput] = useState("");

  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef(null);

  const [rulingOpen, setRulingOpen] = useState(false);
  const [rulingTitle, setRulingTitle] = useState("");
  const [rulingDecision, setRulingDecision] = useState("");
  const [rulingText, setRulingText] = useState("");
  const [rulingSaving, setRulingSaving] = useState(false);

  const [documentOpen, setDocumentOpen] = useState(false);
  const [documentUrl, setDocumentUrl] = useState("");
  const [documentName, setDocumentName] = useState("");

  /* =========================================================
     AUTH + FIREBASE HEARING LOAD
  ========================================================= */

  useEffect(() => {
    let unsubscribeAuth = null;
    let unsubscribeHearing = null;

    unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setAuthLoading(false);

      if (!user) {
        setLoading(false);
        navigate("/login", { replace: true });
        return;
      }

      if (!hearingId) {
        setError("Hearing ID is missing from the URL.");
        setLoading(false);
        return;
      }

      setLoading(true);

      const hearingRef = ref(db, `hearings/${hearingId}`);

      unsubscribeHearing = onValue(
        hearingRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const value = snapshot.val();

            setHearing({
              id: value.id || hearingId,
              ...value
            });

            setHearingPath(`hearings/${hearingId}`);
            setError("");
            setLoading(false);

            return;
          }

          /* ---------------------------------------------------
             If direct Firebase key doesn't match,
             search all hearings.
          --------------------------------------------------- */

          const allHearingsRef = ref(db, "hearings");

          onValue(
            allHearingsRef,
            (allSnapshot) => {
              if (!allSnapshot.exists()) {
                setHearing(null);
                setHearingPath("");
                setError(
                  `Hearing "${hearingId}" was not found in Firebase.`
                );
                setLoading(false);
                return;
              }

              const hearings = allSnapshot.val();

              let foundHearing = null;

              Object.entries(hearings).forEach(([key, value]) => {
                if (!value || typeof value !== "object") {
                  return;
                }

                const firebaseKey = String(key)
                  .trim()
                  .toLowerCase();

                const firebaseId = String(
                  value.id ||
                    value.hearingId ||
                    value.caseId ||
                    key
                )
                  .trim()
                  .toLowerCase();

                const requestedId = String(hearingId)
                  .trim()
                  .toLowerCase();

                if (
                  firebaseKey === requestedId ||
                  firebaseId === requestedId
                ) {
                  foundHearing = {
                    key,
                    data: value
                  };
                }
              });

              if (foundHearing) {
                setHearing({
                  id:
                    foundHearing.data.id ||
                    foundHearing.key,
                  ...foundHearing.data
                });

                setHearingPath(
                  `hearings/${foundHearing.key}`
                );

                setError("");
              } else {
                setHearing(null);
                setHearingPath("");

                setError(
                  `Hearing "${hearingId}" was not found in Firebase.`
                );
              }

              setLoading(false);
            },
            (firebaseError) => {
              console.error(
                "Firebase hearing search error:",
                firebaseError
              );

              setError(firebaseError.message);
              setLoading(false);
            }
          );
        },
        (firebaseError) => {
          console.error(
            "Firebase hearing error:",
            firebaseError
          );

          setError(firebaseError.message);
          setLoading(false);
        }
      );
    });

    return () => {
      if (unsubscribeAuth) {
        unsubscribeAuth();
      }

      if (unsubscribeHearing) {
        unsubscribeHearing();
      }

      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.log(error);
        }

        recognitionRef.current = null;
      }
    };
  }, [hearingId, navigate]);

  /* =========================================================
     FIREBASE UPDATE
  ========================================================= */

  const updateHearing = async (updates) => {
    if (!hearingPath) {
      await Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: "Firebase hearing path was not found."
      });

      return false;
    }

    try {
      await update(ref(db, hearingPath), {
        ...updates
      });

      setHearing((previous) => ({
        ...previous,
        ...updates
      }));

      return true;
    } catch (err) {
      console.error("Unable to update hearing:", err);

      setError(err.message);

      await Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: err.message
      });

      return false;
    }
  };

  /* =========================================================
     CONFIRMATION
  ========================================================= */

  const confirmAction = async (
    title,
    text,
    confirmButtonText
  ) => {
    const result = await Swal.fire({
      title,
      text,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#0288D1",
      cancelButtonColor: "#6B7280",
      confirmButtonText,
      cancelButtonText: "Cancel"
    });

    return result.isConfirmed;
  };

  /* =========================================================
     DATA HELPERS
  ========================================================= */

  const getParticipants = () => {
    if (!hearing?.participants) {
      return [];
    }

    if (Array.isArray(hearing.participants)) {
      return [...hearing.participants];
    }

    return Object.entries(hearing.participants).map(
      ([key, value]) => ({
        firebaseKey: key,
        ...(typeof value === "object"
          ? value
          : {
              name: String(value)
            })
      })
    );
  };

  const getDocuments = () => {
    if (!hearing?.documents) {
      return [];
    }

    if (Array.isArray(hearing.documents)) {
      return [...hearing.documents];
    }

    return Object.entries(hearing.documents).map(
      ([key, value]) => ({
        firebaseKey: key,
        ...(typeof value === "object"
          ? value
          : {
              name: String(value)
            })
      })
    );
  };

  const getTranscript = () => {
    if (!hearing?.transcript) {
      return [];
    }

    if (Array.isArray(hearing.transcript)) {
      return [...hearing.transcript];
    }

    return Object.entries(hearing.transcript).map(
      ([key, value]) => ({
        firebaseKey: key,
        ...(typeof value === "object"
          ? value
          : {
              text: String(value)
            })
      })
    );
  };

  const getAgenda = () => {
    if (!hearing?.agenda) {
      return [];
    }

    if (Array.isArray(hearing.agenda)) {
      return [...hearing.agenda];
    }

    return Object.values(hearing.agenda);
  };

  /* =========================================================
     NOTES
  ========================================================= */

  const addNote = async () => {
    if (!noteInput.trim() || !hearing) {
      return;
    }

    const timestamp = new Date().toLocaleString();

    const newNote =
      `${timestamp}: ${noteInput.trim()}`;

    const notes = hearing.notes
      ? `${hearing.notes}\n\n${newNote}`
      : newNote;

    const success = await updateHearing({
      notes,
      updatedAt: new Date().toISOString()
    });

    if (success) {
      setNoteInput("");

      await Swal.fire({
        icon: "success",
        title: "Note Added",
        text: "Hearing note was saved successfully.",
        timer: 1500,
        showConfirmButton: false
      });
    }
  };

  /* =========================================================
     PARTICIPANTS
  ========================================================= */

  const toggleParticipant = async (index) => {
    const participants = getParticipants();

    if (!participants[index]) {
      return;
    }

    participants[index] = {
      ...participants[index],
      present: !participants[index].present
    };

    const cleanedParticipants =
      participants.map(
        ({ firebaseKey, ...participant }) =>
          participant
      );

    const success = await updateHearing({
      participants: cleanedParticipants,
      updatedAt: new Date().toISOString()
    });

    if (success) {
      await Swal.fire({
        icon: "success",
        title: participants[index].present
          ? "Marked Present"
          : "Marked Absent",
        timer: 1200,
        showConfirmButton: false
      });
    }
  };

  const addParticipant = async () => {
    const { value: formValues } =
      await Swal.fire({
        title: "Add Participant",
        html: `
          <input
            id="swal-name"
            class="swal2-input"
            placeholder="Participant Name"
          />

          <input
            id="swal-role"
            class="swal2-input"
            placeholder="Role"
          />

          <input
            id="swal-email"
            class="swal2-input"
            placeholder="Email"
          />
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: "Add Participant",
        confirmButtonColor: "#0288D1",

        preConfirm: () => {
          const name =
            document
              .getElementById("swal-name")
              .value.trim();

          const role =
            document
              .getElementById("swal-role")
              .value.trim();

          const email =
            document
              .getElementById("swal-email")
              .value.trim();

          if (!name) {
            Swal.showValidationMessage(
              "Participant name is required."
            );

            return false;
          }

          return {
            name,
            role,
            email,
            present: false
          };
        }
      });

    if (!formValues) {
      return;
    }

    const participants = getParticipants();

    participants.push(formValues);

    const cleanedParticipants =
      participants.map(
        ({ firebaseKey, ...participant }) =>
          participant
      );

    const success = await updateHearing({
      participants: cleanedParticipants,
      updatedAt: new Date().toISOString()
    });

    if (success) {
      await Swal.fire({
        icon: "success",
        title: "Participant Added",
        timer: 1500,
        showConfirmButton: false
      });
    }
  };

  /* =========================================================
     AGENDA
  ========================================================= */

  const toggleAgendaItem = async (index) => {
    const agenda = [...getAgenda()];

    if (!agenda[index]) {
      return;
    }

    const item = agenda[index];

    if (typeof item === "string") {
      agenda[index] = item.startsWith("✓ ")
        ? item.substring(2)
        : `✓ ${item}`;
    } else {
      agenda[index] = {
        ...item,
        completed: !item.completed
      };
    }

    await updateHearing({
      agenda,
      updatedAt: new Date().toISOString()
    });
  };

  const addAgendaItem = async () => {
    const { value: item } =
      await Swal.fire({
        title: "Add Agenda Item",
        input: "text",
        inputPlaceholder:
          "Enter agenda item",
        showCancelButton: true,
        confirmButtonText: "Add",
        confirmButtonColor: "#0288D1",

        inputValidator: (value) => {
          if (!value.trim()) {
            return "Agenda item is required.";
          }

          return null;
        }
      });

    if (!item) {
      return;
    }

    const agenda = getAgenda();

    agenda.push(item.trim());

    const success = await updateHearing({
      agenda,
      updatedAt: new Date().toISOString()
    });

    if (success) {
      await Swal.fire({
        icon: "success",
        title: "Agenda Added",
        timer: 1200,
        showConfirmButton: false
      });
    }
  };

  /* =========================================================
     DOCUMENTS
  ========================================================= */

  const addDocument = () => {
    setDocumentName("");
    setDocumentUrl("");
    setDocumentOpen(true);
  };

  const saveDocument = async () => {
    if (
      !documentName.trim() ||
      !documentUrl.trim()
    ) {
      await Swal.fire({
        icon: "warning",
        title: "Missing Information",
        text: "Document name and URL are required."
      });

      return;
    }

    const documents = getDocuments();

    documents.push({
      name: documentName.trim(),
      url: documentUrl.trim(),
      uploaded:
        new Date().toLocaleString(),
      uploadedBy:
        auth.currentUser?.uid ||
        "unknown"
    });

    const cleanedDocuments =
      documents.map(
        ({ firebaseKey, ...document }) =>
          document
      );

    const success = await updateHearing({
      documents: cleanedDocuments,
      updatedAt: new Date().toISOString()
    });

    if (success) {
      setDocumentOpen(false);
      setDocumentName("");
      setDocumentUrl("");

      await Swal.fire({
        icon: "success",
        title: "Document Added",
        text: "Document has been added successfully.",
        timer: 1500,
        showConfirmButton: false
      });
    }
  };

  const viewDocument = async (document) => {
    if (!document?.url) {
      await Swal.fire({
        icon: "info",
        title: "Document Preview",
        text: "This document does not contain a viewable URL."
      });

      return;
    }

    window.open(
      document.url,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const downloadDocument = async (document) => {
    if (!document?.url) {
      await Swal.fire({
        icon: "info",
        title: "Download Unavailable",
        text: "No document URL is available."
      });

      return;
    }

    const link =
      window.document.createElement("a");

    link.href = document.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.download =
      document.name || "document";

    link.click();
  };

  /* =========================================================
     HEARING STATUS
  ========================================================= */

  const setHearingStatus = async (newStatus) => {
    const statusText = {
      completed: "Complete this hearing?",
      adjourned: "Adjourn this hearing?",
      cancelled: "Cancel this hearing?"
    };

    const confirmed =
      await confirmAction(
        statusText[newStatus] ||
          "Change hearing status?",
        "This action will update the hearing status in Firebase.",
        "Yes, Continue"
      );

    if (!confirmed) {
      return;
    }

    const success = await updateHearing({
      status: newStatus,
      updatedAt:
        new Date().toISOString(),
      statusUpdatedBy:
        auth.currentUser?.uid ||
        "unknown"
    });

    if (success) {
      await Swal.fire({
        icon: "success",
        title: "Status Updated",
        text:
          `Hearing has been marked as ${newStatus}.`,
        timer: 1600,
        showConfirmButton: false
      });
    }
  };

  /* =========================================================
     RULING
  ========================================================= */

  const openRuling = () => {
    setRulingTitle(
      hearing?.ruling?.title || ""
    );

    setRulingDecision(
      hearing?.ruling?.decision || ""
    );

    setRulingText(
      hearing?.ruling?.text || ""
    );

    setRulingOpen(true);
  };

  const saveRuling = async () => {
    if (
      !rulingDecision.trim() ||
      !rulingText.trim()
    ) {
      await Swal.fire({
        icon: "warning",
        title: "Incomplete Ruling",
        text:
          "Decision and ruling details are required."
      });

      return;
    }

    const confirmed =
      await confirmAction(
        "Issue Ruling?",
        "The ruling will be saved with this hearing.",
        "Issue Ruling"
      );

    if (!confirmed) {
      return;
    }

    setRulingSaving(true);

    const ruling = {
      title:
        rulingTitle.trim() ||
        "Court Ruling",

      decision:
        rulingDecision.trim(),

      text:
        rulingText.trim(),

      issuedAt:
        new Date().toISOString(),

      issuedBy:
        auth.currentUser?.uid ||
        "unknown",

      judgeName:
        hearing?.judgeName ||
        hearing?.judge ||
        auth.currentUser?.displayName ||
        "Judge"
    };

    const success = await updateHearing({
      ruling,
      rulingStatus: "issued",
      status: "completed",
      updatedAt:
        new Date().toISOString()
    });

    setRulingSaving(false);

    if (success) {
      setRulingOpen(false);

      await Swal.fire({
        icon: "success",
        title: "Ruling Issued",
        text:
          "The ruling has been saved successfully.",
        confirmButtonColor: "#0288D1"
      });
    }
  };

  /* =========================================================
     RECORDING
  ========================================================= */

  const startRecording = () => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      Swal.fire({
        icon: "error",
        title: "Speech Recognition Unsupported",
        text:
          "Please use Google Chrome or Microsoft Edge."
      });

      return;
    }

    const recognition =
      new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = async (event) => {
      let finalText = "";

      for (
        let i = event.resultIndex;
        i < event.results.length;
        i++
      ) {
        if (
          event.results[i].isFinal
        ) {
          finalText +=
            event.results[i][0]
              .transcript;
        }
      }

      if (!finalText.trim()) {
        return;
      }

      const transcript =
        getTranscript();

      transcript.push({
        time:
          new Date().toLocaleTimeString(),

        speaker:
          hearing?.judgeName ||
          hearing?.judge ||
          "Speaker",

        text:
          finalText.trim()
      });

      const cleanedTranscript =
        transcript.map(
          ({ firebaseKey, ...entry }) =>
            entry
        );

      await updateHearing({
        transcript:
          cleanedTranscript,

        updatedAt:
          new Date().toISOString()
      });
    };

    recognition.onerror = (event) => {
      console.error(
        "Speech recognition error:",
        event.error
      );

      if (
        event.error !== "no-speech"
      ) {
        Swal.fire({
          icon: "error",
          title: "Recording Error",
          text: event.error
        });
      }

      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current =
      recognition;

    try {
      recognition.start();
    } catch (error) {
      console.error(error);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.log(error);
      }

      recognitionRef.current = null;
    }

    setIsRecording(false);
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  /* =========================================================
     EXPORT / PRINT / SHARE
  ========================================================= */

  const exportTranscript = () => {
    const transcript =
      getTranscript();

    if (!transcript.length) {
      Swal.fire({
        icon: "info",
        title: "No Transcript",
        text:
          "There is no transcript available to export."
      });

      return;
    }

    const text =
      transcript
        .map(
          (entry) =>
            `${entry.time || ""} ${
              entry.speaker ||
              "Speaker"
            }: ${
              entry.text || ""
            }`
        )
        .join("\n");

    const blob =
      new Blob([text], {
        type:
          "text/plain;charset=utf-8"
      });

    const url =
      URL.createObjectURL(blob);

    const link =
      window.document.createElement(
        "a"
      );

    link.href = url;

    link.download =
      `hearing-${
        hearing?.id ||
        hearingId
      }-transcript.txt`;

    link.click();

    URL.revokeObjectURL(url);
  };

  const printHearing = () => {
    window.print();
  };

  const shareHearing = async () => {
    const shareData = {
      title:
        hearing?.title ||
        hearing?.caseTitle ||
        "Court Hearing",

      text:
        `Hearing ID: ${
          hearing?.id ||
          hearingId
        }`,

      url:
        window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(
          shareData
        );
      } else {
        await navigator.clipboard.writeText(
          window.location.href
        );

        await Swal.fire({
          icon: "success",
          title: "Link Copied",
          text:
            "Hearing link has been copied.",
          timer: 1500,
          showConfirmButton: false
        });
      }
    } catch (error) {
      if (
        error.name !==
        "AbortError"
      ) {
        await Swal.fire({
          icon: "error",
          title: "Share Failed",
          text:
            "Unable to share the hearing."
        });
      }
    }
  };

  /* =========================================================
     STATUS
  ========================================================= */

  const statusConfig = {
    "in-progress": {
      icon: <FaHourglassHalf />,
      className:
        "status-in-progress",
      text: "In Progress"
    },

    scheduled: {
      icon: <FaCalendarAlt />,
      className:
        "status-in-progress",
      text: "Scheduled"
    },

    pending: {
      icon: <FaHourglassHalf />,
      className:
        "status-in-progress",
      text: "Pending"
    },

    completed: {
      icon: <FaCheckCircle />,
      className:
        "status-completed",
      text: "Completed"
    },

    adjourned: {
      icon: <FaClock />,
      className:
        "status-adjourned",
      text: "Adjourned"
    },

    cancelled: {
      icon: <FaTimesCircle />,
      className:
        "status-cancelled",
      text: "Cancelled"
    }
  };

  const getStatusBadge = (value) => {
    return (
      statusConfig[value] ||
      statusConfig.scheduled
    );
  };

  const getAgendaText = (item) => {
    if (typeof item === "string") {
      return item;
    }

    if (
      item &&
      typeof item === "object"
    ) {
      return (
        item.text ||
        item.title ||
        "Agenda Item"
      );
    }

    return "Agenda Item";
  };

  const isAgendaCompleted = (item) => {
    if (typeof item === "string") {
      return item.startsWith("✓ ");
    }

    return Boolean(
      item?.completed
    );
  };

  /* =========================================================
     LOADING
  ========================================================= */

  if (authLoading || loading) {
    return (
      <>
        <style>{`
          .loading-page {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f4f7ff;
          }

          .loading-box {
            background: white;
            padding: 30px 45px;
            border-radius: 16px;
            box-shadow:
              0 10px 30px
              rgba(0,0,0,0.08);
            color: #6b7280;
            font-weight: 600;
          }
        `}</style>

        <div className="loading-page">
          <div className="loading-box">
            Loading hearing...
          </div>
        </div>
      </>
    );
  }

  /* =========================================================
     NOT FOUND
  ========================================================= */

  if (!hearing) {
    return (
      <>
        <style>{`
          .not-found-page {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f4f7ff;
            padding: 30px;
          }

          .not-found-box {
            width: 100%;
            max-width: 600px;
            background: white;
            border-radius: 20px;
            padding: 40px;
            text-align: center;
            box-shadow:
              0 10px 35px
              rgba(0,0,0,0.08);
          }

          .not-found-box h2 {
            margin: 0 0 10px;
            color: #171717;
          }

          .not-found-box p {
            color: #6b7280;
            margin: 8px 0;
          }

          .error-text {
            color: #dc2626 !important;
            font-size: 14px;
          }

          .back-dashboard {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            margin-top: 20px;
            padding: 11px 20px;
            background: #0288d1;
            color: white;
            border-radius: 10px;
            text-decoration: none;
            font-weight: 600;
          }
        `}</style>

        <div className="not-found-page">
          <div className="not-found-box">
            <FaGavel
              size={45}
              style={{
                color: "#0288d1",
                marginBottom: "15px"
              }}
            />

            <h2>
              Hearing Not Found
            </h2>

            <p>
              Hearing ID:
              {" "}
              <strong>
                {hearingId ||
                  "undefined"}
              </strong>
            </p>

            {error && (
              <p className="error-text">
                {error}
              </p>
            )}

            <Link
              to="/judge-dashboard"
              className="back-dashboard"
            >
              <FaArrowLeft />
              Back to Judge Dashboard
            </Link>
          </div>
        </div>
      </>
    );
  }

  const status =
    getStatusBadge(
      hearing.status
    );

  const participants =
    getParticipants();

  const documents =
    getDocuments();

  const transcript =
    getTranscript();

  const agenda =
    getAgenda();

  return (
    <>
      <style>{`
        :root {
          --sky: #4FC3F7;
          --sky-dark: #0288D1;
          --black: #1A1A1A;
          --white: #FFFFFF;
          --gray: #6B7280;
          --light-gray: #F3F6FA;
        }

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
          max-width: 1100px;
          width: 100%;
          margin: 0 auto;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .title-with-back {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .back-btn {
          display: inline-flex;
          align-items: center;
          gap: .5rem;
          padding: .6rem 1.2rem;
          background: rgba(255,255,255,.85);
          border-radius: 50px;
          color: var(--black);
          font-weight: 600;
          text-decoration: none;
        }

        .dashboard-title h1 {
          font-size: 2rem;
          font-weight: 800;
          color: var(--black);
          margin: 0;
        }

        .dashboard-title p {
          color: var(--gray);
          margin: 4px 0 0;
        }

        .dashboard-actions {
          display: flex;
          gap: 10px;
        }

        .action-icon-btn {
          width: 44px;
          height: 44px;
          border: none;
          border-radius: 50%;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--black);
          box-shadow:
            0 5px 15px
            rgba(0,0,0,.06);
        }

        .hearing-header-card {
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .hearing-header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .hearing-header-left {
          display: flex;
          flex-direction: column;
          gap: .5rem;
        }

        .hearing-id {
          font-size: .85rem;
          color: var(--gray);
          word-break: break-all;
        }

        .hearing-header-left h2 {
          font-size: 1.5rem;
          color: var(--black);
          margin: 0;
        }

        .hearing-meta {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: .3rem;
          color: var(--gray);
          font-size: .9rem;
        }

        .hearing-header-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: .5rem;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: .4rem;
          padding: .3rem 1rem;
          border-radius: 50px;
          font-weight: 600;
          font-size: .85rem;
        }

        .status-in-progress {
          background: rgba(79,195,247,.15);
          color: #0288D1;
        }

        .status-completed {
          background: rgba(0,230,118,.15);
          color: #009b50;
        }

        .status-adjourned {
          background: rgba(255,154,86,.15);
          color: #e66d1e;
        }

        .status-cancelled {
          background: rgba(255,107,107,.15);
          color: #e53935;
        }

        .judge-name {
          display: flex;
          align-items: center;
          gap: .3rem;
          color: var(--gray);
          font-size: .9rem;
        }

        .hearing-tabs {
          display: flex;
          gap: .5rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }

        .tab-btn {
          padding: .6rem 1.2rem;
          background: rgba(255,255,255,.6);
          border: 1px solid rgba(255,255,255,.7);
          border-radius: 50px;
          color: var(--gray);
          cursor: pointer;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: .3rem;
        }

        .tab-btn.active {
          background: white;
          color: var(--black);
          border-color: var(--sky);
        }

        .overview-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }

        .agenda-card,
        .notes-card,
        .participants-card,
        .documents-card,
        .transcript-card,
        .ruling-card {
          padding: 1.5rem;
        }

        .agenda-card h3,
        .notes-card h3,
        .participants-card h3,
        .documents-card h3,
        .transcript-card h3,
        .ruling-card h3 {
          margin: 0 0 1rem;
          color: var(--black);
        }

        .agenda-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: .6rem;
        }

        .agenda-item {
          display: flex;
          align-items: center;
          gap: .8rem;
          padding: .7rem .6rem;
          background: rgba(0,0,0,.02);
          border-radius: 8px;
        }

        .agenda-number {
          font-weight: 700;
          color: var(--sky-dark);
          min-width: 24px;
        }

        .agenda-text {
          flex: 1;
        }

        .completed-agenda {
          text-decoration: line-through;
          opacity: .6;
        }

        .complete-btn {
          background: none;
          border: none;
          color: var(--gray);
          cursor: pointer;
          font-size: 1rem;
        }

        .notes-display {
          background: rgba(0,0,0,.02);
          padding: .8rem;
          border-radius: 8px;
          margin-bottom: 1rem;
          max-height: 250px;
          overflow-y: auto;
        }

        .notes-display p {
          margin: 0;
          white-space: pre-wrap;
          color: #444;
          line-height: 1.6;
        }

        .notes-input {
          display: flex;
          flex-direction: column;
          gap: .5rem;
        }

        .notes-input textarea {
          width: 100%;
          box-sizing: border-box;
          padding: .8rem;
          border: 2px solid #D1E8F5;
          border-radius: 8px;
          resize: vertical;
          font-family: inherit;
          outline: none;
        }

        .participants-header,
        .documents-header,
        .transcript-header,
        .ruling-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          flex-wrap: wrap;
          gap: .5rem;
        }

        .participants-grid,
        .documents-list {
          display: flex;
          flex-direction: column;
          gap: .8rem;
        }

        .participant-item,
        .document-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: .8rem;
          background: rgba(0,0,0,.02);
          border-radius: 8px;
          flex-wrap: wrap;
          gap: .5rem;
        }

        .participant-info {
          display: flex;
          gap: .8rem;
          align-items: center;
          flex-wrap: wrap;
        }

        .participant-name,
        .doc-name {
          font-weight: 600;
          color: var(--black);
        }

        .participant-role {
          font-size: .8rem;
          color: var(--gray);
          background: rgba(0,0,0,.04);
          padding: .1rem .5rem;
          border-radius: 50px;
        }

        .participant-email,
        .doc-meta {
          font-size: .8rem;
          color: var(--gray);
        }

        .participant-status,
        .doc-actions,
        .transcript-controls {
          display: flex;
          align-items: center;
          gap: .6rem;
          flex-wrap: wrap;
        }

        .status-present {
          color: #009b50;
          display: flex;
          align-items: center;
          gap: .3rem;
        }

        .status-absent {
          color: #e53935;
          display: flex;
          align-items: center;
          gap: .3rem;
        }

        .toggle-status-btn,
        .btn-secondary-sm,
        .btn-primary-sm,
        .btn-danger-sm {
          padding: .45rem .8rem;
          border: none;
          border-radius: 8px;
          font-size: .85rem;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: .3rem;
        }

        .toggle-status-btn,
        .btn-secondary-sm {
          background: rgba(0,0,0,.06);
          color: var(--black);
        }

        .btn-primary-sm {
          background: var(--sky-dark);
          color: white;
        }

        .btn-danger-sm {
          background: #FF6B6B;
          color: white;
        }

        .doc-info {
          display: flex;
          align-items: center;
          gap: .8rem;
        }

        .doc-icon {
          color: var(--sky-dark);
          font-size: 1.3rem;
        }

        .doc-details {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .transcript-container {
          max-height: 450px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: .6rem;
        }

        .transcript-entry {
          display: flex;
          flex-wrap: wrap;
          gap: .4rem;
          padding: .7rem 0;
          border-bottom: 1px solid rgba(0,0,0,.05);
        }

        .transcript-time {
          font-size: .75rem;
          color: var(--gray);
          min-width: 90px;
        }

        .transcript-speaker {
          font-weight: 600;
        }

        .recording-indicator {
          display: flex;
          align-items: center;
          gap: .5rem;
          padding: .6rem;
          background: rgba(255,107,107,.1);
          border-radius: 8px;
          color: #FF6B6B;
        }

        .recording-dot {
          width: 10px;
          height: 10px;
          background: #FF6B6B;
          border-radius: 50%;
          animation: pulseDot 1.5s infinite;
        }

        @keyframes pulseDot {
          0%,100% {
            opacity: 1;
          }

          50% {
            opacity: .2;
          }
        }

        .agenda-actions {
          margin-top: 1rem;
        }

        .hearing-controls {
          margin-top: 1.5rem;
        }

        .controls-card {
          padding: 1rem;
        }

        .controls-grid {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          justify-content: center;
        }

        .control-btn {
          padding: .7rem 1.5rem;
          border: none;
          border-radius: 50px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: .5rem;
          cursor: pointer;
        }

        .control-btn.primary {
          background:
            linear-gradient(
              135deg,
              #4FC3F7,
              #0288D1
            );
          color: white;
        }

        .control-btn.warning {
          background: #FF9A56;
          color: white;
        }

        .control-btn.danger {
          background: #FF6B6B;
          color: white;
        }

        .control-btn.secondary {
          background: rgba(0,0,0,.06);
          color: var(--black);
        }

        .ruling-summary {
          background: rgba(2,136,209,.06);
          border: 1px solid rgba(2,136,209,.12);
          border-radius: 12px;
          padding: 1rem;
          margin-top: 1rem;
        }

        .ruling-summary strong {
          color: var(--sky-dark);
        }

        .ruling-text {
          white-space: pre-wrap;
          line-height: 1.7;
          color: #444;
          margin-top: .6rem;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,.55);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 9999;
        }

        .modal-box {
          width: 100%;
          max-width: 700px;
          max-height: 90vh;
          overflow-y: auto;
          background: white;
          border-radius: 20px;
          padding: 25px;
          box-shadow:
            0 20px 60px
            rgba(0,0,0,.25);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .modal-header h2 {
          margin: 0;
          color: var(--black);
        }

        .close-modal {
          width: 38px;
          height: 38px;
          border: none;
          border-radius: 50%;
          background: #f3f4f6;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .form-group {
          margin-bottom: 15px;
        }

        .form-group label {
          display: block;
          font-weight: 600;
          margin-bottom: 6px;
          color: #333;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          box-sizing: border-box;
          border: 2px solid #e2e8f0;
          border-radius: 9px;
          padding: 11px;
          font-family: inherit;
          outline: none;
        }

        .form-group textarea {
          resize: vertical;
          min-height: 160px;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 20px;
        }

        .modal-save,
        .modal-cancel {
          border: none;
          border-radius: 9px;
          padding: 11px 18px;
          cursor: pointer;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .modal-save {
          background: var(--sky-dark);
          color: white;
        }

        .modal-cancel {
          background: #e5e7eb;
          color: #222;
        }

        @media(max-width:768px) {
          .dashboard-page {
            padding: 1rem;
          }

          .overview-grid {
            grid-template-columns: 1fr;
          }

          .hearing-header-right {
            align-items: flex-start;
          }

          .controls-grid {
            flex-direction: column;
          }

          .control-btn {
            width: 100%;
            justify-content: center;
          }

          .dashboard-title h1 {
            font-size: 1.5rem;
          }
        }

        @media print {
          .dashboard-actions,
          .back-btn,
          .hearing-tabs,
          .hearing-controls,
          button {
            display: none !important;
          }

          .dashboard-page {
            padding: 0 !important;
            background: white !important;
          }

          .dashboard-container {
            max-width: 100% !important;
          }
        }
      `}</style>

      <div className="dashboard-page">
        <div className="dashboard-container">

          {/* HEADER */}

          <motion.div
            initial={{
              opacity: 0,
              y: 20
            }}
            animate={{
              opacity: 1,
              y: 0
            }}
          >
            <div className="dashboard-header">

              <div className="dashboard-title">

                <div className="title-with-back">

                  <Link
                    to="/judge-dashboard"
                    className="back-btn"
                  >
                    <FaArrowLeft />
                    Back
                  </Link>

                  <div>
                    <h1>
                      Manage Hearing
                    </h1>

                    <p>
                      Control and monitor
                      the hearing process
                    </p>
                  </div>

                </div>

              </div>

              <div className="dashboard-actions">

                <button
                  className="action-icon-btn"
                  onClick={printHearing}
                  title="Print Hearing"
                >
                  <FaPrint />
                </button>

                <button
                  className="action-icon-btn"
                  onClick={shareHearing}
                  title="Share Hearing"
                >
                  <FaShare />
                </button>

              </div>

            </div>

            {/* HEARING HEADER */}

            <GlassCard className="hearing-header-card">

              <div className="hearing-header-content">

                <div className="hearing-header-left">

                  <span className="hearing-id">
                    Hearing ID:
                    {" "}
                    {hearing.id ||
                      hearingId}
                  </span>

                  <h2>
                    {hearing.title ||
                      hearing.caseTitle ||
                      hearing.name ||
                      "Court Hearing"}
                  </h2>

                  <div className="hearing-meta">

                    <span className="meta-item">
                      <FaCalendarAlt />

                      {hearing.date ||
                        hearing.hearingDate ||
                        "Date not set"}
                    </span>

                    <span className="meta-item">
                      <FaClock />

                      {hearing.time ||
                        hearing.hearingTime ||
                        "Time not set"}

                      {hearing.duration
                        ? ` (${hearing.duration} min)`
                        : ""}
                    </span>

                    <span className="meta-item">

                      {hearing.type ===
                      "virtual" ? (
                        <FaVideo />
                      ) : (
                        <FaGavel />
                      )}

                      {hearing.location ||
                        hearing.court ||
                        "Court"}

                    </span>

                  </div>

                </div>

                <div className="hearing-header-right">

                  <span
                    className={`status-badge ${status.className}`}
                  >
                    {status.icon}
                    {status.text}
                  </span>

                  <span className="judge-name">
                    <FaGavel />

                    {hearing.judge ||
                      hearing.judgeName ||
                      "Assigned Judge"}
                  </span>

                </div>

              </div>

            </GlassCard>

            {/* TABS */}

            <div className="hearing-tabs">

              <button
                className={`tab-btn ${
                  activeTab ===
                  "overview"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setActiveTab(
                    "overview"
                  )
                }
              >
                Overview
              </button>

              <button
                className={`tab-btn ${
                  activeTab ===
                  "participants"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setActiveTab(
                    "participants"
                  )
                }
              >
                <FaUsers />
                Participants
              </button>

              <button
                className={`tab-btn ${
                  activeTab ===
                  "documents"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setActiveTab(
                    "documents"
                  )
                }
              >
                <FaFileAlt />
                Documents
              </button>

              <button
                className={`tab-btn ${
                  activeTab ===
                  "transcript"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setActiveTab(
                    "transcript"
                  )
                }
              >
                <FaMicrophone />
                Transcript
              </button>

              <button
                className={`tab-btn ${
                  activeTab ===
                  "ruling"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setActiveTab(
                    "ruling"
                  )
                }
              >
                <FaBalanceScale />
                Ruling
              </button>

            </div>

            {/* CONTENT */}

            <motion.div
              key={activeTab}
              initial={{
                opacity: 0,
                y: 15
              }}
              animate={{
                opacity: 1,
                y: 0
              }}
            >

              {/* OVERVIEW */}

              {activeTab ===
                "overview" && (
                <div className="overview-grid">

                  <GlassCard className="agenda-card">

                    <h3>
                      Agenda
                    </h3>

                    {agenda.length ===
                    0 ? (
                      <p>
                        No agenda items
                        found.
                      </p>
                    ) : (
                      <ul className="agenda-list">

                        {agenda.map(
                          (
                            item,
                            index
                          ) => (
                            <li
                              key={
                                index
                              }
                              className="agenda-item"
                            >

                              <span className="agenda-number">
                                {index +
                                  1}
                              </span>

                              <span
                                className={`agenda-text ${
                                  isAgendaCompleted(
                                    item
                                  )
                                    ? "completed-agenda"
                                    : ""
                                }`}
                              >
                                {getAgendaText(
                                  item
                                )}
                              </span>

                              <button
                                className="complete-btn"
                                onClick={() =>
                                  toggleAgendaItem(
                                    index
                                  )
                                }
                              >
                                <FaCheckCircle />
                              </button>

                            </li>
                          )
                        )}

                      </ul>
                    )}

                    <div className="agenda-actions">

                      <button
                        className="btn-secondary-sm"
                        onClick={
                          addAgendaItem
                        }
                      >
                        <FaPlus />
                        Add Item
                      </button>

                    </div>

                  </GlassCard>

                  <GlassCard className="notes-card">

                    <h3>
                      Notes &
                      Observations
                    </h3>

                    <div className="notes-display">

                      <p>
                        {hearing.notes ||
                          "No notes yet."}
                      </p>

                    </div>

                    <div className="notes-input">

                      <textarea
                        value={
                          noteInput
                        }
                        onChange={(e) =>
                          setNoteInput(
                            e.target
                              .value
                          )
                        }
                        placeholder="Add hearing notes..."
                        rows="4"
                      />

                      <button
                        onClick={
                          addNote
                        }
                        className="btn-primary-sm"
                      >
                        <FaPaperPlane />
                        Add Note
                      </button>

                    </div>

                  </GlassCard>

                  <GlassCard className="ruling-card">

                    <div className="ruling-header">

                      <h3>
                        Ruling
                      </h3>

                      <button
                        className="btn-primary-sm"
                        onClick={
                          openRuling
                        }
                      >
                        <FaBalanceScale />

                        {hearing.ruling
                          ? "Edit Ruling"
                          : "Issue Ruling"}
                      </button>

                    </div>

                    {hearing.ruling ? (
                      <div className="ruling-summary">

                        <strong>
                          {hearing.ruling
                            .title ||
                            "Court Ruling"}
                        </strong>

                        <div>
                          <b>
                            Decision:
                          </b>{" "}
                          {
                            hearing
                              .ruling
                              .decision
                          }
                        </div>

                        <div className="ruling-text">
                          {
                            hearing
                              .ruling
                              .text
                          }
                        </div>

                      </div>
                    ) : (
                      <p>
                        No ruling has
                        been issued.
                      </p>
                    )}

                  </GlassCard>

                </div>
              )}

              {/* PARTICIPANTS */}

              {activeTab ===
                "participants" && (
                <GlassCard className="participants-card">

                  <div className="participants-header">

                    <h3>
                      Participants
                      Attendance
                    </h3>

                    <button
                      className="btn-secondary-sm"
                      onClick={
                        addParticipant
                      }
                    >
                      <FaUserPlus />
                      Add Participant
                    </button>

                  </div>

                  {participants.length ===
                  0 ? (
                    <p>
                      No participants
                      found.
                    </p>
                  ) : (
                    <div className="participants-grid">

                      {participants.map(
                        (
                          participant,
                          index
                        ) => (
                          <div
                            key={
                              participant.firebaseKey ||
                              index
                            }
                            className="participant-item"
                          >

                            <div className="participant-info">

                              <span className="participant-name">
                                {
                                  participant.name
                                }
                              </span>

                              <span className="participant-role">
                                {
                                  participant.role ||
                                  "Participant"
                                }
                              </span>

                              {participant.email && (
                                <span className="participant-email">
                                  {
                                    participant.email
                                  }
                                </span>
                              )}

                            </div>

                            <div className="participant-status">

                              {participant.present ? (
                                <span className="status-present">
                                  <FaCheckCircle />
                                  Present
                                </span>
                              ) : (
                                <span className="status-absent">
                                  <FaTimesCircle />
                                  Absent
                                </span>
                              )}

                              <button
                                className="toggle-status-btn"
                                onClick={() =>
                                  toggleParticipant(
                                    index
                                  )
                                }
                              >
                                {participant.present ? (
                                  <FaUserMinus />
                                ) : (
                                  <FaUserPlus />
                                )}

                                {participant.present
                                  ? "Mark Absent"
                                  : "Mark Present"}
                              </button>

                            </div>

                          </div>
                        )
                      )}

                    </div>
                  )}

                </GlassCard>
              )}

              {/* DOCUMENTS */}

              {activeTab ===
                "documents" && (
                <GlassCard className="documents-card">

                  <div className="documents-header">

                    <h3>
                      Case Documents
                    </h3>

                    <button
                      className="btn-primary-sm"
                      onClick={
                        addDocument
                      }
                    >
                      <FaUpload />
                      Add Document
                    </button>

                  </div>

                  {documents.length ===
                  0 ? (
                    <p>
                      No documents found.
                    </p>
                  ) : (
                    <div className="documents-list">

                      {documents.map(
                        (
                          document,
                          index
                        ) => (
                          <div
                            key={
                              document.firebaseKey ||
                              index
                            }
                            className="document-item"
                          >

                            <div className="doc-info">

                              <FaFileAlt className="doc-icon" />

                              <div className="doc-details">

                                <span className="doc-name">
                                  {
                                    document.name ||
                                    document.title ||
                                    `Document ${
                                      index +
                                      1
                                    }`
                                  }
                                </span>

                                <span className="doc-meta">
                                  {
                                    document.uploaded ||
                                    ""
                                  }
                                </span>

                              </div>

                            </div>

                            <div className="doc-actions">

                              <button
                                className="btn-secondary-sm"
                                onClick={() =>
                                  viewDocument(
                                    document
                                  )
                                }
                              >
                                <FaEye />
                                View
                              </button>

                              <button
                                className="btn-secondary-sm"
                                onClick={() =>
                                  downloadDocument(
                                    document
                                  )
                                }
                              >
                                <FaDownload />
                                Download
                              </button>

                            </div>

                          </div>
                        )
                      )}

                    </div>
                  )}

                </GlassCard>
              )}

              {/* TRANSCRIPT */}

              {activeTab ===
                "transcript" && (
                <GlassCard className="transcript-card">

                  <div className="transcript-header">

                    <h3>
                      Live Transcript
                    </h3>

                    <div className="transcript-controls">

                      <button
                        className={
                          isRecording
                            ? "btn-danger-sm"
                            : "btn-primary-sm"
                        }
                        onClick={
                          toggleRecording
                        }
                      >
                        <FaMicrophone />

                        {isRecording
                          ? "Stop Recording"
                          : "Start Recording"}
                      </button>

                      <button
                        className="btn-secondary-sm"
                        onClick={
                          exportTranscript
                        }
                      >
                        <FaDownload />
                        Export
                      </button>

                    </div>

                  </div>

                  <div className="transcript-container">

                    {transcript.length ===
                      0 && (
                      <p>
                        No transcript
                        available.
                      </p>
                    )}

                    {transcript.map(
                      (
                        entry,
                        index
                      ) => (
                        <div
                          key={
                            entry.firebaseKey ||
                            index
                          }
                          className="transcript-entry"
                        >

                          <span className="transcript-time">
                            {
                              entry.time ||
                              ""
                            }
                          </span>

                          <span className="transcript-speaker">
                            {
                              entry.speaker ||
                              "Speaker"
                            }:
                          </span>

                          <span>
                            {
                              entry.text ||
                              ""
                            }
                          </span>

                        </div>
                      )
                    )}

                    {isRecording && (
                      <div className="recording-indicator">
                        <span className="recording-dot" />
                        Recording in progress...
                      </div>
                    )}

                  </div>

                </GlassCard>
              )}

              {/* RULING */}

              {activeTab ===
                "ruling" && (
                <GlassCard className="ruling-card">

                  <div className="ruling-header">

                    <h3>
                      <FaBalanceScale />
                      {" "}
                      Court Ruling
                    </h3>

                    <button
                      className="btn-primary-sm"
                      onClick={
                        openRuling
                      }
                    >
                      <FaBalanceScale />

                      {hearing.ruling
                        ? "Edit Ruling"
                        : "Issue Ruling"}
                    </button>

                  </div>

                  {hearing.ruling ? (
                    <div className="ruling-summary">

                      <h3>
                        {
                          hearing
                            .ruling
                            .title ||
                          "Court Ruling"
                        }
                      </h3>

                      <p>
                        <strong>
                          Decision:
                        </strong>{" "}
                        {
                          hearing
                            .ruling
                            .decision
                        }
                      </p>

                      <p>
                        <strong>
                          Judge:
                        </strong>{" "}
                        {
                          hearing
                            .ruling
                            .judgeName ||
                          hearing.judge ||
                          "Judge"
                        }
                      </p>

                      <p>
                        <strong>
                          Issued:
                        </strong>{" "}
                        {hearing.ruling
                          .issuedAt
                          ? new Date(
                              hearing
                                .ruling
                                .issuedAt
                            ).toLocaleString()
                          : "N/A"}
                      </p>

                      <div className="ruling-text">
                        {
                          hearing
                            .ruling
                            .text
                        }
                      </div>

                    </div>
                  ) : (
                    <p>
                      No ruling has been
                      issued for this hearing.
                    </p>
                  )}

                </GlassCard>
              )}

            </motion.div>

            {/* CONTROLS */}

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
                delay: 0.2
              }}
              className="hearing-controls"
            >

              <GlassCard className="controls-card">

                <div className="controls-grid">

                  <button
                    className="control-btn primary"
                    onClick={() =>
                      setHearingStatus(
                        "completed"
                      )
                    }
                  >
                    <FaCheckCircle />
                    Complete Hearing
                  </button>

                  <button
                    className="control-btn warning"
                    onClick={() =>
                      setHearingStatus(
                        "adjourned"
                      )
                    }
                  >
                    <FaClock />
                    Adjourn
                  </button>

                  <button
                    className="control-btn danger"
                    onClick={() =>
                      setHearingStatus(
                        "cancelled"
                      )
                    }
                  >
                    <FaTimesCircle />
                    Cancel
                  </button>

                  <button
                    className="control-btn secondary"
                    onClick={
                      openRuling
                    }
                  >
                    <FaBalanceScale />
                    Issue Ruling
                  </button>

                </div>

              </GlassCard>

            </motion.div>

          </motion.div>

        </div>
      </div>

      {/* RULING MODAL */}

      {rulingOpen && (
        <div className="modal-overlay">

          <div className="modal-box">

            <div className="modal-header">

              <h2>
                <FaBalanceScale />
                {" "}
                Issue Court Ruling
              </h2>

              <button
                className="close-modal"
                onClick={() =>
                  setRulingOpen(false)
                }
              >
                <FaTimes />
              </button>

            </div>

            <div className="form-group">

              <label>
                Ruling Title
              </label>

              <input
                value={rulingTitle}
                onChange={(e) =>
                  setRulingTitle(
                    e.target.value
                  )
                }
                placeholder="e.g. Final Court Ruling"
              />

            </div>

            <div className="form-group">

              <label>
                Decision
              </label>

              <select
                value={rulingDecision}
                onChange={(e) =>
                  setRulingDecision(
                    e.target.value
                  )
                }
              >

                <option value="">
                  Select Decision
                </option>

                <option value="Allowed">
                  Allowed
                </option>

                <option value="Dismissed">
                  Dismissed
                </option>

                <option value="Partially Allowed">
                  Partially Allowed
                </option>

                <option value="Acquitted">
                  Acquitted
                </option>

                <option value="Convicted">
                  Convicted
                </option>

                <option value="Remanded">
                  Remanded
                </option>

                <option value="Adjourned">
                  Adjourned
                </option>

                <option value="Other">
                  Other
                </option>

              </select>

            </div>

            <div className="form-group">

              <label>
                Ruling Details
              </label>

              <textarea
                value={rulingText}
                onChange={(e) =>
                  setRulingText(
                    e.target.value
                  )
                }
                placeholder="Enter the complete court ruling..."
              />

            </div>

            <div className="modal-actions">

              <button
                className="modal-cancel"
                onClick={() =>
                  setRulingOpen(false)
                }
              >
                Cancel
              </button>

              <button
                className="modal-save"
                onClick={
                  saveRuling
                }
                disabled={
                  rulingSaving
                }
              >
                <FaSave />

                {rulingSaving
                  ? "Saving..."
                  : "Save Ruling"}
              </button>

            </div>

          </div>

        </div>
      )}

      {/* DOCUMENT MODAL */}

      {documentOpen && (
        <div className="modal-overlay">

          <div className="modal-box">

            <div className="modal-header">

              <h2>
                <FaFileAlt />
                {" "}
                Add Document
              </h2>

              <button
                className="close-modal"
                onClick={() =>
                  setDocumentOpen(
                    false
                  )
                }
              >
                <FaTimes />
              </button>

            </div>

            <div className="form-group">

              <label>
                Document Name
              </label>

              <input
                value={documentName}
                onChange={(e) =>
                  setDocumentName(
                    e.target.value
                  )
                }
                placeholder="e.g. Petition.pdf"
              />

            </div>

            <div className="form-group">

              <label>
                Document URL
              </label>

              <input
                value={documentUrl}
                onChange={(e) =>
                  setDocumentUrl(
                    e.target.value
                  )
                }
                placeholder="https://..."
              />

            </div>

            <div className="modal-actions">

              <button
                className="modal-cancel"
                onClick={() =>
                  setDocumentOpen(
                    false
                  )
                }
              >
                Cancel
              </button>

              <button
                className="modal-save"
                onClick={
                  saveDocument
                }
              >
                <FaSave />
                Save Document
              </button>

            </div>

          </div>

        </div>
      )}

    </>
  );
};

export default ManageHearing;