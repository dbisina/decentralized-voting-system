import React, { useState, useEffect, useCallback } from 'react';
import { Flame, RefreshCw, Database, Info, AlertTriangle, Check } from 'lucide-react';
import IPFSService from '../../services/ipfsService';

/**
 * IPFS Debug Utility Component
 * Helps diagnose and fix issues with IPFS data retrieval
 */
const IPFSDebugUtility = ({ cidToTest, onSuccess }) => {
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [result, setResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [mockDataUsed, setMockDataUsed] = useState(false);
  
  // Initialize IPFS service
  const ipfsService = new IPFSService();
  
  // Test fetching a specific CID
  const testFetchCID = useCallback(async (cid) => {
    if (!cid) {
      setErrorMessage('Please enter a valid CID');
      setStatus('error');
      return;
    }
    
    try {
      setStatus('loading');
      setErrorMessage('');
      setResult(null);
      
      // Attempt to fetch from IPFS
      console.log(`Testing CID fetch: ${cid}`);
      const data = await ipfsService.getFromIPFS(cid);
      
      // Check if we got mock data back
      const isMockData = data && (data._mockData || data._ipfsError);
      setMockDataUsed(isMockData);
      
      setResult(data);
      setStatus(isMockData ? 'warning' : 'success');
      
      if (data && !isMockData && onSuccess) {
        onSuccess(data);
      }
    } catch (error) {
      console.error('Error fetching CID:', error);
      setErrorMessage(error.message || 'Unknown error fetching data');
      setStatus('error');
    }
  }, [ipfsService, onSuccess]);
  
  // Test fetching when CID changes or component mounts
  useEffect(() => {
    if (cidToTest) {
      testFetchCID(cidToTest);
    }
  }, [cidToTest, testFetchCID]);
  
  // Clear IPFS cache and retry
  const handleClearCacheAndRetry = () => {
    ipfsService.clearCache();
    testFetchCID(cidToTest);
  };
  
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium text-gray-700 flex items-center">
          <Database size={18} className="mr-2 text-indigo-600" />
          IPFS Data Debugger
        </h3>
        
        <div className="flex space-x-2">
          <button
            onClick={handleClearCacheAndRetry}
            className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-md text-sm flex items-center"
          >
            <RefreshCw size={14} className="mr-1" />
            Clear Cache & Retry
          </button>
        </div>
      </div>
      
      <div className="mb-4">
        <div className="text-sm text-gray-500 mb-1">Testing CID:</div>
        <div className="font-mono text-sm bg-gray-100 p-2 rounded">{cidToTest || 'No CID provided'}</div>
      </div>
      
      {status === 'loading' && (
        <div className="flex items-center text-blue-600">
          <div className="animate-spin mr-2 h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          <span>Loading IPFS data...</span>
        </div>
      )}
      
      {status === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700 text-sm">
          <div className="flex items-start">
            <AlertTriangle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-bold">Error retrieving IPFS data</div>
              <div>{errorMessage}</div>
            </div>
          </div>
        </div>
      )}
      
      {status === 'warning' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-yellow-700 text-sm">
          <div className="flex items-start">
            <Info size={16} className="mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-bold">Using fallback data</div>
              <div>IPFS fetch failed and mock data was used instead.</div>
              <div className="mt-1 font-mono text-xs">{result && result._requestedCid}</div>
            </div>
          </div>
        </div>
      )}
      
      {status === 'success' && (
        <div className="bg-green-50 border border-green-200 rounded p-3 text-green-700 text-sm">
          <div className="flex items-start">
            <Check size={16} className="mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-bold">Successfully retrieved data</div>
              <div>{mockDataUsed ? 'Using cached mock data' : 'Data fetched from IPFS gateway'}</div>
            </div>
          </div>
        </div>
      )}
      
      {result && (
        <div className="mt-4">
          <div className="text-sm text-gray-500 mb-1">Result:</div>
          <div className="bg-white border border-gray-200 rounded p-3 overflow-auto max-h-40">
            <pre className="text-xs font-mono">{JSON.stringify(result, null, 2)}</pre>
          </div>
        </div>
      )}
      
      <div className="mt-4 text-xs text-gray-500">
        Using mock storage: {ipfsService.isUsingMockStorage() ? 'Yes' : 'No'}
      </div>
    </div>
  );
};

export default IPFSDebugUtility;