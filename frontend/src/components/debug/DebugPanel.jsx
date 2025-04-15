// Create this file: src/components/debug/DebugPanel.jsx

import React, { useState } from 'react';
import { AlertTriangle, Eye, EyeOff, RefreshCw } from 'lucide-react';

/**
 * Debug panel component for helping diagnose issues with elections and candidates
 */
const DebugPanel = ({ election, refreshData }) => {
  const [showDebug, setShowDebug] = useState(false);
  
  if (!election) return null;
  
  const handleForceRefresh = () => {
    if (refreshData && typeof refreshData === 'function') {
      refreshData();
    }
  };
  
  return (
    <div className="mt-6 border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
        <button 
          className="text-gray-700 text-sm font-medium flex items-center"
          onClick={() => setShowDebug(!showDebug)}
        >
          {showDebug ? <EyeOff size={16} className="mr-2" /> : <Eye size={16} className="mr-2" />}
          {showDebug ? 'Hide Debug Info' : 'Show Debug Info'}
        </button>
        
        <button
          className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded text-sm flex items-center"
          onClick={handleForceRefresh}
        >
          <RefreshCw size={14} className="mr-1" />
          Force Refresh
        </button>
      </div>
      
      {showDebug && (
        <div className="p-4 bg-gray-50 overflow-x-auto">
          <div className="text-sm">
            <h4 className="font-bold mb-2">Election Debug Information</h4>
            <div className="mb-4 space-y-1">
              <div><strong>ID:</strong> {election.id}</div>
              <div><strong>Title:</strong> {election.title}</div>
              <div><strong>Status:</strong> {election.status}</div>
              <div><strong>Candidate Count:</strong> {election.candidateCount}</div>
              <div><strong>Actual Candidates Array Length:</strong> {(election.candidates?.length || 0)}</div>
              <div><strong>Total Votes:</strong> {election.totalVotes}</div>
              <div><strong>Admin:</strong> {election.admin}</div>
            </div>
            
            <h4 className="font-bold mb-2">Candidate Debug Information</h4>
            {election.candidates && election.candidates.length > 0 ? (
              <div className="space-y-4">
                {election.candidates.map((candidate, index) => (
                  <div key={index} className="p-2 bg-white rounded border border-gray-200">
                    <div><strong>Index:</strong> {index}</div>
                    <div><strong>ID:</strong> {candidate.id}</div>
                    <div><strong>Name:</strong> {candidate.name}</div>
                    <div><strong>Details Hash:</strong> {candidate.details || 'None'}</div>
                    <div><strong>Vote Count:</strong> {candidate.voteCount}</div>
                    <div><strong>IPFS Success:</strong> {candidate._ipfsError ? 'No' : 'Yes'}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-2 bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-md flex items-start">
                <AlertTriangle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <p><strong>No candidates found in the array.</strong></p>
                  <p className="text-xs mt-1">This could indicate an issue with loading candidates from the contract.</p>
                </div>
              </div>
            )}
            
            <div className="mt-4 p-2 bg-gray-100 rounded text-xs font-mono overflow-auto">
              <h4 className="font-bold mb-1 text-sm">Raw Election Data:</h4>
              <pre>{JSON.stringify(election, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebugPanel;