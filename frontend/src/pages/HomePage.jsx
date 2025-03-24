import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Vote, Database, Lock, ArrowRight, ChevronRight } from 'lucide-react';
import MainLayout from '../layouts/MainLayout';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/common/Button';

const HomePage = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading } = useAuth();
  const [connectLoading, setConnectLoading] = useState(false);
  
  // Handle connect wallet and navigate to dashboard
  const handleGetStarted = async () => {
    if (isAuthenticated) {
      navigate('/dashboard');
      return;
    }
    
    try {
      setConnectLoading(true);
      const success = await login();
      
      if (success) {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setConnectLoading(false);
    }
  };

  return (
    <MainLayout transparent={true}>
      {/* Hero Section */}
      <div className="relative min-h-screen bg-gradient-primary flex flex-col justify-center items-center px-4 sm:px-6">
        <div className="max-w-6xl mx-auto px-6 py-24 flex flex-col items-center text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Secure, Transparent & Decentralized Voting
          </h1>
          <p className="text-xl text-indigo-200 mb-10 max-w-3xl">
            Revolutionizing democracy with blockchain technology. Cast your vote with confidence, 
            knowing it's secure, immutable, and transparent.
          </p>
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            <Button
              size="lg"
              onClick={handleGetStarted}
              isLoading={connectLoading || isLoading}
              className="bg-white text-indigo-600 hover:bg-gray-100"
            >
              {isAuthenticated ? 'Go to Dashboard' : 'Connect Wallet'}
              <ChevronRight size={18} className="ml-1" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate('/about')}
              className="border-white text-white hover:bg-white hover:text-indigo-600"
            >
              Learn More
            </Button>
          </div>
        </div>
        
        {/* Background pattern */}
        <div className="absolute inset-0 bg-pattern opacity-10"></div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-800 mb-12 text-center">
            Why Choose BlockVote?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-indigo-50 p-6 rounded-xl">
              <div className="bg-indigo-100 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <Lock size={24} className="text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-800">Secure & Immutable</h3>
              <p className="text-gray-600">
                Your vote is secured by blockchain technology, making it tamper-proof and verifiable.
              </p>
            </div>
            <div className="bg-indigo-50 p-6 rounded-xl">
              <div className="bg-indigo-100 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <Database size={24} className="text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-800">Transparent Ledger</h3>
              <p className="text-gray-600">
                All votes are recorded on a public, transparent ledger while maintaining voter privacy.
              </p>
            </div>
            <div className="bg-indigo-50 p-6 rounded-xl">
              <div className="bg-indigo-100 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <Shield size={24} className="text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-800">No Central Authority</h3>
              <p className="text-gray-600">
                Eliminates single points of failure by distributing control across the network.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-800 mb-12 text-center">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-indigo-600 font-bold text-2xl flex items-center justify-center text-white mb-4">1</div>
              <h3 className="text-xl font-bold mb-2 text-gray-800">Connect Wallet</h3>
              <p className="text-gray-600">Use MetaMask to securely connect to the voting platform</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-indigo-600 font-bold text-2xl flex items-center justify-center text-white mb-4">2</div>
              <h3 className="text-xl font-bold mb-2 text-gray-800">Verify Identity</h3>
              <p className="text-gray-600">Authenticate using your unique voter credentials</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-indigo-600 font-bold text-2xl flex items-center justify-center text-white mb-4">3</div>
              <h3 className="text-xl font-bold mb-2 text-gray-800">Cast Your Vote</h3>
              <p className="text-gray-600">Vote securely and receive a confirmation on the blockchain</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16 bg-indigo-600 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Transform Voting?</h2>
          <p className="text-indigo-100 mb-8 text-lg">
            Join thousands of users who are already using BlockVote for secure, transparent elections.
          </p>
          <Button
            size="lg"
            className="bg-white text-indigo-600 hover:bg-gray-100"
            onClick={handleGetStarted}
            isLoading={connectLoading || isLoading}
          >
            {isAuthenticated ? 'Go to Dashboard' : 'Get Started'}
            <ArrowRight size={18} className="ml-2" />
          </Button>
        </div>
      </div>
    </MainLayout>
  );
};

export default HomePage;