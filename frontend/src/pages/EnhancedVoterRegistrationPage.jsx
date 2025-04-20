import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Check, AlertTriangle, Info, Clock, User, Lock, Globe } from 'lucide-react';
import Button from '../components/common/Button';
import { useWeb3 } from '../contexts/Web3Context';
import EnhancedBlockchainService from '../services/enhancedBlockchainService';

const EnhancedVoterRegistration = () => {
  const { electionId } = useParams();
  const navigate = useNavigate();
  const { account, contract, signer } = useWeb3();
  
  const [election, setElection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [verificationData, setVerificationData] = useState('');
  const [status, setStatus] = useState(null);
  const [registration, setRegistration] = useState(null);
  const [error, setError] = useState(null);
  
  const enhancedService = new EnhancedBlockchainService(contract, signer);
  
  // Load election details and registration status
  useEffect(() => {
    const loadData = async () => {
      if (!contract || !account || !electionId) return;
      
      try {
        setLoading(true);
        
        // Get election details
        const electionData = await enhancedService.getElectionDetails(electionId);
        setElection(electionData);
        
        // Get voter registration status
        const voterRegistration = await enhancedService.getVoterRegistration(electionId, account);
        setRegistration(voterRegistration);
        
        // Set status message based on registration
        if (voterRegistration.status === 'APPROVED') {
          setStatus({
            type: 'success',
            message: 'You are approved to vote in this election'
          });
        } else if (voterRegistration.status === 'PENDING') {
          setStatus({
            type: 'warning',
            message: 'Your registration is pending approval'
          });
        } else if (voterRegistration.status === 'REJECTED') {
          setStatus({
            type: 'error',
            message: 'Your registration was rejected'
          });
        } else if (voterRegistration.status === 'BLACKLISTED') {
          setStatus({
            type: 'error',
            message: 'You have been blacklisted from this election'
          });
        }
        
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load election data');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [contract, account, electionId]);
  
  // Handle registration
  const handleRegistration = async () => {
    if (!account || !contract || !electionId) return;
    
    try {
      setRegistering(true);
      setError(null);
      
      // For public elections, no verification is needed
      const verificationInfo = election.electionType === 'PUBLIC' ? '' : JSON.stringify({
        socialMediaLink: verificationData,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      });
      
      await enhancedService.registerVoter(electionId, verificationInfo);
      
      // Reload registration status
      const updatedRegistration = await enhancedService.getVoterRegistration(electionId, account);
      setRegistration(updatedRegistration);
      
      setStatus({
        type: 'success',
        message: election.electionType === 'PUBLIC' 
          ? 'Successfully registered! You can now vote in this election.'
          : 'Registration submitted! Please wait for admin approval.'
      });
      
    } catch (err) {
      console.error('Registration error:', err);
      setError('Failed to register. Please try again.');
    } finally {
      setRegistering(false);
    }
  };
  
  // Render appropriate UI based on election type and registration status
  const renderRegistrationUI = () => {
    if (!election) return null;
    
    // If already registered
    if (registration && registration.status !== 'NONE') {
      return (
        <div className="text-center py-8">
          <div className={`inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full ${
            registration.status === 'APPROVED' ? 'bg-green-100' :
            registration.status === 'PENDING' ? 'bg-yellow-100' :
            'bg-red-100'
          }`}>
            {registration.status === 'APPROVED' ? <Check size={32} className="text-green-600" /> :
             registration.status === 'PENDING' ? <Clock size={32} className="text-yellow-600" /> :
             <AlertTriangle size={32} className="text-red-600" />}
          </div>
          
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            {registration.status === 'APPROVED' ? 'Registration Approved' :
             registration.status === 'PENDING' ? 'Registration Pending' :
             registration.status === 'REJECTED' ? 'Registration Rejected' :
             'Registration Blacklisted'}
          </h3>
          
          <p className="text-gray-600 mb-6">
            {registration.status === 'APPROVED' ? 'You are eligible to vote in this election.' :
             registration.status === 'PENDING' ? 'Your registration is under review by the election admin.' :
             registration.status === 'REJECTED' ? 'Your registration was not approved. You may try again if allowed.' :
             'You are not allowed to register for this election.'}
          </p>
          
          {registration.status === 'APPROVED' && (
            <Button
              variant="primary"
              onClick={() => navigate(`/vote/${electionId}`)}
            >
              Proceed to Vote
            </Button>
          )}
        </div>
      );
    }
    
    // If registration is open
    if (election.status === 'REGISTRATION' || 
        (election.electionType === 'PUBLIC' && election.status === 'ACTIVE')) {
      return (
        <div>
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-800 mb-2">
              Register for "{election.title}"
            </h3>
            <p className="text-gray-600">
              {election.electionType === 'PUBLIC' 
                ? 'This is a public election. Registration is automatic upon submission.'
                : 'This is a private election. Your registration requires admin approval.'}
            </p>
          </div>
          
          {election.electionType !== 'PUBLIC' && (
            <div className="mb-6">
              <label className="block text-gray-700 font-medium mb-2">
                Verification Information
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Social media profile link or other identifier"
                value={verificationData}
                onChange={(e) => setVerificationData(e.target.value)}
              />
              <p className="mt-1 text-sm text-gray-500">
                This information will help the admin verify your identity
              </p>
            </div>
          )}
          
          <div className="bg-gray-50 p-4 rounded-md mb-6">
            <h4 className="font-medium text-gray-800 mb-2">Connected Wallet</h4>
            <p className="font-mono text-sm break-all">{account}</p>
          </div>
          
          <Button
            variant="primary"
            onClick={handleRegistration}
            isLoading={registering}
            disabled={registering}
          >
            {election.electionType === 'PUBLIC' ? 'Register Now' : 'Submit Registration'}
          </Button>
        </div>
      );
    }
    
    // Registration closed
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-gray-100">
          <Lock size={32} className="text-gray-400" />
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">Registration Closed</h3>
        <p className="text-gray-600">
          Registration for this election is not currently open.
        </p>
      </div>
    );
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Voter Registration</h1>
                {election && (
                  <div className="mt-2 flex items-center">
                    {election.electionType === 'PUBLIC' ? (
                      <div className="flex items-center text-green-600">
                        <Globe size={16} className="mr-1" />
                        <span className="text-sm">Public Election</span>
                      </div>
                    ) : election.electionType === 'PRIVATE' ? (
                      <div className="flex items-center text-blue-600">
                        <Lock size={16} className="mr-1" />
                        <span className="text-sm">Private Election</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-purple-600">
                        <User size={16} className="mr-1" />
                        <span className="text-sm">Organization Election</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                election?.status === 'REGISTRATION' ? 'bg-green-100 text-green-800' :
                election?.status === 'ACTIVE' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {election?.status}
              </div>
            </div>
          </div>
          
          {/* Content */}
          <div className="p-6">
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                {error}
              </div>
            )}
            
            {status && (
              <div className={`mb-6 px-4 py-3 rounded-md ${
                status.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' :
                status.type === 'warning' ? 'bg-yellow-50 border border-yellow-200 text-yellow-700' :
                'bg-red-50 border border-red-200 text-red-700'
              }`}>
                {status.message}
              </div>
            )}
            
            {renderRegistrationUI()}
          </div>
        </div>
        
        <div className="mt-8 text-center">
          <Button
            variant="secondary"
            onClick={() => navigate('/dashboard')}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EnhancedVoterRegistration;