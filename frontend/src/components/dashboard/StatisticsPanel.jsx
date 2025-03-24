import React from 'react';
import { BarChart3, Users, Check, Calendar } from 'lucide-react';
import useElections  from '../../hooks/useElections';
import { formatPercentage } from '../../utils/formatters';

/**
 * Dashboard statistics panel component
 * Shows summary statistics for elections and votes
 */
const StatisticsPanel = () => {
  const { 
    activeElections, 
    completedElections, 
    upcomingElections, 
    allElections, 
    isLoading 
  } = useElections();
  
  // Calculate total votes across all elections
  const totalVotes = allElections.reduce((sum, election) => sum + (election.totalVotes || 0), 0);
  
  // Calculate total voters count
  const totalVoters = allElections.reduce((sum, election) => sum + (election.voterCount || 0), 0);
  
  // Calculate overall participation rate
  const participationRate = totalVoters > 0 ? (totalVotes / totalVoters) * 100 : 0;
  
  // Get total candidates count
  const totalCandidates = allElections.reduce((sum, election) => {
    return sum + (election.candidates ? election.candidates.length : 0);
  }, 0);
  
  // Get most active election
  const getMostActiveElection = () => {
    if (activeElections.length === 0) return null;
    
    return activeElections.reduce((mostActive, current) => {
      const currentParticipation = current.totalVotes / Math.max(1, current.voterCount);
      const mostActiveParticipation = mostActive.totalVotes / Math.max(1, mostActive.voterCount);
      
      return currentParticipation > mostActiveParticipation ? current : mostActive;
    }, activeElections[0]);
  };
  
  const mostActiveElection = getMostActiveElection();
  
  // Skeleton loader for loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-10 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Active Elections Stat */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center mb-3">
          <div className="p-2 bg-indigo-100 rounded-md mr-3">
            <BarChart3 size={20} className="text-indigo-600" />
          </div>
          <h3 className="text-sm font-medium text-gray-500">Active Elections</h3>
        </div>
        <div className="flex items-end justify-between">
          <div className="text-3xl font-bold text-gray-900">{activeElections.length}</div>
          {activeElections.length > 0 && (
            <div className="text-sm text-green-600 flex items-center">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1"></span>
              In Progress
            </div>
          )}
        </div>
        {mostActiveElection && (
          <div className="mt-4 text-sm text-gray-500 truncate">
            Most active: {mostActiveElection.title}
          </div>
        )}
      </div>
      
      {/* Total Votes Stat */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center mb-3">
          <div className="p-2 bg-green-100 rounded-md mr-3">
            <Check size={20} className="text-green-600" />
          </div>
          <h3 className="text-sm font-medium text-gray-500">Total Votes</h3>
        </div>
        <div className="flex items-end justify-between">
          <div className="text-3xl font-bold text-gray-900">{totalVotes}</div>
          {totalVotes > 0 && totalVoters > 0 && (
            <div className="text-sm text-gray-600">
              {formatPercentage(participationRate)}% participation
            </div>
          )}
        </div>
        <div className="mt-4 text-sm text-gray-500">
          Across {allElections.length} elections
        </div>
      </div>
      
      {/* Total Candidates Stat */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center mb-3">
          <div className="p-2 bg-blue-100 rounded-md mr-3">
            <Users size={20} className="text-blue-600" />
          </div>
          <h3 className="text-sm font-medium text-gray-500">Candidates</h3>
        </div>
        <div className="flex items-end justify-between">
          <div className="text-3xl font-bold text-gray-900">{totalCandidates}</div>
          {allElections.length > 0 && (
            <div className="text-sm text-gray-600">
              ~{Math.round(totalCandidates / Math.max(1, allElections.length))} per election
            </div>
          )}
        </div>
        <div className="mt-4 text-sm text-gray-500">
          {completedElections.length} elected candidates
        </div>
      </div>
      
      {/* Upcoming Elections Stat */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center mb-3">
          <div className="p-2 bg-yellow-100 rounded-md mr-3">
            <Calendar size={20} className="text-yellow-600" />
          </div>
          <h3 className="text-sm font-medium text-gray-500">Upcoming Elections</h3>
        </div>
        <div className="flex items-end justify-between">
          <div className="text-3xl font-bold text-gray-900">{upcomingElections.length}</div>
          {upcomingElections.length > 0 && (
            <div className="text-sm text-blue-600 flex items-center">
              <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1"></span>
              Scheduled
            </div>
          )}
        </div>
        {upcomingElections.length > 0 && (
          <div className="mt-4 text-sm text-gray-500 truncate">
            Next: {upcomingElections[0].title}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatisticsPanel;