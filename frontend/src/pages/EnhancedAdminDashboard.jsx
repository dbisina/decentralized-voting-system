import React, { useState, useEffect } from 'react';
import { Check, X, Users, Search, Filter, ExternalLink, Clock, Lock, Globe, UserCheck, UserX, Shield } from 'lucide-react';

const EnhancedAdminDashboard = ({ 
  electionId = "1",
  isAdmin = true,
  onNavigate
}) => {
  const [election, setElection] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [filteredRegistrations, setFilteredRegistrations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedRegistrations, setSelectedRegistrations] = useState(new Set());
  const [processingBatch, setProcessingBatch] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  
  // Mock data for demonstration
  useEffect(() => {
    // Simulate loading election data
    setTimeout(() => {
      setElection({
        id: electionId,
        title: "Annual General Meeting Election",
        electionType: "PRIVATE",
        status: "REGISTRATION",
        registrationStartTime: new Date(Date.now() - 86400000),
        votingStartTime: new Date(Date.now() + 86400000),
        votingEndTime: new Date(Date.now() + 172800000),
        totalVotes: 0,
        candidateCount: 3
      });
      
      // Simulate loading registrations
      setRegistrations([
        {
          voterAddress: "0x1234567890123456789012345678901234567890",
          name: "Alice Johnson",
          email: "alice@example.com",
          status: "PENDING",
          registrationTime: new Date(Date.now() - 3600000),
          verificationData: JSON.stringify({
            socialMediaLink: "https://twitter.com/alice_voter",
            timestamp: new Date(Date.now() - 3600000)
          })
        },
        {
          voterAddress: "0x2345678901234567890123456789012345678901",
          name: "Bob Smith",
          email: "bob@example.com",
          status: "APPROVED",
          registrationTime: new Date(Date.now() - 7200000),
          approver: "0xadmin123...",
          verificationData: JSON.stringify({
            socialMediaLink: "https://linkedin.com/in/bob-smith",
            timestamp: new Date(Date.now() - 7200000)
          })
        },
        {
          voterAddress: "0x3456789012345678901234567890123456789012",
          name: "Charlie Brown",
          email: "charlie@example.com",
          status: "REJECTED",
          registrationTime: new Date(Date.now() - 10800000),
          approver: "0xadmin456...",
          verificationData: null
        },
        {
          voterAddress: "0x4567890123456789012345678901234567890123",
          name: "Diana Prince",
          email: "diana@example.com",
          status: "PENDING",
          registrationTime: new Date(Date.now() - 1800000),
          verificationData: JSON.stringify({
            socialMediaLink: "https://github.com/diana-prince",
            timestamp: new Date(Date.now() - 1800000)
          })
        },
        {
          voterAddress: "0x5678901234567890123456789012345678901234",
          name: "Eve Wilson",
          email: "eve@example.com",
          status: "BLACKLISTED",
          registrationTime: new Date(Date.now() - 14400000),
          approver: "0xsuperadmin789...",
          verificationData: null
        }
      ]);
      
      setIsLoading(false);
    }, 1500);
  }, [electionId]);
  
  // Filter registrations based on search and status
  useEffect(() => {
    let filtered = [...registrations];
    
    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(reg => reg.status.toLowerCase() === filterStatus);
    }
    
    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(reg => 
        reg.name.toLowerCase().includes(search) ||
        reg.email.toLowerCase().includes(search) ||
        reg.voterAddress.toLowerCase().includes(search)
      );
    }
    
    setFilteredRegistrations(filtered);
  }, [registrations, searchTerm, filterStatus]);
  
  // Handle status update for a single registration
  const handleStatusUpdate = async (registration, newStatus) => {
    try {
      // Simulate blockchain transaction
      setStatusMessage({
        type: 'processing',
        message: `Updating status to ${newStatus}...`
      });
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Update local state
      setRegistrations(regs => 
        regs.map(reg => 
          reg.voterAddress === registration.voterAddress 
            ? { ...reg, status: newStatus, approver: "0xcurrentadmin" }
            : reg
        )
      );
      
      setStatusMessage({
        type: 'success',
        message: `Successfully updated status to ${newStatus}`
      });
      
      // Clear success message after 3 seconds
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (error) {
      setStatusMessage({
        type: 'error',
        message: 'Failed to update status. Please try again.'
      });
    }
  };
  
  // Handle batch approval/rejection
  const handleBatchAction = async (action) => {
    if (selectedRegistrations.size === 0) return;
    
    try {
      setProcessingBatch(true);
      setStatusMessage({
        type: 'processing',
        message: `Processing batch ${action}...`
      });
      
      // Simulate blockchain batch transaction
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update local state
      setRegistrations(regs => 
        regs.map(reg => 
          selectedRegistrations.has(reg.voterAddress) && reg.status === 'PENDING'
            ? { ...reg, status: action.toUpperCase(), approver: "0xcurrentadmin" }
            : reg
        )
      );
      
      setSelectedRegistrations(new Set());
      setStatusMessage({
        type: 'success',
        message: `Successfully processed batch ${action}`
      });
      
      // Clear success message after 3 seconds
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (error) {
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
      .filter(reg => reg.status === 'PENDING')
      .map(reg => reg.voterAddress);
    
    if (selectedRegistrations.size === allPending.length) {
      setSelectedRegistrations(new Set());
    } else {
      setSelectedRegistrations(new Set(allPending));
    }
  };
  
  // Get status badge color
  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
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
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Voter Registration Management</h1>
          <p className="mt-2 text-gray-600">Manage voter registrations for {election?.title}</p>
        </div>
        
        {/* Status Message */}
        {statusMessage && (
          <div className={`mb-6 p-4 rounded-md ${
            statusMessage.type === 'success' ? 'bg-green-50 text-green-800' :
            statusMessage.type === 'error' ? 'bg-red-50 text-red-800' :
            'bg-blue-50 text-blue-800'
          }`}>
            <div className="flex items-center">
              {statusMessage.type === 'processing' && (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {statusMessage.message}
            </div>
          </div>
        )}
        
        {/* Election Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Registrations</p>
                <p className="text-2xl font-bold text-gray-900">{registrations.length}</p>
              </div>
              <Users className="text-indigo-500" size={24} />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {registrations.filter(r => r.status === 'PENDING').length}
                </p>
              </div>
              <Clock className="text-yellow-500" size={24} />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Approved</p>
                <p className="text-2xl font-bold text-green-600">
                  {registrations.filter(r => r.status === 'APPROVED').length}
                </p>
              </div>
              <UserCheck className="text-green-500" size={24} />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Rejected/Blacklisted</p>
                <p className="text-2xl font-bold text-red-600">
                  {registrations.filter(r => r.status === 'REJECTED' || r.status === 'BLACKLISTED').length}
                </p>
              </div>
              <UserX className="text-red-500" size={24} />
            </div>
          </div>
        </div>
        
        {/* Actions and Filters */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search by name, email, or address..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
                />
              </div>
              
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="blacklisted">Blacklisted</option>
              </select>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                className={`bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center ${
                  selectedRegistrations.size === 0 || processingBatch ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                onClick={() => handleBatchAction('approved')}
                disabled={selectedRegistrations.size === 0 || processingBatch}
              >
                <Check size={18} className="mr-2" />
                Approve Selected ({selectedRegistrations.size})
              </button>
              
              <button
                className={`bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 flex items-center ${
                  selectedRegistrations.size === 0 || processingBatch ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                onClick={() => handleBatchAction('rejected')}
                disabled={selectedRegistrations.size === 0 || processingBatch}
              >
                <X size={18} className="mr-2" />
                Reject Selected
              </button>
            </div>
          </div>
        </div>
        
        {/* Registrations Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      checked={selectedRegistrations.size === filteredRegistrations.filter(r => r.status === 'PENDING').length}
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
                {filteredRegistrations.map((registration) => {
                  const verificationData = registration.verificationData ? JSON.parse(registration.verificationData) : null;
                  
                  return (
                    <tr key={registration.voterAddress} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {registration.status === 'PENDING' && (
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            checked={selectedRegistrations.has(registration.voterAddress)}
                            onChange={() => toggleSelection(registration.voterAddress)}
                          />
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{registration.name}</div>
                            <div className="text-sm text-gray-500">{registration.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="font-mono text-sm text-gray-500">
                            {registration.voterAddress.slice(0, 6)}...{registration.voterAddress.slice(-4)}
                          </span>
                          <ExternalLink size={14} className="ml-2 text-gray-400" />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {registration.registrationTime.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(registration.status)}`}>
                          {registration.status}
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
                        {registration.status === 'PENDING' && (
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => handleStatusUpdate(registration, 'APPROVED')}
                              className="text-green-600 hover:text-green-900"
                            >
                              <Check size={18} />
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(registration, 'REJECTED')}
                              className="text-red-600 hover:text-red-900"
                            >
                              <X size={18} />
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(registration, 'BLACKLISTED')}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              <Shield size={18} />
                            </button>
                          </div>
                        )}
                        {registration.status === 'REJECTED' && (
                          <button
                            onClick={() => handleStatusUpdate(registration, 'BLACKLISTED')}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            <Shield size={18} />
                          </button>
                        )}
                        {registration.approver && (
                          <div className="text-xs text-gray-400 mt-1">
                            Approved by: {registration.approver.slice(0, 6)}...
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        
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
          
          <button 
            className="text-gray-600 hover:text-gray-800"
            onClick={() => onNavigate?.('/manage')}
          >
            ← Back to Election Management
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnhancedAdminDashboard;