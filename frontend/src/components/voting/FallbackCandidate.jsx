import React, { useState } from 'react';
import { AlertTriangle, RefreshCw, User } from 'lucide-react';
import Button from '../common/Button';
import IPFSService from '../../services/ipfsService';

/**
 * Fallback component for displaying candidate when IPFS data can't be retrieved
 * Provides retry functionality and displays placeholder content
 */
const FallbackCandidate = ({ 
  candidate, 
  onRetrySuccess, 
  electionId,
  showVotes = false,
  totalVotes = 0,
  isSelected = false,
  onSelect,
  className = '' 
}) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  // Handle retry fetch from IPFS
  const handleRetry = async () => {
    if (!candidate || !candidate.details) return;
    
    try {
      setIsRetrying(true);
      
      // Create a fresh IPFS service instance 
      const ipfsService = new IPFSService();
      
      // Clear the cache to force a fresh retrieval
      ipfsService.clearCache();
      
      // Try to fetch the data again
      const data = await ipfsService.getFromIPFS(candidate.details);
      
      // Check if we got real data back (not an error placeholder)
      if (data && !data._ipfsError && !data._mockData) {
        // Merge the data with the candidate
        const enhancedCandidate = {
          ...candidate,
          ...data,
          // Ensure we have a name
          name: data.name || candidate.name || `Candidate ${candidate.id}`
        };
        
        // Call the success callback with the enhanced candidate
        if (onRetrySuccess) {
          onRetrySuccess(enhancedCandidate);
        }
      }
      
      // Increment retry count
      setRetryCount(prev => prev + 1);
    } catch (error) {
      console.error('Error retrying IPFS fetch:', error);
    } finally {
      setIsRetrying(false);
    }
  };
  
  // Calculate vote percentage if showing votes
  const votePercentage = showVotes && totalVotes > 0 
    ? (candidate.voteCount / totalVotes) * 100 
    : 0;
  
  // Default name in case it's missing
  const displayName = candidate.name || `Candidate ${candidate.id}`;
  
  // Function to handle click
  const handleClick = () => {
    if (typeof onSelect === 'function') {
      onSelect(candidate);
    }
  };
  
  return (
    <div 
      className={`
        bg-white rounded-lg shadow-sm overflow-hidden transition
        ${isSelected ? 'ring-2 ring-indigo-500' : 'hover:shadow-md'}
        ${onSelect ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={handleClick}
    >
      <div className="p-5">
        <div className="flex items-start">
          {/* Placeholder Photo */}
          <div className="flex-shrink-0 mr-4 bg-gray-200 rounded-full w-16 h-16 flex items-center justify-center">
            <User size={24} className="text-gray-400" />
          </div>
          
          {/* Candidate Info */}
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-bold text-gray-800 mr-2">{displayName}</h3>
              
              {/* Error Indicator */}
              <div className="text-yellow-600 p-1 rounded-full">
                <AlertTriangle size={16} />
              </div>
            </div>
            
            {/* Placeholder Platform/Bio */}
            <div className="mt-2 text-sm">
              <p className="text-gray-600">
                {candidate._placeholder
                  ? "Loading candidate information..."
                  : "Candidate details unavailable due to network issues."}
              </p>
              
              {candidate._ipfsError && (
                <p className="text-gray-500 text-xs mt-1">
                  Could not retrieve data from IPFS (CID: {candidate.details?.substring(0, 10)}...)
                </p>
              )}
            </div>
            
            {/* Vote Stats */}
            {showVotes && (
              <div className="mt-4">
                <div className="flex justify-between items-center text-sm mb-1">
                  <span className="text-gray-600">Votes: {candidate.voteCount || 0}</span>
                  <span className="font-medium text-gray-800">{votePercentage.toFixed(1)}%</span>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-indigo-500 h-2 rounded-full"
                    style={{ width: `${votePercentage}%` }}
                  ></div>
                </div>
              </div>
            )}
            
            {/* Retry Button */}
            {(candidate.details && candidate.details.startsWith('Qm')) && (
              <div className="mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent parent click
                    handleRetry();
                  }}
                  isLoading={isRetrying}
                  className="text-xs"
                >
                  {!isRetrying && <RefreshCw size={12} className="mr-1" />}
                  {isRetrying ? 'Retrying...' : retryCount === 0 ? 'Retry Loading' : `Retry Again (${retryCount})`}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FallbackCandidate;