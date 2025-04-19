// frontend/src/services/ipfsService.jsx

import { create } from 'ipfs-http-client';

/**
 * Service for interacting with IPFS for decentralized storage
 * With improved error handling and fallback mechanisms
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
    
    // Fallback to public gateways for content retrieval
    this.gateways = [
      'https://gold-implicit-gayal-493.mypinata.cloud/ipfs/',
    ];
    
    // In-memory cache to prevent repeated requests
    this.contentCache = {};
    
    // Track failed CIDs to prevent repeated failures
    this.failedCids = new Set();

    // Flag to track persistent network issues
    this.networkIssuesDetected = false;

    // Counter for sequential failures
    this.failureCounter = 0;
    this.MAX_FAILURES = 5;
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
      if (!projectId || !projectSecret || projectId === "YOUR_INFURA_IPFS_PROJECT_ID") {
        console.warn('IPFS: No valid credentials found, using mock storage');
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
   * Check if network issues make IPFS unusable
   * @returns {boolean} True if network issues are detected
   */
  _shouldUseMockStorage() {
    return this.usingMockStorage || this.networkIssuesDetected || this.failureCounter >= this.MAX_FAILURES;
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
      
      // If we should use mock storage, skip IPFS attempt
      if (this._shouldUseMockStorage()) {
        return this._useMockStorage(content);
      }
      
      // Otherwise, try IPFS first
      try {
        const { path } = await this.ipfs.add(content);
        console.log('Successfully uploaded content to IPFS with CID:', path);
        
        // Reset failure counter on success
        this.failureCounter = 0;
        
        // Store in cache
        this.contentCache[path] = typeof data === 'object' ? data : content;
        
        return path;
      } catch (ipfsError) {
        console.warn('IPFS upload failed, falling back to mock storage:', ipfsError);
        
        // Increment failure counter
        this.failureCounter++;
        
        // If too many failures, switch to mock mode permanently for this session
        if (this.failureCounter >= this.MAX_FAILURES) {
          console.warn(`${this.MAX_FAILURES} sequential IPFS failures, switching to mock storage permanently`);
          this.networkIssuesDetected = true;
        }
        
        // Fall through to mock storage
        return this._useMockStorage(content);
      }
    } catch (error) {
      console.error('Error uploading to IPFS/mock storage:', error);
      // Still try mock storage as last resort
      return this._useMockStorage(typeof data === 'object' ? JSON.stringify(data) : data);
    }
  }
  
  /**
   * Use mock storage as fallback
   * @param {string} content - Content to store
   * @returns {Promise<string>} Mock CID
   * @private
   */
  _useMockStorage(content) {
    const mockCid = this._generateMockCid();
    this.mockStorage[mockCid] = content;
    this._saveMockStorage();
    
    // Parse to object if it's JSON for cache
    let cacheContent = content;
    try {
      if (typeof content === 'string' && content.trim().startsWith('{')) {
        cacheContent = JSON.parse(content);
      }
    } catch (e) {
      // Not JSON, keep as string
    }
    
    // Store in cache
    this.contentCache[mockCid] = cacheContent;
    
    console.log('Successfully stored content in mock storage with CID:', mockCid);
    return mockCid;
  }

  /**
   * Upload a file to IPFS or mock storage
   * @param {File} file - File object to upload
   * @returns {Promise<string>} IPFS content identifier (CID)
   */
  async uploadFileToIPFS(file) {
    // If we should use mock storage, skip IPFS attempt
    if (this._shouldUseMockStorage()) {
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
        console.log('Stored file in mock storage with CID:', mockCid);
        return mockCid;
      } catch (mockError) {
        console.error('Error storing file in mock storage:', mockError);
        throw mockError;
      }
    }
    
    try {
      // Read file content
      const content = await this._readFileAsBuffer(file);
      
      // Add file to IPFS
      const { path } = await this.ipfs.add({
        path: file.name,
        content
      });
      
      console.log('Successfully uploaded file to IPFS with CID:', path);
      
      // Reset failure counter on success
      this.failureCounter = 0;
      
      return path;
    } catch (ipfsError) {
      console.warn('IPFS file upload failed, falling back to mock storage:', ipfsError);
      
      // Increment failure counter
      this.failureCounter++;
      
      // Fall back to mock storage
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
        console.log('Stored file in mock storage with CID:', mockCid);
        return mockCid;
      } catch (mockError) {
        console.error('Error storing file in mock storage:', mockError);
        throw mockError;
      }
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
   * Get content from IPFS or mock storage - improved version with better error handling
   * @param {string} cid - IPFS content identifier
   * @returns {Promise<Object|string>} Retrieved content
   */
  async getFromIPFS(cid) {
    // If CID is not valid, return empty object instead of failing
    if (!cid || typeof cid !== 'string' || cid.trim() === '') {
      console.warn('Invalid or empty CID provided:', cid);
      return this._createMockCandidate(cid); // Return mock data
    }
    
    // Check cache first for quick response
    if (this.contentCache[cid]) {
      return this.contentCache[cid];
    }
    
    // If this CID has failed before, don't try again (reduces errors in browser console)
    if (this.failedCids.has(cid)) {
      return this._createMockCandidate(cid, true);
    }
    
    // Check mock storage first since it's fastest
    if (this.mockStorage[cid]) {
      console.log(`Found content in mock storage for CID: ${cid}`);
      const content = this.mockStorage[cid];
      
      // If it's a JSON string, parse it
      if (typeof content === 'string') {
        try {
          const parsed = JSON.parse(content);
          this.contentCache[cid] = parsed; // Cache it
          return parsed;
        } catch (parseError) {
          // Return as plain text if not valid JSON
          this.contentCache[cid] = content; // Cache it
          return content;
        }
      }
      
      this.contentCache[cid] = content; // Cache it
      return content;
    }
    
    // If we should use mock storage entirely, skip IPFS attempts
    if (this._shouldUseMockStorage()) {
      return this._createMockCandidate(cid);
    }
    
    try {
      console.log(`Attempting to get content from IPFS: ${cid}`);
      
      // If IPFS client is available, try direct IPFS
      if (this.ipfs) {
        try {
          console.log(`Fetching from IPFS node: ${cid}`);
          const stream = this.ipfs.cat(cid);
          let data = '';
          
          for await (const chunk of stream) {
            data += new TextDecoder().decode(chunk);
          }
          
          console.log(`Successfully retrieved data from IPFS node: ${cid}`);
          
          // Reset failure counter on success
          this.failureCounter = 0;
          
          // Try to parse as JSON if possible
          try {
            const parsed = JSON.parse(data);
            this.contentCache[cid] = parsed; // Cache it
            return parsed;
          } catch (parseError) {
            // Return as plain text if not valid JSON
            this.contentCache[cid] = data; // Cache it
            return data;
          }
        } catch (ipfsError) {
          console.warn(`Error fetching from IPFS node: ${ipfsError.message}`);
          // Continue to gateway fallback
        }
      }
      
      // Try gateway fetch with better error handling
      return await this._fetchFromGatewayWithFallback(cid);
      
    } catch (error) {
      console.error(`Error in getFromIPFS: ${error.message}`);
      
      // Increment failure counter
      this.failureCounter++;
      
      // Check if we should switch to mock mode permanently
      if (this.failureCounter >= this.MAX_FAILURES) {
        console.warn(`${this.MAX_FAILURES} sequential IPFS failures, switching to mock storage permanently`);
        this.networkIssuesDetected = true;
      }
      
      // Mark this CID as failed to prevent repeated attempts
      this.failedCids.add(cid);
      
      // Return a mock data object instead of throwing
      return this._createMockCandidate(cid);
    }
  }

  /**
   * Create a mock candidate when IPFS fails
   * @param {string} cid - The requested CID
   * @param {boolean} cached - Whether this is from cache 
   * @returns {Object} A mock candidate object
   * @private
   */
  _createMockCandidate(cid, cached = false) {
    // Create ID from CID hash 
    const idFromCid = cid ? cid.substring(0, 6) : Math.floor(Math.random() * 1000);
    
    const mockCandidate = {
      name: `Candidate #${idFromCid}`,
      bio: "This candidate information couldn't be retrieved from IPFS",
      platform: "Placeholder platform",
      _ipfsError: true,
      _mockData: true,
      _requestedCid: cid,
      _cached: cached
    };
    
    // Cache the mock data
    if (cid) {
      this.contentCache[cid] = mockCandidate;
    }
    
    return mockCandidate;
  }

  /**
   * Fetch content from gateways with fallback mechanism
   * @param {string} cid - IPFS content identifier
   * @returns {Promise<Object|string>} Retrieved content
   * @private
   */
  async _fetchFromGatewayWithFallback(cid) {
    // Create a function to attempt fetching with a specific gateway
    const tryGateway = async (gateway) => {
      try {
        // Use no-cors mode for better compatibility
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await fetch(`${gateway}${cid}`, { 
          method: 'GET',
          signal: controller.signal,
          mode: 'cors',
          headers: {
            'Accept': 'application/json, text/plain, */*'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Try to determine content type
        const contentType = response.headers.get('content-type');
        
        let data;
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          const text = await response.text();
          // Try to parse as JSON even if content type doesn't indicate it
          try {
            data = JSON.parse(text);
          } catch {
            data = text;
          }
        }
        
        console.log(`Successfully retrieved data from gateway ${gateway}`);
        
        // Cache the successful result
        this.contentCache[cid] = data;
        
        // Reset failure counter on success
        this.failureCounter = 0;
        
        return { success: true, data };
      } catch (error) {
        console.warn(`Error fetching from gateway ${gateway}:`, error.message);
        return { success: false, error };
      }
    };
    
    // Create a set of promise-returning functions for each gateway
    const gatewayPromiseFns = this.gateways.map(gateway => () => tryGateway(gateway));
    
    // Try each gateway sequentially (not in parallel) to avoid overloading
    for (const gatewayFn of gatewayPromiseFns) {
      const result = await gatewayFn();
      if (result.success) {
        return result.data;
      }
    }
    
    // Try a CORS proxy as a last resort (if in development)
    if (process.env.NODE_ENV === 'development') {
      try {
        // Public CORS proxy (https://cors-anywhere.herokuapp.com/) or custom proxy
        const proxyUrl = 'https://corsproxy.io/?';
        const response = await fetch(`${proxyUrl}${this.gateways[0]}${cid}`);
        
        if (response.ok) {
          let data;
          const contentType = response.headers.get('content-type');
          
          if (contentType && contentType.includes('application/json')) {
            data = await response.json();
          } else {
            const text = await response.text();
            try {
              data = JSON.parse(text);
            } catch {
              data = text;
            }
          }
          
          console.log(`Successfully retrieved data via CORS proxy`);
          this.contentCache[cid] = data;
          return data;
        }
      } catch (proxyError) {
        console.warn('Error using CORS proxy:', proxyError.message);
      }
    }
    
    // If we got here, all gateways failed
    console.error('All gateway attempts failed for IPFS CID:', cid);
    
    // Mark this CID as failed to prevent future attempts
    this.failedCids.add(cid);
    
    // Increment failure counter
    this.failureCounter++;
    
    // Return a mock candidate
    return this._createMockCandidate(cid);
  }

  /**
   * Get a gateway URL for a CID (for direct linking in UI)
   * @param {string} cid - IPFS content identifier
   * @returns {string} Full URL to access the content
   */
  getIPFSUrl(cid) {
    if (!cid) return '';
    return `${this.gateways[0]}${cid}`;
  }

  /**
   * Store election details on IPFS or mock storage
   * @param {Object} electionDetails - Election details
   * @returns {Promise<string>} IPFS CID
   */
  async storeElectionDetails(electionDetails) {
    const data = {
      title: electionDetails.title || 'Untitled Election',
      description: electionDetails.description || '',
      rules: electionDetails.rules || '',
      additionalInfo: electionDetails.additionalInfo || '',
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
      name: candidateDetails.name || 'Candidate',
      bio: candidateDetails.bio || '',
      platform: candidateDetails.platform || '',
      photoUrl: candidateDetails.photoUrl || '',
      createdAt: new Date().toISOString()
    };
    
    return this.uploadToIPFS(data);
  }
  
  /**
   * Check if the service is using mock storage
   * @returns {boolean} Whether mock storage is being used
   */
  isUsingMockStorage() {
    return this.usingMockStorage || this.networkIssuesDetected;
  }

  /**
   * Clear the content cache
   */
  clearCache() {
    this.contentCache = {};
    this.failedCids.clear();
    this.failureCounter = 0;
    this.networkIssuesDetected = false;
    console.log("IPFS content cache cleared");
  }
}

export default IPFSService;