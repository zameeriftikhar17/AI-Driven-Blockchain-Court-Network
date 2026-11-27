import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaBars,
  FaTimes,
  FaUser,
  FaSignOutAlt,
  FaCrown,
  FaChevronDown,
  FaGavel,
  FaShieldAlt
} from 'react-icons/fa';
import './Navbar.css';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const isAuthenticated = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const closeMenus = () => {
    setIsOpen(false);
    setIsDropdownOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');

    closeMenus();
    navigate('/');
  };

  const navLinks = [
    {
      name: 'Home',
      path: '/'
    },
    {
      name: 'Track Case',
      path: '/case-tracking'
    }
  ];

  const getDashboardPath = () => {
    if (!role) return '/login';

    const roleMap = {
      citizen: '/citizen-dashboard',
      lawyer: '/lawyer-dashboard',
      judge: '/judge-dashboard',
      clerk: '/clerk-dashboard',
      admin: '/admin-dashboard'
    };

    return roleMap[role.toLowerCase()] || '/login';
  };

  return (
    <motion.nav
      className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{
        duration: 0.6,
        type: 'spring'
      }}
    >
      <div className="nav-container">

        {/* LOGO */}
        <Link
          to="/"
          className="nav-logo"
          onClick={closeMenus}
        >
          <span className="logo-icon">
  ⚖️
</span>

          <span className="logo-text">
            AI Driven Block Chain Court{' '}
            <span className="logo-highlight">
              Network
            </span>
          </span>
        </Link>

        {/* NAVIGATION */}
        <div className={`nav-menu ${isOpen ? 'active' : ''}`}>

          {/* LINKS */}
          {navLinks.map((link, index) => (
            <motion.div
              key={index}
              className="nav-item"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: index * 0.1
              }}
            >
              <Link
                to={link.path}
                className={`nav-link ${
                  location.pathname === link.path
                    ? 'active'
                    : ''
                }`}
                onClick={closeMenus}
              >
                {link.name}
              </Link>
            </motion.div>
          ))}

          {/* DASHBOARD */}
          {isAuthenticated && (
            <motion.div
              className="nav-item"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Link
                to={getDashboardPath()}
                className="nav-link btn-dashboard"
                onClick={closeMenus}
              >
                <FaCrown />
                Dashboard
              </Link>
            </motion.div>
          )}

          {/* NOT LOGGED IN */}
          {!isAuthenticated ? (
            <motion.div
              className="nav-actions"
              initial={{
                opacity: 0,
                y: -20
              }}
              animate={{
                opacity: 1,
                y: 0
              }}
              transition={{
                delay: 0.3
              }}
            >
              <Link
                to="/login"
                className="nav-link btn-outline"
                onClick={closeMenus}
              >
                Login
              </Link>

              <Link
                to="/register"
                className="nav-link btn-primary"
                onClick={closeMenus}
              >
                Register
              </Link>
            </motion.div>
          ) : (
            /* LOGGED IN USER */
            <div className="nav-user-dropdown">

              <motion.button
                className="user-btn"
                onClick={() =>
                  setIsDropdownOpen(!isDropdownOpen)
                }
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FaUser />

                <FaChevronDown
                  className={`dropdown-arrow ${
                    isDropdownOpen ? 'open' : ''
                  }`}
                />
              </motion.button>

              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    className="dropdown-menu"
                    initial={{
                      opacity: 0,
                      y: 10,
                      scale: 0.95
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      scale: 1
                    }}
                    exit={{
                      opacity: 0,
                      y: 10,
                      scale: 0.95
                    }}
                    transition={{
                      duration: 0.2
                    }}
                  >

                    <div className="dropdown-header">
                      <span className="dropdown-role">
                        {role}
                      </span>
                    </div>

                    <Link
                      to={getDashboardPath()}
                      onClick={closeMenus}
                    >
                      <FaGavel />
                      Dashboard
                    </Link>

                    <Link
                      to="/case-tracking"
                      onClick={closeMenus}
                    >
                      <FaShieldAlt />
                      Track Case
                    </Link>

                    <button onClick={handleLogout}>
                      <FaSignOutAlt />
                      Logout
                    </button>

                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          )}

        </div>

        {/* MOBILE BUTTON */}
        <motion.button
          className="nav-toggle"
          onClick={() => {
            setIsOpen(!isOpen);
            setIsDropdownOpen(false);
          }}
          whileTap={{ scale: 0.9 }}
          aria-label="Toggle navigation"
        >
          {isOpen ? <FaTimes /> : <FaBars />}
        </motion.button>

      </div>
    </motion.nav>
  );
};

export default Navbar;