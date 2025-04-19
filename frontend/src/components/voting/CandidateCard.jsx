import React from 'react';
import { Check, User } from 'lucide-react';
import { formatPercentage } from '../../utils/formatters';
import FallbackCandidate from './FallbackCandidate';

/**
 * Enhanced Candidate card component for displaying candidate information
 * With improved error handling and fallback display
 * 
 * @param {Object} candidate - Candidate data
 * @param {boolean} isSelected - Whether the candidate is selected
 * @param {boolean} showVotes - Whether to show vote count/percentage
 * @param {number} totalVotes - Total votes in the election
 * @param {boolean} isWinner - Whether the candidate is the winner
 * @param {function} onSelect - Function to call when candidate is selected
 * @param {string} className - Additional CSS classes
 * @param {function} onRetrySuccess - Function to call when IPFS data is successfully retrieved
 * @param {number} electionId - ID of the election
 */
const CandidateCard = ({
  candidate,
  isSelected = false,
  showVotes = false,
  totalVotes = 0,
  isWinner = false,
  onSelect,
  className = '',
  onRetrySuccess,
  electionId
}) => {
  if (!candidate) return null;
  
  // Check if this candidate needs the fallback component
  const needsFallback = 
    candidate._placeholder || 
    candidate._ipfsError || 
    candidate._error || 
    !candidate.name;
  
  // If needs fallback, use the FallbackCandidate component
  if (needsFallback) {
    return (
      <FallbackCandidate
        candidate={candidate}
        isSelected={isSelected}
        showVotes={showVotes}
        totalVotes={totalVotes}
        onSelect={onSelect}
        className={className}
        onRetrySuccess={onRetrySuccess}
        electionId={electionId}
      />
    );
  }
  
  // Regular candidate display for when we have all the data
  const {
    id,
    name,
    bio,
    platform,
    photoUrl,
    voteCount = 0
  } = candidate;
  
  // Calculate vote percentage
  const votePercentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
  
  // Determine if the card is clickable
  const isClickable = typeof onSelect === 'function';
  
  // Handle click on the card
  const handleClick = () => {
    if (isClickable) {
      onSelect(candidate);
    }
  };
  
  return (
    <div 
      className={`
        bg-white rounded-lg shadow-sm overflow-hidden
        ${isSelected ? 'ring-2 ring-indigo-500' : 'hover:shadow-md'}
        ${isClickable ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={handleClick}
    >
      <div className="p-5">
        <div className="flex items-start">
          {/* Candidate Photo */}
          {photoUrl ? (
            <div className="flex-shrink-0 mr-4">
              <img 
                src={photoUrl} 
                alt={name} 
                className="w-16 h-16 rounded-full object-cover"
              />
            </div>
          ) : (
            <div className="flex-shrink-0 mr-4 bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center">
              <User size={24} className="text-gray-400" />
            </div>
          )}
          
          {/* Candidate Info */}
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-bold text-gray-800 mr-2">{name}</h3>
              
              {/* Selected Indicator */}
              {isSelected && (
                <div className="bg-indigo-100 text-indigo-800 p-1 rounded-full">
                  <Check size={16} />
                </div>
              )}
              
              {/* Winner Badge */}
              {isWinner && !isSelected && (
                <div className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                  Winner
                </div>
              )}
            </div>
            
            {/* Platform/Slogan */}
            {platform && (
              <p className="text-gray-700 text-sm mt-1">{platform}</p>
            )}
            
            {/* Bio */}
            {bio && (
              <p className="text-gray-500 text-sm mt-2">{bio}</p>
            )}
            
            {/* Vote Stats */}
            {showVotes && (
              <div className="mt-4">
                <div className="flex justify-between items-center text-sm mb-1">
                  <span className="text-gray-600">Votes: {voteCount}</span>
                  <span className="font-medium text-gray-800">{formatPercentage(votePercentage)}%</span>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${isWinner ? 'bg-green-500' : 'bg-indigo-500'}`}
                    style={{ width: `${votePercentage}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidateCard;