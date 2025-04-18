import React, { useEffect, useState, useCallback } from 'react';
import { BarChart3, Users, Check, Calendar } from 'lucide-react';
import useElections from '../../hooks/useElections';
import { useVoterRegistration } from '../../contexts/VoterRegistrationContext';
import { useWeb3 } from '../../contexts/Web3Context';
import { formatPercentage } from '../../utils/formatters';

/**
 * Dashboard statistics panel component
 * Shows personalized statistics for the current user's elections and votes
 */
const StatisticsPanel = () => {
  const { 
    allElections, 
    isLoading: electionsLoading 
  } = useElections();
  
  const { 
    isRegisteredForElection, 
    isLoading: registrationLoading 
  } = useVoterRegistration();
  
  const { account } = useWeb3();
  
  const [userStats, setUserStats] = useState({
    activeElections: [],
    completedElections: [],
    upcomingElections: [],
    userVoteCount: 0,
    userCandidateCount: 0,
    mostActiveElection: null
  });
  
  // Memoize the function to avoid re-creation on every render
  const calculateStats = useCallback(() => {
    if (electionsLoading || registrationLoading || !account || !Array.isArray(allElections)) {
      return null;
    }

    // Filter elections that the user is registered for or is the admin of
    const userActiveElections = allElections.filter(election => 
      (isRegisteredForElection(election.id) || 
       (election.admin && election.admin.toLowerCase() === account.toLowerCase())) && 
      election.status === 'active'
    );
    
    const userCompletedElections = allElections.filter(election => 
      (isRegisteredForElection(election.id) || 
       (election.admin && election.admin.toLowerCase() === account.toLowerCase())) && 
      (election.status === 'completed' || election.status === 'ended')
    );
    
    const userUpcomingElections = allElections.filter(election => 
      (isRegisteredForElection(election.id) || 
       (election.admin && election.admin.toLowerCase() === account.toLowerCase())) && 
      election.status === 'upcoming'
    );
    
    // Count user's personal votes
    let userVoteCount = 0;
    
    userActiveElections.concat(userCompletedElections).forEach(election => {
      if (election.hasVoted) {
        userVoteCount++;
      }
    });
    
    // Count candidates in elections the user created
    const userCreatedElections = allElections.filter(
      election => election.admin && election.admin.toLowerCase() === account.toLowerCase()
    );
    
    let userCandidateCount = 0;
    userCreatedElections.forEach(election => {
      userCandidateCount += (election.candidates?.length || 0);
    });
    
    // Find most active election among user's elections
    let mostActiveElection = null;
    let highestParticipation = 0;
    
    userActiveElections.forEach(election => {
      const participation = election.totalVotes / Math.max(1, election.voterCount || 0);
      if (participation > highestParticipation) {
        highestParticipation = participation;
        mostActiveElection = election;
      }
    });
    
    return {
      activeElections: userActiveElections,
      completedElections: userCompletedElections,
      upcomingElections: userUpcomingElections,
      userVoteCount,
      userCandidateCount,
      mostActiveElection
    };
  }, [allElections, isRegisteredForElection, account, electionsLoading, registrationLoading]);
  
  // Calculate personalized statistics when dependencies change
  useEffect(() => {
    const stats = calculateStats();
    if (stats) {
      setUserStats(stats);
    }
  }, [calculateStats]);
  
  // Skeleton loader for loading state
  if (electionsLoading || registrationLoading) {
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
          <h3 className="text-sm font-medium text-gray-500">Your Active Elections</h3>
        </div>
        <div className="flex items-end justify-between">
          <div className="text-3xl font-bold text-gray-900">{userStats.activeElections.length}</div>
          {userStats.activeElections.length > 0 && (
            <div className="text-sm text-green-600 flex items-center">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1"></span>
              In Progress
            </div>
          )}
        </div>
        {userStats.mostActiveElection && (
          <div className="mt-4 text-sm text-gray-500 truncate">
            Most active: {userStats.mostActiveElection.title}
          </div>
        )}
      </div>
      
      {/* Your Votes Stat */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center mb-3">
          <div className="p-2 bg-green-100 rounded-md mr-3">
            <Check size={20} className="text-green-600" />
          </div>
          <h3 className="text-sm font-medium text-gray-500">Your Votes</h3>
        </div>
        <div className="flex items-end justify-between">
          <div className="text-3xl font-bold text-gray-900">{userStats.userVoteCount}</div>
          {userStats.userVoteCount > 0 && (
            <div className="text-sm text-gray-600">
              {formatPercentage(userStats.userVoteCount / Math.max(1, userStats.activeElections.length + userStats.completedElections.length) * 100)}% participation
            </div>
          )}
        </div>
        <div className="mt-4 text-sm text-gray-500">
          Across {userStats.activeElections.length + userStats.completedElections.length} available elections
        </div>
      </div>
      
      {/* Your Candidates Stat */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center mb-3">
          <div className="p-2 bg-blue-100 rounded-md mr-3">
            <Users size={20} className="text-blue-600" />
          </div>
          <h3 className="text-sm font-medium text-gray-500">Your Candidates</h3>
        </div>
        <div className="flex items-end justify-between">
          <div className="text-3xl font-bold text-gray-900">{userStats.userCandidateCount}</div>
          {userStats.userCandidateCount > 0 && (
            <div className="text-sm text-gray-600">
              In your created elections
            </div>
          )}
        </div>
        <div className="mt-4 text-sm text-gray-500">
          {userStats.completedElections.length} completed elections
        </div>
      </div>
      
      {/* Upcoming Elections Stat */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center mb-3">
          <div className="p-2 bg-yellow-100 rounded-md mr-3">
            <Calendar size={20} className="text-yellow-600" />
          </div>
          <h3 className="text-sm font-medium text-gray-500">Your Upcoming Elections</h3>
        </div>
        <div className="flex items-end justify-between">
          <div className="text-3xl font-bold text-gray-900">{userStats.upcomingElections.length}</div>
          {userStats.upcomingElections.length > 0 && (
            <div className="text-sm text-blue-600 flex items-center">
              <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1"></span>
              Scheduled
            </div>
          )}
        </div>
        {userStats.upcomingElections.length > 0 && (
          <div className="mt-4 text-sm text-gray-500 truncate">
            Next: {userStats.upcomingElections[0].title}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatisticsPanel;