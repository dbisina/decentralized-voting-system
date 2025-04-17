import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Check, X, Users, Copy, ExternalLink } from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import useElections from '../hooks/useElections';
import { useWeb3 } from '../contexts/Web3Context';

const VoterRegistrationManagementPage = () => {
    const { electionId } = useParams();
    const navigate = useNavigate();
    const { account } = useWeb3();
    const { allElections, addAllowedVoter, refreshElections } = useElections();
    
    const [election, setElection] = useState(null);
    const [registrations, setRegistrations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [statusMessage, setStatusMessage] = useState(null);
    const [registrationLink, setRegistrationLink] = useState('');
    
    // Generate a random registration code if none exists
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
    
    // Load all registrations for this election
    useEffect(() => {
        try {
            // In production, this would be a server API call
            const storedRegistrations = JSON.parse(localStorage.getItem('voterRegistrations') || '[]');
            
            // Get all registrations for this election (don't filter by admin wallet)
            const filteredRegistrations = storedRegistrations.filter(r => r.electionId === electionId);
            
            setRegistrations(filteredRegistrations);
            setIsLoading(false);
        } catch (error) {
            console.error('Error loading registrations:', error);
            setStatusMessage({
                type: 'error',
                message: 'Failed to load registrations'
            });
            setIsLoading(false);
        }
    }, [electionId]);
    
    // Handle approval of a registration
    const handleApproveRegistration = async (registration) => {
        try {
            setIsLoading(true);
            
            // Update the registration status
            const updatedRegistrations = registrations.map(r => {
                if (r.walletAddress === registration.walletAddress) {
                    return { ...r, status: 'approved' };
                }
                return r;
            });
            
            // Save back to localStorage
            const allRegistrations = JSON.parse(localStorage.getItem('voterRegistrations') || '[]');
            const updatedAllRegistrations = allRegistrations.map(r => {
                if (r.electionId === electionId && r.walletAddress === registration.walletAddress) {
                    return { ...r, status: 'approved' };
                }
                return r;
            });
            localStorage.setItem('voterRegistrations', JSON.stringify(updatedAllRegistrations));
            
            // Add the voter's wallet address to the allowed voters list on the blockchain
            await addAllowedVoter(electionId, registration.walletAddress);
            
            setRegistrations(updatedRegistrations);
            setStatusMessage({
                type: 'success',
                message: `Approved ${registration.fullName}'s registration`
            });
        } catch (error) {
            console.error('Error approving registration:', error);
            setStatusMessage({
                type: 'error',
                message: 'Failed to approve registration'
            });
        } finally {
            setIsLoading(false);
        }
    };
    
    // Handle rejection of a registration
    const handleRejectRegistration = (registration) => {
        try {
            // Update the registration status
            const updatedRegistrations = registrations.map(r => {
                if (r.walletAddress === registration.walletAddress) {
                    return { ...r, status: 'rejected' };
                }
                return r;
            });
            
            // Save back to localStorage
            const allRegistrations = JSON.parse(localStorage.getItem('voterRegistrations') || '[]');
            const updatedAllRegistrations = allRegistrations.map(r => {
                if (r.electionId === electionId && r.walletAddress === registration.walletAddress) {
                    return { ...r, status: 'rejected' };
                }
                return r;
            });
            localStorage.setItem('voterRegistrations', JSON.stringify(updatedAllRegistrations));
            
            setRegistrations(updatedRegistrations);
            setStatusMessage({
                type: 'success',
                message: `Rejected ${registration.fullName}'s registration`
            });
        } catch (error) {
            console.error('Error rejecting registration:', error);
            setStatusMessage({
                type: 'error',
                message: 'Failed to reject registration'
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
    };
    
    // Check if user has permission to manage this election
    const hasPermission = () => {
        if (!election || !account) return false;
        return election.admin && election.admin.toLowerCase() === account.toLowerCase();
    };
    
    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
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
                <div className={`mb-6 p-4 rounded-md ${
                    statusMessage.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                }`}>
                    {statusMessage.message}
                </div>
            )}
            
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
                        className="ml-2"
                    >
                        <Copy size={16} className="mr-1" />
                        Copy
                    </Button>
                </div>
            </Card>
            
            <Card>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-800">Voter Registrations</h2>
                    <div className="text-sm text-gray-500 flex items-center">
                        <Users size={16} className="mr-1" />
                        {registrations.length} {registrations.length === 1 ? 'registration' : 'registrations'}
                    </div>
                </div>
                
                {registrations.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        No voter registrations yet. Share the registration link to get started.
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
                                {registrations.map((registration, index) => (
                                    <tr key={index}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{registration.fullName}</div>
                                            {registration.email && (
                                                <div className="text-sm text-gray-500">{registration.email}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{registration.identifier}</div>
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
                                                        disabled={isLoading}
                                                    >
                                                        <Check size={16} />
                                                    </Button>
                                                    <Button
                                                        variant="danger"
                                                        size="sm"
                                                        onClick={() => handleRejectRegistration(registration)}
                                                        disabled={isLoading}
                                                    >
                                                        <X size={16} />
                                                    </Button>
                                                </div>
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