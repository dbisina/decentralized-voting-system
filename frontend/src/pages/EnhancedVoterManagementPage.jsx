import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import EnhancedVoterManagement from '../components/voting/EnhancedVoterManagement';
import useElections from '../hooks/useElections';
import { useWeb3 } from '../contexts/Web3Context';
import { useAuth } from '../contexts/AuthContext';

/**
 * Enhanced Voter Management Page
 * Manages voter registration and access control for elections
 */
const EnhancedVoterManagementPage = () => {
  const { electionId } = useParams();
  const navigate = useNavigate();
  const { account } = useWeb3();
  const { isAdmin } = useAuth();
  const { allElections, refreshElections } = useElections();
  
  const [election, setElection] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Load election data
  useEffect(() => {
    const loadElection = async () => {
      setIsLoading(true);
      
      try {
        if (allElections.length > 0 && electionId) {
          const foundElection = allElections.find(e => e.id === parseInt(electionId));
          
          if (foundElection) {
            setElection(foundElection);
          } else {
            setError(`Election with ID ${electionId} not found.`);
          }
        } else {
          // Refresh elections to get the latest data
          await refreshElections();
        }
      } catch (err) {
        console.error('Error loading election:', err);
        setError('Failed to load election data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadElection();
  }, [allElections, electionId, refreshElections]);
  
  // Check if user is the election admin
  const isElectionAdmin = () => {
    if (!election || !account) return false;
    return election.admin && account.toLowerCase() === election.admin.toLowerCase();
  };
  
  // Render loading state
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Enhanced Voter Management</h1>
          <p className="text-gray-600 mt-1">Loading election data...</p>
        </div>
        
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </DashboardLayout>
    );
  }
  
  // Render error state
  if (error || !election) {
    return (
      <DashboardLayout>
        <div className="mb-6">
          <Button 
            variant="secondary"
            onClick={() => navigate('/manage')}
            className="flex items-center"
          >
            <ArrowLeft size={16} className="mr-1" />
            <span>Back to Management</span>
          </Button>
        </div>
        
        <Card className="bg-red-50 border-red-200">
          <div className="flex items-start">
            <AlertTriangle size={24} className="text-red-600 mr-3 mt-1 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Error Loading Election</h2>
              <p className="text-red-700">{error || 'Election not found'}</p>
              <Button 
                variant="primary"
                className="mt-6"
                onClick={() => navigate('/manage')}
              >
                Return to Management
              </Button>
            </div>
          </div>
        </Card>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <Button 
            variant="secondary"
            onClick={() => navigate('/manage')}
            className="flex items-center"
          >
            <ArrowLeft size={16} className="mr-1" />
            <span>Back to Management</span>
          </Button>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-800 mt-4">Enhanced Voter Management</h1>
        <p className="text-gray-600 mt-1">
          Manage voter access for {election.title}
        </p>
      </div>
      
      <EnhancedVoterManagement 
        election={election}
        isAdmin={isElectionAdmin() || isAdmin()}
        onNavigate={navigate}
      />
    </DashboardLayout>
  );
};

export default EnhancedVoterManagementPage;