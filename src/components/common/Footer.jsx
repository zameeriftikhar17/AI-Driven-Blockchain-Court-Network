import React from 'react';
import { Link } from 'react-router-dom';
import { FaFacebook, FaTwitter, FaLinkedin, FaGithub, FaYoutube, FaInstagram } from 'react-icons/fa';
import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-background">
        <div className="footer-gradient"></div>
      </div>
      
      <div className="footer-container">
        <div className="footer-grid">
          <div className="footer-section">
            <div className="footer-logo">
              <span className="logo-icon">⚖️</span>
              <span className="logo-text">Court<span className="logo-highlight">Network</span></span>
            </div>
            <p className="footer-description">
              Revolutionizing the judicial system with AI and Blockchain technology. 
              Transparent, efficient, and secure justice for every citizen.
            </p>
            <div className="footer-social">
              <a href="#" className="social-link"><FaFacebook /></a>
              <a href="#" className="social-link"><FaTwitter /></a>
              <a href="#" className="social-link"><FaLinkedin /></a>
              <a href="#" className="social-link"><FaGithub /></a>
              <a href="#" className="social-link"><FaYoutube /></a>
              <a href="#" className="social-link"><FaInstagram /></a>
            </div>
          </div>

          <div className="footer-section">
            <h4>Quick Links</h4>
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/case-tracking">Track Case</Link></li>
              <li><Link to="/login">Login</Link></li>
              <li><Link to="/register">Register</Link></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>Resources</h4>
            <ul>
              <li><a href="#">About Us</a></li>
              <li><a href="#">Contact</a></li>
              <li><a href="#">Privacy Policy</a></li>
              <li><a href="#">Terms of Service</a></li>
              <li><a href="#">Help Center</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>Contact Info</h4>
            <ul className="contact-info">
              <li>
                <span className="contact-icon">📍</span>
                <span>University of Sialkot, Pakistan</span>
              </li>
              <li>
                <span className="contact-icon">📧</span>
                <span>info@courtnetwork.com</span>
              </li>
              <li>
                <span className="contact-icon">📞</span>
                <span>+92 300 1234567</span>
              </li>
              <li>
                <span className="contact-icon">🕐</span>
                <span>Mon-Fri: 9:00 AM - 5:00 PM</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-bottom-content">
            <p>&copy; {currentYear} CourtNetwork. All rights reserved.</p>
            <div className="footer-bottom-links">
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
              <a href="#">Cookies</a>
              <a href="#">Sitemap</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;