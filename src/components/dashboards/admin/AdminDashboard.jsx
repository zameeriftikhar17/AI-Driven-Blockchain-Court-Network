
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FaUsers,
  FaDatabase,
  FaRobot,
  FaShieldAlt,
  FaBell,
  FaCog,
  FaUserTie,
  FaUserCog,
  FaGavel,
  FaHome,
  FaFileAlt,
  FaBars,
  FaTimes,
  FaClock,
  FaChartLine
} from 'react-icons/fa';
import { ref, onValue, off } from "firebase/database";
import { auth, db } from "../../../firebase";
import GlassCard from '../../common/GlassCard';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const user = auth.currentUser;
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
 
  const [stats, setStats] = useState({
    users: 0,
    cases: 0,
    blockchainBlocks: 0,
    aiModels: 4,
    judges: 0,
    clerks: 0
  });

  const [cases, setCases] = useState([]);
  const [systemLogs, setSystemLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!user) return;

    let loadedCount = 0;
    const totalListeners = 3;
    let timeoutId = null;

    const checkLoadingComplete = () => {
      loadedCount++;

      if (loadedCount >= totalListeners) {
        setLoading(false);

        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    };

    timeoutId = setTimeout(() => {
      setLoading(false);
    }, 5000);

    // =========================
    // USERS
    // =========================
    const usersRef = ref(db, 'users');

    const unsubUsers = onValue(
      usersRef,
      (snapshot) => {
        const data = snapshot.val();

        if (data) {
          const usersArray = Object.keys(data).map(key => ({
            id: key,
            ...data[key]
          }));

          const total = usersArray.length;

          const judges = usersArray.filter(
            u => String(u.role || '').toLowerCase() === 'judge'
          ).length;

          const clerks = usersArray.filter(
            u => String(u.role || '').toLowerCase() === 'clerk'
          ).length;

          setStats(prev => ({
            ...prev,
            users: total,
            judges,
            clerks
          }));
        } else {
          setStats(prev => ({
            ...prev,
            users: 0,
            judges: 0,
            clerks: 0
          }));
        }

        checkLoadingComplete();
      },
      (error) => {
        console.error('Users fetch error:', error);

        setStats(prev => ({
          ...prev,
          users: 0,
          judges: 0,
          clerks: 0
        }));

        checkLoadingComplete();
      }
    );

    // =========================
    // CASES
    // =========================
    const casesRef = ref(db, 'cases');

    const unsubCases = onValue(
      casesRef,
      (snapshot) => {
        const data = snapshot.val();

        if (data) {
          const casesArray = Object.keys(data).map(key => ({
            id: key,
            caseId: key,
            ...data[key]
          }));

          setCases(casesArray);

          setStats(prev => ({
            ...prev,
            cases: casesArray.length
          }));
        } else {
          setCases([]);

          setStats(prev => ({
            ...prev,
            cases: 0
          }));
        }

        checkLoadingComplete();
      },
      (error) => {
        console.error('Cases fetch error:', error);

        setCases([]);

        setStats(prev => ({
          ...prev,
          cases: 0
        }));

        checkLoadingComplete();
      }
    );

    // =========================
    // SYSTEM LOGS
    // =========================
    const logsRef = ref(db, 'systemLogs');

    const unsubLogs = onValue(
      logsRef,
      (snapshot) => {
        const data = snapshot.val();

        if (data) {
          const logsArray = Object.keys(data).map(key => ({
            id: key,
            ...data[key]
          }));

          logsArray.sort((a, b) => {
            const dateA = new Date(a.timestamp || 0).getTime();
            const dateB = new Date(b.timestamp || 0).getTime();

            return dateB - dateA;
          });

          setSystemLogs(logsArray.slice(0, 5));

          const blockchainLogs = logsArray.filter(
            log =>
              String(log.module || '').toLowerCase() === 'blockchain'
          );

          setStats(prev => ({
            ...prev,
            blockchainBlocks: blockchainLogs.length
          }));
        } else {
          setSystemLogs([]);

          setStats(prev => ({
            ...prev,
            blockchainBlocks: 0
          }));
        }

        checkLoadingComplete();
      },
      (error) => {
        console.error('Logs fetch error:', error);

        setSystemLogs([]);

        setStats(prev => ({
          ...prev,
          blockchainBlocks: 0
        }));

        checkLoadingComplete();
      }
    );

    return () => {
      off(usersRef);
      off(casesRef);
      off(logsRef);

      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [user]);

  // =========================
  // NAVIGATION
  // =========================

  const isActive = (path) => {
    return (
      location.pathname === path ||
      location.pathname.startsWith(path + '/')
    );
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  
  // =========================
  // AI HELPERS
  // =========================

  const getPriorityClass = (priority) => {
    const value = String(priority || '').toLowerCase();

    if (value === 'high') {
      return 'high';
    }

    if (value === 'medium') {
      return 'medium';
    }

    if (value === 'low') {
      return 'low';
    }

    return 'unknown';
  };

  const getCaseTitle = (item) => {
    return (
      item.title ||
      item.description ||
      'Untitled Case'
    );
  };

  const getJudgeRecommendation = (item) => {
    return (
      item.aiRecommendedJudge ||
      item.recommendedJudge ||
      item.assignedJudge ||
      item.judge ||
      'Pending Judge Assignment'
    );
  };

  const getPredictionCount = () => {
    return cases.filter(
      item =>
        item.predictedCaseType ||
        item.predictedPriority ||
        item.predictedDurationDays !== undefined
    ).length;
  };

  const aiPredictedCases = cases.filter(
    item =>
      item.predictedCaseType ||
      item.predictedPriority ||
      item.predictedDurationDays !== undefined
  );

  // =========================
  // STAT CARDS
  // =========================

  const statCards = [
    {
      icon: <FaUsers />,
      label: 'Total Users',
      value: stats.users,
      color: '#4A6CF7'
    },
    {
      icon: <FaFileAlt />,
      label: 'Total Cases',
      value: stats.cases,
      color: '#FF9A56'
    },
    {
      icon: <FaDatabase />,
      label: 'Blocks Verified',
      value: stats.blockchainBlocks,
      color: '#00E676'
    },
    {
      icon: <FaRobot />,
      label: 'AI Models Active',
      value: stats.aiModels,
      color: '#7C4DFF'
    },
    {
      icon: <FaGavel />,
      label: 'Total Judges',
      value: stats.judges,
      color: '#00BCD4'
    },
    {
      icon: <FaUserTie />,
      label: 'Total Clerks',
      value: stats.clerks,
      color: '#FF4081'
    }
  ];

  return (
    <>
      <style>{`

        :root {
          --sky: #4FC3F7;
          --sky-dark: #0288D1;
          --black: #1A1A1A;
          --white: #FFFFFF;
          --gray: #6B7280;
          --shadow: 0 8px 32px rgba(0,0,0,0.08);
          --radius: 16px;
          --transition-smooth: cubic-bezier(0.4,0,0.2,1);
        }

        * {
          box-sizing: border-box;
        }

        .admin-layout {
          display: flex;
          min-height: 100vh;
          background: linear-gradient(
            135deg,
            #E3F2FD 0%,
            #BBDEFB 50%,
            #90CAF9 100%
          );
          animation: gradientShift 12s ease-in-out infinite alternate;
        }

        @keyframes gradientShift {
          0% {
            background-position: 0% 50%;
          }

          50% {
            background-position: 100% 50%;
          }

          100% {
            background-position: 0% 50%;
          }
        }

        .admin-mobile-menu {
          position: fixed;
          top: 1rem;
          left: 1rem;
          z-index: 1001;
          background: rgba(255,255,255,0.9);
          border: none;
          border-radius: 50%;
          width: 44px;
          height: 44px;
          display: none;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
          cursor: pointer;
          box-shadow: var(--shadow);
        }

        .admin-sidebar {
          width: 260px;
          min-height: 100vh;
          background: rgba(20, 25, 45, 0.95);
          backdrop-filter: blur(16px);
          border-right: 1px solid rgba(255,255,255,0.08);
          padding: 1.5rem 1rem;
          transition: transform 0.3s var(--transition-smooth);
          position: sticky;
          top: 0;
          height: 100vh;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          z-index: 1000;
          flex-shrink: 0;
        }

        .admin-sidebar-header {
          display: flex;
          align-items: center;
          gap: 0.8rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          margin-bottom: 1.5rem;
        }

        .admin-logo {
          font-size: 2rem;
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(79,195,247,0.15);
          border-radius: 12px;
          color: var(--sky);
        }

        .admin-sidebar-header h2 {
          color: white;
          font-size: 1.2rem;
          margin: 0;
        }

        .admin-sidebar-header span {
          color: rgba(255,255,255,0.5);
          font-size: 0.8rem;
        }

        .admin-sidebar-menu {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
          flex: 1;
        }

        .admin-sidebar-link {
          display: flex;
          align-items: center;
          gap: 0.8rem;
          padding: 0.7rem 1rem;
          border-radius: 10px;
          color: rgba(255,255,255,0.6);
          text-decoration: none;
          transition: all 0.3s;
          font-size: 0.95rem;
        }

        .admin-sidebar-link:hover {
          background: rgba(255,255,255,0.06);
          color: white;
        }

        .admin-sidebar-link.active {
          background: rgba(79,195,247,0.15);
          color: white;
        }

        .admin-sidebar-link svg {
          font-size: 1.1rem;
          width: 20px;
          flex-shrink: 0;
        }

        .ai-sidebar-button {
          width: 100%;
          border: none;
          background: transparent;
          cursor: pointer;
          text-align: left;
          font-family: inherit;
        }

        .ai-sidebar-button:hover {
          background: rgba(255,255,255,0.06);
          color: white;
        }

        .ai-sidebar-button.active {
          background: rgba(79,195,247,0.15);
          color: white;
        }

        .admin-main-content {
          flex: 1;
          padding: 2rem;
          max-width: calc(100% - 260px);
          min-width: 0;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          flex-wrap: wrap;
          gap: 1rem;
          background: rgba(255,255,255,0.7);
          backdrop-filter: blur(10px);
          padding: 1.2rem 1.8rem;
          border-radius: var(--radius);
          box-shadow: var(--shadow);
        }

        .dashboard-title h1 {
          font-size: 2rem;
          font-weight: 800;
          color: var(--black);
          margin: 0;
        }

        .dashboard-title p {
          color: var(--gray);
          margin: 0;
          font-weight: 500;
        }

        .dashboard-actions {
          display: flex;
          gap: 0.8rem;
          align-items: center;
        }

        .notif-btn {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          background: rgba(255,255,255,0.7);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.8);
          border-radius: 50%;
          color: var(--black);
          transition: all 0.3s;
          text-decoration: none;
        }

        .notif-btn:hover {
          background: white;
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .notif-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          background: #EF4444;
          color: white;
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0.2rem 0.5rem;
          border-radius: 50px;
          min-width: 18px;
          text-align: center;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.2rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.2rem 1.5rem;
          background: rgba(255,255,255,0.85) !important;
          backdrop-filter: blur(20px) !important;
          border: 1px solid rgba(255,255,255,0.9) !important;
          box-shadow: var(--shadow) !important;
          border-radius: var(--radius);
          transition: transform 0.3s, box-shadow 0.3s;
          cursor: pointer;
        }

        .stat-card:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 12px 40px rgba(0,0,0,0.12) !important;
        }

        .stat-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 52px;
          height: 52px;
          border-radius: 14px;
          font-size: 1.4rem;
          flex-shrink: 0;
        }

        .stat-info {
          display: flex;
          flex-direction: column;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: 800;
          color: var(--black);
          line-height: 1.2;
        }

        .stat-label {
          font-size: 0.9rem;
          color: #4B5563;
          font-weight: 500;
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }

        .chart-card,
        .recent-card {
          padding: 1.5rem;
          background: rgba(255,255,255,0.85) !important;
          backdrop-filter: blur(20px) !important;
          border: 1px solid rgba(255,255,255,0.9) !important;
          box-shadow: var(--shadow) !important;
          border-radius: var(--radius);
        }

        .chart-card h3,
        .recent-card h3 {
          color: var(--black);
          font-size: 1.2rem;
          font-weight: 700;
          margin: 0 0 1rem 0;
        }

        .system-logs {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }

        .log-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.6rem 0.8rem;
          background: rgba(0,0,0,0.02);
          border-radius: 8px;
          gap: 0.5rem;
        }

        .log-info {
          display: flex;
          gap: 0.8rem;
          flex-wrap: wrap;
        }

        .log-action {
          font-weight: 500;
          color: var(--black);
        }

        .log-user {
          font-size: 0.8rem;
          color: var(--gray);
        }

        .log-time {
          font-size: 0.8rem;
          color: var(--gray);
          white-space: nowrap;
        }

        .admin-controls {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }

        .control-item {
          display: flex;
          align-items: center;
          gap: 0.8rem;
          padding: 0.6rem 0.8rem;
          background: rgba(0,0,0,0.02);
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.3s;
          text-decoration: none;
          color: var(--black);
        }

        .control-item:hover {
          background: rgba(79,195,247,0.08);
        }

        .control-item span:first-of-type {
          flex: 1;
          font-weight: 500;
        }

        .control-count {
          font-size: 0.8rem;
          color: var(--gray);
          background: rgba(0,0,0,0.04);
          padding: 0.1rem 0.6rem;
          border-radius: 50px;
        }

        .no-data {
          color: var(--gray);
          text-align: center;
          padding: 1rem;
        }

        /* =========================
           AI RECOMMENDATIONS
        ========================= */

        .ai-recommendations-wrapper {
          margin-top: 1.5rem;
          scroll-margin-top: 1.5rem;
        }

        .ai-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
          margin-bottom: 1.5rem;
        }

        .ai-header-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .ai-main-icon {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(124,77,255,0.12);
          color: #7C4DFF;
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .ai-header h2 {
          margin: 0;
          font-size: 1.35rem;
          color: var(--black);
        }

        .ai-header p {
          margin: 0.25rem 0 0;
          color: var(--gray);
          font-size: 0.9rem;
        }

        .ai-close-btn {
          border: none;
          background: #F3F4F6;
          color: #374151;
          padding: 0.6rem 1rem;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: 0.3s;
        }

        .ai-close-btn:hover {
          background: #E5E7EB;
        }

        .ai-models-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
          margin-bottom: 1.8rem;
        }

        .ai-model-card {
          padding: 1.2rem;
          background: rgba(255,255,255,0.8);
          border: 1px solid rgba(0,0,0,0.05);
          border-radius: 14px;
          display: flex;
          gap: 1rem;
          align-items: flex-start;
          transition: 0.3s;
        }

        .ai-model-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.08);
        }

        .ai-model-icon {
          min-width: 44px;
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: rgba(124,77,255,0.1);
          color: #7C4DFF;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ai-model-card h4 {
          margin: 0 0 0.4rem;
          color: #1A1A1A;
          font-size: 0.95rem;
        }

        .ai-model-card p {
          margin: 0;
          color: #6B7280;
          font-size: 0.82rem;
          line-height: 1.5;
        }

        .ai-analysis-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
          margin-bottom: 1rem;
        }

        .ai-analysis-header h4 {
          margin: 0;
          color: var(--black);
          font-size: 1.05rem;
        }

        .ai-count-badge {
          background: rgba(79,195,247,0.12);
          color: var(--sky-dark);
          padding: 0.35rem 0.7rem;
          border-radius: 50px;
          font-size: 0.8rem;
          font-weight: 700;
        }

        .ai-cases-list {
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
        }

        .ai-case-row {
          display: grid;
          grid-template-columns: 1.2fr 2fr;
          gap: 1rem;
          padding: 1rem;
          background: rgba(0,0,0,0.025);
          border-radius: 12px;
          border: 1px solid rgba(0,0,0,0.04);
        }

        .ai-case-main {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .ai-case-id {
          color: var(--sky-dark);
          font-weight: 700;
          font-size: 0.85rem;
        }

        .ai-case-title {
          color: var(--black);
          font-weight: 600;
          word-break: break-word;
        }

        .ai-case-citizen {
          color: var(--gray);
          font-size: 0.8rem;
          word-break: break-word;
        }

        .ai-result {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.6rem;
          align-items: stretch;
        }

        .ai-result-box {
          background: white;
          padding: 0.7rem;
          border-radius: 9px;
          border: 1px solid rgba(0,0,0,0.05);
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
          min-width: 0;
        }

        .ai-result-label {
          color: var(--gray);
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .ai-result-value {
          color: var(--black);
          font-size: 0.82rem;
          font-weight: 700;
          word-break: break-word;
        }

        .priority-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: fit-content;
          padding: 0.2rem 0.55rem;
          border-radius: 50px;
          font-size: 0.72rem;
          font-weight: 700;
        }

        .priority-badge.high {
          background: #FEE2E2;
          color: #B91C1C;
        }

        .priority-badge.medium {
          background: #FEF3C7;
          color: #92400E;
        }

        .priority-badge.low {
          background: #D1FAE5;
          color: #065F46;
        }

        .priority-badge.unknown {
          background: #F3F4F6;
          color: #6B7280;
        }

        .ai-empty {
          padding: 2rem;
          text-align: center;
          background: rgba(0,0,0,0.02);
          border-radius: 12px;
          color: var(--gray);
        }

        .ai-empty-icon {
          font-size: 2rem;
          margin-bottom: 0.6rem;
          color: #7C4DFF;
        }

        .ai-info-box {
          margin-top: 1rem;
          padding: 0.9rem 1rem;
          background: rgba(79,195,247,0.07);
          border-left: 4px solid var(--sky);
          border-radius: 8px;
          color: #374151;
          font-size: 0.82rem;
          line-height: 1.5;
        }

        @media (max-width: 1200px) {
          .ai-models-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .ai-case-row {
            grid-template-columns: 1fr;
          }

          .ai-result {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        @media (max-width: 992px) {
          .admin-mobile-menu {
            display: flex;
          }

          .admin-sidebar {
            position: fixed;
            top: 0;
            left: 0;
            transform: translateX(-100%);
            width: 280px;
            height: 100vh;
            z-index: 1000;
          }

          .admin-sidebar.open {
            transform: translateX(0);
          }

          .admin-main-content {
            max-width: 100%;
            padding: 1.5rem;
            padding-top: 4.5rem;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .dashboard-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }

          .dashboard-header {
            flex-direction: column;
            align-items: stretch;
          }

          .dashboard-actions {
            justify-content: flex-start;
          }

          .dashboard-title h1 {
            font-size: 1.8rem;
          }

          .ai-models-grid {
            grid-template-columns: 1fr;
          }

          .ai-result {
            grid-template-columns: repeat(2, 1fr);
          }

          .ai-header {
            align-items: flex-start;
          }
        }

        @media (max-width: 480px) {
          .admin-main-content {
            padding-left: 1rem;
            padding-right: 1rem;
          }

          .dashboard-title h1 {
            font-size: 1.5rem;
          }

          .chart-card,
          .recent-card {
            padding: 1rem;
          }

          .ai-header-left {
            align-items: flex-start;
          }

          .ai-main-icon {
            width: 44px;
            height: 44px;
            font-size: 1.2rem;
          }

          .ai-result {
            grid-template-columns: 1fr;
          }

          .log-item {
            align-items: flex-start;
            flex-direction: column;
          }
        }

      `}</style>

      <div className="admin-layout">

        {/* MOBILE MENU */}

        <button
          type="button"
          className="admin-mobile-menu"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <FaTimes /> : <FaBars />}
        </button>

        {/* SIDEBAR */}

        <aside
          className={`admin-sidebar ${
            sidebarOpen ? 'open' : ''
          }`}
        >

          <div className="admin-sidebar-header">

            <div className="admin-logo">
              ⚖️
            </div>

            <div>
              <h2>Admin Panel</h2>
              <span>CourtNetwork</span>
            </div>

          </div>

          <nav className="admin-sidebar-menu">

            <Link
              to="/admin-dashboard"
              className={`admin-sidebar-link ${
                isActive('/admin-dashboard')
  ? 'active'
  : ''
              }`}
              onClick={closeSidebar}
            >
              <FaHome />
              <span>Dashboard</span>
            </Link>

            <Link
              to="/admin-dashboard/users"
              className={`admin-sidebar-link ${
                isActive('/admin-dashboard/users')
                  ? 'active'
                  : ''
              }`}
              onClick={closeSidebar}
            >
              <FaUsers />
              <span>User Management</span>
            </Link>

            <Link
              to="/admin-dashboard/judges"
              className={`admin-sidebar-link ${
                isActive('/admin-dashboard/judges')
                  ? 'active'
                  : ''
              }`}
              onClick={closeSidebar}
            >
              <FaGavel />
              <span>Judge Management</span>
            </Link>

            <Link
              to="/admin-dashboard/lawyers"
              className={`admin-sidebar-link ${
                isActive('/admin-dashboard/lawyers')
                  ? 'active'
                  : ''
              }`}
              onClick={closeSidebar}
            >
              <FaUserTie />
              <span>Lawyer Management</span>
            </Link>

            <Link
              to="/admin-dashboard/clerks"
              className={`admin-sidebar-link ${
                isActive('/admin-dashboard/clerks')
                  ? 'active'
                  : ''
              }`}
              onClick={closeSidebar}
            >
              <FaUserTie />
              <span>Clerk Management</span>
            </Link>

            <Link
              to="/admin-dashboard/admins"
              className={`admin-sidebar-link ${
                isActive('/admin-dashboard/admins')
                  ? 'active'
                  : ''
              }`}
              onClick={closeSidebar}
            >
              <FaUserCog />
              <span>Admin Management</span>
            </Link>

            <Link
              to="/admin-dashboard/cases"
              className={`admin-sidebar-link ${
                isActive('/admin-dashboard/cases')
                  ? 'active'
                  : ''
              }`}
              onClick={closeSidebar}
            >
              <FaFileAlt />
              <span>Case Management</span>
            </Link>

            {/* AI RECOMMENDATIONS - SAME DASHBOARD */}

            <Link
  to="/admin-dashboard/ai-recommendations"
  className={`admin-sidebar-link ${
    isActive('/admin-dashboard/ai-recommendations')
      ? 'active'
      : ''
  }`}
  onClick={closeSidebar}
>
  <FaRobot />
  <span>AI Recommendations</span>
</Link>

            <Link
              to="/admin-dashboard/blockchain"
              className={`admin-sidebar-link ${
                isActive('/admin-dashboard/blockchain')
                  ? 'active'
                  : ''
              }`}
              onClick={closeSidebar}
            >
              <FaDatabase />
              <span>Blockchain</span>
            </Link>

            <Link
              to="/admin-dashboard/audit"
              className={`admin-sidebar-link ${
                isActive('/admin-dashboard/audit')
                  ? 'active'
                  : ''
              }`}
              onClick={closeSidebar}
            >
              <FaShieldAlt />
              <span>Audit Trails</span>
            </Link>

            <Link
              to="/admin-dashboard/settings"
              className={`admin-sidebar-link ${
                isActive('/admin-dashboard/settings')
                  ? 'active'
                  : ''
              }`}
              onClick={closeSidebar}
            >
              <FaCog />
              <span>Settings</span>
            </Link>

          </nav>

        </aside>

        {/* MAIN */}

        <main className="admin-main-content">

          {/* HEADER */}

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
            transition={{
              duration: 0.6
            }}
          >

            <div className="dashboard-title">

              <h1>
                System Admin Dashboard
              </h1>

              <p>
                Full control and monitoring of the CourtNetwork system
              </p>

            </div>

            <div className="dashboard-actions">

              <Link
                to="/admin-dashboard/settings"
                className="notif-btn"
                title="Settings"
              >
                <FaCog />
              </Link>

              <Link
                to="/notifications"
                className="notif-btn"
                title="Notifications"
              >
                <FaBell />

                <span className="notif-badge">
                  5
                </span>
              </Link>

            </div>

          </motion.div>

          {/* STAT CARDS */}

          <div className="stats-grid">

            {statCards.map((stat, index) => (

              <motion.div
                key={index}
                initial={{
                  opacity: 0,
                  y: 20
                }}
                animate={{
                  opacity: 1,
                  y: 0
                }}
                transition={{
                  delay: index * 0.1
                }}
              >

                <GlassCard
                  glow
                  hover
                  className="stat-card"
                >

                  <div
                    className="stat-icon"
                    style={{
                      background: `${stat.color}20`,
                      color: stat.color
                    }}
                  >
                    {stat.icon}
                  </div>

                  <div className="stat-info">

                    <span className="stat-value">
                      {loading
                        ? '...'
                        : stat.value}
                    </span>

                    <span className="stat-label">
                      {stat.label}
                    </span>

                  </div>

                </GlassCard>

              </motion.div>

            ))}

          </div>

          {/* MAIN DASHBOARD GRID */}

          <div className="dashboard-grid admin-grid">

            {/* SYSTEM LOGS */}

            <motion.div
              className="chart-section"
              initial={{
                opacity: 0,
                x: -20
              }}
              animate={{
                opacity: 1,
                x: 0
              }}
              transition={{
                delay: 0.4
              }}
            >

              <GlassCard className="chart-card">

                <h3>
                  System Logs
                </h3>

                <div className="system-logs">

                  {systemLogs.length === 0 ? (

                    <div className="no-data">
                      No logs yet
                    </div>

                  ) : (

                    systemLogs.map(log => (

                      <div
                        key={log.id}
                        className="log-item"
                      >

                        <div className="log-info">

                          <span className="log-action">
                            {log.action || 'System Activity'}
                          </span>

                          <span className="log-user">
                            {log.user || 'System'}
                          </span>

                        </div>

                        <span className="log-time">
                          {log.time || 'Just now'}
                        </span>

                      </div>

                    ))

                  )}

                </div>

              </GlassCard>

            </motion.div>

            {/* ADMIN CONTROLS */}

            <motion.div
              className="recent-section"
              initial={{
                opacity: 0,
                x: 20
              }}
              animate={{
                opacity: 1,
                x: 0
              }}
              transition={{
                delay: 0.5
              }}
            >

              <GlassCard className="recent-card">

                <h3>
                  Admin Controls
                </h3>

                <div className="admin-controls">

                  <Link
                    to="/admin-dashboard/users"
                    className="control-item"
                  >
                    <FaUsers />
                    <span>User Management</span>
                    <span className="control-count">
                      {stats.users}
                    </span>
                  </Link>

                  <Link
                    to="/admin-dashboard/judges"
                    className="control-item"
                  >
                    <FaGavel />
                    <span>Judge Management</span>
                    <span className="control-count">
                      {stats.judges}
                    </span>
                  </Link>

                  <Link
                    to="/admin-dashboard/clerks"
                    className="control-item"
                  >
                    <FaUserTie />
                    <span>Clerk Management</span>
                    <span className="control-count">
                      {stats.clerks}
                    </span>
                  </Link>

                  <Link
                    to="/admin-dashboard/admins"
                    className="control-item"
                  >
                    <FaUserCog />
                    <span>Admin Management</span>
                    <span className="control-count">
                      Manage
                    </span>
                  </Link>

                  <Link
                    to="/admin-dashboard/cases"
                    className="control-item"
                  >
                    <FaFileAlt />
                    <span>Case Management</span>
                    <span className="control-count">
                      {stats.cases}
                    </span>
                  </Link>

                  <Link
  to="/admin-dashboard/ai-recommendations"
  className="control-item"
  onClick={closeSidebar}
  style={{
    display: 'block',
    width: '100%',
    fontFamily: 'inherit',
    textAlign: 'left',
    textDecoration: 'none'
  }}
>
  <FaRobot />
  AI Recommendations
</Link>
                    

                  <Link
                    to="/admin-dashboard/blockchain"
                    className="control-item"
                  >
                    <FaDatabase />
                    <span>Blockchain Ledger</span>
                    <span className="control-count">
                      {stats.blockchainBlocks}
                    </span>
                  </Link>

                  <Link
                    to="/admin-dashboard/audit"
                    className="control-item"
                  >
                    <FaShieldAlt />
                    <span>Audit Trails</span>
                    <span className="control-count">
                      Active
                    </span>
                  </Link>

                  <Link
                    to="/admin-dashboard/settings"
                    className="control-item"
                  >
                    <FaCog />
                    <span>Settings</span>
                    <span className="control-count">
                      Manage
                    </span>
                  </Link>

                </div>

              </GlassCard>

            </motion.div>

          </div>

         

        </main>

      </div>
    </>
  );
};

export default AdminDashboard;
