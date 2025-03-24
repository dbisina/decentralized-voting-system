import React from 'react';
import { ExternalLink, AlertTriangle, Check, Loader, ArrowRight } from 'lucide-react';
import Button from '../common/Button';
import useBlockchain  from '../../hooks/useBlockchain';

/**
 * Vote confirmation component
 * Shows transaction details and confirmation steps
 * 
 * @param {Object} candidate - Selected candidate
 * @param {Object} election - Election data
 * @param {string} step - Current step in the voting process
 * @param {Object} transaction - Transaction data
 * @param {boolean} isProcessing - Whether a transaction is processing
 * @param {string} error - Error message if any
 * @param {function} onConfirm - Function to call on confirmation
 * @param {function} onCancel - Function to call on cancellation
 * @param {function} onBack - Function to call to go back
 * @param {function} onDone - Function to call when done
 */
const VoteConfirmation = ({
  candidate,
  election,
  step = 'confirm', // 'confirm', 'processing', 'success', 'error'
  transaction,
  isProcessing = false,
  error = null,
  onConfirm,
  onCancel,
  onBack,
  onDone
}) => {
  const { getExplorerUrl, getNetworkCurrency, formatEther, gasPrice } = useBlockchain();
  
  if (!candidate || !election) return null;
  
  // Get transaction URL for block explorer
  const getTransactionUrl = () => {
    if (!transaction?.transactionHash) return '';
    return getExplorerUrl('tx', transaction.transactionHash);
  };
  
  // Format gas price for display
  const getEstimatedGasFee = () => {
    if (!gasPrice) return '~0.0001';
    
    // Estimate gas used for a vote transaction (approximate)
    const estimatedGas = 100000; // Typically voting uses around 60k-100k gas
    const estimatedCost = parseFloat(gasPrice) * estimatedGas / 1e18;
    return estimatedCost.toFixed(6);
  };
  
  // Render confirmation step
  const renderConfirmationStep = () => (
    <>
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-800 mb-1">Confirm your vote</h2>
        <p className="text-gray-600 text-sm">
          Please review your selection before submitting your vote to the blockchain.
        </p>
      </div>
      
      <div className="mb-6">
        <div className="text-sm text-gray-500 mb-1">Selected Candidate</div>
        <div className="flex items-center p-4 bg-indigo-50 rounded-lg">
          {candidate.photoUrl && (
            <img 
              src={candidate.photoUrl} 
              alt={candidate.name}
              className="w-12 h-12 rounded-full mr-4 object-cover"
            />
          )}
          <div>
            <div className="font-bold text-gray-800">
              {candidate.name}
            </div>
            {candidate.platform && (
              <div className="text-sm text-gray-600">
                {candidate.platform}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="bg-indigo-50 rounded-lg p-4 mb-6">
        <h3 className="font-medium text-gray-800 mb-2">Transaction Details</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-gray-500">Network</div>
          <div className="text-gray-800">{election.network || 'Polygon Mumbai Testnet'}</div>
          <div className="text-gray-500">Gas Fee (estimated)</div>
          <div className="text-gray-800">{getEstimatedGasFee()} {getNetworkCurrency()}</div>
          <div className="text-gray-500">Election</div>
          <div className="text-gray-800 truncate">{election.title}</div>
        </div>
      </div>
      
      <div className="bg-yellow-50 rounded-lg p-4 mb-6 flex items-start">
        <AlertTriangle size={20} className="text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-yellow-800">
          <strong>Important:</strong> Once submitted, your vote cannot be changed. This transaction
          will be permanently recorded on the blockchain.
        </div>
      </div>
      
      <div className="flex justify-between">
        <Button 
          variant="secondary"
          onClick={onBack || onCancel}
          disabled={isProcessing}
        >
          Back
        </Button>
        <Button 
          variant="primary"
          onClick={onConfirm}
          isLoading={isProcessing}
          disabled={isProcessing}
        >
          Submit Vote
        </Button>
      </div>
    </>
  );
  
  // Render processing step
  const renderProcessingStep = () => (
    <div className="text-center py-8">
      <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-indigo-100">
        <Loader size={32} className="text-indigo-600 animate-spin" />
      </div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">Processing your vote</h2>
      <p className="text-gray-600 mb-8 max-w-md mx-auto">
        Your vote is being recorded on the blockchain. This may take a few moments.
        Please do not close this page.
      </p>
      
      {transaction?.transactionHash && (
        <div className="bg-indigo-50 rounded-lg p-4 mb-6 inline-block mx-auto">
          <div className="text-sm">
            <div className="flex items-center justify-center">
              <span className="font-medium text-gray-700 mr-2">Transaction Hash:</span>
              <span className="font-mono text-sm text-gray-800 truncate">{transaction.transactionHash.slice(0, 10)}...{transaction.transactionHash.slice(-8)}</span>
              <a 
                href={getTransactionUrl()} 
                target="_blank" 
                rel="noopener noreferrer"
                className="ml-2 text-indigo-600 hover:text-indigo-800"
              >
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
  
  // Render success step
  const renderSuccessStep = () => (
    <div className="text-center py-8">
      <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-green-100">
        <Check size={32} className="text-green-600" />
      </div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">Vote successfully recorded!</h2>
      <p className="text-gray-600 mb-8 max-w-md mx-auto">
        Your vote for <strong>{candidate.name}</strong> has been securely recorded on the blockchain.
        Thank you for participating in this election.
      </p>
      
      {transaction?.transactionHash && (
        <div className="bg-gray-50 rounded-lg p-4 max-w-md mx-auto mb-8 text-left">
          <h3 className="font-medium text-gray-800 mb-2">Transaction Details</h3>
          <div className="text-sm">
            <div className="flex justify-between mb-1">
              <span className="text-gray-500">Transaction Hash:</span>
              <div className="flex items-center">
                <span className="text-gray-800 font-mono">{transaction.transactionHash.slice(0, 8)}...{transaction.transactionHash.slice(-6)}</span>
                <a 
                  href={getTransactionUrl()} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="ml-2 text-indigo-600 hover:text-indigo-800"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
            {transaction.blockNumber && (
              <div className="flex justify-between mb-1">
                <span className="text-gray-500">Block:</span>
                <span className="text-gray-800">#{transaction.blockNumber}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Time:</span>
              <span className="text-gray-800">{new Date().toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
      
      <Button 
        variant="primary"
        onClick={onDone}
        className="inline-flex items-center"
      >
        Return to Dashboard
        <ArrowRight size={16} className="ml-2" />
      </Button>
    </div>
  );
  
  // Render error step
  const renderErrorStep = () => (
    <div className="text-center py-8">
      <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-red-100">
        <AlertTriangle size={32} className="text-red-600" />
      </div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">Voting transaction failed</h2>
      <p className="text-gray-600 mb-4 max-w-md mx-auto">
        There was an error recording your vote on the blockchain.
      </p>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8 max-w-md mx-auto text-sm text-red-800">
          {error}
        </div>
      )}
      
      <div className="flex justify-center space-x-4">
        <Button 
          variant="secondary"
          onClick={onBack || onCancel}
        >
          Try Again
        </Button>
        <Button 
          variant="primary"
          onClick={onDone}
        >
          Return to Dashboard
        </Button>
      </div>
    </div>
  );
  
  // Render the appropriate step
  const renderStep = () => {
    switch (step) {
      case 'confirm':
        return renderConfirmationStep();
      case 'processing':
        return renderProcessingStep();
      case 'success':
        return renderSuccessStep();
      case 'error':
        return renderErrorStep();
      default:
        return renderConfirmationStep();
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="p-6">
        {renderStep()}
      </div>
    </div>
  );
};

export default VoteConfirmation;