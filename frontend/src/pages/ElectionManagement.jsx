import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Users, Calendar, Shield, ChevronDown, Info, ExternalLink, AlertCircle, UserPlus } from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import StatusBadge from '../components/common/StatusBadge';
import useElections from '../hooks/useElections';
import useBlockchain from '../hooks/useBlockchain';
import { useAuth } from '../contexts/AuthContext';
import { useWeb3 } from '../contexts/Web3Context';
import { formatDate } from '../utils/dateUtils';
import { formatAddress } from '../utils/formatters';
import { useVoterRegistration } from '../contexts/VoterRegistrationContext';

const ElectionManagement = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { account } = useWeb3();
  const { getExplorerUrl } = useBlockchain();
  const { universalAccess } = useVoterRegistration();
  const [activeTab, setActiveTab] = useState('all');
  const [selectedElection, setSelectedElection] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [accessMessage, setAccessMessage] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  
  const {
    allElections,
    activeElections,
    completedElections,
    upcomingElections,
    draftElections,
    isLoading,
    error,
    finalizeElection,
    refreshElections
  } = useElections();
  
  // Check if user has admin rights for an election
  const isElectionAdmin = (election) => {
    if (!election || !account) return false;
    
    // Super admin has access to all elections
    if (isAdmin()) return true;
    
    // In development mode with universal access, grant admin rights
    if (universalAccess && process.env.NODE_ENV === 'development') {
      return true;
    }
    
    // Check if user is the election admin
    return election.admin && election.admin.toLowerCase() === account.toLowerCase();
  };
  
  // Filter elections that the current user is admin for
  const filterUserElections = (elections) => {
    if (!account) return [];
    
    return elections.filter(election => {
      // Admin can see all elections
      if (isAdmin()) return true;
      
      // In development mode with universal access, show all elections
      if (universalAccess && process.env.NODE_ENV === 'development') {
        return true;
      }
      
      // Otherwise only show elections created by the user
      return election.admin && election.admin.toLowerCase() === account.toLowerCase();
    });
  };
  
  // Check universal access mode on component mount
  useEffect(() => {
    if (universalAccess && process.env.NODE_ENV === 'development') {
      setAccessMessage({
        type: 'warning',
        message: 'Universal Access Mode is enabled. All access controls are bypassed in this mode.'
      });
    } else {
      setAccessMessage(null);
    }
  }, [universalAccess]);
  
  // Get filtered elections based on active tab
  const getFilteredElections = () => {
    switch (activeTab) {
      case 'active':
        return filterUserElections(activeElections);
      case 'completed':
        return filterUserElections(completedElections);
      case 'upcoming':
        return filterUserElections(upcomingElections);
      case 'draft':
        return filterUserElections(draftElections);
      default:
        return filterUserElections(allElections);
    }
  };
  
  const filteredElections = getFilteredElections();
  
  /**
 * Handle finalization of an election with improved error handling and user feedback
 * @param {number} electionId - ID of the election to finalize
 */
