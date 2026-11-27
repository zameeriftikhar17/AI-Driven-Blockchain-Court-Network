import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { 
  FaRobot, 
  FaLock, 
  FaChartLine, 
  FaShieldAlt, 
  FaGavel, 
  FaUsers,
  FaBrain,
  FaDatabase,
  FaClock,
  FaGlobe,
  FaCheckCircle,
  FaRocket
} from 'react-icons/fa';
import GlassCard from '../common/GlassCard';
import './Features.css';

const Features = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  const features = [
    {
      icon: <FaBrain />,
      title: 'AI-Powered Analysis',
      description: 'Intelligent case prioritization, duration prediction, and smart judge assignment using advanced machine learning algorithms.',
      color: '#4A6CF7'
    },
    {
      icon: <FaLock />,
      title: 'Blockchain Security',
      description: 'Tamper-proof records with immutable blockchain technology ensuring complete transparency and data integrity.',
      color: '#00D4FF'
    },
    {
      icon: <FaChartLine />,
      title: 'Real-time Tracking',
      description: 'Monitor your case progress in real-time with instant notifications and comprehensive status updates.',
      color: '#FF6B6B'
    },
    {
      icon: <FaShieldAlt />,
      title: 'Secure Evidence',
      description: 'Blockchain-verified evidence storage ensuring authenticity, integrity, and chain of custody.',
      color: '#FF9A56'
    },
    {
      icon: <FaGavel />,
      title: 'Smart Case Management',
      description: 'Efficient case filing, scheduling, and management with automated workflows and intelligent routing.',
      color: '#7C4DFF'
    },
    {
      icon: <FaUsers />,
      title: 'Multi-Role Access',
      description: 'Dedicated dashboards for citizens, lawyers, judges, clerks, and administrators with role-based access.',
      color: '#FF4081'
    },
    {
      icon: <FaClock />,
      title: 'Reduced Delays',
      description: 'AI-driven scheduling and prioritization significantly reducing case backlog and waiting times.',
      color: '#00E676'
    },
    {
      icon: <FaDatabase />,
      title: 'Secure Data Storage',
      description: 'Enterprise-grade database with encryption and blockchain backup for maximum security.',
      color: '#FFD740'
    }
  ];

  return (
    <section className="features-section" ref={ref}>
      <div className="features-background">
        <div className="features-gradient"></div>
      </div>
      
      <div className="features-container">
        <motion.div 
          className="features-header"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span className="features-badge"><h1>Features</h1></span>
          <h2 className="features-title">
            Why Choose <span className="gradient-text">CourtNetwork</span>
          </h2>
          <p className="features-subtitle">
            Discover how our AI-driven blockchain court network transforms the judicial system
            with cutting-edge technology and innovative solutions.
          </p>
        </motion.div>

        <div className="features-grid">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              className="feature-item"
              initial={{ opacity: 0, y: 50 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <GlassCard glow hover className="feature-card">
                <div className="feature-icon-wrapper" style={{ background: `${feature.color}20` }}>
                  <div className="feature-icon" style={{ color: feature.color }}>
                    {feature.icon}
                  </div>
                </div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
               
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;