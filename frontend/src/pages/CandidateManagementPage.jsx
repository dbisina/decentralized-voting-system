import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PlusCircle, MinusCircle, ArrowLeft, Save, AlertTriangle, CheckCircle, Info, Clock } from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import useElections from '../hooks/useElections';
import IPFSService from '../services/ipfsService';
import { useWeb3 } from '../contexts/Web3Context';

const CandidateManagementPage = () => {
    const { electionId } = useParams();
    const navigate = useNavigate();
    const { account } = useWeb3();
    const { allElections, addCandidate, refreshElections } = useElections();
    const ipfsService = new IPFSService();
    
    const [election, setElection] = useState(null);
    const [candidates, setCandidates] = useState([
        { name: '', platform: '', bio: '' }
    ]);
    const [isLoading, setIsLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [statusMessage, setStatusMessage] = useState(null);
    
    // Load election data
    useEffect(() => {
        const loadElectionData = async () => {
            setIsLoading(true);
            try {
                if (allElections.length > 0 && electionId) {
                    const foundElection = allElections.find(e => e.id === parseInt(electionId));
                    
                    if (foundElection) {
                        setElection(foundElection);
                        
                        // Check if election can accept candidates
                        const now = new Date();
                        const startTime = new Date(foundElection.startTime);
                        
                        if (now >= startTime) {
                            setStatusMessage({
                                type: 'error',
                                message: 'This election has already started and cannot accept new candidates.'
                            });
                        }
                    } else {
                        setStatusMessage({
                            type: 'error',
                            message: `Election with ID ${electionId} not found.`
                        });
                    }
                } else {
                    // If allElections is empty, try to refresh the data
                    await refreshElections();
                }
            } catch (error) {
                console.error("Error loading election data:", error);
                setStatusMessage({
                    type: 'error',
                    message: 'Failed to load election data. Please try again.'
                });
            } finally {
                setIsLoading(false);
            }
        };
        
        loadElectionData();
    }, [allElections, electionId, refreshElections]);
    
    // Add a new candidate field
    const addCandidateField = () => {
        setCandidates([...candidates, { name: '', platform: '', bio: '' }]);
    };
    
    // Remove a candidate field
    const removeCandidateField = (index) => {
        if (candidates.length > 1) {
            const updatedCandidates = candidates.filter((_, i) => i !== index);
            setCandidates(updatedCandidates);
        }
    };
    
    // Handle candidate input changes
    const handleCandidateChange = (index, field, value) => {
        const updatedCandidates = [...candidates];
        updatedCandidates[index] = {
            ...updatedCandidates[index],
            [field]: value
        };
        setCandidates(updatedCandidates);
    };
    
    // Save candidates
    const handleSaveCandidates = async () => {
        try {
            setProcessing(true);
            setStatusMessage({
                type: 'processing',
                message: 'Saving candidates...'
            });
            
            // Filter out empty candidates
            const validCandidates = candidates.filter(c => c.name.trim() !== '');
            
            if (validCandidates.length === 0) {
                setStatusMessage({
                    type: 'error',
                    message: 'Please add at least one candidate with a name.'
                });
                setProcessing(false);
                return;
            }
            
            let successCount = 0;
            let failureCount = 0;
            
            // Add each candidate
            for (let i = 0; i < validCandidates.length; i++) {
                try {
                    const candidate = validCandidates[i];
                    
                    // Update status message
                    setStatusMessage({
                        type: 'processing',
                        message: `Adding candidate ${i+1} of ${validCandidates.length}: ${candidate.name}`
                    });
                    
                    // Store candidate details on IPFS
                    const candidateIpfsCid = await ipfsService.storeCandidateDetails({
                        name: candidate.name,
                        bio: candidate.bio,
                        platform: candidate.platform
                    });
                    
                    // Add candidate to blockchain
                    await addCandidate(parseInt(electionId), {
                        name: candidate.name,
                        details: candidateIpfsCid
                    });
                    
                    successCount++;
                } catch (error) {
                    console.error(`Error adding candidate ${i+1}:`, error);
                    failureCount++;
                    
                    // Check if the error is because the election has started
                    if (error.message && error.message.includes("Cannot add candidate after election has started")) {
                        setStatusMessage({
                            type: 'error',
                            message: 'This election has already started and cannot accept new candidates.'
                        });
                        // Break the loop as no more candidates can be added
                        break;
                    }
                }
            }
            
            // Refresh elections data
            await refreshElections();
            
            if (successCount > 0) {
                setStatusMessage({
                    type: 'success',
                    message: `Successfully added ${successCount} candidates.${failureCount > 0 ? ` Failed to add ${failureCount} candidates.` : ''}`
                });
                
                // Clear form after success
                setCandidates([{ name: '', platform: '', bio: '' }]);
                
                // Redirect after a brief delay
                setTimeout(() => {
                    navigate(`/election/${electionId}`);
                }, 2000);
            } else {
                setStatusMessage({
                    type: 'error',
                    message: 'Failed to add any candidates. Please try again.'
                });
            }
        } catch (error) {
            console.error('Error saving candidates:', error);
            setStatusMessage({
                type: 'error',
                message: error.message || 'An error occurred while saving candidates.'
            });
        } finally {
            setProcessing(false);
        }
    };
    
    // Check if the election has already started
    const hasStarted = () => {
        if (!election) return false;
        const now = new Date();
        const startTime = new Date(election.startTime);
        return now >= startTime;
    };
    
    // Format time until election starts
    const getTimeUntilStart = () => {
        if (!election) return '';
        
        const now = new Date();
        const startTime = new Date(election.startTime);
        
        if (now >= startTime) return 'Election has started';
        
        const diffMs = startTime - now;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        if (diffDays > 0) {
            return `Election starts in ${diffDays} days, ${diffHours} hours`;
        } else if (diffHours > 0) {
            return `Election starts in ${diffHours} hours, ${diffMinutes} minutes`;
        } else {
            return `Election starts in ${diffMinutes} minutes`;
        }
    };
    
    return (
        <DashboardLayout>
            <div className="mb-6 flex items-center justify-between">
                <button 
                    onClick={() => navigate('/manage')} 
                    className="flex items-center text-indigo-600 hover:text-indigo-800"
                >
                    <ArrowLeft size={16} className="mr-1" />
                    <span>Back to Management</span>
                </button>
            </div>
            
            <Card className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800 mb-4">Manage Candidates</h1>
                
                {isLoading ? (
                    <div className="py-8 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Loading election data...</p>
                    </div>
                ) : election ? (
                    <div>
                        <div className="mb-6">
                            <h2 className="text-xl font-semibold">{election.title}</h2>
                            <div className="flex items-center text-sm text-gray-500 mt-1">
                                <Clock size={16} className="mr-1" />
                                <span>{getTimeUntilStart()}</span>
                            </div>
                        </div>
                        
                        {statusMessage && (
                            <div className={`p-4 mb-6 rounded-md ${
                                statusMessage.type === 'error' ? 'bg-red-50 text-red-700' :
                                statusMessage.type === 'success' ? 'bg-green-50 text-green-700' :
                                'bg-blue-50 text-blue-700'
                            }`}>
                                <div className="flex items-start">
                                    {statusMessage.type === 'error' ? <AlertTriangle size={20} className="mr-2 flex-shrink-0" /> :
                                     statusMessage.type === 'success' ? <CheckCircle size={20} className="mr-2 flex-shrink-0" /> : 
                                     <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full mr-2 flex-shrink-0"></div>}
                                    <div>
                                        <p className="font-medium">{statusMessage.message}</p>
                                        {statusMessage.details && (
                                            <p className="text-sm mt-1">{statusMessage.details}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {election.candidates && election.candidates.length > 0 && (
                            <div className="mb-6">
                                <h3 className="text-lg font-medium text-gray-800 mb-3">Current Candidates</h3>
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {election.candidates.map(candidate => (
                                            <div key={candidate.id} className="p-3 bg-white rounded border border-gray-200">
                                                <div className="font-medium text-gray-800">{candidate.name}</div>
                                                {candidate.platform && (
                                                    <div className="text-sm text-gray-600 mt-1">{candidate.platform}</div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {!hasStarted() ? (
                            <div>
                                <div className="mb-6 bg-blue-50 border border-blue-200 rounded-md p-4 text-sm text-blue-800 flex items-start">
                                    <Info size={18} className="mr-2 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <strong>Important:</strong> Add all candidates before the election starts. 
                                        According to the smart contract, candidates cannot be added after the election has started.
                                    </div>
                                </div>
                            
                                <h3 className="text-lg font-medium text-gray-800 mb-4">Add New Candidates</h3>
                                
                                {candidates.map((candidate, index) => (
                                    <div 
                                        key={index} 
                                        className="mb-6 p-4 border border-gray-200 rounded-lg"
                                    >
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="font-medium text-gray-700">Candidate {index + 1}</h3>
                                            
                                            {candidates.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeCandidateField(index)}
                                                    className="text-red-600 hover:text-red-800"
                                                >
                                                    <MinusCircle size={18} />
                                                </button>
                                            )}
                                        </div>
                                        
                                        <div className="mb-4">
                                            <label className="block text-gray-700 text-sm font-medium mb-1">
                                                Candidate Name *
                                            </label>
                                            <input
                                                type="text"
                                                className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                placeholder="Enter candidate name"
                                                value={candidate.name}
                                                onChange={(e) => handleCandidateChange(index, 'name', e.target.value)}
                                                required={index === 0}
                                            />
                                        </div>
                                        
                                        <div className="mb-4">
                                            <label className="block text-gray-700 text-sm font-medium mb-1">
                                                Platform/Slogan
                                            </label>
                                            <input
                                                type="text"
                                                className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                placeholder="Enter candidate platform or slogan"
                                                value={candidate.platform}
                                                onChange={(e) => handleCandidateChange(index, 'platform', e.target.value)}
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className="block text-gray-700 text-sm font-medium mb-1">
                                                Bio/Description
                                            </label>
                                            <textarea
                                                rows="2"
                                                className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                placeholder="Brief description about the candidate"
                                                value={candidate.bio}
                                                onChange={(e) => handleCandidateChange(index, 'bio', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                ))}
                                
                                <button
                                    type="button"
                                    onClick={addCandidateField}
                                    className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-indigo-500 hover:text-indigo-600 flex items-center justify-center mb-6"
                                >
                                    <PlusCircle size={18} className="mr-2" />
                                    <span>Add Another Candidate</span>
                                </button>
                                
                                <div className="flex justify-between">
                                    <Button
                                        variant="secondary"
                                        onClick={() => navigate(`/election/${electionId}`)}
                                    >
                                        View Election
                                    </Button>
                                    
                                    <Button
                                        variant="primary"
                                        onClick={handleSaveCandidates}
                                        isLoading={processing}
                                        className="flex items-center"
                                    >
                                        <Save size={16} className="mr-2" />
                                        Save Candidates
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-yellow-50 p-6 rounded-lg text-center">
                                <AlertTriangle size={24} className="text-yellow-600 mx-auto mb-3" />
                                <h3 className="text-lg font-medium text-yellow-800 mb-2">Cannot Add Candidates</h3>
                                <p className="text-yellow-700 mb-4">
                                    This election has already started and cannot accept new candidates.
                                    According to the smart contract rules, candidates must be added before
                                    the election start time.
                                </p>
                                <Button
                                    variant="primary"
                                    onClick={() => navigate(`/election/${electionId}`)}
                                >
                                    View Election
                                </Button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-red-50 p-6 rounded-lg text-center">
                        <AlertTriangle size={24} className="text-red-600 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-red-800 mb-2">Election Not Found</h3>
                        <p className="text-red-700 mb-4">
                            The election you're looking for could not be found. Please check the election ID
                            and try again.
                        </p>
                        <Button
                            variant="primary"
                            onClick={() => navigate('/manage')}
                        >
                            Return to Management
                        </Button>
                    </div>
                )}
            </Card>
        </DashboardLayout>
    );
};

export default CandidateManagementPage;