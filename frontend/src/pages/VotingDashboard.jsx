import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Plus } from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import StatisticsPanel from '../components/dashboard/StatisticsPanel';
import ElectionCard from '../components/dashboard/ElectionCard';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import useElections from '../hooks/useElections';
import { timeRemaining } from '../utils/dateUtils';

const VotingDashboard = () => {
  const navigate = useNavigate();
  const { 
    activeElections, 
    upcomingElections, 
    refreshElections, 
    isLoading, 
    error 
  } = useElections();
  
  // Refresh elections on component mount
  useEffect(() => {
    refreshElections();
  }, [refreshElections]);
  
  // Navigate to voting page
  const handleVoteClick = (election) => {
    navigate(`/vote/${election.id}`);
  };
  
  // Navigate to create election page
  const handleCreateElection = () => {
    navigate('/create-election');
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
  
  return (
    <DashboardLayout>
      {/* Statistics Panel */}
      <StatisticsPanel />
      
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
      
      {/* Recent Voting Activity */}
      <div className="mt-8">
        <h2 className="text-xl font-bold text-gray-800 mb-6">Your Recent Activity</h2>
        
        <Card>
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
            
            {activeElections.length === 0 && (
              <div className="py-6 text-center">
                <p className="text-gray-500">No recent activity to display</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default VotingDashboard;