import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, AlertCircle, Info, Users, AlertTriangle } from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import CandidateCard from '../components/voting/CandidateCard';
import VoteConfirmation from '../components/voting/VoteConfirmation';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import StatusBadge from '../components/common/StatusBadge';
import useElections from '../hooks/useElections';
import useVote from '../hooks/useVote';
import { timeRemaining, formatDate } from '../utils/dateUtils';
import { useWeb3 } from '../contexts/Web3Context';
import { useVoterRegistration } from '../contexts/VoterRegistrationContext';
import { Check } from 'lucide-react';

const VoteCastingPage = () => {
  const { electionId } = useParams();
  const navigate = useNavigate();
  const { account } = useWeb3();
  const { allElections, refreshElections, isLoading: electionsLoading } = useElections();
  const { isRegisteredForElection, universalAccess } = useVoterRegistration();
  
  const [election, setElection] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [accessBypass, setAccessBypass] = useState(false);
  
  // Initialize vote hook
  const {
    selectedCandidate,
    votingStep,
    processing,
    transaction,
    error,
    selectCandidate,
    nextStep,
    prevStep,
    checkVotingStatus,
    submitVote,
    resetVoting
  } = useVote(electionId);
  
  // Find the election and check voting status
  useEffect(() => {
    const loadElection = async () => {
      setIsLoading(true);
      try {
        // Find election in our data
        if (allElections.length > 0 && electionId) {
          const foundElection = allElections.find(e => e.id === parseInt(electionId));
          
          if (foundElection) {
            setElection(foundElection);
            
            // Check if user has voted
            const { hasVoted: userHasVoted, error: votingError } = await checkVotingStatus();
            setHasVoted(userHasVoted);
            
            if (votingError) {
              console.warn("Voting status check error:", votingError);
              // We don't set an error message here to allow access
            }
          } else {
            setErrorMessage(`Election with ID ${electionId} not found.`);
          }
        }
      } catch (error) {
        console.error('Error loading election:', error);
        setErrorMessage('Failed to load election data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (account) {
      loadElection();
    }
  }, [electionId, allElections, checkVotingStatus, account]);
  
  // Handle vote submission
  const handleConfirmVote = async () => {
    try {
      const success = await submitVote();
      
      if (success) {
        // Refresh elections data after successful vote
        await refreshElections();
        setHasVoted(true);
      }
    } catch (error) {
      console.error('Error submitting vote:', error);
    }
  };
  
  // Handle return to dashboard
  const handleReturnToDashboard = () => {
    navigate('/dashboard');
  };
  
  // Enable access bypass (development mode only)
  const enableAccessBypass = () => {
    console.log("⚠️ ACCESS RESTRICTIONS BYPASSED - FOR DEVELOPMENT ONLY");
    setAccessBypass(true);
    setErrorMessage(null);
  };
  
  // Find the selected candidate object
  const getSelectedCandidateObject = () => {
    if (!election?.candidates || !selectedCandidate) return null;
    return election.candidates.find(c => c.id === selectedCandidate);
  };
  
  // Check if user is admin of this election
  const isElectionAdmin = () => {
    if (!election || !account) return false;
    return election.admin && account.toLowerCase() === election.admin.toLowerCase();
  };
  
  // Check if user has access to vote in this election
  const hasAccessToVote = () => {
    // Admin always has access
    if (isElectionAdmin()) return true;
    
    // Dev mode bypass
    if (accessBypass || universalAccess) return true;
    
    // Regular users need to be registered
    return isRegisteredForElection(electionId);
  };
  
  // Loading state
  if (isLoading || electionsLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </DashboardLayout>
    );
  }
  
  // Error state
  if (errorMessage || !election) {
    return (
      <DashboardLayout>
        <div className="mb-6 flex items-center justify-between">
          <Button 
            variant="secondary"
            size="sm"
            onClick={handleReturnToDashboard}
            className="flex items-center"
          >
            <ArrowLeft size={16} className="mr-1" />
            <span>Back to Dashboard</span>
          </Button>
        </div>
        
        <Card className="bg-red-50 border-red-200">
          <div className="flex items-start">
            <AlertCircle className="mr-3 mt-0.5 text-red-600" size={20} />
            <div>
              <h3 className="font-bold text-red-800">Error Loading Election</h3>
              <p className="text-red-700">{errorMessage || 'Election not found or data could not be loaded.'}</p>
            </div>
          </div>
          
          <Button 
            variant="primary"
            className="mt-6"
            onClick={handleReturnToDashboard}
          >
            Return to Dashboard
          </Button>
        </Card>
      </DashboardLayout>
    );
  }
  
  // Check if election is active
  const isElectionActive = election.status === 'active';
  
  // Access denied state - user not registered
  if (!hasAccessToVote() && votingStep !== 'success') {
    return (
      <DashboardLayout>
        <div className="mb-6 flex items-center justify-between">
          <Button 
            variant="secondary"
            size="sm"
            onClick={handleReturnToDashboard}
            className="flex items-center"
          >
            <ArrowLeft size={16} className="mr-1" />
            <span>Back to Dashboard</span>
          </Button>
          
          <StatusBadge status={election.status} large />
        </div>
        
        <Card className="bg-red-50 border-red-200">
          <div className="flex items-start">
            <AlertTriangle className="mr-3 mt-0.5 text-red-600" size={20} />
            <div>
              <h3 className="font-bold text-red-800">Access Denied</h3>
              <p className="text-red-700">
                You are not registered to vote in this election. Please contact the election administrator for access.
              </p>
            </div>
          </div>
          
          <Button 
            variant="primary"
            className="mt-6"
            onClick={handleReturnToDashboard}
          >
            Return to Dashboard
          </Button>
          
          {process.env.NODE_ENV === 'development' && (
            <Button
              variant="secondary"
              onClick={enableAccessBypass}
              className="mt-4"
            >
              Bypass Access Check (Dev Only)
            </Button>
          )}
        </Card>
      </DashboardLayout>
    );
  }
  
  // Already voted state
  if (hasVoted && votingStep !== 'success') {
    return (
      <DashboardLayout>
        <div className="mb-6 flex items-center justify-between">
          <Button 
            variant="secondary"
            size="sm"
            onClick={handleReturnToDashboard}
            className="flex items-center"
          >
            <ArrowLeft size={16} className="mr-1" />
            <span>Back to Dashboard</span>
          </Button>
          
          <StatusBadge status={election.status} large />
        </div>
        
        <Card>
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-green-100">
              <Check size={32} className="text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">You've Already Voted</h2>
            <p className="text-gray-600 mb-6">
              You have already cast your vote in this election. Thank you for participating!
            </p>
            <Button
              variant="primary"
              onClick={() => navigate(`/election/${electionId}`)}
            >
              View Election Results
            </Button>
          </div>
        </Card>
      </DashboardLayout>
    );
  }
  
  // Inactive election state
  if (!isElectionActive && votingStep !== 'success' && !accessBypass) {
    return (
      <DashboardLayout>
        <div className="mb-6 flex items-center justify-between">
          <Button 
            variant="secondary"
            size="sm"
            onClick={handleReturnToDashboard}
            className="flex items-center"
          >
            <ArrowLeft size={16} className="mr-1" />
            <span>Back to Dashboard</span>
          </Button>
          
          <StatusBadge status={election.status} large />
        </div>
        
        <Card>
          <div className="text-center py-8">
            <AlertCircle size={48} className="text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              {election.status === 'upcoming' ? 'Election Has Not Started Yet' : 'Election Has Ended'}
            </h2>
            <p className="text-gray-600 mb-6">
              {election.status === 'upcoming' 
                ? `This election will start on ${formatDate(election.startTime, true)}.`
                : `This election ended on ${formatDate(election.endTime, true)}.`
              }
            </p>
            <Button
              variant="primary"
              onClick={() => navigate(election.status === 'upcoming' ? '/dashboard' : `/election/${electionId}`)}
            >
              {election.status === 'upcoming' ? 'Return to Dashboard' : 'View Election Results'}
            </Button>
            
            {process.env.NODE_ENV === 'development' && (
              <Button
                variant="secondary"
                onClick={enableAccessBypass}
                className="mt-4"
              >
                Bypass Active Check (Dev Only)
              </Button>
            )}
          </div>
        </Card>
      </DashboardLayout>
    );
  }
  
  // If we're in the confirmation or later steps
  if (votingStep !== 'select') {
    return (
      <DashboardLayout>
        <div className="mb-6 flex items-center justify-between">
          <Button 
            variant="secondary"
            size="sm"
            onClick={votingStep === 'confirm' ? prevStep : handleReturnToDashboard}
            disabled={processing}
            className="flex items-center"
          >
            <ArrowLeft size={16} className="mr-1" />
            <span>{votingStep === 'confirm' ? 'Back to Selection' : 'Back to Dashboard'}</span>
          </Button>
          
          <StatusBadge status={election.status} large />
        </div>
        
        <VoteConfirmation
          candidate={getSelectedCandidateObject()}
          election={election}
          step={votingStep}
          transaction={transaction}
          isProcessing={processing}
          error={error}
          onConfirm={handleConfirmVote}
          onCancel={resetVoting}
          onBack={prevStep}
          onDone={handleReturnToDashboard}
        />
      </DashboardLayout>
    );
  }
  
  // Default voting view - candidate selection (with bypass for active check in dev mode)
  if ((isElectionActive || accessBypass) && votingStep === 'select') {
    return (
      <DashboardLayout>
        <div className="mb-6 flex items-center justify-between">
          <Button 
            variant="secondary"
            size="sm"
            onClick={handleReturnToDashboard}
            className="flex items-center"
          >
            <ArrowLeft size={16} className="mr-1" />
            <span>Back to Dashboard</span>
          </Button>
          
          <div className="flex items-center">
            <Clock size={16} className="text-orange-600 mr-1" />
            <span className="text-sm text-orange-600 font-medium">
              {accessBypass ? "DEV MODE" : timeRemaining(election.endTime)}
            </span>
          </div>
        </div>
        
        {(accessBypass || universalAccess) && (
          <Card className="mb-4 bg-yellow-50 border-yellow-200">
            <div className="flex items-start">
              <AlertTriangle size={20} className="text-yellow-600 mr-3 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-yellow-800 mb-1">Developer Mode Active</h3>
                <p className="text-yellow-700">
                  Registration and election status restrictions have been bypassed. This is for development only.
                </p>
              </div>
            </div>
          </Card>
        )}
        
        <Card 
          header={
            <>
              <Card.Title>{election.title}</Card.Title>
              {election.organization && (
                <div className="text-sm text-gray-500 mt-1">{election.organization}</div>
              )}
            </>
          }
        >
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Select a candidate</h2>
            <p className="text-gray-600 mb-4">
              Review each candidate's platform carefully before making your selection. 
              Your vote will be securely recorded on the blockchain.
            </p>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 flex items-start">
              <AlertTriangle size={20} className="text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-yellow-700">
                <strong>Important:</strong> Once your vote is submitted to the blockchain, it cannot be changed. 
                Please ensure your selection is correct before confirming.
              </div>
            </div>
          </div>
          
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4 text-sm text-red-700">
              {error}
            </div>
          )}
          
          <div className="space-y-4 mb-6">
            {election.candidates && election.candidates.map(candidate => (
              <CandidateCard 
                key={candidate.id}
                candidate={candidate}
                isSelected={selectedCandidate === candidate.id}
                onSelect={() => selectCandidate(candidate.id)}
              />
            ))}
            
            {(!election.candidates || election.candidates.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                No candidates found for this election.
              </div>
            )}
          </div>
          
          <div className="flex justify-end">
            <Button 
              variant="primary"
              onClick={nextStep}
              disabled={!selectedCandidate}
            >
              Continue to Confirmation
            </Button>
          </div>
        </Card>
        
        {(accessBypass || universalAccess) && (
          <Card className="mt-6 bg-blue-50 border-blue-200">
            <div className="flex items-start">
              <Info size={20} className="text-blue-600 mr-3 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-gray-800 mb-2">Development Mode Information</h3>
                <p className="text-gray-700 mb-2">
                  All registration checks have been temporarily disabled to facilitate testing.
                </p>
                <ul className="list-disc pl-5 space-y-1 text-gray-600">
                  <li>You can vote regardless of registration status</li>
                  <li>Inactive elections can be accessed with the bypass button</li>
                  <li>Your votes will still be recorded on the blockchain</li>
                </ul>
              </div>
            </div>
          </Card>
        )}
      </DashboardLayout>
    );
  }
  
  // Default return - this should normally be unreachable after our changes
  return (
    <DashboardLayout>
      <div className="flex justify-center items-center h-64">
        <Button 
          variant="primary"
          onClick={enableAccessBypass}
        >
          Enable Development Access Mode
        </Button>
      </div>
    </DashboardLayout>
  );
};

export default VoteCastingPage;