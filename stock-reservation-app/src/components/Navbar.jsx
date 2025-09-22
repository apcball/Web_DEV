import React from 'react';

const Navbar = ({ isAdminView, toggleAdminView, toggleStockView }) => {
  return (
    <nav className="main-nav">
      <button 
        className={`nav-btn ${!isAdminView ? 'active' : ''}`}
        onClick={toggleStockView}
      >
        Stock View
      </button>
      <button 
        className={`nav-btn ${isAdminView ? 'active' : ''}`}
        onClick={toggleAdminView}
      >
        Admin Dashboard
      </button>
    </nav>
  );
};

export default Navbar;