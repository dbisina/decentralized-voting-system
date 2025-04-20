import React, { useState, useEffect } from 'react';
import { 
  Check, X, Users, Search, Filter, ExternalLink, 
  Clock, Lock, Globe, UserCheck, UserX, Shield, 
  AlertTriangle, Info, Download, Upload
} from 'lucide-react';
import Button from '../common/Button';
import Card from '../common/Card';
import { useWeb3 } from '../../contexts/Web3Context';
import { useVoterRegistration } from '../../contexts/VoterRegistrationContext';
import IPFSRegistrationService from '../../services/ipfsRegistrationService';

/**
 * Enhanced Voter Management Component
 * Provides advanced voter registration management with role-based access control
 * 
 * @param {Object} election - Election data
 * @param {boolean} isAdmin - Whether the current user is an admin
 * @param {function} onNavigate - Navigation function for routing
 */
const EnhancedVoterManagement = ({ 
  election, 
  isAdmin = false,
  onNavigate
}) => {
  const { account } = useWeb3();
  const { 
    addAllowedVoter, 
    rejectVoterRegistration, 
    refreshRegistrations 
  } = useVoterRegistration();
  
  const [registrations, setRegistrations] = useState([]);
  const [filteredRegistrations, setFilteredRegistrations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedRegistrations, setSelectedRegistrations] = useState(new Set());
  const [processingBatch, setProcessingBatch] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [importData, setImportData] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  
  // Initialize IPFS service
  const ipfsService = new IPFSRegistrationService();
  
  // Load registrations for the election
  useEffect(() => {
    const loadRegistrationsData = async () => {
      if (!election?.id) return;
      
      try {
        setIsLoading(true);
        
        // Clear IPFS service cache to ensure fresh data
        ipfsService.clearCache();
        
        // Fetch registrations from IPFS
        const fetchedRegistrations = await ipfsService.getElectionRegistrations(election.id);
        
        setRegistrations(fetchedRegistrations);
        
        if (fetchedRegistrations.length > 0) {
          setStatusMessage({
            type: 'success',
            message: `Successfully loaded ${fetchedRegistrations.length} voter registrations`
          });
          
          // Auto-clear success message after 3 seconds
          setTimeout(() => {
            setStatusMessage(prev => 
              prev?.type === 'success' ? null : prev
            );
          }, 3000);
        } else {
          setStatusMessage({
            type: 'info',
            message: 'No registrations found for this election'
          });
        }
      } catch (error) {
        console.error('Error loading registrations:', error);
        setStatusMessage({
          type: 'error',
          message: 'Failed to load registrations. The API may be rate limited or experiencing issues.'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadRegistrationsData();
  }, [election?.id]);
  
  // Filter registrations based on search and status
  useEffect(() => {
    let filtered = [...registrations];
    
    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(reg => reg.status.toLowerCase() === filterStatus.toLowerCase());
    }
    
    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(reg => 
        (reg.fullName && reg.fullName.toLowerCase().includes(search)) ||
        (reg.email && reg.email.toLowerCase().includes(search)) ||
        (reg.identifier && reg.identifier.toLowerCase().includes(search)) ||
        (reg.walletAddress && reg.walletAddress.toLowerCase().includes(search))
      );
    }
    
    setFilteredRegistrations(filtered);
  }, [registrations, searchTerm, filterStatus]);
  
  // Handle approval of a single registration
  const handleApproveRegistration = async (registration) => {
    if (!isAdmin) {
      setStatusMessage({
        type: 'error',
        message: 'You do not have permission to approve registrations'
      });
      return;
    }
    
    try {
      setStatusMessage({
        type: 'processing',
        message: `Approving ${registration.fullName}'s registration...`
      });
      
      // Add the voter to the blockchain
      await addAllowedVoter(election.id, registration.walletAddress);
      
      // Update local state
      setRegistrations(regs => 
        regs.map(reg => 
          reg.walletAddress === registration.walletAddress 
            ? { ...reg, status: 'approved', approver: account } 
            : reg
        )
      );
      
      setStatusMessage({
        type: 'success',
        message: `Approved ${registration.fullName}'s registration`
      });
      
      // Auto-clear success message after 3 seconds
      setTimeout(() => {
        setStatusMessage(prev => 
          prev?.type === 'success' ? null : prev
        );
      }, 3000);
    } catch (error) {
      console.error('Error approving registration:', error);
      setStatusMessage({
        type: 'error',
        message: `Failed to approve registration: ${error.message}`
      });
    }
  };
  
  // Handle rejection of a single registration
  const handleRejectRegistration = async (registration) => {
    if (!isAdmin) {
      setStatusMessage({
        type: 'error',
        message: 'You do not have permission to reject registrations'
      });
      return;
    }
    
    try {
      setStatusMessage({
        type: 'processing',
        message: `Rejecting ${registration.fullName}'s registration...`
      });
      
      // Update registration status
      await rejectVoterRegistration(election.id, registration.walletAddress);
      
      // Update local state
      setRegistrations(regs => 
        regs.map(reg => 
          reg.walletAddress === registration.walletAddress 
            ? { ...reg, status: 'rejected', approver: account } 
            : reg
        )
      );
      
      setStatusMessage({
        type: 'success',
        message: `Rejected ${registration.fullName}'s registration`
      });
      
      // Auto-clear success message after 3 seconds
      setTimeout(() => {
        setStatusMessage(prev => 
          prev?.type === 'success' ? null : prev
        );
      }, 3000);
    } catch (error) {
      console.error('Error rejecting registration:', error);
      setStatusMessage({
        type: 'error',
        message: `Failed to reject registration: ${error.message}`
      });
    }
  };
  
  // Handle batch approval/rejection
  const handleBatchAction = async (action) => {
    if (selectedRegistrations.size === 0 || !isAdmin) return;
    
    try {
      setProcessingBatch(true);
      setStatusMessage({
        type: 'processing',
        message: `Processing batch ${action}...`
      });
      
      // Process each selected registration
      const promises = [];
      for (const walletAddress of selectedRegistrations) {
        const registration = registrations.find(r => r.walletAddress === walletAddress);
        if (registration && registration.status === 'pending') {
          if (action === 'approve') {
            promises.push(addAllowedVoter(election.id, walletAddress));
          } else if (action === 'reject') {
            promises.push(rejectVoterRegistration(election.id, walletAddress));
          }
        }
      }
      
      // Wait for all operations to complete
      await Promise.all(promises);
      
      // Update local state
      setRegistrations(regs => 
        regs.map(reg => 
          selectedRegistrations.has(reg.walletAddress) && reg.status === 'pending'
            ? { ...reg, status: action === 'approve' ? 'approved' : 'rejected', approver: account }
            : reg
        )
      );
      
      setSelectedRegistrations(new Set());
      setStatusMessage({
        type: 'success',
        message: `Successfully processed batch ${action}`
      });
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setStatusMessage(prev => 
          prev?.type === 'success' ? null : prev
        );
      }, 3000);
    } catch (error) {
      console.error('Error processing batch action:', error);
      setStatusMessage({
        type: 'error',
        message: 'Failed to process batch action. Please try again.'
      });
    } finally {
      setProcessingBatch(false);
    }
  };
  
  // Toggle selection for batch actions
  const toggleSelection = (voterAddress) => {
    const newSelection = new Set(selectedRegistrations);
    if (newSelection.has(voterAddress)) {
      newSelection.delete(voterAddress);
    } else {
      newSelection.add(voterAddress);
    }
    setSelectedRegistrations(newSelection);
  };
  
  // Toggle select all
  const toggleSelectAll = () => {
    const allPending = filteredRegistrations
      .filter(reg => reg.status === 'pending')
      .map(reg => reg.walletAddress);
    
    if (selectedRegistrations.size === allPending.length) {
      setSelectedRegistrations(new Set());
    } else {
      setSelectedRegistrations(new Set(allPending));
    }
  };
  
  // Get status badge color
  const getStatusColor = (status) => {
    const statusLower = status?.toLowerCase() || 'pending';
    switch (statusLower) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'blacklisted':
        return 'bg-gray-800 text-white';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Export voter data
  const handleExportData = () => {
    if (registrations.length === 0) return;
    
    try {
      // Format data for export
      const exportData = filteredRegistrations.map(reg => ({
        fullName: reg.fullName || '',
        email: reg.email || '',
        walletAddress: reg.walletAddress || '',
        status: reg.status || 'pending',
        registrationTime: reg.timestamp || '',
        identifier: reg.identifier || ''
      }));
      
      // Convert to CSV
      const headers = Object.keys(exportData[0]);
      const csvData = [
        headers.join(','),
        ...exportData.map(row => headers.map(field => `"${row[field]}"`).join(','))
      ].join('\n');
      
      // Create download link
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `voters_${election.id}_${new Date().toISOString().slice(0,10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setStatusMessage({
        type: 'success',
        message: 'Voter data exported successfully'
      });
      
      setTimeout(() => {
        setStatusMessage(prev => prev?.type === 'success' ? null : prev);
      }, 3000);
    } catch (error) {
      console.error('Error exporting data:', error);
      setStatusMessage({
        type: 'error',
        message: 'Failed to export voter data'
      });
    }
  };
  
  // Calculate statistics
  const stats = {
    total: registrations.length,
    pending: registrations.filter(r => r.status === 'pending').length,
    approved: registrations.filter(r => r.status === 'approved').length,
    rejected: registrations.filter(r => r.status === 'rejected' || r.status === 'blacklisted').length
  };
  
  // Generate registration link
  const getRegistrationLink = () => {
    if (!election) return '';
    
    // Generate a code if none exists
    const registrationCode = election.registrationCode || 
      Math.random().toString(36).substring(2, 10);
    
    return `${window.location.origin}/register/${election.id}/${registrationCode}`;
  };
  
  // Copy registration link to clipboard
  const copyRegistrationLink = () => {
    const link = getRegistrationLink();
    navigator.clipboard.writeText(link);
    setStatusMessage({
      type: 'success',
      message: 'Registration link copied to clipboard'
    });
    
    setTimeout(() => {
      setStatusMessage(prev => prev?.type === 'success' ? null : prev);
    }, 3000);
  };
  
  // If not admin, show access denied
  if (!isAdmin) {
    return (
      <Card className="bg-red-50 border-red-200">
        <div className="flex items-start">
          <AlertTriangle size={20} className="mr-3 mt-0.5 flex-shrink-0 text-red-600" />
          <div>
            <h3 className="font-bold text-red-800 mb-1">Access Denied</h3>
            <p className="text-red-700">You do not have permission to manage voter registrations for this election.</p>
          </div>
        </div>
        <Button 
          variant="primary"
          className="mt-4"
          onClick={() => onNavigate?.('/dashboard')}
        >
          Return to Dashboard
        </Button>
      </Card>
    );
  }
  
  // If loading
  if (isLoading && registrations.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }
  
  return (
    <div>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-800">{stats.total}</div>
            <div className="text-sm text-gray-500">Total Registrations</div>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-gray-500">Pending</div>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{stats.approved}</div>
            <div className="text-sm text-gray-500">Approved</div>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600">{stats.rejected}</div>
            <div className="text-sm text-gray-500">Rejected/Blacklisted</div>
          </div>
        </Card>
      </div>
      
      {/* Registration Link */}
      <Card className="mb-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Registration Link</h2>
        <p className="text-gray-600 mb-4">
          Share this link with potential voters to allow them to register for this election.
        </p>
        
        <div className="flex items-center bg-gray-50 p-3 rounded-md">
          <input
            type="text"
            value={getRegistrationLink()}
            readOnly
            className="flex-1 bg-transparent border-none focus:outline-none font-mono text-sm"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={copyRegistrationLink}
            className="ml-2 flex items-center"
          >
            <ExternalLink size={16} className="mr-1" />
            Copy
          </Button>
        </div>
        
        <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-200">
          <div className="flex items-start">
            <Info size={20} className="text-blue-600 mr-3 mt-1 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <h3 className="font-bold mb-1">Important:</h3>
              <p>After approving a voter registration, they will be added to the blockchain's allowedVoters list. Make sure to verify their identity before approval.</p>
            </div>
          </div>
        </div>
        
        <div className="flex justify-between mt-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportData}
            className="flex items-center"
            disabled={registrations.length === 0}
          >
            <Download size={16} className="mr-1" />
            Export Voter Data
          </Button>
          
          {process.env.NODE_ENV === 'development' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowImportModal(true)}
              className="flex items-center"
            >
              <Upload size={16} className="mr-1" />
              Import Test Data
            </Button>
          )}
        </div>
      </Card>
      
      {/* Status Message */}
      {statusMessage && (
        <div className={`mb-6 p-4 rounded-md ${
          statusMessage.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' : 
          statusMessage.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
          statusMessage.type === 'processing' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
          'bg-blue-50 text-blue-800 border border-blue-200'
        }`}>
          <div className="flex items-center">
            {statusMessage.type === 'processing' ? (
              <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full mr-2 flex-shrink-0"></div>
            ) : statusMessage.type === 'error' ? (
              <AlertTriangle size={20} className="mr-2 flex-shrink-0" />
            ) : statusMessage.type === 'success' ? (
              <Check size={20} className="mr-2 flex-shrink-0" />
            ) : (
              <Info size={20} className="mr-2 flex-shrink-0" />
            )}
            <div>{statusMessage.message}</div>
          </div>
        </div>
      )}
      
      {/* Voter Table */}
      <Card>
        <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
          <h2 className="text-lg font-bold text-gray-800">Voter Registrations</h2>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial sm:min-w-[300px]">
              <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search registrations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                ipfsService.clearCache();
                // Re-load registrations
                setIsLoading(true);
                setTimeout(() => {
                  ipfsService.getElectionRegistrations(election.id)
                    .then(fetchedRegistrations => {
                      setRegistrations(fetchedRegistrations);
                      setIsLoading(false);
                    })
                    .catch(error => {
                      console.error('Error refreshing registrations:', error);
                      setIsLoading(false);
                    });
                }, 500);
              }}
              disabled={isLoading}
              className="flex items-center flex-shrink-0"
            >
              <Clock size={16} className={`mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
        
        <div className="mb-4 flex flex-wrap gap-2">
          <Button
            variant={filterStatus === 'all' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('all')}
          >
            All ({stats.total})
          </Button>
          <Button
            variant={filterStatus === 'pending' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('pending')}
          >
            Pending ({stats.pending})
          </Button>
          <Button
            variant={filterStatus === 'approved' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('approved')}
          >
            Approved ({stats.approved})
          </Button>
          <Button
            variant={filterStatus === 'rejected' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('rejected')}
          >
            Rejected ({stats.rejected})
          </Button>
        </div>
        
        {/* Batch Actions */}
        {selectedRegistrations.size > 0 && (
          <div className="mb-4 p-3 bg-indigo-50 rounded-md flex justify-between items-center">
            <div className="text-indigo-800">
              <span className="font-medium">{selectedRegistrations.size}</span> registrations selected
            </div>
            <div className="flex gap-2">
              <Button
                variant="success"
                size="sm"
                onClick={() => handleBatchAction('approve')}
                disabled={processingBatch}
                className="flex items-center"
              >
                <Check size={16} className="mr-1" />
                Approve Selected
              </Button>
              
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleBatchAction('reject')}
                disabled={processingBatch}
                className="flex items-center"
              >
                <X size={16} className="mr-1" />
                Reject Selected
              </Button>
            </div>
          </div>
        )}
        
        {/* Registrations Table */}
        {isLoading ? (
          <div className="py-8 flex justify-center">
            <div className="animate-spin h-8 w-8 border-b-2 border-indigo-600 rounded-full"></div>
          </div>
        ) : registrations.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
            <Users size={48} className="text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-800 mb-2">No Voter Registrations</h3>
            <p className="text-gray-500 mb-6">
              No one has registered for this election yet. Share the registration link to get started.
            </p>
            <Button
              variant="primary"
              onClick={copyRegistrationLink}
              className="flex items-center mx-auto"
            >
              <ExternalLink size={16} className="mr-1" />
              Copy Registration Link
            </Button>
          </div>
        ) : filteredRegistrations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No registrations match your search or filter criteria.</p>
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterStatus('all');
              }}
              className="text-indigo-600 hover:text-indigo-800 mt-2"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      checked={selectedRegistrations.size === filteredRegistrations.filter(r => r.status === 'pending').length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Voter
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Address
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Registration Time
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Verification
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRegistrations.map((registration, index) => {
                  const verificationData = registration.verificationData 
                    ? (typeof registration.verificationData === 'string' 
                        ? JSON.parse(registration.verificationData) 
                        : registration.verificationData)
                    : null;
                  
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(registration.status)}`}>
                          {registration.status || 'pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {verificationData?.socialMediaLink ? (
                          <a href={verificationData.socialMediaLink} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-900">
                            View Profile <ExternalLink size={14} className="inline ml-1" />
                          </a>
                        ) : (
                          <span className="text-gray-400">No verification data</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {registration.status === 'pending' && (
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="success"
                              size="sm"
                              onClick={() => handleApproveRegistration(registration)}
                              className="p-1"
                            >
                              <Check size={16} />
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleRejectRegistration(registration)}
                              className="p-1"
                            >
                              <X size={16} />
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleRejectRegistration({...registration, status: 'blacklisted'})}
                              className="p-1"
                            >
                              <Shield size={16} />
                            </Button>
                          </div>
                        )}
                        {(registration.status === 'approved' || registration.status === 'rejected') && (
                          <div className="text-xs text-gray-400">
                            {registration.approver 
                              ? `By: ${registration.approver.slice(0, 6)}...` 
                              : ''}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      
      {/* Election Type Indicator */}
      <div className="mt-8 flex justify-between items-center">
        <div className="flex items-center">
          {election?.electionType === 'PUBLIC' ? (
            <div className="flex items-center text-green-600">
              <Globe size={20} className="mr-2" />
              <span>Public Election - Automatic Approval</span>
            </div>
          ) : election?.electionType === 'PRIVATE' ? (
            <div className="flex items-center text-blue-600">
              <Lock size={20} className="mr-2" />
              <span>Private Election - Manual Approval Required</span>
            </div>
          ) : (
            <div className="flex items-center text-purple-600">
              <Users size={20} className="mr-2" />
              <span>Organization Election - Members Only</span>
            </div>
          )}
        </div>
        
        <Button 
          variant="secondary"
          onClick={() => onNavigate?.('/manage')}
        >
          Back to Election Management
        </Button>
      </div>
      
      {/* Import Modal for Dev Only */}
      {showImportModal && process.env.NODE_ENV === 'development' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Import Test Data</h3>
            <p className="text-gray-600 mb-4">
              Generate test voter registrations for development purposes.
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of registrations
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={importData?.count || 5}
                onChange={(e) => setImportData({
                  ...importData,
                  count: parseInt(e.target.value) || 5
                })}
                className="w-full border border-gray-300 rounded-md py-2 px-3"
              />
            </div>
            
            <div className="flex justify-end space-x-4">
              <Button
                variant="secondary"
                onClick={() => setShowImportModal(false)}
              >
                Cancel
              </Button>
              
              <Button
                variant="primary"
                onClick={async () => {
                  try {
                    setStatusMessage({
                      type: 'processing',
                      message: 'Generating test data...'
                    });
                    
                    await ipfsService.generateTestRegistrations(
                      election.id,
                      importData?.count || 5
                    );
                    
                    // Reload data
                    const fetchedRegistrations = await ipfsService.getElectionRegistrations(election.id);
                    setRegistrations(fetchedRegistrations);
                    
                    setStatusMessage({
                      type: 'success',
                      message: 'Test data generated successfully'
                    });
                    
                    setShowImportModal(false);
                  } catch (error) {
                    console.error('Error generating test data:', error);
                    setStatusMessage({
                      type: 'error',
                      message: 'Failed to generate test data'
                    });
                  }
                }}
              >
                Generate Test Data
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedVoterManagement;