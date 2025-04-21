import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, Users, ChevronRight } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import { formatDate, timeRemaining } from '../../utils/dateUtils';
import { formatPercentage } from '../../utils/formatters';

/**
 * Election card component to display election information
 * 
 * @param {Object} election - Election data
 * @param {string} className - Additional CSS classes
 * @param {boolean} showDetails - Whether to show detailed information
 * @param {boolean} showActions - Whether to show action buttons
 * @param {function} onVoteClick - Vote button click handler
 */
const ElectionCard = ({ 
  election, 
  className = '',
  showDetails = true,
  showActions = true,
  onVoteClick
}) => {
  if (!election) return null;
  
  const {
    id,
    title,
    description,
    status,
    startTime,
    endTime,
    candidates = [],
    totalVotes = 0,
    voterCount = 0
  } = election;
  
  // Calculate progress percentage
  const progress = voterCount > 0 ? (totalVotes / voterCount) * 100 : 0;
  
  // Format time remaining
  const timeLeft = timeRemaining(endTime);
  
  // Get route based on status
  const getRoute = () => {
    if (status === 'active') {
      return `/vote/${id}`;
    } else {
      return `/election/${id}`;
    }
  };
  
  // Handle vote button click
  const handleVoteClick = (e) => {
    e.preventDefault();
    if (onVoteClick) {
      onVoteClick(election);
    }
  };
  
  return (
    <Link 
      to={getRoute()} 
      className={`block bg-white rounded-lg shadow-sm hover:shadow transition ${className}`}
    >
      <div className="p-6">
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-bold text-gray-800 mb-1">{title}</h3>
          <StatusBadge status={status} />
        </div>
        
        {description && (
          <p className="text-gray-600 text-sm mt-1 mb-3 truncate-2-lines">
            {description}
          </p>
        )}
        
        <div className="flex items-center mt-4 text-sm">
          <Calendar size={16} className="text-gray-400 mr-1" />
          <span className="text-gray-600">
            {formatDate(startTime)} - {formatDate(endTime)}
          </span>
        </div>
        
        {status === 'active' && (
          <div className="flex items-center mt-2 text-sm">
            <Clock size={16} className="text-orange-500 mr-1" />
            <span className="text-orange-500 font-medium">{timeLeft}</span>
          </div>
        )}
        
        {showDetails && (
          <>
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Voter Participation</span>
                {/*<span>{formatPercentage(progress)}%</span>*/}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-indigo-600 h-2 rounded-full" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
            
            <div className="flex justify-between mt-4">
              <div className="text-sm text-gray-500">
                <span className="font-medium text-gray-800">{candidates.length}</span> Candidates
              </div>
              <div className="text-sm text-gray-500">
                <span className="font-medium text-gray-800">{totalVotes}</span> Votes
              </div>
            </div>
          </>
        )}
        
        {showActions && (
          <div className="mt-4 flex justify-end">
            {status === 'active' ? (
              <button
                onClick={handleVoteClick}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm rounded transition flex items-center"
              >
                Vote Now
                <ChevronRight size={16} className="ml-1" />
              </button>
            ) : (
              <button
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 text-sm rounded transition flex items-center"
              >
                View Details
                <ChevronRight size={16} className="ml-1" />
              </button>
            )}
          </div>
        )}
      </div>
    </Link>
  );
};

export default ElectionCard;