const handleFinalizeElection = async (electionId) => {
  // Prevent multiple clicks
  if (processing) return;
  
  try {
    setProcessing(true);
    setStatusMessage({
      type: 'processing',
      message: `Finalizing election #${electionId}...`,
      details: 'Please wait and confirm the transaction in your wallet'
    });
    
    console.log(`Attempting to finalize election ${electionId}`);
    
    // First check if the election can be finalized
    const election = allElections.find(e => e.id === electionId);
    if (!election) {
      throw new Error(`Election ${electionId} not found`);
    }
    
    // Double-check status and end time
    const now = new Date();
    const endTime = new Date(election.endTime);
    
    if (now < endTime) {
      setStatusMessage({
        type: 'error',
        message: 'Election has not ended yet',
        details: `Election ends at ${endTime.toLocaleString()}`
      });
      return;
    }
    
    if (election.totalVotes === 0) {
      setStatusMessage({
        type: 'error',
        message: 'Cannot finalize an election with no votes',
        details: 'At least one vote must be cast before finalization'
      });
      return;
    }
    
    // Ask for confirmation
    const confirmFinalize = window.confirm(
      `Are you sure you want to finalize election "${election.title}"? This action cannot be undone.`
    );
    
    if (!confirmFinalize) {
      setStatusMessage(null);
      return;
    }
    
    // With all checks passed, try to finalize
    const result = await finalizeElection(electionId);
    
    setStatusMessage({
      type: 'success',
      message: 'Election finalized successfully!',
      details: `Transaction: ${result.transactionHash?.substring(0, 10)}...${result.transactionHash?.substring(result.transactionHash.length - 8)}`
    });
    
    // Refresh election data
    await refreshElections();
    
    // Clear success message after 5 seconds
    setTimeout(() => {
      setStatusMessage(prev => prev?.type === 'success' ? null : prev);
    }, 5000);
    
  } catch (err) {
    console.error('Error finalizing election:', err);
    
    // Handle specific errors with user-friendly messages
    let errorMessage = 'Failed to finalize election';
    let errorDetails = err.message;
    
    if (err.message.includes('not ended')) {
      errorMessage = 'Election has not ended yet';
      errorDetails = 'Please wait until the election end time has passed';
    } else if (err.message.includes('no votes')) {
      errorMessage = 'No votes cast in this election';
      errorDetails = 'At least one vote is required to finalize an election';
    } else if (err.message.includes('already finalized')) {
      errorMessage = 'Election is already finalized';
      errorDetails = 'This election has already been completed';
    } else if (err.message.toLowerCase().includes('rejected')) {
      errorMessage = 'Transaction rejected';
      errorDetails = 'The transaction was rejected by your wallet';
    }
    
    setStatusMessage({
      type: 'error',
      message: errorMessage,
      details: errorDetails
    });
    
    // Add an option to try again using mock mode in development
    if (process.env.NODE_ENV === 'development') {
      // Present retry option
      setTimeout(() => {
        const retryMock = window.confirm(
          'Would you like to retry using mock mode (no blockchain transaction)?\n\n' +
          'This is only available in development and will simulate a successful finalization.'
        );
        
        if (retryMock) {
          localStorage.setItem('bypass_blockchain', 'true');
          handleFinalizeElection(electionId);
        }
      }, 1000);
    }
    
  } finally {
    setProcessing(false);
  }
};
  
  // Handle election deletion
  const handleDeleteElection = (electionId) => {
    const election = allElections.find(e => e.id === electionId);
    
    // Check permissions
    if (!isElectionAdmin(election)) {
      console.error('Permission denied: Not the election admin');
      return;
    }
    
    setConfirmDelete(electionId);
  };
  
  // Navigate to voter registration management
  const handleManageRegistrations = (electionId) => {
    navigate(`/manage-registrations/${electionId}`);
  };
  
  // Navigate to enhanced voter management
  const handleEnhancedVoterManagement = (electionId) => {
    navigate(`/enhanced-voter-management/${electionId}`);
  };
  
  // Confirm election deletion
  const confirmDeleteElection = async () => {
    try {
      // In a real app, this would call a contract method to delete the election
      console.log(`Deleting election ${confirmDelete}`);
      
      // For now, just refresh the elections
      await refreshElections();
      setConfirmDelete(null);
    } catch (error) {
      console.error('Error deleting election:', error);
    }
  };
  
  // Handle election details view
  const handleViewDetails = (election) => {
    setSelectedElection(election);
  };
  
  // Create new election
  const handleCreateElection = () => {
    navigate('/create-election');
  };
  
  // Edit election
  const handleEditElection = (electionId) => {
    const election = allElections.find(e => e.id === electionId);
    
    // Check permissions
    if (!isElectionAdmin(election)) {
      console.error('Permission denied: Not the election admin');
      return;
    }
    
    navigate(`/edit-election/${electionId}`);
  };
  
  // View election results
  const handleViewResults = (electionId) => {
    navigate(`/election/${electionId}`);
  };
  
  // Manage candidates
  const handleManageCandidates = (electionId) => {
    const election = allElections.find(e => e.id === electionId);
    
    // Check permissions
    if (!isElectionAdmin(election)) {
      console.error('Permission denied: Not the election admin');
      return;
    }
    
    navigate(`/manage-candidates/${electionId}`);
  };
  
  // Get contract explorer URL
  const getContractUrl = (address) => {
    if (!address) return '';
    return getExplorerUrl('address', address);
  };
  
  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Election Management</h1>
        <Button
          variant="primary"
          onClick={handleCreateElection}
          className="flex items-center"
        >
          <Plus size={18} className="mr-2" />
          <span>Create New Election</span>
        </Button>
      </div>
      
      {/* Universal Access Warning */}
      {accessMessage && (
        <Card className="mb-6 bg-yellow-50 border-yellow-200">
          <div className="flex items-start">
            <AlertCircle className="mr-3 mt-0.5 text-yellow-600" size={20} />
            <div>
              <h3 className="font-bold text-yellow-800">{accessMessage.message}</h3>
            </div>
          </div>
        </Card>
      )}
      
      {error && (
        <Card className="mb-6 bg-red-50 border-red-200">
          <div className="flex items-start">
            <AlertCircle className="mr-3 mt-0.5 text-red-600" size={20} />
            <div>
              <h3 className="font-bold text-red-800">Error Loading Elections</h3>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
          <Button 
            variant="secondary"
            className="mt-4"
            onClick={refreshElections}
          >
            Retry
          </Button>
        </Card>
      )}
      
      <Card className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button 
              onClick={() => setActiveTab('all')}
              className={`px-6 py-4 font-medium text-sm ${
                activeTab === 'all' 
                  ? 'border-b-2 border-indigo-600 text-indigo-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              All Elections
            </button>
            <button 
              onClick={() => setActiveTab('active')}
              className={`px-6 py-4 font-medium text-sm ${
                activeTab === 'active' 
                  ? 'border-b-2 border-indigo-600 text-indigo-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Active
            </button>
            <button 
              onClick={() => setActiveTab('completed')}
              className={`px-6 py-4 font-medium text-sm ${
                activeTab === 'completed' 
                  ? 'border-b-2 border-indigo-600 text-indigo-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Completed
            </button>
            <button 
              onClick={() => setActiveTab('upcoming')}
              className={`px-6 py-4 font-medium text-sm ${
                activeTab === 'upcoming' 
                  ? 'border-b-2 border-indigo-600 text-indigo-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Upcoming
            </button>
          </nav>
        </div>
        
        {isLoading ? (
          <div className="p-6 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredElections.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-500 mb-4">No elections found in this category.</p>
            <Button
              variant="primary"
              onClick={handleCreateElection}
              className="flex items-center mx-auto"
            >
              <Plus size={18} className="mr-2" />
              <span>Create New Election</span>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Election Title
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timeline
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Candidates
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Participation
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredElections.map(election => (
                  <tr key={election.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{election.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={election.status} />
                      {election.status === 'upcoming' && (!election.candidates || election.candidates.length === 0) && (
                          <div className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full font-medium">
                            No Candidates
                          </div>
                        )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar size={16} className="mr-2" />
                        <span>{formatDate(election.startTime)} - {formatDate(election.endTime)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {election.candidates ? election.candidates.length : 0} candidates
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {election.status !== 'upcoming' ? (
                        <div>
                          <div className="flex items-center text-sm text-gray-500">
                            <Users size={16} className="mr-2" />
                            <span>
                              {election.totalVotes || 0}/
                              {election.voterCount || 0} voters 
                              ({Math.round(((election.totalVotes || 0) / Math.max(1, (election.voterCount || 0)))*100)}%)
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                            <div 
                              className="bg-indigo-600 h-1.5 rounded-full" 
                              style={{ width: `${Math.round(((election.totalVotes || 0) / Math.max(1, (election.voterCount || 0)))*100)}%` }}
                            ></div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Not started</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        {election.status === 'active' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewResults(election.id)}
                            className="px-2 py-1"
                          >
                            <Info size={16} />
                          </Button>
                        )}
                        
                        {election.status === 'ended' && !election.finalized && isElectionAdmin(election) && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleFinalizeElection(election.id)}
                            className="px-2 py-1"
                          >
                            Finalize
                          </Button>
                        )}
                        
                        {election.status === 'upcoming' && isElectionAdmin(election) && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditElection(election.id)}
                            className="px-2 py-1"
                          >
                            <Edit size={16} />
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteElection(election.id)}
                            className="px-2 py-1"
                          >
                            <Trash2 size={16} />
                          </Button>
                          
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleManageCandidates(election.id)}
                            className="px-2 py-1"
                          >
                            <UserPlus size={16} />
                          </Button>
                                                  
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleEnhancedVoterManagement(election.id)}
                            className="ml-2 flex items-center"
                          >
                            <Shield size={16} className="mr-1" />
                            Enhanced Access
                          </Button>

                
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleManageRegistrations(election.id)}
                            className="ml-2 flex items-center"
                          >
                            <Users size={16} className="mr-1" />
                            Basic Management
                          </Button>
                        </>
                      )}
                                        
                        
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleViewDetails(election)}
                          className="px-2 py-1"
                        >
                          <ChevronDown size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      
      {selectedElection && (
        <Card
          header={<Card.Title>Election Details: {selectedElection.title}</Card.Title>}
          footer={
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => setSelectedElection(null)}
            >
              Close
            </Button>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-50 p-5 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Contract Address</h3>
              <div className="flex items-center">
                <div className="font-mono text-sm text-gray-800 truncate">
                  {formatAddress(selectedElection.contractAddress || '0x3B9f...d5E4', 8, 4)}
                </div>
                <a 
                  href={getContractUrl(selectedElection.contractAddress)} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="ml-2 text-indigo-600 hover:text-indigo-800"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
            
            <div className="bg-gray-50 p-5 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Admin Address</h3>
              <div className="flex items-center">
                <div className="font-mono text-sm text-gray-800 truncate">
                  {formatAddress(selectedElection.admin, 8, 4)}
                </div>
                <a 
                  href={getExplorerUrl('address', selectedElection.admin)} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="ml-2 text-indigo-600 hover:text-indigo-800"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
            
            <div className="bg-gray-50 p-5 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Network Information</h3>
              <div className="text-sm text-gray-800">
                {selectedElection.network || 'Polygon Mumbai Testnet'}
              </div>
              <div className="flex items-center mt-3">
                <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                <div className="text-xs text-gray-600">Connected</div>
              </div>
            </div>
          </div>
          
          {selectedElection.description && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
              <p className="text-gray-700">{selectedElection.description}</p>
            </div>
          )}
          
          {selectedElection.candidates && selectedElection.candidates.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Candidates</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedElection.candidates.map(candidate => (
                  <div key={candidate.id} className="bg-gray-50 p-4 rounded-lg">
                    <div className="font-medium text-gray-800">{candidate.name}</div>
                    {candidate.platform && (
                      <div className="text-sm text-gray-600 mt-1">{candidate.platform}</div>
                    )}
                    {candidate.voteCount !== undefined && (
                      <div className="text-sm text-gray-500 mt-2">
                        Votes: {candidate.voteCount}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
      
      {/* Delete Confirmation Dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md mx-auto p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Confirm Deletion</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this election? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-4">
              <Button
                variant="secondary"
                onClick={() => setConfirmDelete(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={confirmDeleteElection}
              >
                Delete
              </Button>
              
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default ElectionManagement;