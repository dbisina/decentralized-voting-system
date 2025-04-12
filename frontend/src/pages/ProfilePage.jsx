import React, { useState, useEffect } from 'react';
import { User, Edit2, Clock, ChevronRight, ExternalLink, AlertTriangle, Mail, Globe, Plus } from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import { useWeb3 } from '../contexts/Web3Context';
import { useAuth } from '../contexts/AuthContext';
import useBlockchain from '../hooks/useBlockchain';
import { formatDate } from '../utils/dateUtils';

const ProfilePage = () => {
  const { account, networkId } = useWeb3();
  const { user, updateProfile, isLoading: authLoading } = useAuth();
  const { formatAddress, getExplorerUrl, getNetworkCurrency, transactionHistory } = useBlockchain();
  
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    displayName: '',
    email: '',
    bio: '',
    website: '',
    organization: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Initialize profile data from user object
  useEffect(() => {
    if (user) {
      setProfileData({
        displayName: user.displayName || '',
        email: user.email || '',
        bio: user.bio || '',
        website: user.website || '',
        organization: user.organization || ''
      });
    }
  }, [user]);
  
  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData({
      ...profileData,
      [name]: value
    });
  };
  
  // Handle profile update
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    
    try {
      setIsLoading(true);
      setError(null);
      
      await updateProfile(profileData);
      
      setSuccess('Profile updated successfully!');
      setIsEditing(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
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
  
  // Calculate join date (created from user or a default date)
  const joinDate = user?.createdAt 
    ? new Date(user.createdAt) 
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default to 30 days ago
  
  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Your Profile</h1>
        
        {!isEditing && (
          <Button
            variant="outline"
            onClick={() => setIsEditing(true)}
            className="flex items-center"
          >
            <Edit2 size={16} className="mr-2" />
            Edit Profile
          </Button>
        )}
      </div>
      
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-800 rounded-md p-4 flex items-start">
          <AlertTriangle className="mr-3 mt-0.5" size={20} />
          <div>
            <h3 className="font-bold">Error</h3>
            <p>{error}</p>
          </div>
        </div>
      )}
      
      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-800 rounded-md p-4">
          {success}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="md:col-span-1">
          {/* Profile Card */}
          <Card className="mb-6">
            <div className="flex flex-col items-center">
              <div className="bg-indigo-100 text-indigo-600 rounded-full p-4 mb-4">
                <User size={48} />
              </div>
              
              <h2 className="text-xl font-bold text-gray-800 mb-1">
                {user?.displayName || 'BlockVote User'}
              </h2>
              
              <div className="text-sm text-gray-500 mb-4">
                {formatAddress(account, 8, 6)}
              </div>
              
              <div className="bg-gray-100 rounded-full px-3 py-1 text-xs font-medium text-gray-700 mb-4">
                {getNetworkName(networkId)}
              </div>
              
              <div className="w-full border-t border-gray-200 pt-4 mt-2">
                <div className="flex items-center text-sm text-gray-600 mb-2">
                  <Clock size={16} className="mr-2" />
                  <span>Joined {formatDate(joinDate)}</span>
                </div>
                
                {user?.organization && (
                  <div className="flex items-center text-sm text-gray-600 mb-2">
                    <User size={16} className="mr-2" />
                    <span>{user.organization}</span>
                  </div>
                )}
                
                {user?.email && (
                  <div className="flex items-center text-sm text-gray-600 mb-2">
                    <Mail size={16} className="mr-2" />
                    <span>{user.email}</span>
                  </div>
                )}
                
                {user?.website && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Globe size={16} className="mr-2" />
                    <a 
                      href={user.website.startsWith('http') ? user.website : `https://${user.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800"
                    >
                      {user.website.replace(/https?:\/\//g, '')}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </Card>
          
          {/* Wallet Card */}
          <Card>
            <div className="pb-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 mb-1">Wallet Info</h3>
              <p className="text-sm text-gray-600">Your blockchain wallet details</p>
            </div>
            
            <div className="mt-4 space-y-4">
              <div>
                <div className="text-sm text-gray-500 mb-1">Address</div>
                <div className="flex items-center">
                  <span className="font-mono text-sm">{formatAddress(account, 10, 6)}</span>
                  <a 
                    href={getExplorerUrl('address', account)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="ml-2 text-indigo-600 hover:text-indigo-800"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
              
              <div>
                <div className="text-sm text-gray-500 mb-1">Network</div>
                <div className="text-sm">{getNetworkName(networkId)}</div>
              </div>
              
              <div>
                <div className="text-sm text-gray-500 mb-1">Currency</div>
                <div className="text-sm">{getNetworkCurrency()}</div>
              </div>
              
              <div className="pt-4 border-t border-gray-200">
                <a 
                  href={getExplorerUrl('address', account)} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center"
                >
                  View in Explorer
                  <ChevronRight size={16} className="ml-1" />
                </a>
              </div>
            </div>
          </Card>
        </div>
        
        <div className="md:col-span-2">
          {isEditing ? (
            <Card>
              <h2 className="text-xl font-bold text-gray-800 mb-4">Edit Profile</h2>
              
              <form onSubmit={handleProfileUpdate}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="displayName">
                    Display Name
                  </label>
                  <input
                    type="text"
                    id="displayName"
                    name="displayName"
                    className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={profileData.displayName}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={profileData.email}
                    onChange={handleInputChange}
                  />
                  <p className="mt-1 text-xs text-gray-500">Your email will not be displayed publicly</p>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="organization">
                    Organization
                  </label>
                  <input
                    type="text"
                    id="organization"
                    name="organization"
                    className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={profileData.organization}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="website">
                    Website
                  </label>
                  <input
                    type="text"
                    id="website"
                    name="website"
                    className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={profileData.website}
                    onChange={handleInputChange}
                    placeholder="https://example.com"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="bio">
                    Bio
                  </label>
                  <textarea
                    id="bio"
                    name="bio"
                    rows="4"
                    className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={profileData.bio}
                    onChange={handleInputChange}
                    placeholder="Tell us about yourself"
                  ></textarea>
                </div>
                
                <div className="flex justify-end mt-6 space-x-4">
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    type="submit"
                    isLoading={isLoading}
                  >
                    Save Profile
                  </Button>
                </div>
              </form>
            </Card>
          ) : (
            <>
              {/* Bio Card */}
              <Card className="mb-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">About</h2>
                {user?.bio ? (
                  <p className="text-gray-600">{user.bio}</p>
                ) : (
                  <div className="text-gray-500 italic">
                    No bio provided. <button onClick={() => setIsEditing(true)} className="text-indigo-600 hover:text-indigo-800">Add one now</button>
                  </div>
                )}
              </Card>
              
              {/* Activity Card */}
              <Card>
                <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-1">Recent Activity</h3>
                    <p className="text-sm text-gray-600">Your recent transactions</p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => window.open(getExplorerUrl('address', account), '_blank')}
                    className="flex items-center"
                  >
                    View All
                    <ExternalLink size={14} className="ml-1" />
                  </Button>
                </div>
                
                <div className="mt-4">
                  {transactionHistory && transactionHistory.length > 0 ? (
                    <div className="space-y-4">
                      {transactionHistory.slice(0, 5).map((tx, index) => (
                        <div key={index} className="flex justify-between">
                          <div>
                            <div className="font-medium text-gray-800">
                              {tx.type || 'Transaction'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {new Date(tx.timestamp || Date.now()).toLocaleString()}
                            </div>
                          </div>
                          <a 
                            href={getExplorerUrl('tx', tx.hash)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-800"
                          >
                            <ExternalLink size={16} />
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="inline-flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-gray-100">
                        <Clock size={24} className="text-gray-400" />
                      </div>
                      <h4 className="text-gray-800 font-medium mb-2">No Recent Activity</h4>
                      <p className="text-gray-500 text-sm">
                        Your recent blockchain transactions will appear here
                      </p>
                      <Button 
                        variant="primary"
                        size="sm"
                        className="mt-4 flex items-center mx-auto"
                        onClick={() => window.location.href = '/create-election'}
                      >
                        <Plus size={16} className="mr-1" />
                        Create Election
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ProfilePage;