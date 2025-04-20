import { useState, useEffect } from 'react';
import { Check, AlertTriangle, Clock, Info } from 'lucide-react';

/**
 * Enhanced voting component that works with the hybrid approach
 * Verifies voter eligibility directly on the blockchain
 */
const EnhancedVotingComponent = ({
  election,
  account,
  blockchainService,
  ipfsService,
  onVote,
  children
}) => {
  const [eligibilityStatus, setEligibilityStatus] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState(null);
  
  // Check voter eligibility on component mount
  useEffect(() => {
    checkVoterEligibility();
  }, [election, account]);
  
  // Verify if the voter is eligible to vote
  const checkVoterEligibility = async () => {
    if (!election?.id || !account) return;
    
    try {
      setIsChecking(true);
      setError(null);
      
      // Try blockchain verification first
      if (blockchainService) {
        try {
          // Check if the election requires registration
          let requiresRegistration = true;
          if (election.requiresRegistration !== undefined) {
            requiresRegistration = election.requiresRegistration;
          } else {
            try {
              // Try to get full election details to check if registration is required
              const details = await blockchainService.getElectionDetails(election.id);
              requiresRegistration = details.requiresRegistration;
            } catch (detailsError) {
              console.warn('Could not determine if election requires registration:', detailsError);
              // Assume it requires registration by default
            }
          }
          
          // If registration is not required, all voters are eligible
          if (!requiresRegistration) {
            setEligibilityStatus({
              isEligible: true,
              source: 'blockchain',
              reason: 'This election is open to all voters without registration'
            });
            return;
          }
          
          // Check on-chain eligibility
          const isAllowed = await blockchainService.isVoterAllowed(election.id, account);
          
          if (isAllowed) {
            setEligibilityStatus({
              isEligible: true,
              source: 'blockchain',
              reason: 'Your wallet is approved to vote in this election'
            });
          } else {
            // Get status to provide better reason
            let status = 'unknown';
            try {
              status = await blockchainService.getVoterStatus(election.id, account);
            } catch (statusError) {
              console.warn('Could not get voter status:', statusError);
            }
            
            setEligibilityStatus({
              isEligible: false,
              source: 'blockchain',
              status,
              reason: status === 'pending' 
                ? 'Your registration is pending approval by the election administrator'
                : status === 'rejected'
                ? 'Your registration has been rejected by the election administrator'
                : 'You are not registered for this election'
            });
          }
          
          return;
        } catch (blockchainError) {
          console.warn('Error checking blockchain eligibility:', blockchainError);
          // Fall back to IPFS check
        }
      }
      
      // Fall back to IPFS if blockchain check fails or is not available
      if (ipfsService) {
        try {
          const status = await ipfsService.getUserRegistrationStatus(account, election.id);
          
          if (status === 'approved') {
            setEligibilityStatus({
              isEligible: true,
              source: 'ipfs',
              reason: 'Your registration has been approved'
            });
          } else {
            setEligibilityStatus({
              isEligible: false,
              source: 'ipfs',
              status,
              reason: status === 'pending' 
                ? 'Your registration is pending approval by the election administrator'
                : status === 'rejected'
                ? 'Your registration has been rejected by the election administrator'
                : 'You are not registered for this election'
            });
          }
          
          return;
        } catch (ipfsError) {
          console.warn('Error checking IPFS eligibility:', ipfsError);
        }
      }
      
      // Last resort: check local storage
      try {
        const userRefsKey = `user_registrations_${account}`;
        const userRefs = JSON.parse(localStorage.getItem(userRefsKey) || '[]');
        const ref = userRefs.find(r => r.electionId == election.id);
        
        if (ref && ref.status === 'approved') {
          setEligibilityStatus({
            isEligible: true,
            source: 'localStorage',
            reason: 'Your registration has been approved'
          });
        } else if (ref) {
          setEligibilityStatus({
            isEligible: false,
            source: 'localStorage',
            status: ref.status,
            reason: ref.status === 'pending' 
              ? 'Your registration is pending approval by the election administrator'
              : 'Your registration has been rejected by the election administrator'
          });
        } else {
          // Check if in allowed voters array
          const allowedKey = `allowed_voters_${election.id}`;
          const allowedVoters = JSON.parse(localStorage.getItem(allowedKey) || '[]');
          
          if (allowedVoters.includes(account)) {
            setEligibilityStatus({
              isEligible: true,
              source: 'localStorage',
              reason: 'Your address is in the allowed voters list'
            });
          } else {
            setEligibilityStatus({
              isEligible: false,
              source: 'localStorage',
              reason: 'You are not registered for this election'
            });
          }
        }
      } catch (localError) {
        console.warn('Error checking localStorage eligibility:', localError);
        setError('Could not verify your voting eligibility. Please try again later.');
      }
    } catch (error) {
      console.error('Error checking voter eligibility:', error);
      setError('Could not verify your voting eligibility. Please try again later.');
    } finally {
      setIsChecking(false);
    }
  };
  
  // Force approval for development purposes
  const handleForceApprove = () => {
    if (process.env.NODE_ENV !== 'development') return;
    
    try {
      // Set up local storage approval
      const localKey = `allowed_voters_${election.id}`;
      const allowedVoters = JSON.parse(localStorage.getItem(localKey) || '[]');
      
      if (!allowedVoters.includes(account)) {
        allowedVoters.push(account);
        localStorage.setItem(localKey, JSON.stringify(allowedVoters));
      }
      
      // Update user registration status
      const userRefsKey = `user_registrations_${account}`;
      const userRefs = JSON.parse(localStorage.getItem(userRefsKey) || '[]');
      
      const index = userRefs.findIndex(ref => ref.electionId == election.id);
      const updatedRef = {
        electionId: election.id,
        status: 'approved',
        updatedAt: new Date().toISOString()
      };
      
      if (index >= 0) {
        userRefs[index] = {...userRefs[index], ...updatedRef};
      } else {
        userRefs.push(updatedRef);
      }
      
      localStorage.setItem(userRefsKey, JSON.stringify(userRefs));
      
      // Update state
      setEligibilityStatus({
        isEligible: true,
        source: 'localStorage',
        reason: 'Your registration has been force-approved (development only)'
      });
    } catch (error) {
      console.error('Error force-approving voter:', error);
    }
  };
  
  // Render the eligibility status
  const renderEligibilityStatus = () => {
    if (isChecking) {
      return (
        <div className="bg-blue-50 rounded-lg p-4 mb-4 flex items-center">
          <div className="animate-spin h-4 w-4 mr-2 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          <div className="text-blue-700">
            Verifying your voting eligibility...
          </div>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="bg-red-50 rounded-lg p-4 mb-4 flex items-start">
          <AlertTriangle size={20} className="text-red-600 mr-3 mt-0.5 flex-shrink-0" />
          <div className="text-red-700">
            <p className="font-bold">Error checking eligibility</p>
            <p>{error}</p>
          </div>
        </div>
      );
    }
    
    if (!eligibilityStatus) {
      return null;
    }
    
    if (eligibilityStatus.isEligible) {
      return (
        <div className="bg-green-50 rounded-lg p-4 mb-4 flex items-start">
          <Check size={20} className="text-green-600 mr-3 mt-0.5 flex-shrink-0" />
          <div className="text-green-700">
            <p className="font-bold">You are eligible to vote</p>
            <p>{eligibilityStatus.reason}</p>
            <p className="text-xs mt-1">Source: {eligibilityStatus.source}</p>
          </div>
        </div>
      );
    } else {
      return (
        <div className="bg-red-50 rounded-lg p-4 mb-4 flex items-start">
          <AlertTriangle size={20} className="text-red-600 mr-3 mt-0.5 flex-shrink-0" />
          <div className="text-red-700">
            <p className="font-bold">You are not eligible to vote</p>
            <p>{eligibilityStatus.reason}</p>
            <p className="text-xs mt-1">Source: {eligibilityStatus.source}</p>
            
            {process.env.NODE_ENV === 'development' && (
              <button
                onClick={handleForceApprove}
                className="bg-red-100 hover:bg-red-200 text-red-800 text-xs px-3 py-1 rounded mt-2"
              >
                Force Approve (Dev Only)
              </button>
            )}
          </div>
        </div>
      );
    }
  };
  
  // Wrap the vote handler to check eligibility first
  const handleVote = (candidateId) => {
    if (!eligibilityStatus?.isEligible) {
      setError('You are not eligible to vote in this election.');
      return;
    }
    
    if (onVote) {
      onVote(candidateId);
    }
  };
  
  // Add debugging info if in development mode
  const renderDebugInfo = () => {
    if (process.env.NODE_ENV !== 'development') return null;
    
    return (
      <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
        <details>
          <summary className="cursor-pointer text-sm font-medium text-gray-700">
            Debug Information
          </summary>
          <div className="mt-2 text-xs font-mono">
            <div>Election ID: {election?.id}</div>
            <div>Account: {account}</div>
            <div>Registration Required: {election?.requiresRegistration?.toString() || 'unknown'}</div>
            <div>Status: {JSON.stringify(eligibilityStatus, null, 2)}</div>
          </div>
        </details>
      </div>
    );
  };
  
  return (
    <div className="voting-component">
      {renderEligibilityStatus()}
      
      {/* Render children only if eligible or checking */}
      {(eligibilityStatus?.isEligible || isChecking) && children}
      
      {renderDebugInfo()}
    </div>
  );
};

export default EnhancedVotingComponent;