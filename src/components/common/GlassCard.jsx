import React from 'react';
import './GlassCard.css';

const GlassCard = ({ 
  children, 
  className = '', 
  glow = false,
  hover = true,
  dark = false,
  onClick,
  style
}) => {
  const classes = [
    'glass-card',
    dark ? 'glass-card-dark' : '',
    glow ? 'glass-card-glow' : '',
    hover ? 'glass-card-hover' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div 
      className={classes} 
      onClick={onClick}
      style={style}
    >
      {children}
    </div>
  );
};


export default GlassCard;
