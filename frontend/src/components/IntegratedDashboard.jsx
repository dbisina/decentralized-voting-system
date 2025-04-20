import React, { useState, useEffect } from 'react';
import { 
  Vote, Shield, Users, ChevronRight, Settings, List, 
  Clock, CheckSquare, AlertTriangle, Award, Plus 
} from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import StatisticsPanel from './dashboard/StatisticsPanel';
import ElectionCard from './dashboard/ElectionCard';
import Button from './common/Button';
import Card from './common/Card';
import useElections from '../hooks/useElections';
import { timeRemaining } from '../utils/dateUtils';
import { useWeb3 } from '../contexts/Web3Context';
import { useAuth } from '../contexts/AuthContext';
import { useVoterRegistration } from '../contexts/VoterRegistrationContext';

const IntegratedDashboard = () => {
  const { account, networkId } = useWeb3();
  const { user, isAdmin } = useAuth();
  const { 
    activeElections, 
    upcomingElections, 
    refreshElections, 
    isLoading, 
    error 
  } = useElections();
  const { 
    universalAccess, 
    toggleUniversalAccess 
  } = useVoterRegistration();
  
  const [viewMode, setViewMode] = useState('standard'); // 'standard' or 'enhanced'
  
  // Refresh elections on component mount
  useEffect(() => {
    refreshElections();
  }, [refreshElections]);
  
  // Navigate to voting page
  const handleVoteClick = (election) => {
    window.location.href = `/vote/${election.id}`;
  };
  
  // Navigate to create election page
  const handleCreateElection = () => {
    window.location.href = '/create-election';
  };
  
  // Toggle between standard and enhanced view modes
  const toggleViewMode = () => {
    setViewMode(viewMode === 'standard' ? 'enhanced' : 'standard');
  };

  // Navigate to admin dashboard
  const goToAdminDashboard = () => {
    window.location.href = '/admin-dashboard';
  };
  
  // Navigate to other pages
  const navigateTo = (path) => {
    window.location.href = path;
  };
  
  // Render skeleton loaders during loading state
  const renderSkeletons = (count = 2) => {
    return Array.from({ length: count }).map((_, index) => (
      <div key={index} className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
        <div className="flex justify-between items-center mb-4">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        </div>
        <div className="h-2 bg-gray-200 rounded w-full mb-6"></div>
        <div className="flex justify-end">
          <div className="h-8 bg-gray-200 rounded w-24"></div>
        </div>
      </div>
    ));
  };
  
  // Render access control panel for admins
  const renderAccessControlPanel = () => {
    if (!isAdmin()) return null;
    
    return (
      <Card className="mb-6 bg-indigo-50 border-indigo-200">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h3 className="font-bold text-indigo-800 mb-1">Administration Controls</h3>
            <p className="text-indigo-600 text-sm">
              Manage elections, voters, and system settings
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={goToAdminDashboard}
              className="flex items-center"
            >
              <Shield size={16} className="mr-1" />
              Admin Dashboard
            </Button>
            <Button
              variant={viewMode === 'enhanced' ? 'primary' : 'secondary'}
              onClick={toggleViewMode}
              className="flex items-center"
            >
              <Settings size={16} className="mr-1" />
              {viewMode === 'standard' ? 'Enhanced Mode' : 'Standard Mode'}
            </Button>
          </div>
        </div>
      </Card>
    );
  };
  
  // Render developer mode toggle in development environment
  const renderDevControls = () => {
    if (process.env.NODE_ENV !== 'development') return null;
    
    return (
      <Card className="mb-6 bg-yellow-50 border-yellow-200">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h3 className="font-bold text-yellow-800 mb-1">Development Mode</h3>
            <p className="text-yellow-600 text-sm">
              {universalAccess 
                ? "Universal access is enabled - all elections are accessible" 
                : "Standard access control is active"}
            </p>
          </div>
          <Button
            variant={universalAccess ? "danger" : "warning"}
            onClick={toggleUniversalAccess}
          >
            {universalAccess ? "Disable Universal Access" : "Enable Universal Access"}
          </Button>
        </div>
      </Card>
    );
  };
  
  // Render the quick actions panel
  const renderQuickActions = () => {
    return (
      <Card className="mb-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <Button
            variant="outline"
            onClick={() => navigateTo('/create-election')}
            className="flex items-center justify-center h-12"
          >
            <Plus size={18} className="mr-2" />
            Create Election
          </Button>
          
          <Button
            variant="outline"
            onClick={() => navigateTo('/manage')}
            className="flex items-center justify-center h-12"
          >
            <List size={18} className="mr-2" />
            Manage Elections
          </Button>
          
          <Button
            variant="outline"
            onClick={() => navigateTo('/profile')}
            className="flex items-center justify-center h-12"
          >
            <Users size={18} className="mr-2" />
            Manage Profile
          </Button>
        </div>
      </Card>
    );
  };
  
  // Render enhanced view
  const renderEnhancedView = () => {
    return (
      <>
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="flex flex-col items-center justify-center p-6 text-center">
            <Vote size={36} className="text-indigo-600 mb-4" />
            <h3 className="text-lg font-bold text-gray-800 mb-2">Cast Your Vote</h3>
            <p className="text-gray-600 mb-4">Participate in active elections</p>
            <Button
              variant="primary"
              onClick={() => navigateTo('/dashboard')}
              className="mt-auto"
            >
              View Active Elections
            </Button>
          </Card>
          
          <Card className="flex flex-col items-center justify-center p-6 text-center">
            <CheckSquare size={36} className="text-green-600 mb-4" />
            <h3 className="text-lg font-bold text-gray-800 mb-2">Verify Registration</h3>
            <p className="text-gray-600 mb-4">Check your voter status for upcoming elections</p>
            <Button
              variant="primary"
              onClick={() => navigateTo('/register-vote')}
              className="mt-auto"
            >
              Registration Status
            </Button>
          </Card>
          
          <Card className="flex flex-col items-center justify-center p-6 text-center">
            <Award size={36} className="text-blue-600 mb-4" />
            <h3 className="text-lg font-bold text-gray-800 mb-2">View Results</h3>
            <p className="text-gray-600 mb-4">See outcomes of past elections</p>
            <Button
              variant="primary"
              onClick={() => navigateTo('/manage')}
              className="mt-auto"
            >
              Election Results
            </Button>
          </Card>
        </div>
        
        {/* Recent Activity */}
        <Card>
          <h2 className="text-lg font-bold text-gray-800 mb-4">Recent Activity</h2>
          
          {activeElections.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {activeElections.slice(0, 3).map(election => (
                <div key={election.id} className="py-4 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-medium text-gray-800">{election.title}</h3>
                    <div className="text-sm text-gray-500">
                      {election.hasVoted ? 'You have voted in this election' : 'You have not voted yet'}
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Clock size={16} className="text-indigo-500 mr-1" />
                    <span className="text-sm text-indigo-600 font-medium">
                      {timeRemaining(election.endTime)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-gray-500">
              <p>No recent activity to display</p>
              <Button
                variant="primary"
                onClick={handleCreateElection}
                className="mt-4 flex items-center mx-auto"
              >
                <Plus size={16} className="mr-1" />
                Create Election
              </Button>
            </div>
          )}
        </Card>
      </>
    );
  };
  
  // Render standard view
  const renderStandardView = () => {
    return (
      <>
        {/* Active Elections */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">Active Elections</h2>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateElection}
              className="flex items-center"
            >
              <Plus size={16} className="mr-1" />
              Create Election
            </Button>
          </div>
          
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderSkeletons(2)}
            </div>
          ) : error ? (
            <Card className="bg-red-50 border-red-200">
              <p className="text-red-600">{error}</p>
              <Button 
                variant="secondary" 
                className="mt-4" 
                onClick={refreshElections}
              >
                Retry
              </Button>
            </Card>
          ) : activeElections.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeElections.map(election => (
                <ElectionCard
                  key={election.id}
                  election={election}
                  onVoteClick={handleVoteClick}
                />
              ))}
            </div>
          ) : (
            <Card>
              <div className="text-center py-8">
                <h3 className="text-lg font-medium text-gray-800 mb-2">No Active Elections</h3>
                <p className="text-gray-600 mb-4">
                  There are currently no active elections available for voting.
                </p>
                <Button 
                  variant="primary"
                  onClick={handleCreateElection}
                  className="flex items-center mx-auto"
                >
                  <Plus size={16} className="mr-1" />
                  Create an Election
                </Button>
              </div>
            </Card>
          )}
        </div>
        
        {/* Upcoming Elections */}
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-6">Upcoming Elections</h2>
          
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderSkeletons(1)}
            </div>
          ) : error ? (
            null // Already shown error above
          ) : upcomingElections.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {upcomingElections.map(election => (
                <ElectionCard
                  key={election.id}
                  election={election}
                  showActions={false}
                />
              ))}
            </div>
          ) : (
            <Card>
              <div className="text-center py-8">
                <h3 className="text-lg font-medium text-gray-800 mb-2">No Upcoming Elections</h3>
                <p className="text-gray-600">
                  There are no upcoming elections scheduled at this time.
                </p>
              </div>
            </Card>
          )}
        </div>
      </>
    );
  };
  
  return (
    <DashboardLayout>
      {/* Admin Controls (if user is admin) */}
      {renderAccessControlPanel()}
      
      {/* Dev Controls (only in development mode) */}
      {process.env.NODE_ENV === 'development' && renderDevControls()}
      
      {/* Statistics Panel */}
      <StatisticsPanel />
      
      {/* Quick Actions */}
      {renderQuickActions()}
      
      {/* Main Content - Toggle between enhanced and standard view */}
      {viewMode === 'enhanced' ? renderEnhancedView() : renderStandardView()}
    </DashboardLayout>
  );
};

export default IntegratedDashboard;