import { create } from 'ipfs-http-client';

/**
 * Service for interacting with IPFS for decentralized storage
 */
class IPFSService {
  constructor() {
    // Configure IPFS client
    // Using Infura IPFS gateway for production
    this.ipfs = this._createIPFSClient();
    
    // Fallback to Pinata gateway for content retrieval
    this.gatewayURL = 'https://gateway.pinata.cloud/ipfs/';
    
    // Alternative gateways if needed
    this.alternativeGateways = [
      'https://ipfs.io/ipfs/',
      'https://cloudflare-ipfs.com/ipfs/',
      'https://dweb.link/ipfs/'
    ];
  }

  /**
   * Create the IPFS client
   * @returns {Object} IPFS client instance
   * @private
   */
  _createIPFSClient() {
    try {
      // Infura IPFS project setup
      const projectId = process.env.REACT_APP_INFURA_IPFS_PROJECT_ID;
      const projectSecret = process.env.REACT_APP_INFURA_IPFS_PROJECT_SECRET;
      const auth = 'Basic ' + Buffer.from(projectId + ':' + projectSecret).toString('base64');
      
      return create({
        host: 'ipfs.infura.io',
        port: 5001,
        protocol: 'https',
        headers: {
          authorization: auth,
        },
      });
    } catch (error) {
      console.error('Error creating IPFS client:', error);
      return null;
    }
  }

  /**
   * Upload data to IPFS
   * @param {Object|Array|string} data - Data to upload to IPFS
   * @returns {Promise<string>} IPFS content identifier (CID)
   */
  async uploadToIPFS(data) {
    try {
      if (!this.ipfs) {
        throw new Error('IPFS client not initialized');
      }
      
      // Convert data to JSON string if it's an object
      const content = typeof data === 'object' ? JSON.stringify(data) : data;
      
      // Add content to IPFS
      const { path } = await this.ipfs.add(content);
      
      console.log('Successfully uploaded content to IPFS with CID:', path);
      return path;
    } catch (error) {
      console.error('Error uploading to IPFS:', error);
      throw error;
    }
  }

  /**
   * Upload a file to IPFS
   * @param {File} file - File object to upload
   * @returns {Promise<string>} IPFS content identifier (CID)
   */
  async uploadFileToIPFS(file) {
    try {
      if (!this.ipfs) {
        throw new Error('IPFS client not initialized');
      }
      
      // Read file content
      const content = await this._readFileAsBuffer(file);
      
      // Add file to IPFS
      const { path } = await this.ipfs.add({
        path: file.name,
        content
      });
      
      console.log('Successfully uploaded file to IPFS with CID:', path);
      return path;
    } catch (error) {
      console.error('Error uploading file to IPFS:', error);
      throw error;
    }
  }

  /**
   * Helper to read a file as ArrayBuffer
   * @param {File} file - File to read
   * @returns {Promise<ArrayBuffer>} File content as buffer
   * @private
   */
  _readFileAsBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Get content from IPFS
   * @param {string} cid - IPFS content identifier
   * @returns {Promise<Object|string>} Retrieved content
   */
  async getFromIPFS(cid) {
    try {
      if (!cid) {
        throw new Error('Invalid CID');
      }
      
      // Try to fetch directly from IPFS if client is available
      if (this.ipfs) {
        try {
          const stream = this.ipfs.cat(cid);
          let data = '';
          
          for await (const chunk of stream) {
            data += new TextDecoder().decode(chunk);
          }
          
          // Try to parse as JSON if possible
          try {
            return JSON.parse(data);
          } catch (parseError) {
            // Return as plain text if not valid JSON
            return data;
          }
        } catch (ipfsError) {
          console.warn('Error fetching from IPFS node, falling back to gateway:', ipfsError);
          // Fall back to gateway if direct fetch fails
        }
      }
      
      // Fallback to HTTP gateway
      return this._fetchFromGateway(cid);
    } catch (error) {
      console.error('Error getting content from IPFS:', error);
      throw error;
    }
  }

  /**
   * Fetch content from IPFS gateway
   * @param {string} cid - IPFS content identifier
   * @returns {Promise<Object|string>} Retrieved content
   * @private
   */
  async _fetchFromGateway(cid) {
    // Try primary gateway first
    try {
      const response = await fetch(`${this.gatewayURL}${cid}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const contentType = response.headers.get('content-type');
      
      // Parse as JSON if content type is JSON
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return await response.text();
      }
    } catch (primaryError) {
      console.warn('Error fetching from primary gateway, trying alternatives:', primaryError);
      
      // Try alternative gateways
      for (const gateway of this.alternativeGateways) {
        try {
          const response = await fetch(`${gateway}${cid}`);
          if (!response.ok) continue;
          
          const contentType = response.headers.get('content-type');
          
          if (contentType && contentType.includes('application/json')) {
            return await response.json();
          } else {
            return await response.text();
          }
        } catch (altError) {
          console.warn(`Error fetching from gateway ${gateway}:`, altError);
        }
      }
      
      throw new Error('Failed to fetch content from all IPFS gateways');
    }
  }

  /**
   * Get a gateway URL for a CID (for direct linking in UI)
   * @param {string} cid - IPFS content identifier
   * @returns {string} Full URL to access the content
   */
  getIPFSUrl(cid) {
    if (!cid) return '';
    return `${this.gatewayURL}${cid}`;
  }

  /**
   * Store election details on IPFS
   * @param {Object} electionDetails - Election details
   * @returns {Promise<string>} IPFS CID
   */
  async storeElectionDetails(electionDetails) {
    const data = {
      title: electionDetails.title,
      description: electionDetails.description,
      rules: electionDetails.rules,
      additionalInfo: electionDetails.additionalInfo,
      createdAt: new Date().toISOString()
    };
    
    return this.uploadToIPFS(data);
  }

  /**
   * Store candidate details on IPFS
   * @param {Object} candidateDetails - Candidate details
   * @returns {Promise<string>} IPFS CID
   */
  async storeCandidateDetails(candidateDetails) {
    const data = {
      name: candidateDetails.name,
      bio: candidateDetails.bio,
      platform: candidateDetails.platform,
      photoUrl: candidateDetails.photoUrl, // This would be a URL or another IPFS hash
      additionalInfo: candidateDetails.additionalInfo,
      createdAt: new Date().toISOString()
    };
    
    return this.uploadToIPFS(data);
  }
}

export default IPFSService;