import React from "react";
import { Link, useLocation } from "react-router-dom";
import { FaHome, FaHistory, FaSignOutAlt } from "react-icons/fa";

const Navbar = ({ user, onLogout }) => {
  const location = useLocation();
  
  return (
    <nav className="bg-gray-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <span className="font-bold text-xl">NATO Intel</span>
            
            <div className="ml-10 flex items-center space-x-4">
              <Link 
                to="/" 
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                  location.pathname === '/' 
                    ? 'bg-gray-900 text-white' 
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <FaHome className="mr-2" />
                Home
              </Link>
              
              <Link 
                to="/history" 
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                  location.pathname === '/history' 
                    ? 'bg-gray-900 text-white' 
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <FaHistory className="mr-2" />
                History
              </Link>
            </div>
          </div>
          
          <div className="flex items-center">
            <span className="text-sm mr-4">
              Welcome, {user?.username || 'User'}
            </span>
            
            <button 
              onClick={onLogout}
              className="flex items-center bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm font-medium"
            >
              <FaSignOutAlt className="mr-2" />
              Log out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
