import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Vote, Menu, X, ExternalLink } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { useAuth } from '../contexts/AuthContext';

const MainLayout = ({ children }) => {
  const navigate = useNavigate();
  const { account, networkId } = useWeb3();
  const { login, isAuthenticated, loading } = useAuth();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [connectingWallet, setConnectingWallet] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  
  // Check if page is scrolled for navbar styling
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Handle connect wallet button click
  const handleConnectWallet = async () => {
    try {
      setConnectingWallet(true);
      setErrorMessage(null);
      
      // Attempt to connect wallet
      const success = await login();
      
      if (success) {
        // Navigate to dashboard on successful connection
        navigate('/dashboard');
      } else {
        setErrorMessage('Failed to connect wallet. Please try again.');
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
      setErrorMessage(error.message || 'An unexpected error occurred');
    } finally {
      setConnectingWallet(false);
    }
  };
  
  // Get network name
  const getNetworkName = (id) => {
    switch (id) {
      case 1:
        return 'Ethereum Mainnet';
      case 5:
        return 'Goerli Testnet';
      case 137:
        return 'Polygon Mainnet';
      case 80001:
        return 'Mumbai Testnet';
      case 1337:
        return 'Local Testnet';
      default:
        return 'Unknown Network';
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className={`${
        isScrolled ? 'bg-white shadow-md' : 'bg-transparent'
      } fixed w-full z-10 transition-all duration-300`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center">
                <Vote size={28} className={`${isScrolled ? 'text-indigo-600' : 'text-indigo-500'}`} />
                <span className={`ml-2 text-xl font-bold ${isScrolled ? 'text-gray-800' : 'text-white'}`}>
                  BlockVote
                </span>
              </Link>
              
              {/* Desktop navigation */}
              <div className="hidden md:ml-10 md:flex md:space-x-8">
                <Link 
                  to="/" 
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isScrolled ? 'text-gray-700 hover:text-indigo-600' : 'text-gray-200 hover:text-white'
                  }`}
                >
                  Home
                </Link>
                <Link 
                  to="/about" 
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isScrolled ? 'text-gray-700 hover:text-indigo-600' : 'text-gray-200 hover:text-white'
                  }`}
                >
                  About
                </Link>
                <Link 
                  to="/faq" 
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isScrolled ? 'text-gray-700 hover:text-indigo-600' : 'text-gray-200 hover:text-white'
                  }`}
                >
                  FAQ
                </Link>
                <a 
                  href="https://docs.blockvote.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                    isScrolled ? 'text-gray-700 hover:text-indigo-600' : 'text-gray-200 hover:text-white'
                  }`}
                >
                  <span>Docs</span>
                  <ExternalLink size={14} className="ml-1" />
                </a>
              </div>
            </div>
            
            <div className="flex items-center">
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    isScrolled 
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                      : 'bg-white text-indigo-600 hover:bg-gray-100'
                  }`}
                >
                  Dashboard
                </Link>
              ) : (
                <button
                  onClick={handleConnectWallet}
                  disabled={connectingWallet || loading}
                  className={`flex items-center px-4 py-2 rounded-md text-sm font-medium ${
                    isScrolled 
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                      : 'bg-white text-indigo-600 hover:bg-gray-100'
                  } ${(connectingWallet || loading) ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {connectingWallet || loading ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <span>Connect Wallet</span>
                  )}
                </button>
              )}
              
              {/* Mobile menu button */}
              <div className="flex md:hidden ml-4">
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className={`${
                    isScrolled ? 'text-gray-700' : 'text-white'
                  } focus:outline-none`}
                >
                  {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Mobile menu */}
        <div className={`${mobileMenuOpen ? 'block' : 'hidden'} md:hidden bg-white shadow-lg`}>
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              to="/"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50"
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              to="/about"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50"
              onClick={() => setMobileMenuOpen(false)}
            >
              About
            </Link>
            <Link
              to="/faq"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50"
              onClick={() => setMobileMenuOpen(false)}
            >
              FAQ
            </Link>
            <a
              href="https://docs.blockvote.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span>Documentation</span>
              <ExternalLink size={14} className="ml-1" />
            </a>
            
            {account && (
              <div className="px-3 py-2 text-sm text-gray-500">
                Connected: {account.substring(0, 6)}...{account.substring(account.length - 4)}
                <div className="text-xs mt-1">
                  {networkId && getNetworkName(networkId)}
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>
      
      {/* Error message */}
      {errorMessage && (
        <div className="fixed top-20 left-0 right-0 mx-auto w-full max-w-md z-50 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <span className="block sm:inline">{errorMessage}</span>
          <button
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
            onClick={() => setErrorMessage(null)}
          >
            <X size={16} />
          </button>
        </div>
      )}
      
      {/* Main content */}
      <main className="flex-grow">
        {children}
      </main>
      
      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <div className="flex items-center">
                <Vote size={24} className="text-indigo-400" />
                <span className="ml-2 text-xl font-bold">BlockVote</span>
              </div>
              <div className="mt-2 text-gray-400 text-sm">
                Decentralized Voting System
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-8 md:grid-cols-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                  Product
                </h3>
                <div className="mt-4 space-y-2">
                  <a href="#" className="text-base text-gray-400 hover:text-white block">
                    Features
                  </a>
                  <a href="#" className="text-base text-gray-400 hover:text-white block">
                    Security
                  </a>
                  <a href="#" className="text-base text-gray-400 hover:text-white block">
                    Roadmap
                  </a>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                  Resources
                </h3>
                <div className="mt-4 space-y-2">
                  <a href="#" className="text-base text-gray-400 hover:text-white block">
                    Documentation
                  </a>
                  <a href="#" className="text-base text-gray-400 hover:text-white block">
                    Tutorials
                  </a>
                  <a href="#" className="text-base text-gray-400 hover:text-white block">
                    Blog
                  </a>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                  Connect
                </h3>
                <div className="mt-4 space-y-2">
                  <a href="#" className="text-base text-gray-400 hover:text-white block">
                    GitHub
                  </a>
                  <a href="#" className="text-base text-gray-400 hover:text-white block">
                    Discord
                  </a>
                  <a href="#" className="text-base text-gray-400 hover:text-white block">
                    Twitter
                  </a>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 border-t border-gray-700 pt-8 flex flex-col md:flex-row justify-between items-center">
            <div className="text-gray-400 text-sm">
              &copy; {new Date().getFullYear()} BlockVote. All rights reserved.
            </div>
            <div className="mt-4 md:mt-0 flex space-x-6">
              <a href="#" className="text-gray-400 hover:text-white">
                Privacy Policy
              </a>
              <a href="#" className="text-gray-400 hover:text-white">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;