import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FaArrowLeft,
  FaCog,
  FaBell,
  FaRobot,
  FaDatabase,
  FaShieldAlt,
  FaSave
} from 'react-icons/fa';
import { ref, onValue, off, update } from "firebase/database";
import { auth, db } from "../../../firebase";

const AdminSettings = () => {
  const [settings, setSettings] = useState({
    systemName: 'AI Driven Block Chain Court Network',
    emailNotifications: true,
    aiApproval: true,
    blockchainVerification: true,
    maintenanceMode: false
  });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const settingsRef = ref(db, 'adminSettings');
    const unsubscribe = onValue(settingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setSettings((prev) => ({ ...prev, ...data }));
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching settings:', error);
      setLoading(false);
    });
    return () => off(settingsRef);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
    setSaved(false);
  };

  const handleToggle = (name) => {
    setSettings((prev) => ({ ...prev, [name]: !prev[name] }));
    setSaved(false);
  };

  const handleSave = async () => {
    try {
      await update(ref(db, 'adminSettings'), settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('Error saving settings:', err);
      alert('Failed to save settings. Please try again.');
    }
  };

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
        .admin-settings-page {
          min-height: 100vh;
          padding: 2rem;
          background: linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 50%, #90CAF9 100%);
          animation: gradientShift 12s ease-in-out infinite alternate;
        }
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .admin-settings-header {
          margin-bottom: 2rem;
          background: rgba(255,255,255,0.7);
          backdrop-filter: blur(10px);
          padding: 1.5rem 2rem;
          border-radius: var(--radius);
          box-shadow: var(--shadow);
        }
        .back-button {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--black);
          text-decoration: none;
          font-weight: 500;
          transition: 0.3s;
          margin-bottom: 0.5rem;
        }
        .back-button:hover {
          color: var(--sky-dark);
          transform: translateX(-4px);
        }
        .settings-heading {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .settings-heading-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          background: rgba(79,195,247,0.15);
          border-radius: 50%;
          color: var(--sky-dark);
          font-size: 1.5rem;
        }
        .settings-heading h1 {
          font-size: 2.2rem;
          font-weight: 800;
          color: var(--black);
          margin: 0;
        }
        .settings-heading p {
          color: var(--gray);
          margin: 0;
        }
        .settings-container {
          max-width: 900px;
          margin: 0 auto;
        }
        .settings-card {
          background: rgba(255,255,255,0.85);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.9);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          padding: 1.5rem 2rem;
          margin-bottom: 1.5rem;
        }
        .settings-card-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .settings-card-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          background: rgba(79,195,247,0.1);
          border-radius: 50%;
          color: var(--sky-dark);
          font-size: 1.2rem;
        }
        .settings-card-header h2 {
          font-size: 1.2rem;
          font-weight: 700;
          color: var(--black);
          margin: 0;
        }
        .settings-card-header p {
          color: var(--gray);
          margin: 0;
        }
        .settings-form-group {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }
        .settings-form-group label {
          font-weight: 600;
          color: var(--black);
          font-size: 0.9rem;
        }
        .settings-form-group input {
          padding: 0.6rem 0.8rem;
          border: 2px solid #D1E8F5;
          border-radius: 8px;
          font-size: 0.95rem;
          transition: 0.3s;
          background: var(--white);
        }
        .settings-form-group input:focus {
          outline: none;
          border-color: var(--sky);
          box-shadow: 0 0 0 4px rgba(79,195,247,0.2);
        }
        .setting-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.8rem 0;
          border-bottom: 1px solid rgba(0,0,0,0.04);
        }
        .setting-row:last-child {
          border-bottom: none;
        }
        .setting-row div {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }
        .setting-row strong {
          color: var(--black);
          font-size: 1rem;
        }
        .setting-row span {
          color: var(--gray);
          font-size: 0.85rem;
        }
        .setting-toggle {
          width: 48px;
          height: 26px;
          border: none;
          border-radius: 50px;
          background: #ccc;
          cursor: pointer;
          transition: 0.3s;
          position: relative;
          flex-shrink: 0;
        }
        .setting-toggle span {
          display: block;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          position: absolute;
          top: 3px;
          left: 3px;
          transition: 0.3s;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .setting-toggle.active {
          background: var(--sky-dark);
        }
        .setting-toggle.active span {
          left: 25px;
        }
        .settings-save-area {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 1rem;
          margin-top: 1rem;
        }
        .settings-saved {
          color: #00E676;
          font-weight: 600;
          font-size: 0.95rem;
        }
        .settings-save-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.7rem 1.8rem;
          background: linear-gradient(135deg, var(--sky), var(--sky-dark));
          border: none;
          border-radius: 50px;
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: 0.3s;
          box-shadow: 0 4px 15px rgba(79,195,247,0.3);
        }
        .settings-save-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(2,136,209,0.4);
        }
        @media (max-width: 768px) {
          .admin-settings-page {
            padding: 1rem;
          }
          .admin-settings-header {
            padding: 1rem;
          }
          .settings-heading h1 {
            font-size: 1.8rem;
          }
          .settings-card {
            padding: 1rem;
          }
          .setting-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }
          .settings-save-area {
            flex-direction: column;
            align-items: stretch;
          }
          .settings-save-btn {
            justify-content: center;
          }
        }
      `}</style>

      <div className="admin-settings-page">
        <div className="admin-settings-header">
          <Link to="/admin-dashboard" className="back-button">
            <FaArrowLeft /> Back to Dashboard
          </Link>
          <div className="settings-heading">
            <div className="settings-heading-icon">
              <FaCog />
            </div>
            <div>
              <h1>Admin Settings</h1>
              <p>Configure and manage system settings</p>
            </div>
          </div>
        </div>

        <div className="settings-container">
          {loading ? (
            <div className="settings-card" style={{ textAlign: 'center', padding: '2rem' }}>
              <p>Loading settings...</p>
            </div>
          ) : (
            <>
              <div className="settings-card">
                <div className="settings-card-header">
                  <div className="settings-card-icon"><FaCog /></div>
                  <div>
                    <h2>General Settings</h2>
                    <p>Basic system configuration</p>
                  </div>
                </div>
                <div className="settings-form-group">
                  <label>System Name</label>
                  <input
                    type="text"
                    name="systemName"
                    value={settings.systemName}
                    onChange={handleChange}
                    placeholder="Enter system name"
                  />
                </div>
              </div>

              <div className="settings-card">
                <div className="settings-card-header">
                  <div className="settings-card-icon"><FaBell /></div>
                  <div>
                    <h2>Notifications</h2>
                    <p>Manage system notification settings</p>
                  </div>
                </div>
                <div className="setting-row">
                  <div>
                    <strong>Email Notifications</strong>
                    <span>Enable important system notifications</span>
                  </div>
                  <button
                    type="button"
                    className={`setting-toggle ${settings.emailNotifications ? 'active' : ''}`}
                    onClick={() => handleToggle('emailNotifications')}
                  >
                    <span />
                  </button>
                </div>
              </div>

              <div className="settings-card">
                <div className="settings-card-header">
                  <div className="settings-card-icon"><FaRobot /></div>
                  <div>
                    <h2>AI Configuration</h2>
                    <p>Manage AI recommendation workflow</p>
                  </div>
                </div>
                <div className="setting-row">
                  <div>
                    <strong>Admin Approval Required</strong>
                    <span>AI recommendations require Admin approval before becoming final</span>
                  </div>
                  <button
                    type="button"
                    className={`setting-toggle ${settings.aiApproval ? 'active' : ''}`}
                    onClick={() => handleToggle('aiApproval')}
                  >
                    <span />
                  </button>
                </div>
              </div>

              <div className="settings-card">
                <div className="settings-card-header">
                  <div className="settings-card-icon"><FaDatabase /></div>
                  <div>
                    <h2>Blockchain</h2>
                    <p>Manage blockchain verification</p>
                  </div>
                </div>
                <div className="setting-row">
                  <div>
                    <strong>Automatic Verification</strong>
                    <span>Verify important records on the blockchain</span>
                  </div>
                  <button
                    type="button"
                    className={`setting-toggle ${settings.blockchainVerification ? 'active' : ''}`}
                    onClick={() => handleToggle('blockchainVerification')}
                  >
                    <span />
                  </button>
                </div>
              </div>

              <div className="settings-card">
                <div className="settings-card-header">
                  <div className="settings-card-icon"><FaShieldAlt /></div>
                  <div>
                    <h2>System Security</h2>
                    <p>Control system maintenance mode</p>
                  </div>
                </div>
                <div className="setting-row">
                  <div>
                    <strong>Maintenance Mode</strong>
                    <span>Temporarily restrict normal system access</span>
                  </div>
                  <button
                    type="button"
                    className={`setting-toggle ${settings.maintenanceMode ? 'active' : ''}`}
                    onClick={() => handleToggle('maintenanceMode')}
                  >
                    <span />
                  </button>
                </div>
              </div>

              <div className="settings-save-area">
                {saved && <span className="settings-saved">Settings saved successfully.</span>}
                <button type="button" className="settings-save-btn" onClick={handleSave}>
                  <FaSave /> Save Settings
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default AdminSettings;