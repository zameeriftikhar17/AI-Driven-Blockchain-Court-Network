import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FaArrowRight,
  FaPlay
} from 'react-icons/fa';
import './Hero.css';

const Hero = () => {
  const stats = [
    { number: '10K+', label: 'Cases Filed' },
    { number: '95%', label: 'Transparency' },
    { number: '4.8', label: 'User Rating' },
    { number: '99.9%', label: 'Data Security' }
  ];

  return (
    <section className="hero-section">

      {/* Background */}
      <div className="hero-background">
        <div className="hero-particles"></div>
        <div className="hero-gradient"></div>
      </div>

      <div className="hero-container">

        {/* LEFT CONTENT */}
        <motion.div
          className="hero-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        >

          {/* Badge */}
          <motion.div
            className="hero-badge"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <span className="badge-icon">⚖️</span>
            AI-Blockchain Powered Justice System
          </motion.div>

          {/* Title */}
          <motion.h1
            className="hero-title"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            Revolutionizing Justice with
            <span className="gradient-text">
              {' '}AI & Blockchain
            </span>
          </motion.h1>

          {/* Description */}
          <motion.p
            className="hero-description"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            Experience the future of judicial systems with our cutting-edge
            AI-driven blockchain court network. Transparent, efficient, and
            secure justice delivery for every citizen.
          </motion.p>

          {/* Buttons */}
          <motion.div
            className="hero-buttons"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            <Link
              to="/register"
              className="btn-primary-hero"
            >
              Get Started
              <FaArrowRight />
            </Link>

            <Link
              to="/case-tracking"
              className="btn-secondary-hero"
            >
              <FaPlay className="btn-play" />
              Track Case
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            className="hero-stats"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.8 }}
          >
            {stats.map((stat, index) => (
              <div
                key={index}
                className="stat-item"
              >
                <motion.span
                  className="stat-number"
                  initial={{
                    opacity: 0,
                    scale: 0.5
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1
                  }}
                  transition={{
                    delay: 0.8 + index * 0.1
                  }}
                >
                  {stat.number}
                </motion.span>

                <span className="stat-label">
                  {stat.label}
                </span>
              </div>
            ))}
          </motion.div>

        </motion.div>

        {/* RIGHT SIDE - ONLY CIRCLE LOGO */}
        <motion.div
          className="hero-visual"
          initial={{
            opacity: 0,
            x: 50
          }}
          animate={{
            opacity: 1,
            x: 0
          }}
          transition={{
            delay: 0.5,
            duration: 0.8
          }}
        >

          <div className="hero-logo-circle">
            <img
              src="https://static.vecteezy.com/system/resources/previews/050/035/745/non_2x/law-icon-legal-safety-logo-illustration-free-vector.jpg"
              alt="Law and Justice"
            />
          </div>

        </motion.div>

      </div>
    </section>
  );
};

export default Hero;