// src/pages/SettingsPage.jsx
import React, { useState } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { useWeb3 } from '../contexts/Web3Context';
import { Save, AlertTriangle } from 'lucide-react';

const SettingsPage = () => {
  const { networkId, switchNetwork, supportedNetworks } = useWeb3();
  
  const [settings, setSettings] = useState({
    notificationsEnabled: true,
    theme: 'light',
    gasPreference: 'standard'
  });
  
  const [message, setMessage] = useState(null);
  
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings({
      ...settings,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  const handleSaveSettings = () => {
    // In a real app, this would save to server/database
    // For now, just save to localStorage
    localStorage.setItem('user_settings', JSON.stringify(settings));
    
    setMessage({
      type: 'success',
      text: 'Settings saved successfully!'
    });
    
    // Clear message after 3 seconds
    setTimeout(() => {
      setMessage(null);
    }, 3000);
  };
  
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
        return 'Local Development';
      default:
        return 'Unknown Network';
    }
  };
  
  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
        <p className="text-gray-600 mt-1">
          Configure your BlockVote application preferences
        </p>
      </div>
      
      {message && (
        <div className={`mb-6 p-4 rounded-md ${
          message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
        }`}>
          {message.text}
        </div>
      )}
      
      <Card className="mb-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Network Settings</h2>
        
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-700 mb-2">Current Network</div>
          <div className="bg-indigo-50 text-indigo-700 px-3 py-2 rounded-md inline-block">
            {getNetworkName(networkId)}
          </div>
        </div>
        
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-700 mb-2">Switch Network</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {supportedNetworks.map(id => (
              <Button
                key={id}
                variant={id === networkId ? 'primary' : 'outline'}
                size="sm"
                onClick={() => switchNetwork(id)}
                disabled={id === networkId}
              >
                {getNetworkName(id)}
              </Button>
            ))}
          </div>
        </div>
      </Card>
      
      <Card>
        <h2 className="text-lg font-bold text-gray-800 mb-4">Application Settings</h2>
        
        <div className="mb-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              name="notificationsEnabled"
              checked={settings.notificationsEnabled}
              onChange={handleInputChange}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-gray-700">Enable notifications</span>
          </label>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="theme">
            Theme
          </label>
          <select
            id="theme"
            name="theme"
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            value={settings.theme}
            onChange={handleInputChange}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System Default</option>
          </select>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Gas Price Preference
          </label>
          <div className="mt-1 space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="gasPreference"
                value="low"
                checked={settings.gasPreference === 'low'}
                onChange={handleInputChange}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
              />
              <span className="ml-2 text-gray-700">Low (slower confirmation)</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="gasPreference"
                value="standard"
                checked={settings.gasPreference === 'standard'}
                onChange={handleInputChange}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
              />
              <span className="ml-2 text-gray-700">Standard (recommended)</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="gasPreference"
                value="high"
                checked={settings.gasPreference === 'high'}
                onChange={handleInputChange}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
              />
              <span className="ml-2 text-gray-700">High (faster confirmation)</span>
            </label>
          </div>
        </div>
        
        <div className="bg-yellow-50 p-4 rounded-md mb-6">
          <div className="flex items-start">
            <AlertTriangle className="text-yellow-600 mt-0.5 mr-3 flex-shrink-0" size={18} />
            <div className="text-sm text-yellow-700">
              <p className="font-medium">Important Note</p>
              <p>These settings are stored locally on your device and will be reset if you clear your browser data.</p>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end">
          <Button
            variant="primary"
            onClick={handleSaveSettings}
            className="flex items-center"
          >
            <Save size={16} className="mr-2" />
            Save Settings
          </Button>
        </div>
      </Card>
    </DashboardLayout>
  );
};

export default SettingsPage;