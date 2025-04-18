import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, Info, AlertTriangle, CheckCircle } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import useElections from '../hooks/useElections';
import IPFSService from '../services/ipfsService';
import DashboardLayout from '../layouts/DashboardLayout';
import Button from '../components/common/Button';
import Card from '../components/common/Card';

const CreateElectionPage = () => {
  const navigate = useNavigate();
  const { account } = useWeb3();
  const { createElection } = useElections();
  const ipfsService = new IPFSService();
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    rules: '',
    startDate: '',
    startTime: '12:00',
    endDate: '',
    endTime: '12:00',
    additionalInfo: ''
  });
  
  // UI state
  const [processing, setProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [activeStep, setActiveStep] = useState(1); // 1: Basic Details, 2: Review
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  // Navigate between steps
  const nextStep = () => {
    if (activeStep < 2) {
      setActiveStep(activeStep + 1);
    }
  };
  
  const prevStep = () => {
    if (activeStep > 1) {
      setActiveStep(activeStep - 1);
    }
  };
  
  // Validate form before submission
  const validateForm = () => {
    // Basic validation
    if (!formData.title.trim()) {
      setStatusMessage({ type: 'error', message: 'Election title is required' });
      return false;
    }
    
    if (!formData.startDate || !formData.endDate) {
      setStatusMessage({ type: 'error', message: 'Start and end dates are required' });
      return false;
    }
    
    // Check if start date is before end date
    const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
    const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);
    
    if (startDateTime >= endDateTime) {
      setStatusMessage({ type: 'error', message: 'End date must be after start date' });
      return false;
    }
    
    // IMPORTANT: Make sure start time is at least 24 hours in the future
    const now = new Date();
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
   /* if (startDateTime <= oneDayFromNow) {
      setStatusMessage({ 
        type: 'error', 
        message: 'Start date must be at least 24 hours in the future to allow time for adding candidates' 
      });
      return false;
    }*/
    
    // Clear any previous error messages
    setStatusMessage(null);
    return true;
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setProcessing(true);
      setStatusMessage({ type: 'processing', message: 'Creating election...' });
      
      // Prepare election data
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);
      
      // Store election details on IPFS
      setStatusMessage({ type: 'processing', message: 'Storing election details on IPFS...' });
      const ipfsCid = await ipfsService.storeElectionDetails({
        title: formData.title,
        description: formData.description,
        rules: formData.rules,
        additionalInfo: formData.additionalInfo
      });
      
      // Create election on blockchain
      setStatusMessage({ type: 'processing', message: 'Creating election on blockchain...' });
      const result = await createElection({
        title: formData.title,
        description: ipfsCid,
        startDate: startDateTime,
        endDate: endDateTime
      });
      
      // Success message
      if (result && result.electionId) {
        setStatusMessage({ 
          type: 'success', 
          message: 'Election created successfully!',
          details: `Transaction Hash: ${result.transactionHash}`
        });
        
        // Redirect to candidate management page
        setTimeout(() => {
          navigate(`/manage-candidates/${result.electionId}`);
        }, 2000);
      }
    } catch (err) {
      console.error("Error creating election:", err);
      setStatusMessage({ 
        type: 'error', 
        message: 'Failed to create election',
        details: err.message 
      });
    } finally {
      setProcessing(false);
    }
  };
  
  // Format today's date for min attribute on date inputs
  const today = new Date().toISOString().split('T')[0];
  
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
        
        <div className="text-sm text-gray-500">
          {`Step ${activeStep} of 2`}
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-800">Create New Election</h1>
          <p className="text-gray-600 mt-1">
            Set up a new blockchain-based election with secure, transparent voting.
          </p>
        </div>
        
        {/* Status Messages */}
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
        
        {/* Step Progress */}
        <div className="px-6 pt-4">
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              activeStep >= 1 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              1
            </div>
            <div className={`flex-1 h-1 mx-2 ${
              activeStep >= 2 ? 'bg-indigo-600' : 'bg-gray-200'
            }`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              activeStep >= 2 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              2
            </div>
          </div>
          <div className="flex justify-between text-sm mt-2">
            <div className={activeStep === 1 ? 'text-indigo-600 font-medium' : 'text-gray-500'}>
              Basic Details
            </div>
            <div className={activeStep === 2 ? 'text-indigo-600 font-medium' : 'text-gray-500'}>
              Review & Create
            </div>
          </div>
        </div>
        
        <form onSubmit={handleSubmit}>
          {/* Step 1: Basic Election Details */}
          {activeStep === 1 && (
            <div className="p-6">
              <div className="mb-6">
                <label className="block text-gray-700 font-medium mb-2" htmlFor="title">
                  Election Title *
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., Student Council President"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-gray-700 font-medium mb-2" htmlFor="description">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows="3"
                  className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Describe the purpose of this election"
                  value={formData.description}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">
                    Start Date and Time *
                  </label>
                  <div className="flex items-center">
                    <div className="relative flex-1 mr-2">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Calendar size={16} className="text-gray-500" />
                      </div>
                      <input
                        type="date"
                        name="startDate"
                        className="w-full border border-gray-300 rounded-md py-2 pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        min={today}
                        value={formData.startDate}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Clock size={16} className="text-gray-500" />
                      </div>
                      <input
                        type="time"
                        name="startTime"
                        className="w-full border border-gray-300 rounded-md py-2 pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={formData.startTime}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-gray-700 font-medium mb-2">
                    End Date and Time *
                  </label>
                  <div className="flex items-center">
                    <div className="relative flex-1 mr-2">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Calendar size={16} className="text-gray-500" />
                      </div>
                      <input
                        type="date"
                        name="endDate"
                        className="w-full border border-gray-300 rounded-md py-2 pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        min={formData.startDate || today}
                        value={formData.endDate}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Clock size={16} className="text-gray-500" />
                      </div>
                      <input
                        type="time"
                        name="endTime"
                        className="w-full border border-gray-300 rounded-md py-2 pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={formData.endTime}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-gray-700 font-medium mb-2" htmlFor="rules">
                  Election Rules
                </label>
                <textarea
                  id="rules"
                  name="rules"
                  rows="3"
                  className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter any specific rules for this election"
                  value={formData.rules}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-gray-700 font-medium mb-2" htmlFor="additionalInfo">
                  Additional Information
                </label>
                <textarea
                  id="additionalInfo"
                  name="additionalInfo"
                  rows="2"
                  className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter any additional information about this election"
                  value={formData.additionalInfo}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-sm text-blue-800 flex items-start">
                <Info size={18} className="mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Important:</strong> Once created, the basic details of an election cannot be modified.
                  After creating the election, you'll be able to add candidates until the election starts.
                </div>
              </div>
            </div>
          )}
          
          {/* Step 2: Review */}
          {activeStep === 2 && (
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-gray-800">Review Election Details</h2>
                <p className="text-gray-600 text-sm">
                  Please review all information before creating the election on the blockchain.
                </p>
              </div>
              
              <div className="mb-6 border border-gray-200 rounded-lg divide-y divide-gray-200">
                <div className="p-4">
                  <h3 className="font-medium text-gray-800 mb-3">Basic Details</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500">Election Title</div>
                      <div className="font-medium">{formData.title}</div>
                    </div>
                    
                    <div>
                      <div className="text-gray-500">Timeline</div>
                      <div className="font-medium">
                        {formData.startDate} {formData.startTime} to {formData.endDate} {formData.endTime}
                      </div>
                    </div>
                    
                    {formData.description && (
                      <div className="col-span-2">
                        <div className="text-gray-500">Description</div>
                        <div>{formData.description}</div>
                      </div>
                    )}
                    
                    {formData.rules && (
                      <div className="col-span-2">
                        <div className="text-gray-500">Rules</div>
                        <div>{formData.rules}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="bg-indigo-50 border border-indigo-200 rounded-md p-4 text-sm text-indigo-800 mb-6">
                <div className="flex items-start">
                  <Info size={18} className="mr-2 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Important:</strong> Creating an election will require a blockchain transaction.
                    Please make sure your wallet is connected to the correct network and has sufficient funds.
                    <div className="mt-2">
                      <strong>Connected Address:</strong> {account || 'Not connected'}
                    </div>
                    <div className="mt-2">
                      <strong>Next Steps:</strong> After creating the election, you'll be redirected to a page
                      where you can add candidates before the election starts.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Navigation Buttons */}
          <div className="px-6 py-4 bg-gray-50 flex justify-between">
            {activeStep > 1 ? (
              <button
                type="button"
                onClick={prevStep}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={processing}
              >
                Previous
              </button>
            ) : (
              <div></div> // Empty div for flex spacing
            )}
            
            {activeStep < 2 ? (
              <button
                type="button"
                onClick={nextStep}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md"
                disabled={processing}
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                className={`px-6 py-2 rounded-md flex items-center ${
                  processing 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
                disabled={processing}
              >
                {processing && (
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                )}
                <span>{processing ? 'Processing...' : 'Create Election'}</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default CreateElectionPage;