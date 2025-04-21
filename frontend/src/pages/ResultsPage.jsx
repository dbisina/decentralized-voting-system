import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Award, Users, CheckCircle, AlertTriangle } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import useElections from '../hooks/useElections';
import { useVoterRegistration } from '../contexts/VoterRegistrationContext';
import DashboardLayout from '../layouts/DashboardLayout';
import useDirectContract from '../hooks/useDirectContract';
import DebugPanel from '../components/debug/DebugPanel';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import { useAuth } from '../contexts/AuthContext';

const ResultsPage = () => {
  const { electionId } = useParams();
  const navigate = useNavigate();
  const { account } = useWeb3();
  const { isAdmin } = useAuth();
  const { allElections, refreshElections, finalizeElection, isLoading, error } = useElections();
  const { isRegisteredForElection, universalAccess } = useVoterRegistration();
  
  const [election, setElection] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [accessBypass, setAccessBypass] = useState(false);
  
  const {
    getAllCandidates: getDirectCandidates,
    error: directContractError
  } = useDirectContract(process.env.REACT_APP_CONTRACT_ADDRESS);
  
  // Find the election in our data
  useEffect(() => {
    if (allElections.length > 0 && electionId) {
      const foundElection = allElections.find(e => e.id === parseInt(electionId));
      
      if (foundElection) {
        setElection(foundElection);
        
        // Check if current user is the election admin
        setIsOwner(account && foundElection.admin && 
          account.toLowerCase() === foundElection.admin.toLowerCase());
      } else {
        // Election not found
        setStatusMessage({
          type: 'error',
          message: `Election with ID ${electionId} not found.`
        });
      }
    }
  }, [allElections, electionId, account]);
  
  // Handle finalize election
  const handleFinalizeElection = async () => {
    if (!isOwner && !isAdmin) {
      setStatusMessage({
        type: 'error',
        message: 'You do not have permission to finalize this election.'
      });
      return;
    }
    
    try {
      setProcessing(true);
      setStatusMessage({
        type: 'processing',
        message: 'Finalizing election results on the blockchain...'
      });
      
      const result = await finalizeElection(parseInt(electionId));
      
      setStatusMessage({
        type: 'success',
        message: 'Election has been successfully finalized.',
        details: `Transaction Hash: ${result.transactionHash}`
      });
      
      // Refresh data
      await refreshElections();
    } catch (err) {
      console.error("Error finalizing election:", err);
      setStatusMessage({
        type: 'error',
        message: 'Failed to finalize election.',
        details: err.message
      });
    } finally {
      setProcessing(false);
    }
  };
  
  // Force refresh candidates from blockchain
  const forceRefreshCandidates = async () => {
    if (!election || !electionId) return;
    
    try {
      // Try to get candidates directly from contract
      const directCandidates = await getDirectCandidates(parseInt(electionId));
      
      if (directCandidates && directCandidates.length > 0) {
        console.log(`Found ${directCandidates.length} candidates directly from contract`);
        
        // Update the election object with these candidates
        setElection(prev => ({
          ...prev,
          candidates: directCandidates
        }));
      } else {
        console.warn('No candidates found through direct contract call');
      }
    } catch (err) {
      console.error('Error in direct candidate fetch:', err);
    }
  };
  
  // Check if user has access to view results
  const hasAccessToResults = () => {
    // Admins always have access
    if (isOwner || isAdmin) return true;
    
    // Universal access in dev mode
    if (universalAccess || accessBypass) return true;
    
    // Check if user is registered for this election
    return isRegisteredForElection(electionId);
  };
  
  // Enable access bypass (development mode only)
  const enableAccessBypass = () => {
    console.log("⚠️ ACCESS RESTRICTIONS BYPASSED - FOR DEVELOPMENT ONLY");
    setAccessBypass(true);
  };
  
  // Sort candidates by vote count (descending)
  const sortedCandidates = election?.candidates 
    ? [...election.candidates].sort((a, b) => b.voteCount - a.voteCount) 
    : [];
  
  // Find the winning candidate
  const winningCandidate = sortedCandidates.length > 0 ? sortedCandidates[0] : null;
  
  // Calculate total votes and percentages
  const totalVotes = election?.totalVotes || 0;
  
  // Format the percentage with proper handling of zero total votes
  const getVotePercentage = (voteCount) => {
    if (totalVotes === 0) return 0;
    return ((voteCount / totalVotes) * 100).toFixed(1);
  };
  
  // Loading state
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </DashboardLayout>
    );
  }
  
  // Access denied check - if not access bypass mode and not registered
  if (!hasAccessToResults()) {
    return (
      <DashboardLayout>
        <div className="mb-6 flex items-center justify-between">
          <button 
            onClick={() => navigate('/dashboard')} 
            className="flex items-center text-indigo-600 hover:text-indigo-800"
          >
            <ArrowLeft size={16} className="mr-1" />
            <span>Back to Dashboard</span>
          </button>
        </div>
        
        <Card className="bg-red-50 border-red-200">
          <div className="flex items-start">
            <AlertTriangle className="mr-3 mt-0.5 text-red-600" size={20} />
            <div>
              <h3 className="font-bold text-red-800">Access Denied</h3>
              <p className="text-red-700">You are not registered for this election and cannot view its results.</p>
            </div>
          </div>
          
          <Button 
            variant="primary"
            className="mt-6"
            onClick={() => navigate('/dashboard')}
          >
            Return to Dashboard
          </Button>
          
          {process.env.NODE_ENV === 'development' && (
            <Button 
              variant="secondary"
              className="mt-4"
              onClick={enableAccessBypass}
            >
              Bypass Access Check (Dev Only)
            </Button>
          )}
        </Card>
      </DashboardLayout>
    );
  }
  
  // Error state or election not found
  if (error || !election) {
    return (
      <DashboardLayout>
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-md">
          <div className="flex items-start">
            <AlertTriangle className="mr-3 mt-0.5" size={20} />
            <div>
              <h3 className="font-bold">Error Loading Election Results</h3>
              <p>{error || statusMessage?.message || 'Election not found or data could not be loaded.'}</p>
            </div>
          </div>
        </div>
        
        <div className="mt-6">
          <button 
            onClick={() => navigate('/dashboard')} 
            className="flex items-center text-indigo-600 hover:text-indigo-800"
          >
            <ArrowLeft size={16} className="mr-1" />
            <span>Back to Dashboard</span>
          </button>
        </div>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <button 
          onClick={() => navigate('/dashboard')} 
          className="flex items-center text-indigo-600 hover:text-indigo-800"
        >
          <ArrowLeft size={16} className="mr-1" />
          <span>Back to Dashboard</span>
        </button>
        
        {/* Election Status Badge */}
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
          election.status === 'active' ? 'bg-green-100 text-green-800' :
          election.status === 'completed' ? 'bg-blue-100 text-blue-800' :
          election.status === 'ended' ? 'bg-yellow-100 text-yellow-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {election.status === 'active' ? 'Active' : 
           election.status === 'completed' ? 'Completed' :
           election.status === 'ended' ? 'Ended (Not Finalized)' : 
           election.status}
        </div>
      </div>
      
      {/* Dev Mode Indicator */}
      {(accessBypass || universalAccess) && process.env.NODE_ENV === 'development' && (
        <Card className="mb-6 bg-yellow-50 border-yellow-200">
          <div className="flex items-start">
            <AlertTriangle className="mr-3 mt-0.5 text-yellow-600" size={20} />
            <div>
              <h3 className="font-bold text-yellow-800">Development Mode</h3>
              <p className="text-yellow-700">
                Access restrictions have been bypassed. In production, only registered voters and admins can view results.
              </p>
            </div>
          </div>
        </Card>
      )}
      
      {/* Registration status indicator for non-admin users */}
      {!isOwner && !isAdmin && !accessBypass && !universalAccess && (
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <div className="flex items-start">
            <CheckCircle size={20} className="text-blue-600 mr-3 mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-gray-800">Registration Status</h3>
              <p className="text-gray-700">
                You are registered for this election and can view the results.
              </p>
            </div>
          </div>
        </Card>
      )}
      
      <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-800">{election.title}</h1>
          <div className="flex items-center mt-2 text-sm text-gray-600">
            <Users size={16} className="mr-1" />
            <span>{totalVotes} votes cast</span>
          </div>
        </div>
        
        {/* Status Message */}
        {statusMessage && (
          <div className={`p-4 ${
            statusMessage.type === 'error' ? 'bg-red-50 text-red-800' :
            statusMessage.type === 'success' ? 'bg-green-50 text-green-800' :
            'bg-blue-50 text-blue-700'
          }`}>
            <div className="flex items-start">
              {statusMessage.type === 'error' ? <AlertTriangle size={20} className="mr-2" /> :
               statusMessage.type === 'success' ? <CheckCircle size={20} className="mr-2" /> : 
               <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full mr-2"></div>}
              <div>
                <p className="font-medium">{statusMessage.message}</p>
                {statusMessage.details && (
                  <p className="text-sm mt-1">{statusMessage.details}</p>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Winner Section (only for finalized elections) */}
        {election.finalized && winningCandidate && (
          <div className="p-6 bg-indigo-50 border-b border-indigo-100">
            <div className="flex items-center">
              <div className="bg-indigo-100 p-3 rounded-full mr-4">
                <Award size={28} className="text-indigo-600" />
              </div>
              <div>
                <div className="text-sm text-indigo-700 font-medium">Winner</div>
                <div className="text-xl font-bold text-gray-800">
                  {winningCandidate.name}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {winningCandidate.voteCount} votes ({getVotePercentage(winningCandidate.voteCount)}%)
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Results Section */}
        <div className="p-6">
          <h2 className="font-bold text-gray-800 text-lg mb-4">
            Election Results {!election.finalized && '(Preliminary)'}
          </h2>
          
          <div className="space-y-6">
            {sortedCandidates.map((candidate, index) => (
              <div 
                key={candidate.id}
                className={`border ${index === 0 && !election.finalized ? 'border-indigo-200 bg-indigo-50' : 'border-gray-200'} rounded-lg p-4`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full ${
                      index === 0 ? 'bg-indigo-600' : 
                      index === 1 ? 'bg-indigo-400' : 
                      index === 2 ? 'bg-indigo-300' : 'bg-gray-300'
                    } flex items-center justify-center text-white font-medium mr-3`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-800">{candidate.name}</div>
                      {candidate.platform && (
                        <div className="text-sm text-gray-600 mt-1">{candidate.platform}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-800">{candidate.voteCount} votes</div>
                    <div className="text-sm text-gray-600">{getVotePercentage(candidate.voteCount)}%</div>
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`${
                      index === 0 ? 'bg-indigo-600' : 
                      index === 1 ? 'bg-indigo-400' : 
                      index === 2 ? 'bg-indigo-300' : 'bg-gray-400'
                    } h-2 rounded-full`}
                    style={{ width: `${getVotePercentage(candidate.voteCount)}%` }}
                  ></div>
                </div>
              </div>
            ))}
            
            {sortedCandidates.length === 0 && (
              <div className="text-gray-500 text-center py-8">
                No candidates found for this election.
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Finalize Button (only for admins and unfinalized ended elections) */}
      {(isOwner || isAdmin) && election.status === 'ended' && !election.finalized && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-start">
            <div className="flex-1">
              <h3 className="font-bold text-gray-800">Finalize Election Results</h3>
              <p className="text-gray-600 text-sm mt-1">
                Finalizing the election will permanently record the results on the blockchain.
                This action cannot be undone.
              </p>
            </div>
            <button
              onClick={handleFinalizeElection}
              disabled={processing}
              className={`px-4 py-2 rounded-md font-medium ${
                processing ? 'bg-gray-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {processing ? 'Processing...' : 'Finalize Results'}
            </button>
          </div>
        </div>
      )}
      
      {/* Election Details */}
      <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
        <h3 className="font-bold text-gray-800 mb-4">Election Details</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="text-sm text-gray-500 mb-1">Start Date</div>
            <div>{election.formattedStartDate}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">End Date</div>
            <div>{election.formattedEndDate}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">Total Votes</div>
            <div>{totalVotes}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">Number of Candidates</div>
            <div>{election.candidates ? election.candidates.length : 0}</div>
          </div>
          {election.description && (
            <div className="col-span-2">
              <div className="text-sm text-gray-500 mb-1">Description</div>
              <div className="text-gray-700">{election.description}</div>
            </div>
          )}
        </div>
        
        {election.transactionHash && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-500 mb-1">Transaction Hash</div>
            <div className="font-mono text-sm text-gray-700 break-all">
              {election.transactionHash}
            </div>
          </div>
        )}
      </div>
      
      {/* Debug Panel (Only available for admins in development mode) */}
      {(isOwner || isAdmin || accessBypass || universalAccess) && 
       process.env.NODE_ENV === 'development' && 
       election && 
       <DebugPanel election={election} refreshData={forceRefreshCandidates} />}
    </DashboardLayout>
  );
};

export default ResultsPage;