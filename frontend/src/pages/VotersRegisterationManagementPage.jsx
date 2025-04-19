import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Check, X, Users, Copy, ExternalLink, AlertTriangle, RefreshCw, Search, Plus, Info } from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import useElections from '../hooks/useElections';
import { useWeb3 } from '../contexts/Web3Context';
import IPFSRegistrationService from '../services/ipfsRegistrationService';

// Define a proxy service for handling CORS issues (only in development)
const corsProxyUrl = process.env.NODE_ENV === 'development' 
  ? 'https://corsproxy.io/?' 
  : '';

const VoterRegistrationManagementPage = () => {
    const { electionId } = useParams();
    const navigate = useNavigate();
    const { account } = useWeb3();
    const { allElections, addAllowedVoter, refreshElections } = useElections();
    
    // Initialize IPFS service
    const ipfsService = new IPFSRegistrationService();
    
    const [election, setElection] = useState(null);
    const [registrations, setRegistrations] = useState([]);
    const [filteredRegistrations, setFilteredRegistrations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [statusMessage, setStatusMessage] = useState(null);
    const [registrationLink, setRegistrationLink] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [processingIds, setProcessingIds] = useState(new Set());
    const [viewOption, setViewOption] = useState('pending'); // 'all', 'pending', 'approved', 'rejected'
    
    // Generate a registration code if none exists
    useEffect(() => {
        if (election && !election.registrationCode) {
            const newCode = Math.random().toString(36).substring(2, 10);
            setRegistrationLink(`${window.location.origin}/register/${electionId}/${newCode}`);
        } else if (election?.registrationCode) {
            setRegistrationLink(`${window.location.origin}/register/${electionId}/${election.registrationCode}`);
        }
    }, [election, electionId]);
    
    // Load election data
    useEffect(() => {
        if (allElections.length > 0 && electionId) {
            const foundElection = allElections.find(e => e.id === parseInt(electionId));
            if (foundElection) {
                setElection(foundElection);
            }
        }
    }, [allElections, electionId]);
    
    // Filter registrations when they change or search/view options change
    useEffect(() => {
        let filtered = [...registrations];
        
        // Apply status filter
        if (viewOption !== 'all') {
            filtered = filtered.filter(reg => reg.status === viewOption);
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
    }, [registrations, searchTerm, viewOption]);
    
    // Load all registrations for this election using CORS proxy if needed
    const loadRegistrations = async () => {
        try {
            setIsLoading(true);
            setStatusMessage(null);
            
            // Fetch registrations from IPFS
            const fetchedRegistrations = await ipfsService.getElectionRegistrations(electionId);
            
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
                message: 'Failed to load registrations. The API may be rate limited or experiencing CORS issues.'
            });
        } finally {
            setIsLoading(false);
        }
    };
    
    // Load registrations when component mounts
    useEffect(() => {
        if (electionId) {
            loadRegistrations();
        }
    }, [electionId]);
    
    // Handle approval of a registration
    const handleApproveRegistration = async (registration) => {
        if (processingIds.has(registration.walletAddress)) {
            return; // Prevent multiple submissions
        }
        
        try {
            // Add to processing set
            setProcessingIds(prev => new Set([...prev, registration.walletAddress]));
            
            // Update registration status in IPFS via Pinata
            await ipfsService.updateRegistrationStatus(registration, 'approved');
            
            // THIS IS THE CRITICAL PART - Add the voter to the blockchain
            const blockchainSuccess = await addAllowedVoter(electionId, registration.walletAddress);
            
            if (!blockchainSuccess) {
                // If blockchain registration fails, show warning but continue
                console.warn(`Blockchain registration failed for ${registration.walletAddress}`);
                setStatusMessage({
                    type: 'warning',
                    message: `Approved ${registration.fullName}'s registration but blockchain registration may have failed. They might not be able to vote.`
                });
            }
            
            // Update local state for UI
            setRegistrations(prev => 
                prev.map(r => 
                    r.walletAddress === registration.walletAddress 
                        ? { ...r, status: 'approved' } 
                        : r
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
        } finally {
            // Remove from processing set
            setProcessingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(registration.walletAddress);
                return newSet;
            });
        }
    };
    
    // Handle rejection of a registration
    const handleRejectRegistration = async (registration) => {
        if (processingIds.has(registration.walletAddress)) {
            return; // Prevent multiple submissions
        }
        
        try {
            // Add to processing set
            setProcessingIds(prev => new Set([...prev, registration.walletAddress]));
            
            // Update registration status in IPFS
            await ipfsService.updateRegistrationStatus(registration, 'rejected');
            
            // Update local state
            setRegistrations(prev => 
                prev.map(r => 
                    r.walletAddress === registration.walletAddress 
                        ? { ...r, status: 'rejected' } 
                        : r
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
        } finally {
            // Remove from processing set
            setProcessingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(registration.walletAddress);
                return newSet;
            });
        }
    };
    
    // Copy registration link to clipboard
    const copyRegistrationLink = () => {
        navigator.clipboard.writeText(registrationLink);
        setStatusMessage({
            type: 'success',
            message: 'Registration link copied to clipboard'
        });
        
        // Auto-clear success message after 3 seconds
        setTimeout(() => {
            setStatusMessage(prev => 
                prev?.type === 'success' ? null : prev
            );
        }, 3000);
    };
    
    // Check if user has permission to manage this election
    const hasPermission = () => {
        if (!election || !account) return false;
        return election.admin && election.admin.toLowerCase() === account.toLowerCase();
    };
    
    // Create dummy registrations for testing
    const handleAddTestRegistrations = async () => {
        try {
            setIsLoading(true);
            setStatusMessage({
                type: 'info',
                message: 'Creating test registrations...'
            });
            
            // Generate 5 test registrations
            await ipfsService.generateTestRegistrations(electionId, 5);
            
            // Reload registrations
            await loadRegistrations();
            
            setStatusMessage({
                type: 'success',
                message: 'Added test registrations successfully'
            });
        } catch (error) {
            console.error('Error adding test registrations:', error);
            setStatusMessage({
                type: 'error',
                message: `Failed to add test registrations: ${error.message}`
            });
        } finally {
            setIsLoading(false);
        }
    };
    
    // Calculate stats
    const stats = {
        total: registrations.length,
        pending: registrations.filter(r => r.status === 'pending').length,
        approved: registrations.filter(r => r.status === 'approved').length,
        rejected: registrations.filter(r => r.status === 'rejected').length
    };
    
    if (!election && !isLoading) {
        return (
            <DashboardLayout>
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">Election Not Found</h1>
                </div>
                
                <Card className="bg-red-50 border-red-200">
                    <div className="text-red-800">
                        <p className="font-bold mb-2">The requested election could not be found.</p>
                        <p>The election may have been deleted or the ID is incorrect.</p>
                        <Button 
                            variant="primary"
                            className="mt-6"
                            onClick={() => navigate('/manage')}
                        >
                            Back to Management
                        </Button>
                    </div>
                </Card>
            </DashboardLayout>
        );
    }
    
    // Loading state
    if (isLoading && registrations.length === 0) {
        return (
            <DashboardLayout>
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">Voter Registration Management</h1>
                    <p className="text-gray-600 mt-1">
                        Loading registration data...
                    </p>
                </div>
                
                <Card>
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    </div>
                </Card>
            </DashboardLayout>
        );
    }
    
    // If not the admin of this election, show access denied
    if (!hasPermission()) {
        return (
            <DashboardLayout>
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">Access Denied</h1>
                </div>
                
                <Card className="bg-red-50 border-red-200">
                    <div className="text-red-800">
                        <p className="font-bold mb-2">You do not have permission to manage registrations for this election.</p>
                        <p>Only the election administrator can manage voter registrations.</p>
                        <Button 
                            variant="primary"
                            className="mt-6"
                            onClick={() => navigate('/manage')}
                        >
                            Back to Management
                        </Button>
                    </div>
                </Card>
            </DashboardLayout>
        );
    }
    
    return (
        <DashboardLayout>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Voter Registration Management</h1>
                <p className="text-gray-600 mt-1">
                    Manage voter registrations for {election?.title || 'this election'}
                </p>
            </div>
            
            {statusMessage && (
                <div className={`mb-6 p-4 rounded-md flex items-start ${
                    statusMessage.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 
                    statusMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
                    'bg-blue-50 text-blue-700 border border-blue-200'
                }`}>
                    {statusMessage.type === 'error' ? 
                        <AlertTriangle size={20} className="mr-3 mt-0.5 flex-shrink-0" /> : 
                        statusMessage.type === 'success' ? 
                        <Check size={20} className="mr-3 mt-0.5 flex-shrink-0" /> :
                        <Info size={20} className="mr-3 mt-0.5 flex-shrink-0" />
                    }
                    <div>{statusMessage.message}</div>
                </div>
            )}
            
            {/* Registration Stats */}
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
                        <div className="text-sm text-gray-500">Rejected</div>
                    </div>
                </Card>
            </div>
            
            <Card className="mb-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4">Registration Link</h2>
                <p className="text-gray-600 mb-4">
                    Share this link with potential voters to allow them to register for this election.
                </p>
                
                <div className="flex items-center bg-gray-50 p-3 rounded-md">
                    <input
                        type="text"
                        value={registrationLink}
                        readOnly
                        className="flex-1 bg-transparent border-none focus:outline-none font-mono text-sm"
                    />
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={copyRegistrationLink}
                        className="ml-2 flex items-center"
                    >
                        <Copy size={16} className="mr-1" />
                        Copy
                    </Button>
                </div>
                
                {/* Add option for testing */}
                {process.env.NODE_ENV === 'development' && (
                    <div className="mt-4 p-3 bg-yellow-50 rounded-md border border-yellow-200">
                        <h3 className="text-sm font-medium text-yellow-800 mb-2">Development Tools</h3>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleAddTestRegistrations}
                            disabled={isLoading}
                            className="flex items-center"
                        >
                            <Plus size={16} className="mr-1" />
                            Add Test Registrations
                        </Button>
                    </div>
                )}
            </Card>
            
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
                            onClick={loadRegistrations}
                            disabled={isLoading}
                            className="flex items-center flex-shrink-0"
                        >
                            <RefreshCw size={16} className={`mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                    </div>
                </div>
                
                <div className="mb-4 flex flex-wrap gap-2">
                    <Button
                        variant={viewOption === 'all' ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => setViewOption('all')}
                    >
                        All ({stats.total})
                    </Button>
                    <Button
                        variant={viewOption === 'pending' ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => setViewOption('pending')}
                    >
                        Pending ({stats.pending})
                    </Button>
                    <Button
                        variant={viewOption === 'approved' ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => setViewOption('approved')}
                    >
                        Approved ({stats.approved})
                    </Button>
                    <Button
                        variant={viewOption === 'rejected' ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => setViewOption('rejected')}
                    >
                        Rejected ({stats.rejected})
                    </Button>
                </div>
                
                {isLoading && registrations.length > 0 && (
                    <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-md mb-4 flex items-center">
                        <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full mr-2"></div>
                        <span>Refreshing registrations...</span>
                    </div>
                )}
                
                {registrations.length === 0 ? (
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
                            <Copy size={16} className="mr-1" />
                            Copy Registration Link
                        </Button>
                    </div>
                ) : filteredRegistrations.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <p>No registrations match your search or filter criteria.</p>
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setViewOption('all');
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
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Name
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Identifier
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Wallet Address
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredRegistrations.map((registration, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{registration.fullName}</div>
                                            {registration.email && (
                                                <div className="text-sm text-gray-500">{registration.email}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{registration.identifier}</div>
                                            <div className="text-xs text-gray-500">
                                                {new Date(registration.timestamp).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center text-sm font-mono text-gray-500">
                                                {`${registration.walletAddress.substring(0, 8)}...${registration.walletAddress.substring(registration.walletAddress.length - 6)}`}
                                                <a 
                                                    href={`https://etherscan.io/address/${registration.walletAddress}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="ml-1 text-indigo-600"
                                                >
                                                    <ExternalLink size={14} />
                                                </a>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                            ${registration.status === 'approved' ? 'bg-green-100 text-green-800' : 
                                                registration.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                                                'bg-yellow-100 text-yellow-800'}`}
                                            >
                                                {registration.status === 'approved' ? 'Approved' : 
                                                registration.status === 'rejected' ? 'Rejected' : 'Pending'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {registration.status === 'pending' && (
                                                <div className="flex justify-end space-x-2">
                                                    <Button
                                                        variant="success"
                                                        size="sm"
                                                        onClick={() => handleApproveRegistration(registration)}
                                                        disabled={processingIds.has(registration.walletAddress)}
                                                        className={processingIds.has(registration.walletAddress) ? 'opacity-50' : ''}
                                                    >
                                                        {processingIds.has(registration.walletAddress) ? (
                                                            <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
                                                        ) : (
                                                            <Check size={16} />
                                                        )}
                                                    </Button>
                                                    <Button
                                                        variant="danger"
                                                        size="sm"
                                                        onClick={() => handleRejectRegistration(registration)}
                                                        disabled={processingIds.has(registration.walletAddress)}
                                                        className={processingIds.has(registration.walletAddress) ? 'opacity-50' : ''}
                                                    >
                                                        {processingIds.has(registration.walletAddress) ? (
                                                            <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
                                                        ) : (
                                                            <X size={16} />
                                                        )}
                                                    </Button>
                                                </div>
                                            )}
                                            {registration.status === 'approved' && (
                                                <div className="text-green-600 text-xs">Voter approved</div>
                                            )}
                                            {registration.status === 'rejected' && (
                                                <div className="text-red-600 text-xs">Registration rejected</div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </DashboardLayout>
    );
};

export default VoterRegistrationManagementPage;