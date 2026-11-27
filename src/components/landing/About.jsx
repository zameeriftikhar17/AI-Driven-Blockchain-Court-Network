import React from 'react';
import { motion } from 'framer-motion';
import { FaCheckCircle, FaRocket, FaShieldAlt, FaGlobe } from 'react-icons/fa';
import './About.css';

const About = () => {
  const features = [
    {
      
      title: 'Secure & Transparent',
      description: 'Blockchain technology ensures all records are immutable and verifiable.'
    },
    {
      
      title: 'AI-Powered Efficiency',
      description: 'Intelligent algorithms reduce case delays and optimize court workflows.'
    },
    {
    
      title: 'Accessible Justice',
      description: 'Citizens can access case information anytime, anywhere.'
    }
  ];

  return (
    <section className="about-section">
      <div className="about-background">
        <div className="about-gradient"></div>
      </div>
      
      <div className="about-container">
        <motion.div 
          className="about-content"
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <span className="about-badge"> <h1>About Us</h1></span>
          <h2 className="about-title">
            Transforming the Judicial System with <span className="gradient-text">Technology</span>
          </h2>
          <p className="about-text">
            CourtNetwork is a revolutionary AI-driven blockchain court management system 
            designed to modernize the judicial process. By combining artificial intelligence 
            with blockchain technology, we ensure transparency, efficiency, and security in 
            case management.
          </p>

          <div className="about-features">
            {features.map((feature, index) => (
              <motion.div 
                key={index}
                className="about-feature-item"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.2 }}
                viewport={{ once: true }}
              >
                <div className="about-feature-icon">{feature.icon}</div>
                <div className="about-feature-content">
                  <h4>{feature.title}</h4>
                  <p>{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div 
            className="about-mission"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            viewport={{ once: true }}
          >
            <div className="mission-icon"></div>
            <div className="mission-content">
              <h4>Our Mission</h4>
              <p>To make justice accessible, transparent, and efficient for every citizen through innovative technology.</p>
            </div>
          </motion.div>
        </motion.div>

        <motion.div 
          className="about-visual"
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <div className="about-image-wrapper">
            <div className="about-image">
              <div className="about-image-glow"></div>
              <div className="about-image-content">
                <span className="about-image-icon">⚖️</span>
                <h3>Modern Justice System</h3>
                <p>AI + Blockchain = Transparent Justice</p>
                <div className="about-image-stats">
                  <div className="about-stat">
                    <span>10K+</span>
                    <span>Cases</span>
                  </div>
                  <div className="about-stat">
                    <span>95%</span>
                    <span>Satisfaction</span>
                  </div>
                  <div className="about-stat">
                    <span>99.9%</span>
                    <span>Security</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default About;