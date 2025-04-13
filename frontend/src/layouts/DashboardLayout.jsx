import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Vote, LogOut, User, BarChart, Settings, HelpCircle, Menu, X, Plus } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { useAuth } from '../contexts/AuthContext';

const DashboardLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { account, networkId } = useWeb3();
  const { logout } = useAuth();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pageTitle, setPageTitle] = useState('Dashboard');

  // Set page title based on current path
  useEffect(() => {
    const path = location.pathname;
    
    if (path === '/dashboard') setPageTitle('Dashboard');
    else if (path === '/manage') setPageTitle('Manage Elections');
    else if (path === '/profile') setPageTitle('Profile');
    else if (path === '/settings') setPageTitle('Settings');
    else if (path === '/help') setPageTitle('Help Center');
    else if (path.includes('/create-election')) setPageTitle('Create Election');
    else if (path.includes('/vote/')) setPageTitle('Vote');
    else if (path.includes('/election/')) setPageTitle('Election Results');
    else setPageTitle('Dashboard');
  }, [location.pathname]);
  
  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarOpen && !event.target.closest('.sidebar') && !event.target.closest('.sidebar-toggle')) {
        setSidebarOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [sidebarOpen]);
  
  // Determine active page for highlighting in sidebar
  const isActive = (path) => {
    if (path === '/dashboard' && location.pathname === '/dashboard') return true;
    if (path === '/manage' && location.pathname === '/manage') return true;
    if (path === '/profile' && location.pathname === '/profile') return true;
    if (path === '/settings' && location.pathname === '/settings') return true;
    if (path === '/help' && location.pathname === '/help') return true;
    return false;
  };
  
  // Format the account address for display
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  // Handle logout
  const handleLogout = async () => {
    await logout();
    navigate('/');
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
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Mobile header */}
      <div className="bg-white shadow-sm lg:hidden sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-gray-500 focus:outline-none sidebar-toggle"
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <Link to="/dashboard" className="ml-4 flex items-center">
              <Vote size={24} className="text-indigo-600" />
              <span className="ml-2 text-lg font-bold text-gray-800">BlockVote</span>
            </Link>
          </div>
          <div className="flex items-center">
            <Link
              to="/create-election"
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-2 mr-2"
              aria-label="Create election"
            >
              <Plus size={20} />
            </Link>
          </div>
        </div>
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`sidebar fixed inset-y-0 left-0 z-20 w-64 bg-indigo-900 text-white transform transition-transform duration-300 lg:relative lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } flex flex-col`}
        >
          <div className="p-6 hidden lg:block">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <Vote size={24} className="text-indigo-300" />
              <span className="text-xl font-bold">BlockVote</span>
            </Link>
          </div>
          
          <nav className="flex-1 mt-6 overflow-y-auto">
            <Link
              to="/dashboard"
              className={`px-6 py-3 font-medium flex items-center space-x-3 transition-colors ${
                isActive('/dashboard') ? 'bg-indigo-800' : 'hover:bg-indigo-800/70'
              }`}
              onClick={() => setSidebarOpen(false)}
            >
              <BarChart size={18} />
              <span>Dashboard</span>
            </Link>
            
            <Link
              to="/manage"
              className={`px-6 py-3 font-medium flex items-center space-x-3 transition-colors ${
                isActive('/manage') ? 'bg-indigo-800' : 'hover:bg-indigo-800/70'
              }`}
              onClick={() => setSidebarOpen(false)}
            >
              <Vote size={18} />
              <span>Manage Elections</span>
            </Link>
            
            <Link
              to="/profile"
              className={`px-6 py-3 font-medium flex items-center space-x-3 transition-colors ${
                isActive('/profile') ? 'bg-indigo-800' : 'hover:bg-indigo-800/70'
              }`}
              onClick={() => setSidebarOpen(false)}
            >
              <User size={18} />
              <span>Profile</span>
            </Link>
            
            <Link
              to="/settings"
              className={`px-6 py-3 font-medium flex items-center space-x-3 transition-colors ${
                isActive('/settings') ? 'bg-indigo-800' : 'hover:bg-indigo-800/70'
              }`}
              onClick={() => setSidebarOpen(false)}
            >
              <Settings size={18} />
              <span>Settings</span>
            </Link>
            
            <Link
              to="/help"
              className={`px-6 py-3 font-medium flex items-center space-x-3 transition-colors ${
                isActive('/help') ? 'bg-indigo-800' : 'hover:bg-indigo-800/70'
              }`}
              onClick={() => setSidebarOpen(false)}
            >
              <HelpCircle size={18} />
              <span>Help</span>
            </Link>
          </nav>
          
          <div className="p-4 mt-auto">
            <div className="bg-indigo-800 rounded-lg p-3 transition-all hover:bg-indigo-700">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">Wallet Connected</div>
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
              </div>
              <div className="text-sm text-indigo-300 truncate mb-1">
                {formatAddress(account)}
              </div>
              <div className="text-xs text-indigo-400 mb-3">
                {networkId && getNetworkName(networkId)}
              </div>
              <button
                onClick={handleLogout}
                className="w-full bg-indigo-700 hover:bg-indigo-600 py-2 rounded flex items-center justify-center space-x-2 transition text-sm"
              >
                <LogOut size={16} />
                <span>Disconnect</span>
              </button>
            </div>
          </div>
        </aside>
        
        {/* Overlay for sidebar on mobile */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-10 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          ></div>
        )}
        
        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-auto">
          {/* Desktop header */}
          <header className="bg-white shadow-sm px-6 py-4 hidden lg:flex justify-between items-center sticky top-0 z-10">
            <h1 className="text-2xl font-bold text-gray-800">{pageTitle}</h1>
            <div className="flex items-center space-x-4">
              <Link
                to="/create-election"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center transition"
              >
                <Plus size={18} className="mr-2" />
                <span>Create Election</span>
              </Link>
            </div>
          </header>
          
          {/* Page content */}
          <main className="flex-1 px-4 py-6 lg:px-8">
            {children}
          </main>
          
          {/* Footer */}
          <footer className="bg-white py-4 px-6 border-t text-center text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} BlockVote - Decentralized Voting System
          </footer>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;