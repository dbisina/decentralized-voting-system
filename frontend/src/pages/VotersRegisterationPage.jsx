import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Check, AlertTriangle, Info } from 'lucide-react';
import MainLayout from '../layouts/MainLayout';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import { useWeb3 } from '../contexts/Web3Context';
import useElections from '../hooks/useElections';

const VoterRegistrationPage = () => {
  const { electionId, registrationCode } = useParams();
  const navigate = useNavigate();
  const { allElections } = useElections();
  const { account, connectWallet } = useWeb3();
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    identifier: '', // Could be student ID, employee ID, etc.
  });
  const [election, setElection] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [registered, setRegistered] = useState(false);
  
  // Load election data
  useEffect(() => {
    if (allElections.length > 0 && electionId) {
      const foundElection = allElections.find(e => e.id === parseInt(electionId));
      if (foundElection) {
        setElection(foundElection);
      }
      setIsLoading(false);
    }
  }, [allElections, electionId]);
  
  // Check if already registered
  useEffect(() => {
    if (account && electionId) {
      // Check if this wallet is already registered for this election
      const registrations = JSON.parse(localStorage.getItem('voterRegistrations') || '[]');
      const existingReg = registrations.find(
        reg => reg.walletAddress.toLowerCase() === account.toLowerCase() && 
              reg.electionId === electionId
      );
      
      if (existingReg) {
        setRegistered(true);
        setMessage({
          type: existingReg.status === 'approved' ? 'success' : 'info',
          text: existingReg.status === 'approved' 
            ? 'You are already registered and approved for this election.' 
            : 'You have already submitted a registration request for this election. Please wait for admin approval.'
        });
      }
    }
  }, [account, electionId]);
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!account) {
      setMessage({
        type: 'error',
        text: 'Please connect your wallet first'
      });
      return;
    }
    
    if (!formData.fullName || !formData.identifier) {
      setMessage({
        type: 'error',
        text: 'Please fill all required fields'
      });
      return;
    }
    
    setRegisterLoading(true);
    
    try {
      // For now, just store this information locally
      // In a production app, this would be sent to a secure database
      const registrationData = {
        electionId,
        registrationCode,
        fullName: formData.fullName,
        email: formData.email,
        identifier: formData.identifier,
        walletAddress: account,
        timestamp: new Date().toISOString(),
        status: 'pending' // Will be approved by admin
      };
      
      // Store in localStorage for demo purposes
      // In production, this would be a server API call
      const existingRegistrations = JSON.parse(localStorage.getItem('voterRegistrations') || '[]');
      
      // Check for existing registration
      const existingIndex = existingRegistrations.findIndex(
        reg => reg.walletAddress.toLowerCase() === account.toLowerCase() && 
              reg.electionId === electionId
      );
      
      if (existingIndex >= 0) {
        // Update existing registration
        existingRegistrations[existingIndex] = {
          ...existingRegistrations[existingIndex],
          ...registrationData
        };
      } else {
        // Add new registration
        existingRegistrations.push(registrationData);
      }
      
      localStorage.setItem('voterRegistrations', JSON.stringify(existingRegistrations));
      
      setRegistered(true);
      setMessage({
        type: 'success',
        text: 'Registration submitted successfully! Please wait for admin approval.'
      });
      
      // Reset form
      setFormData({
        fullName: '',
        email: '',
        identifier: ''
      });
    } catch (error) {
      console.error('Registration error:', error);
      setMessage({
        type: 'error',
        text: 'Failed to submit registration. Please try again.'
      });
    } finally {
      setRegisterLoading(false);
    }
  };
  
  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 py-16">
        <Card>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading election details...</p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">Voter Registration</h1>
              
              {election ? (
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-700">{election.title}</h2>
                  <p className="text-gray-600 mt-1">
                    Complete this form to register for the election.
                  </p>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-6">
                  <div className="flex items-start">
                    <AlertTriangle className="text-yellow-600 mt-0.5 mr-3" size={18} />
                    <p className="text-yellow-700">
                      Election details could not be found. The election may have been deleted or the link is invalid.
                    </p>
                  </div>
                </div>
              )}
              
              {message && (
                <div className={`p-4 mb-6 rounded-md ${
                  message.type === 'error' ? 'bg-red-50 text-red-700' : 
                  message.type === 'success' ? 'bg-green-50 text-green-700' :
                  'bg-blue-50 text-blue-700'
                }`}>
                  <div className="flex items-start">
                    {message.type === 'error' ? (
                      <AlertTriangle className="mr-3 mt-0.5" size={20} />
                    ) : message.type === 'success' ? (
                      <Check className="mr-3 mt-0.5" size={20} />
                    ) : (
                      <Info className="mr-3 mt-0.5" size={20} />
                    )}
                    <div>{message.text}</div>
                  </div>
                </div>
              )}
              
              {registered ? (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-green-100">
                    <Check size={32} className="text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Registration Submitted</h3>
                  <p className="text-gray-600 mb-6">
                    Your registration has been submitted successfully. An administrator will review and approve it.
                  </p>
                  <p className="text-gray-600 mb-6">
                    Once approved, you will be able to see this election in your dashboard and participate in voting.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row justify-center gap-4">
                    {account ? (
                      <Button
                        variant="primary"
                        onClick={() => navigate('/dashboard')}
                      >
                        Go to Dashboard
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        onClick={connectWallet}
                      >
                        Connect Wallet
                      </Button>
                    )}
                    
                    <Button
                      variant="secondary"
                      onClick={() => navigate('/')}
                    >
                      Return to Home
                    </Button>
                  </div>
                </div>
              ) : !account ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-6">
                    Please connect your wallet to register as a voter for this election.
                  </p>
                  <Button
                    variant="primary"
                    onClick={connectWallet}
                    isLoading={isLoading}
                  >
                    Connect Wallet
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <label className="block text-gray-700 font-medium mb-2" htmlFor="fullName">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="fullName"
                      name="fullName"
                      className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-gray-700 font-medium mb-2" htmlFor="email">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={formData.email}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="mb-6">
                    <label className="block text-gray-700 font-medium mb-2" htmlFor="identifier">
                      Identification Number *
                    </label>
                    <input
                      type="text"
                      id="identifier"
                      name="identifier"
                      className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Student ID, Employee ID, etc."
                      value={formData.identifier}
                      onChange={handleInputChange}
                      required
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      This will be used by the administrator to verify your identity.
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-md mb-6">
                    <div className="font-medium text-gray-700 mb-2">Connected Wallet Address:</div>
                    <div className="font-mono text-sm break-all">{account}</div>
                    <p className="mt-2 text-sm text-gray-500">
                      This address will be used for voting after your registration is approved.
                    </p>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      variant="primary"
                      isLoading={registerLoading}
                    >
                      Submit Registration
                    </Button>
                  </div>
                </form>
              )}
            </>
          )}
        </Card>
      </div>
    </MainLayout>
  );
};

export default VoterRegistrationPage;