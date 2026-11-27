import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

import {
  FaGavel,
  FaCalendarAlt,
  FaFileAlt,
  FaClock,
  FaBell,
  FaRobot,
  FaArrowRight,
  FaEye,
  FaCheckCircle,
  FaExclamationTriangle,
  FaUserTie,
  FaPlus,
  FaList,
  FaBrain,
  FaChevronRight,
} from "react-icons/fa";

import { onAuthStateChanged } from "firebase/auth";
import { ref, onValue } from "firebase/database";

import { auth, db } from "../../../firebase";

const JudgeDashboard = () => {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [judgeProfile, setJudgeProfile] = useState(null);

  const [cases, setCases] = useState([]);
  const [hearings, setHearings] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const [loading, setLoading] = useState(true);

  // =========================================================
  // AUTH
  // =========================================================
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        navigate("/login", { replace: true });
        return;
      }

      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  // =========================================================
  // JUDGE PROFILE
  // =========================================================
  useEffect(() => {
    if (!user?.uid) return;

    const judgeRef = ref(db, `users/${user.uid}`);

    const unsubscribe = onValue(judgeRef, (snapshot) => {
      const data = snapshot.val();

      if (data) {
        setJudgeProfile({
          id: user.uid,
          ...data,
        });
      } else {
        setJudgeProfile({
          id: user.uid,
          fullName: user.displayName || "Judge",
          name: user.displayName || "Judge",
        });
      }
    });

    return () => unsubscribe();
  }, [user]);

  // =========================================================
  // CASES
  // assignedJudgeId = Firebase UID of judge
  // =========================================================
  useEffect(() => {
    if (!user?.uid) return;

    const casesRef = ref(db, "cases");

    const unsubscribe = onValue(
      casesRef,
      (snapshot) => {
        const data = snapshot.val();

        if (!data) {
          setCases([]);
          return;
        }

        const loadedCases = Object.entries(data)
          .map(([id, caseData]) => ({
            id,
            ...caseData,
          }))
          .filter((caseItem) => {
            return (
              caseItem.assignedJudgeId === user.uid ||
              caseItem.judgeId === user.uid
            );
          });

        setCases(loadedCases);
      },
      (error) => {
        console.error("Cases loading error:", error);
        setCases([]);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // =========================================================
  // HEARINGS
  // =========================================================
  useEffect(() => {
    if (!user?.uid) return;

    const hearingsRef = ref(db, "hearings");

    const unsubscribe = onValue(
      hearingsRef,
      (snapshot) => {
        const data = snapshot.val();

        if (!data) {
          setHearings([]);
          return;
        }

        const loadedHearings = Object.entries(data)
          .map(([id, hearingData]) => ({
            id,
            ...hearingData,
          }))
          .filter((hearing) => {
            const directJudgeMatch =
              hearing.judgeId === user.uid ||
              hearing.assignedJudgeId === user.uid ||
              hearing.judgeUID === user.uid;

            const hearingCaseId =
              hearing.caseId ||
              hearing.caseID ||
              hearing.case_id ||
              hearing.caseNumber;

            const relatedCase = cases.find((item) => {
              const caseIds = [
                item.id,
                item.caseId,
                item.caseNumber,
                item.case_number,
              ]
                .filter(Boolean)
                .map(String);

              return (
                hearingCaseId &&
                caseIds.includes(String(hearingCaseId))
              );
            });

            return directJudgeMatch || Boolean(relatedCase);
          });

        setHearings(loadedHearings);
      },
      (error) => {
        console.error("Hearings loading error:", error);
        setHearings([]);
      }
    );

    return () => unsubscribe();
  }, [user, cases]);

  // =========================================================
  // NOTIFICATIONS
  // =========================================================
  useEffect(() => {
    if (!user?.uid) return;

    const notificationsRef = ref(
      db,
      `notifications/${user.uid}`
    );

    const unsubscribe = onValue(
      notificationsRef,
      (snapshot) => {
        const data = snapshot.val();

        if (!data) {
          setNotifications([]);
          return;
        }

        const loadedNotifications = Object.entries(data)
          .map(([id, notification]) => ({
            id,
            ...notification,
          }))
          .sort((a, b) => {
            const getTime = (notification) => {
              const value =
                notification.createdAt ??
                notification.timestamp ??
                notification.time ??
                0;

              // Firebase timestamp object
              if (
                typeof value === "object" &&
                value !== null
              ) {
                if (value.seconds) {
                  return Number(value.seconds) * 1000;
                }

                if (value._seconds) {
                  return Number(value._seconds) * 1000;
                }

                if (value.timestamp) {
                  return Number(value.timestamp);
                }
              }

              // Number timestamp
              if (typeof value === "number") {
                return value;
              }

              // String timestamp/date
              if (typeof value === "string") {
                const numericValue = Number(value);

                if (!isNaN(numericValue)) {
                  return numericValue;
                }

                const parsedDate =
                  new Date(value).getTime();

                return isNaN(parsedDate)
                  ? 0
                  : parsedDate;
              }

              return 0;
            };

            return getTime(b) - getTime(a);
          });

        setNotifications(loadedNotifications);
      },
      (error) => {
        console.error(
          "Notifications loading error:",
          error
        );

        setNotifications([]);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // =========================================================
  // HELPERS
  // =========================================================

  const normalizeStatus = (status) => {
    if (!status) return "Pending";

    return String(status)
      .replace(/_/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  };

  const getCaseTitle = (caseItem) => {
    return (
      caseItem.title ||
      caseItem.caseTitle ||
      caseItem.caseName ||
      caseItem.subject ||
      caseItem.description ||
      "Untitled Case"
    );
  };

  const getCaseNumber = (caseItem) => {
    return (
      caseItem.caseNumber ||
      caseItem.case_number ||
      caseItem.caseId ||
      caseItem.id ||
      "N/A"
    );
  };

  const getCaseType = (caseItem) => {
    return (
      caseItem.caseType ||
      caseItem.case_type ||
      caseItem.type ||
      "General"
    );
  };

  const getPriority = (caseItem) => {
    return (
      caseItem.predictedPriority ||
      caseItem.priority ||
      caseItem.casePriority ||
      "Normal"
    );
  };

  const getHearingDate = (hearing) => {
    return (
      hearing.date ||
      hearing.hearingDate ||
      hearing.hearing_date ||
      hearing.scheduledDate ||
      hearing.scheduleDate ||
      ""
    );
  };

  const getHearingTime = (hearing) => {
    return (
      hearing.time ||
      hearing.hearingTime ||
      hearing.hearing_time ||
      hearing.scheduledTime ||
      ""
    );
  };

  // =========================================================
  // FORMAT DATE
  // =========================================================
  const formatDate = (value) => {
    if (!value) return "N/A";

    try {
      let date;

      if (
        typeof value === "object" &&
        value !== null
      ) {
        if (value.seconds) {
          date = new Date(
            Number(value.seconds) * 1000
          );
        } else if (value._seconds) {
          date = new Date(
            Number(value._seconds) * 1000
          );
        } else {
          return "N/A";
        }
      } else if (
        typeof value === "number"
      ) {
        date = new Date(value);
      } else if (
        !isNaN(Number(value))
      ) {
        date = new Date(Number(value));
      } else {
        date = new Date(value);
      }

      if (isNaN(date.getTime())) {
        return String(value);
      }

      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return String(value);
    }
  };

  // =========================================================
  // HEARING TIMESTAMP
  // =========================================================
  const getHearingTimestamp = (hearing) => {
    const dateValue = getHearingDate(hearing);

    if (!dateValue) {
      return Number.MAX_SAFE_INTEGER;
    }

    const parsed = new Date(dateValue).getTime();

    if (!isNaN(parsed)) {
      return parsed;
    }

    return Number.MAX_SAFE_INTEGER;
  };

  // =========================================================
  // STATUS CLASS
  // =========================================================
  const getStatusClass = (status) => {
    const value = String(status || "")
      .toLowerCase()
      .replace(/\s+/g, "-");

    if (
      value.includes("complete") ||
      value.includes("resolved")
    ) {
      return "status-completed";
    }

    if (
      value.includes("assign") ||
      value.includes("active")
    ) {
      return "status-assigned";
    }

    if (
      value.includes("pending") ||
      value.includes("waiting")
    ) {
      return "status-pending";
    }

    return "status-default";
  };

  // =========================================================
  // PRIORITY CLASS
  // =========================================================
  const getPriorityClass = (priority) => {
    const value = String(priority || "").toLowerCase();

    if (
      value.includes("urgent") ||
      value.includes("high")
    ) {
      return "priority-high";
    }

    if (value.includes("medium")) {
      return "priority-medium";
    }

    return "priority-normal";
  };

  // =========================================================
  // UNREAD NOTIFICATIONS
  // =========================================================
  const unreadNotificationCount = useMemo(() => {
    return notifications.filter((notification) => {
      return (
        notification.read === false ||
        notification.isRead === false ||
        String(notification.status || "").toLowerCase() ===
          "unread" ||
        String(
          notification.readStatus || ""
        ).toLowerCase() === "unread"
      );
    }).length;
  }, [notifications]);

  // =========================================================
  // FIND HEARING FOR CASE
  // =========================================================
  const findHearingForCase = (caseItem) => {
    const caseIds = [
      caseItem.id,
      caseItem.caseId,
      caseItem.caseNumber,
      caseItem.case_number,
    ]
      .filter(Boolean)
      .map(String);

    return hearings.find((hearing) => {
      const hearingCaseId =
        hearing.caseId ||
        hearing.caseID ||
        hearing.case_id ||
        hearing.caseNumber;

      if (!hearingCaseId) return false;

      return caseIds.includes(
        String(hearingCaseId)
      );
    });
  };

  // =========================================================
  // STATS
  // =========================================================
  const stats = useMemo(() => {
    const assigned = cases.length;

    const pending = cases.filter((item) => {
      const status = normalizeStatus(
        item.status
      ).toLowerCase();

      return (
        status.includes("pending") ||
        status.includes("waiting")
      );
    }).length;

    const completed = cases.filter((item) => {
      const status = normalizeStatus(
        item.status
      ).toLowerCase();

      return (
        status.includes("completed") ||
        status.includes("complete") ||
        status.includes("resolved")
      );
    }).length;

    const aiAssigned = cases.filter(
      (item) =>
        item.aiRecommended === true ||
        item.aiRecommended === "true" ||
        item.aiRecommendationScore !== undefined ||
        item.aiRecommendationReason
    ).length;

    const urgent = cases.filter((item) => {
      const priority =
        getPriority(item).toLowerCase();

      return (
        priority.includes("urgent") ||
        priority.includes("high")
      );
    }).length;

    return {
      assigned,
      pending,
      completed,
      aiAssigned,
      urgent,
    };
  }, [cases]);

  // =========================================================
  // RECENT CASES
  // =========================================================
  const recentCases = useMemo(() => {
    const getCaseDate = (item) => {
      const value =
        item.createdAt ||
        item.filingDate ||
        item.filing_date ||
        0;

      if (
        typeof value === "object" &&
        value !== null
      ) {
        if (value.seconds) {
          return Number(value.seconds) * 1000;
        }

        if (value._seconds) {
          return Number(value._seconds) * 1000;
        }
      }

      const numeric = Number(value);

      if (!isNaN(numeric) && numeric > 0) {
        return numeric;
      }

      const parsed =
        new Date(value).getTime();

      return isNaN(parsed) ? 0 : parsed;
    };

    return [...cases]
      .sort(
        (a, b) =>
          getCaseDate(b) -
          getCaseDate(a)
      )
      .slice(0, 5);
  }, [cases]);

  // =========================================================
  // UPCOMING HEARINGS
  // =========================================================
  const upcomingHearings = useMemo(() => {
    const now = new Date();

    return [...hearings]
      .filter((hearing) => {
        const date = getHearingDate(hearing);

        if (!date) return true;

        const timestamp =
          new Date(date).getTime();

        return (
          isNaN(timestamp) ||
          timestamp >=
            new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate()
            ).getTime()
        );
      })
      .sort(
        (a, b) =>
          getHearingTimestamp(a) -
          getHearingTimestamp(b)
      )
      .slice(0, 5);
  }, [hearings]);

  // =========================================================
  // VIEW CASE
  // =========================================================
  const handleViewCase = (caseItem) => {
    if (!caseItem?.id) return;

    navigate(
      `/judge-dashboard/case/${caseItem.id}`,
      {
        state: {
          from: "/judge-dashboard",
        },
      }
    );
  };

  // =========================================================
  // VIEW HEARING
  // =========================================================
  const handleViewHearing = (hearing) => {
    if (!hearing?.id) return;

    navigate(
      `/judge-dashboard/hearing/${hearing.id}`,
      {
        state: {
          from: "/judge-dashboard",
        },
      }
    );
  };

  // =========================================================
  // JUDGE NAME
  // =========================================================
  const judgeName =
    judgeProfile?.fullName ||
    judgeProfile?.name ||
    judgeProfile?.displayName ||
    user?.displayName ||
    "Judge";

  // =========================================================
  // LOADING
  // =========================================================
  if (loading) {
    return (
      <div className="judge-loading">
        <div className="loading-spinner"></div>
        <p>Loading Judge Dashboard...</p>
      </div>
    );
  }

  // =========================================================
  // UI
  // =========================================================
  return (
    <div className="judge-dashboard">

      <style>{`
        * {
          box-sizing: border-box;
        }

        .judge-dashboard {
          min-height: 100vh;
          background: #f5f7fb;
          padding: 28px;
          color: #1f2937;
        }

        .judge-container {
          max-width: 1450px;
          margin: 0 auto;
        }

        .judge-loading {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #f5f7fb;
          color: #374151;
        }

        .loading-spinner {
          width: 45px;
          height: 45px;
          border: 4px solid #dbe3ee;
          border-top-color: #1e3a8a;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-bottom: 15px;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .judge-header {
          background: linear-gradient(
            135deg,
            #102a56,
            #1e3a8a
          );
          border-radius: 20px;
          padding: 30px;
          color: white;
          margin-bottom: 25px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 25px;
          box-shadow: 0 12px 30px rgba(
            16,
            42,
            86,
            0.15
          );
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .judge-avatar {
          width: 70px;
          height: 70px;
          border-radius: 18px;
          background: rgba(
            255,
            255,
            255,
            0.15
          );
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          border: 1px solid rgba(
            255,
            255,
            255,
            0.2
          );
        }

        .header-left h1 {
          margin: 0 0 6px;
          font-size: 28px;
        }

        .header-left p {
          margin: 0;
          opacity: 0.85;
        }

        .header-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .header-btn {
          text-decoration: none;
          color: #102a56;
          background: white;
          padding: 11px 16px;
          border-radius: 10px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: 0.2s;
        }

        .header-btn:hover {
          transform: translateY(-2px);
        }

        .notification-btn {
          position: relative;
        }

        .notification-count {
          position: absolute;
          top: -7px;
          right: -7px;
          min-width: 20px;
          height: 20px;
          padding: 0 5px;
          border-radius: 20px;
          background: #dc2626;
          color: white;
          font-size: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid white;
          font-weight: 800;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(
            5,
            1fr
          );
          gap: 18px;
          margin-bottom: 25px;
        }

        .stat-card {
          background: white;
          border-radius: 16px;
          padding: 22px;
          display: flex;
          align-items: center;
          gap: 15px;
          box-shadow: 0 5px 18px rgba(
            0,
            0,
            0,
            0.05
          );
          border: 1px solid #e8edf4;
        }

        .stat-icon {
          width: 50px;
          height: 50px;
          border-radius: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #eef3ff;
          color: #1e3a8a;
          font-size: 21px;
          flex-shrink: 0;
        }

        .stat-card h3 {
          margin: 0 0 4px;
          font-size: 26px;
          color: #111827;
        }

        .stat-card p {
          margin: 0;
          color: #6b7280;
          font-size: 13px;
        }

        .quick-actions {
          display: grid;
          grid-template-columns: repeat(
            4,
            1fr
          );
          gap: 15px;
          margin-bottom: 25px;
        }

        .quick-card {
          text-decoration: none;
          background: white;
          border: 1px solid #e5eaf1;
          border-radius: 15px;
          padding: 20px;
          color: #1f2937;
          display: flex;
          align-items: center;
          gap: 15px;
          transition: all 0.2s ease;
          box-shadow: 0 4px 14px rgba(
            0,
            0,
            0,
            0.04
          );
        }

        .quick-card:hover {
          transform: translateY(-3px);
          border-color: #9db2d5;
          box-shadow: 0 9px 20px rgba(
            0,
            0,
            0,
            0.08
          );
        }

        .quick-icon {
          width: 45px;
          height: 45px;
          border-radius: 12px;
          background: #edf3ff;
          color: #1e3a8a;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 19px;
          flex-shrink: 0;
        }

        .quick-card strong {
          display: block;
          margin-bottom: 4px;
        }

        .quick-card span {
          color: #6b7280;
          font-size: 12px;
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 22px;
        }

        .panel {
          background: white;
          border-radius: 18px;
          border: 1px solid #e7ebf1;
          box-shadow: 0 5px 18px rgba(
            0,
            0,
            0,
            0.04
          );
          overflow: hidden;
        }

        .panel-header {
          padding: 20px 22px;
          border-bottom: 1px solid #edf0f4;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
        }

        .panel-title {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .panel-title h2 {
          margin: 0;
          font-size: 18px;
        }

        .panel-title svg {
          color: #1e3a8a;
        }

        .view-all {
          text-decoration: none;
          color: #1e3a8a;
          font-size: 13px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .case-list {
          padding: 10px 20px 20px;
        }

        .case-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 16px 5px;
          border-bottom: 1px solid #eef1f5;
        }

        .case-row:last-child {
          border-bottom: none;
        }

        .case-info {
          min-width: 0;
        }

        .case-number {
          color: #1e3a8a;
          font-size: 12px;
          font-weight: 800;
          margin-bottom: 4px;
        }

        .case-title {
          font-weight: 700;
          color: #111827;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 430px;
        }

        .case-meta {
          margin-top: 6px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          color: #6b7280;
          font-size: 12px;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          padding: 5px 9px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
        }

        .status-pending {
          background: #fff7ed;
          color: #c2410c;
        }

        .status-assigned {
          background: #eff6ff;
          color: #1d4ed8;
        }

        .status-completed {
          background: #ecfdf5;
          color: #047857;
        }

        .status-default {
          background: #f3f4f6;
          color: #4b5563;
        }

        .priority-high {
          background: #fef2f2;
          color: #b91c1c;
        }

        .priority-medium {
          background: #fffbeb;
          color: #a16207;
        }

        .priority-normal {
          background: #f0fdf4;
          color: #15803d;
        }

        .case-action {
          border: none;
          background: #eef3ff;
          color: #1e3a8a;
          padding: 9px 13px;
          border-radius: 9px;
          cursor: pointer;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 7px;
          white-space: nowrap;
        }

        .case-action:hover {
          background: #dce7ff;
        }

        .hearing-list {
          padding: 10px 20px 20px;
        }

        .hearing-card {
          border: 1px solid #e8edf3;
          border-radius: 13px;
          padding: 15px;
          margin-bottom: 12px;
        }

        .hearing-card:last-child {
          margin-bottom: 0;
        }

        .hearing-top {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
        }

        .hearing-title {
          font-weight: 700;
          color: #111827;
        }

        .hearing-case {
          margin-top: 4px;
          font-size: 12px;
          color: #1e3a8a;
          font-weight: 700;
        }

        .hearing-date {
          margin-top: 10px;
          color: #6b7280;
          font-size: 12px;
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .hearing-view {
          border: none;
          background: #102a56;
          color: white;
          border-radius: 8px;
          padding: 7px 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          font-weight: 700;
        }

        .empty-state {
          text-align: center;
          padding: 35px 20px;
          color: #6b7280;
        }

        .empty-state svg {
          font-size: 32px;
          margin-bottom: 10px;
          color: #9ca3af;
        }

        .ai-panel {
          margin-top: 22px;
        }

        .ai-content {
          padding: 22px;
        }

        .ai-summary {
          display: grid;
          grid-template-columns: repeat(
            3,
            1fr
          );
          gap: 15px;
        }

        .ai-box {
          background: #f7f9ff;
          border: 1px solid #e2e8ff;
          border-radius: 13px;
          padding: 17px;
        }

        .ai-box svg {
          color: #4338ca;
          margin-bottom: 8px;
        }

        .ai-box h3 {
          margin: 0 0 5px;
          font-size: 22px;
        }

        .ai-box p {
          margin: 0;
          color: #6b7280;
          font-size: 12px;
        }

        .notifications-panel {
          margin-top: 22px;
        }

        .notification-list {
          padding: 10px 20px 20px;
        }

        .notification-item {
          display: flex;
          gap: 12px;
          padding: 14px 5px;
          border-bottom: 1px solid #eef1f5;
          transition: background 0.2s ease;
        }

        .notification-item:last-child {
          border-bottom: none;
        }

        .notification-unread {
          background: #f5f8ff;
          border-left: 4px solid #1e3a8a;
          padding-left: 12px;
          border-radius: 8px;
        }

        .notification-unread
        .notification-text strong {
          color: #102a56;
        }

        .notification-icon {
          width: 38px;
          height: 38px;
          flex-shrink: 0;
          border-radius: 10px;
          background: #eef3ff;
          color: #1e3a8a;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .notification-unread
        .notification-icon {
          background: #dce7ff;
        }

        .notification-text {
          flex: 1;
        }

        .notification-text strong {
          display: block;
          margin-bottom: 3px;
          font-size: 13px;
        }

        .notification-text p {
          margin: 0;
          color: #6b7280;
          font-size: 12px;
          line-height: 1.5;
        }

        @media (max-width: 1150px) {
          .stats-grid {
            grid-template-columns: repeat(
              3,
              1fr
            );
          }

          .quick-actions {
            grid-template-columns: repeat(
              2,
              1fr
            );
          }

          .dashboard-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {
          .judge-dashboard {
            padding: 15px;
          }

          .judge-header {
            padding: 22px;
            flex-direction: column;
            align-items: flex-start;
          }

          .header-actions {
            width: 100%;
          }

          .header-btn {
            flex: 1;
            justify-content: center;
          }

          .stats-grid {
            grid-template-columns: repeat(
              2,
              1fr
            );
          }

          .quick-actions {
            grid-template-columns: 1fr;
          }

          .ai-summary {
            grid-template-columns: 1fr;
          }

          .case-row {
            align-items: flex-start;
            flex-direction: column;
          }

          .case-title {
            max-width: 100%;
            white-space: normal;
          }
        }

        @media (max-width: 450px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }

          .header-left {
            align-items: flex-start;
          }

          .judge-avatar {
            width: 55px;
            height: 55px;
            font-size: 24px;
          }

          .header-left h1 {
            font-size: 22px;
          }
        }
      `}</style>

      <div className="judge-container">

        {/* =====================================================
            HEADER
        ====================================================== */}

        <motion.div
          className="judge-header"
          initial={{
            opacity: 0,
            y: -15,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
        >

          <div className="header-left">

            <div className="judge-avatar">
              <FaGavel />
            </div>

            <div>
              <h1>
                Welcome, {judgeName}
              </h1>

              <p>
                Judge Dashboard — Court Network
              </p>
            </div>

          </div>

          <div className="header-actions">

            <Link
              to="/judge-dashboard/schedule"
              className="header-btn"
            >
              <FaPlus />
              Schedule Hearing
            </Link>

            <Link
              to="/judge-dashboard/notifications"
              className="header-btn notification-btn"
            >

              <FaBell />

              Notifications

              {unreadNotificationCount > 0 && (
                <span className="notification-count">
                  {unreadNotificationCount > 99
                    ? "99+"
                    : unreadNotificationCount}
                </span>
              )}

            </Link>

          </div>

        </motion.div>

        {/* =====================================================
            STATS
        ====================================================== */}

        <div className="stats-grid">

          <motion.div
            className="stat-card"
            whileHover={{ y: -3 }}
          >
            <div className="stat-icon">
              <FaFileAlt />
            </div>

            <div>
              <h3>{stats.assigned}</h3>
              <p>Assigned Cases</p>
            </div>
          </motion.div>

          <motion.div
            className="stat-card"
            whileHover={{ y: -3 }}
          >
            <div className="stat-icon">
              <FaClock />
            </div>

            <div>
              <h3>{stats.pending}</h3>
              <p>Pending Cases</p>
            </div>
          </motion.div>

          <motion.div
            className="stat-card"
            whileHover={{ y: -3 }}
          >
            <div className="stat-icon">
              <FaCheckCircle />
            </div>

            <div>
              <h3>{stats.completed}</h3>
              <p>Completed Cases</p>
            </div>
          </motion.div>

          <motion.div
            className="stat-card"
            whileHover={{ y: -3 }}
          >
            <div className="stat-icon">
              <FaRobot />
            </div>

            <div>
              <h3>{stats.aiAssigned}</h3>
              <p>AI Assigned</p>
            </div>
          </motion.div>

          <motion.div
            className="stat-card"
            whileHover={{ y: -3 }}
          >
            <div className="stat-icon">
              <FaExclamationTriangle />
            </div>

            <div>
              <h3>{stats.urgent}</h3>
              <p>High / Urgent</p>
            </div>
          </motion.div>

        </div>

        {/* =====================================================
            QUICK ACTIONS
        ====================================================== */}

        <div className="quick-actions">

          <Link
            to="/judge-dashboard/all-cases"
            className="quick-card"
          >
            <div className="quick-icon">
              <FaList />
            </div>

            <div>
              <strong>All Cases</strong>
              <span>
                View all assigned cases
              </span>
            </div>

            <FaChevronRight />
          </Link>

          <Link
            to="/judge-dashboard/ai-assigned-cases"
            className="quick-card"
          >
            <div className="quick-icon">
              <FaBrain />
            </div>

            <div>
              <strong>
                AI Assigned Cases
              </strong>

              <span>
                View AI recommended cases
              </span>
            </div>

            <FaChevronRight />
          </Link>

          <Link
            to="/judge-dashboard/schedule"
            className="quick-card"
          >
            <div className="quick-icon">
              <FaCalendarAlt />
            </div>

            <div>
              <strong>
                Schedule Hearing
              </strong>

              <span>
                Schedule a new hearing
              </span>
            </div>

            <FaChevronRight />
          </Link>

          <Link
            to="/judge-dashboard/notifications"
            className="quick-card"
          >
            <div className="quick-icon">
              <FaBell />
            </div>

            <div>
              <strong>
                Notifications
              </strong>

              <span>
                View your notifications
              </span>
            </div>

            <FaChevronRight />
          </Link>

        </div>

        {/* =====================================================
            CASES + HEARINGS
        ====================================================== */}

        <div className="dashboard-grid">

          {/* ================= RECENT CASES ================= */}

          <div className="panel">

            <div className="panel-header">

              <div className="panel-title">
                <FaFileAlt />
                <h2>
                  Recent Assigned Cases
                </h2>
              </div>

              <Link
                to="/judge-dashboard/all-cases"
                className="view-all"
              >
                View All
                <FaArrowRight />
              </Link>

            </div>

            <div className="case-list">

              {recentCases.length === 0 ? (

                <div className="empty-state">

                  <FaFileAlt />

                  <p>
                    No cases assigned to you yet.
                  </p>

                </div>

              ) : (

                recentCases.map((caseItem) => {

                  const status =
                    normalizeStatus(
                      caseItem.status
                    );

                  const priority =
                    getPriority(caseItem);

                  const hearing =
                    findHearingForCase(
                      caseItem
                    );

                  return (
                    <div
                      className="case-row"
                      key={caseItem.id}
                    >

                      <div className="case-info">

                        <div className="case-number">
                          {getCaseNumber(
                            caseItem
                          )}
                        </div>

                        <div className="case-title">
                          {getCaseTitle(
                            caseItem
                          )}
                        </div>

                        <div className="case-meta">

                          <span>
                            {getCaseType(
                              caseItem
                            )}
                          </span>

                          <span
                            className={`badge ${getStatusClass(
                              status
                            )}`}
                          >
                            {status}
                          </span>

                          <span
                            className={`badge ${getPriorityClass(
                              priority
                            )}`}
                          >
                            {priority}
                          </span>

                          {hearing && (
                            <span>
                              Hearing Scheduled
                            </span>
                          )}

                        </div>

                      </div>

                      <button
                        className="case-action"
                        onClick={() =>
                          handleViewCase(
                            caseItem
                          )
                        }
                      >
                        <FaEye />
                        View
                      </button>

                    </div>
                  );
                })

              )}

            </div>

          </div>

          {/* ================= UPCOMING HEARINGS ================= */}

          <div className="panel">

            <div className="panel-header">

              <div className="panel-title">
                <FaCalendarAlt />
                <h2>
                  Upcoming Hearings
                </h2>
              </div>

              <Link
                to="/judge-dashboard/schedule"
                className="view-all"
              >
                Schedule
                <FaArrowRight />
              </Link>

            </div>

            <div className="hearing-list">

              {upcomingHearings.length === 0 ? (

                <div className="empty-state">

                  <FaCalendarAlt />

                  <p>
                    No upcoming hearings.
                  </p>

                  <Link
                    to="/judge-dashboard/schedule"
                    className="view-all"
                    style={{
                      justifyContent: "center",
                      marginTop: "10px",
                    }}
                  >
                    Schedule Hearing
                    <FaArrowRight />
                  </Link>

                </div>

              ) : (

                upcomingHearings.map(
                  (hearing) => {

                    const hearingCaseId =
                      hearing.caseId ||
                      hearing.caseID ||
                      hearing.case_id ||
                      hearing.caseNumber;

                    const relatedCase =
                      cases.find(
                        (item) =>
                          String(item.id) ===
                            String(
                              hearingCaseId
                            ) ||
                          String(
                            item.caseNumber ||
                              item.case_number
                          ) ===
                            String(
                              hearingCaseId
                            )
                      );

                    return (
                      <div
                        className="hearing-card"
                        key={hearing.id}
                      >

                        <div className="hearing-top">

                          <div>

                            <div className="hearing-title">
                              {hearing.title ||
                                hearing.hearingTitle ||
                                hearing.type ||
                                "Court Hearing"}
                            </div>

                            <div className="hearing-case">
                              Case:{" "}
                              {relatedCase
                                ? getCaseNumber(
                                    relatedCase
                                  )
                                : hearingCaseId ||
                                  "N/A"}
                            </div>

                          </div>

                          <button
                            className="hearing-view"
                            onClick={() =>
                              handleViewHearing(
                                hearing
                              )
                            }
                          >
                            <FaEye />
                            Manage
                          </button>

                        </div>

                        <div className="hearing-date">

                          <span>
                            📅{" "}
                            {formatDate(
                              getHearingDate(
                                hearing
                              )
                            )}
                          </span>

                          <span>
                            🕐{" "}
                            {getHearingTime(
                              hearing
                            ) ||
                              "Time not set"}
                          </span>

                          {hearing.courtRoom && (
                            <span>
                              📍{" "}
                              {
                                hearing.courtRoom
                              }
                            </span>
                          )}

                        </div>

                      </div>
                    );
                  }
                )

              )}

            </div>

          </div>

        </div>

        {/* =====================================================
            AI ASSIGNMENT SUMMARY
        ====================================================== */}

        <div className="panel ai-panel">

          <div className="panel-header">

            <div className="panel-title">
              <FaRobot />
              <h2>
                AI Assignment Summary
              </h2>
            </div>

            <Link
              to="/judge-dashboard/ai-assigned-cases"
              className="view-all"
            >
              View AI Cases
              <FaArrowRight />
            </Link>

          </div>

          <div className="ai-content">

            <div className="ai-summary">

              <div className="ai-box">

                <FaRobot />

                <h3>
                  {stats.aiAssigned}
                </h3>

                <p>
                  Cases assigned through AI
                  recommendation
                </p>

              </div>

              <div className="ai-box">

                <FaGavel />

                <h3>
                  {judgeProfile?.expertise ||
                    judgeProfile?.specialization ||
                    "Judge"}
                </h3>

                <p>
                  Judge specialization /
                  expertise
                </p>

              </div>

              <div className="ai-box">

                <FaUserTie />

                <h3>
                  {judgeProfile?.currentWorkload ??
                    judgeProfile?.workload ??
                    cases.length}
                </h3>

                <p>
                  Current workload
                </p>

              </div>

            </div>

          </div>

        </div>

        {/* =====================================================
            NOTIFICATIONS
        ====================================================== */}

        <div className="panel notifications-panel">

          <div className="panel-header">

            <div className="panel-title">
              <FaBell />
              <h2>
                Recent Notifications
              </h2>
            </div>

            <Link
              to="/judge-dashboard/notifications"
              className="view-all"
            >
              View All
              <FaArrowRight />
            </Link>

          </div>

          <div className="notification-list">

            {notifications.length === 0 ? (

              <div className="empty-state">

                <FaBell />

                <p>
                  No notifications available.
                </p>

              </div>

            ) : (

              notifications
                .slice(0, 5)
                .map((notification) => {

                  const isUnread =
                    notification.read === false ||
                    notification.isRead === false ||
                    String(
                      notification.status || ""
                    ).toLowerCase() ===
                      "unread" ||
                    String(
                      notification.readStatus ||
                        ""
                    ).toLowerCase() ===
                      "unread";

                  return (
                    <div
                      className={`notification-item ${
                        isUnread
                          ? "notification-unread"
                          : ""
                      }`}
                      key={notification.id}
                    >

                      <div className="notification-icon">
                        <FaBell />
                      </div>

                      <div className="notification-text">

                        <strong>
                          {notification.title ||
                            notification.type ||
                            "Notification"}
                        </strong>

                        <p>
                          {notification.message ||
                            notification.description ||
                            "You have a new notification."}
                        </p>

                      </div>

                    </div>
                  );
                })

            )}

          </div>

        </div>

      </div>

    </div>
  );
};

export default JudgeDashboard;