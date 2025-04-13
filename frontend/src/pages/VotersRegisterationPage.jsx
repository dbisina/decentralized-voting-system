import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import { useWeb3 } from '../contexts/Web3Context';

const VoterRegistrationPage = () => {
  const { electionId, registrationCode } = useParams();
  const navigate = useNavigate();
  const { account, connectWallet } = useWeb3();
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    identifier: '', // Could be student ID, employee ID, etc.
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);
  
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
    
    setIsLoading(true);
    
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
      existingRegistrations.push(registrationData);
      localStorage.setItem('voterRegistrations', JSON.stringify(existingRegistrations));
      
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
      setIsLoading(false);
    }
  };
  
  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 py-16">
        <Card>
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Voter Registration</h1>
          
          {message && (
            <div className={`p-4 mb-6 rounded-md ${
              message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
            }`}>
              {message.text}
            </div>
          )}
          
          {!account ? (
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
                  isLoading={isLoading}
                >
                  Submit Registration
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </MainLayout>
  );
};

export default VoterRegistrationPage;