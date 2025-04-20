import React from 'react';
import { useNavigate } from 'react-router-dom';
import IntegratedDashboardComponent from '../components/IntegratedDashboard';
import { useAuth } from '../contexts/AuthContext';

/**
 * IntegratedDashboard Page
 * This serves as a wrapper for the IntegratedDashboard component
 * It handles navigation and authentication checks
 */
const IntegratedDashboardPage = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  
  // Check if user is authenticated
  React.useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

  return <IntegratedDashboardComponent />;
};

export default IntegratedDashboardPage;