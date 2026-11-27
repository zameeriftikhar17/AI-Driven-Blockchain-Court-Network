import React from 'react';
import { Helmet } from 'react-helmet-async';
import Hero from '../components/landing/Hero';
import Features from '../components/landing/Features';
import About from '../components/landing/About';

const Home = () => {
  return (
    <>
      <Helmet>
        <title>CourtNetwork - AI-Driven Blockchain Justice System</title>
        <meta name="description" content="Revolutionizing the judicial system with AI and Blockchain technology" />
      </Helmet>
      <div className="home-page">
        <Hero />
        <Features />
        <About />
      </div>
    </>
  );
};

export default Home;