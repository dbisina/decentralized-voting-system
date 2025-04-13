import { create } from 'ipfs-http-client';

/**
 * Service for interacting with IPFS for decentralized storage
 * With fallback to local storage when IPFS is unavailable
 */
class IPFSService {
  constructor() {
    // Try to configure IPFS client
    this.ipfs = this._createIPFSClient();
    
    // Flag to track if we're using mock storage
    this.usingMockStorage = !this.ipfs;
    
    // Mock storage for fallback (using localStorage)
    this.mockStorage = {};
    
    // Load any existing mock data from localStorage
    this._loadMockStorage();
    
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
   * @returns {Object|null} IPFS client instance or null if creation fails
   * @private
   */
  _createIPFSClient() {
    try {
      // Check for environment variables
      const projectId = process.env.REACT_APP_INFURA_IPFS_PROJECT_ID;
      const projectSecret = process.env.REACT_APP_INFURA_IPFS_PROJECT_SECRET;
      
      // If we don't have credentials, return null to use mock storage
      if (!projectId || !projectSecret) {
        console.warn('IPFS: No credentials found, using mock storage');
        return null;
      }
      
      // Create auth header
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
      console.warn('Error creating IPFS client, using mock storage:', error);
      return null;
    }
  }
  
  /**
   * Load mock storage from localStorage
   * @private
   */
  _loadMockStorage() {
    try {
      const savedData = localStorage.getItem('mock_ipfs_storage');
      if (savedData) {
        this.mockStorage = JSON.parse(savedData);
      }
    } catch (error) {
      console.warn('Error loading mock storage:', error);
      this.mockStorage = {};
    }
  }
  
  /**
   * Save mock storage to localStorage
   * @private
   */
  _saveMockStorage() {
    try {
      localStorage.setItem('mock_ipfs_storage', JSON.stringify(this.mockStorage));
    } catch (error) {
      console.warn('Error saving mock storage:', error);
    }
  }
  
  /**
   * Generate a mock CID (Content Identifier)
   * @returns {string} A mock CID
   * @private
   */
  _generateMockCid() {
    // Generate a random string that looks like a CID
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'Qm';
    for (let i = 0; i < 44; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Upload data to IPFS or mock storage
   * @param {Object|Array|string} data - Data to upload to IPFS
   * @returns {Promise<string>} IPFS content identifier (CID)
   */
  async uploadToIPFS(data) {
    try {
      // Convert data to JSON string if it's an object
      const content = typeof data === 'object' ? JSON.stringify(data) : data;
      
      // If IPFS client is available, use it
      if (this.ipfs) {
        try {
          const { path } = await this.ipfs.add(content);
          console.log('Successfully uploaded content to IPFS with CID:', path);
          return path;
        } catch (ipfsError) {
          console.warn('IPFS upload failed, falling back to mock storage:', ipfsError);
          // Fall through to mock storage
        }
      }
      
      // Use mock storage if IPFS is unavailable or upload failed
      const mockCid = this._generateMockCid();
      this.mockStorage[mockCid] = content;
      this._saveMockStorage();
      console.log('Successfully stored content in mock storage with CID:', mockCid);
      return mockCid;
    } catch (error) {
      console.error('Error uploading to IPFS/mock storage:', error);
      throw error;
    }
  }

  /**
   * Upload a file to IPFS or mock storage
   * @param {File} file - File object to upload
   * @returns {Promise<string>} IPFS content identifier (CID)
   */
  async uploadFileToIPFS(file) {
    try {
      // If IPFS client is available, use it
      if (this.ipfs) {
        try {
          // Read file content
          const content = await this._readFileAsBuffer(file);
          
          // Add file to IPFS
          const { path } = await this.ipfs.add({
            path: file.name,
            content
          });
          
          console.log('Successfully uploaded file to IPFS with CID:', path);
          return path;
        } catch (ipfsError) {
          console.warn('IPFS file upload failed, falling back to mock storage:', ipfsError);
          // Fall through to mock storage
        }
      }
      
      // Use mock storage if IPFS is unavailable or upload failed
      try {
        // Read file as text or base64
        const content = await this._readFileAsText(file);
        const mockCid = this._generateMockCid();
        this.mockStorage[mockCid] = {
          filename: file.name,
          content: content,
          type: file.type
        };
        this._saveMockStorage();
        console.log('Successfully stored file in mock storage with CID:', mockCid);
        return mockCid;
      } catch (mockError) {
        console.error('Error storing file in mock storage:', mockError);
        throw mockError;
      }
    } catch (error) {
      console.error('Error uploading file:', error);
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
   * Helper to read a file as text or base64
   * @param {File} file - File to read
   * @returns {Promise<string>} File content as text or base64
   * @private
   */
  _readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      
      if (file.type.startsWith('text/')) {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    });
  }

  /**
   * Get content from IPFS or mock storage
   * @param {string} cid - IPFS content identifier
   * @returns {Promise<Object|string>} Retrieved content
   */
  async getFromIPFS(cid) {
    try {
      if (!cid) {
        throw new Error('Invalid CID');
      }
      
      // First check mock storage
      if (this.mockStorage[cid]) {
        const content = this.mockStorage[cid];
        
        // If it's a JSON string, parse it
        if (typeof content === 'string') {
          try {
            return JSON.parse(content);
          } catch (parseError) {
            // Return as plain text if not valid JSON
            return content;
          }
        }
        
        return content;
      }
      
      // If not in mock storage and IPFS client is available, try IPFS
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
      console.error('Error getting content from IPFS/mock storage:', error);
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
      
      // If all gateways fail and we have mock storage, create a mock entry
      if (!this.mockStorage[cid]) {
        this.mockStorage[cid] = {
          mockData: true,
          message: "This is mock data created when retrieval from IPFS failed"
        };
        this._saveMockStorage();
        return this.mockStorage[cid];
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
   * Store election details on IPFS or mock storage
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
   * Store candidate details on IPFS or mock storage
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
  
  /**
   * Check if the service is using mock storage
   * @returns {boolean} Whether mock storage is being used
   */
  isUsingMockStorage() {
    return this.usingMockStorage;
  }
}

export default IPFSService;