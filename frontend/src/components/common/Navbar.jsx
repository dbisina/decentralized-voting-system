import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Vote, Menu, X, LogOut, User, ChevronDown } from 'lucide-react';
import { useWeb3 } from '../../contexts/Web3Context';
import { useAuth } from '../../contexts/AuthContext';
import Button from './Button';

/**
 * Navigation bar component that handles both authenticated and unauthenticated states
 */
const Navbar = ({ transparent = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { account, networkId, connectWallet, disconnectWallet } = useWeb3();
  const { user, isAuthenticated, login, logout } = useAuth();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  
  // Handle scroll events to change navbar background
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
      setIsLoading(true);
      
      const success = await login();
      
      if (success) {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle disconnect wallet button click
  const handleDisconnectWallet = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };
  
  // Format the account address for display
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
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
  
  // Check if a menu item is active
  const isActive = (path) => {
    return location.pathname === path;
  };
  
  // Determine if we're on the home page
  const isHomePage = location.pathname === '/';
  
  // Determine navbar background based on scroll and transparent prop
  const navbarBackground = transparent && !isScrolled && isHomePage
    ? 'bg-transparent'
    : 'bg-white shadow-sm';
  
  // Determine text color based on transparency
  const textColor = transparent && !isScrolled && isHomePage
    ? 'text-white'
    : 'text-gray-800';
  
  return (
    <nav className={`${navbarBackground} fixed w-full z-10 transition-all duration-300`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <Vote size={28} className={transparent && !isScrolled && isHomePage ? 'text-indigo-300' : 'text-indigo-600'} />
              <span className={`ml-2 text-xl font-bold ${textColor}`}>
                BlockVote
              </span>
            </Link>
            
            {/* Desktop navigation */}
            <div className="hidden md:ml-10 md:flex md:space-x-8">
              <Link 
                to="/" 
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isActive('/') 
                    ? (transparent && !isScrolled && isHomePage ? 'text-white font-semibold' : 'text-indigo-600') 
                    : (transparent && !isScrolled && isHomePage ? 'text-gray-200 hover:text-white' : 'text-gray-700 hover:text-indigo-600')
                }`}
              >
                Home
              </Link>
              
              {isAuthenticated ? (
                <>
                  <Link 
                    to="/dashboard" 
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      isActive('/dashboard') 
                        ? (transparent && !isScrolled && isHomePage ? 'text-white font-semibold' : 'text-indigo-600') 
                        : (transparent && !isScrolled && isHomePage ? 'text-gray-200 hover:text-white' : 'text-gray-700 hover:text-indigo-600')
                    }`}
                  >
                    Dashboard
                  </Link>
                  
                  <Link 
                    to="/manage" 
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      isActive('/manage') 
                        ? (transparent && !isScrolled && isHomePage ? 'text-white font-semibold' : 'text-indigo-600') 
                        : (transparent && !isScrolled && isHomePage ? 'text-gray-200 hover:text-white' : 'text-gray-700 hover:text-indigo-600')
                    }`}
                  >
                    Manage Elections
                  </Link>
                </>
              ) : (
                <>
                  <Link 
                    to="/about" 
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      isActive('/about') 
                        ? (transparent && !isScrolled && isHomePage ? 'text-white font-semibold' : 'text-indigo-600') 
                        : (transparent && !isScrolled && isHomePage ? 'text-gray-200 hover:text-white' : 'text-gray-700 hover:text-indigo-600')
                    }`}
                  >
                    About
                  </Link>
                  
                  <Link 
                    to="/faq" 
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      isActive('/faq') 
                        ? (transparent && !isScrolled && isHomePage ? 'text-white font-semibold' : 'text-indigo-600') 
                        : (transparent && !isScrolled && isHomePage ? 'text-gray-200 hover:text-white' : 'text-gray-700 hover:text-indigo-600')
                    }`}
                  >
                    FAQ
                  </Link>
                </>
              )}
              
              <a 
                href="https://docs.blockvote.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  transparent && !isScrolled && isHomePage ? 'text-gray-200 hover:text-white' : 'text-gray-700 hover:text-indigo-600'
                }`}
              >
                Documentation
              </a>
            </div>
          </div>
          
          <div className="flex items-center">
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                    transparent && !isScrolled && isHomePage 
                      ? 'bg-white/10 text-white' 
                      : 'bg-gray-100 text-gray-800'
                  } hover:bg-opacity-80`}
                >
                  <span className="mr-1">{formatAddress(account)}</span>
                  <ChevronDown size={16} />
                </button>
                
                {/* Profile dropdown menu */}
                {profileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 ring-1 ring-black ring-opacity-5">
                    <div className="px-4 py-2 text-xs text-gray-500">
                      Connected to {getNetworkName(networkId)}
                    </div>
                    
                    <Link
                      to="/dashboard"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                    
                    <Link
                      to="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      Profile
                    </Link>
                    
                    <Link
                      to="/settings"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      Settings
                    </Link>
                    
                    <div className="border-t border-gray-200 my-1"></div>
                    
                    <button
                      onClick={handleDisconnectWallet}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                    >
                      Disconnect
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Button
                variant={transparent && !isScrolled && isHomePage ? 'outline' : 'primary'}
                size="md"
                isLoading={isLoading}
                onClick={handleConnectWallet}
                className={transparent && !isScrolled && isHomePage ? 'border-white text-white hover:bg-white hover:text-indigo-600' : ''}
              >
                Connect Wallet
              </Button>
            )}
            
            {/* Mobile menu button */}
            <div className="flex md:hidden ml-4">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`${textColor} focus:outline-none`}
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
          
          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50"
                onClick={() => setMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
              
              <Link
                to="/manage"
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50"
                onClick={() => setMobileMenuOpen(false)}
              >
                Manage Elections
              </Link>
              
              <Link
                to="/profile"
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50"
                onClick={() => setMobileMenuOpen(false)}
              >
                Profile
              </Link>
            </>
          ) : (
            <>
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
            </>
          )}
          
          <a
            href="https://docs.blockvote.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50"
            onClick={() => setMobileMenuOpen(false)}
          >
            Documentation
          </a>
          
          {isAuthenticated && (
            <div className="border-t border-gray-200 pt-4 pb-3">
              {account && (
                <div className="px-3">
                  <div className="text-base font-medium text-gray-800">{formatAddress(account)}</div>
                  <div className="text-sm text-gray-500">
                    {networkId && getNetworkName(networkId)}
                  </div>
                </div>
              )}
              
              <div className="mt-3 px-2">
                <button
                  onClick={() => {
                    handleDisconnectWallet();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center w-full px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-gray-50"
                >
                  <LogOut className="mr-2 h-5 w-5" />
                  Disconnect
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;