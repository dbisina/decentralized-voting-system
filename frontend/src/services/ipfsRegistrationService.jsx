import axios from 'axios';

class IPFSRegistrationService {
  constructor() {
    // Your Pinata API keys (get these from the Pinata dashboard)
    this.apiKey = process.env.REACT_APP_PINATA_API_KEY || '';
    this.apiSecret = process.env.REACT_APP_PINATA_API_SECRET || '';
    this.baseURL = 'https://api.pinata.cloud';
    
    // For development/testing - check if we have valid keys
    this.hasValidCredentials = this.apiKey && this.apiSecret && 
                              this.apiKey !== 'YOUR_PINATA_API_KEY';
    
    // Local cache to reduce API calls
    this.registrationCache = {};
    
    // Store retries counter to avoid infinite retries
    this.retryAttempts = {};
    
    // Flag to track if we're experiencing CORS issues
    this.hasCorsIssues = false;
  }

  /**
   * Upload registration data to IPFS
   * @param {Object} registrationData - Registration data
   * @returns {Promise<string>} - IPFS hash
   */
  async storeRegistration(registrationData) {
    try {
      // If not connected to Pinata or we had CORS issues, use local storage as fallback
      if (!this.hasValidCredentials || this.hasCorsIssues) {
        console.warn('Using localStorage fallback for registration storage');
        return this._storeLocalRegistration(registrationData);
      }
      
      try {
        const response = await axios.post(
          `${this.baseURL}/pinning/pinJSONToIPFS`,
          {
            pinataContent: registrationData,
            pinataMetadata: {
              name: `voter-registration-${registrationData.electionId}-${Date.now()}`
            }
          },
          {
            headers: {
              'Content-Type': 'application/json',
              pinata_api_key: this.apiKey,
              pinata_secret_api_key: this.apiSecret
            }
          }
        );
  
        // Return the IPFS hash (CID)
        const ipfsHash = response.data.IpfsHash;
        
        // Update the registration with its hash for reference
        const registrationWithHash = {
          ...registrationData,
          ipfsHash
        };
        
        // Update local reference for this wallet address
        this._updateLocalReference(registrationWithHash);
        
        return ipfsHash;
      } catch (apiError) {
        // Check for CORS issues and mark flag if detected
        if (apiError.message && (
            apiError.message.includes('NetworkError') || 
            apiError.message.includes('Network Error') ||
            apiError.message.includes('CORS'))) {
          console.warn('CORS issue detected with Pinata API, switching to local storage mode');
          this.hasCorsIssues = true;
        }
        throw apiError;
      }
    } catch (error) {
      console.error('Error storing registration on IPFS:', error);
      
      // Fallback to local storage
      return this._storeLocalRegistration(registrationData);
    }
  }

  /**
   * Get all registrations for an election
   * @param {string|number} electionId - ID of the election
   * @returns {Promise<Array>} - Array of registrations
   */
  async getElectionRegistrations(electionId) {
    try {
      // If CORS issues or no credentials, use local storage as fallback
      if (!this.hasValidCredentials || this.hasCorsIssues) {
        console.warn('Using localStorage fallback for fetching registrations');
        return this._getLocalElectionRegistrations(electionId);
      }
      
      try {
        // Query Pinata for files with metadata matching the election ID
        const queryString = `metadata[name]=voter-registration-${electionId}`;
        const response = await axios.get(
          `${this.baseURL}/data/pinList?${queryString}`,
          {
            headers: {
              pinata_api_key: this.apiKey,
              pinata_secret_api_key: this.apiSecret
            }
          }
        );
  
        // Fetch each registration data
        const registrations = [];
        for (const pin of response.data.rows) {
          const data = await this.getRegistration(pin.ipfs_pin_hash);
          if (data && data.electionId === electionId) {
            registrations.push(data);
          }
        }
  
        return registrations;
      } catch (apiError) {
        // Check for CORS issues and mark flag if detected
        if (apiError.message && (
            apiError.message.includes('NetworkError') || 
            apiError.message.includes('Network Error') ||
            apiError.message.includes('CORS'))) {
          console.warn('CORS issue detected with Pinata API, switching to local storage mode');
          this.hasCorsIssues = true;
        }
        throw apiError;
      }
    } catch (error) {
      console.error('Error getting registrations from IPFS:', error);
      
      // Fallback to local storage
      return this._getLocalElectionRegistrations(electionId);
    }
  }

  /**
   * Get a specific registration by IPFS hash
   * @param {string} ipfsHash - IPFS hash
   * @returns {Promise<Object>} - Registration data
   */
  async getRegistration(ipfsHash) {
    try {
      // Check cache first
      if (this.registrationCache[ipfsHash]) {
        return this.registrationCache[ipfsHash];
      }
      
      // If CORS issues or no credentials, check local storage
      if (!this.hasValidCredentials || this.hasCorsIssues) {
        return this._getLocalRegistrationByHash(ipfsHash);
      }
      
      try {
        // Try a few public gateways to handle potential CORS issues
        const gateways = [
          `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
          `https://ipfs.io/ipfs/${ipfsHash}`,
          `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`
        ];
        
        let response;
        let successfulGateway;
        
        // Try each gateway until one works
        for (const gateway of gateways) {
          try {
            response = await axios.get(gateway, { timeout: 5000 });
            successfulGateway = gateway;
            break;
          } catch (gatewayError) {
            console.warn(`Gateway ${gateway} failed:`, gatewayError.message);
            // Continue to next gateway
          }
        }
        
        if (!response) {
          throw new Error('All IPFS gateways failed');
        }
        
        console.log(`Successfully retrieved from gateway: ${successfulGateway}`);
        const data = response.data;
        
        // Cache the result
        this.registrationCache[ipfsHash] = data;
        
        return data;
      } catch (gatewayError) {
        // If all gateways fail, try local fallback
        console.warn('All gateways failed, checking local storage:', gatewayError.message);
        const localData = this._getLocalRegistrationByHash(ipfsHash);
        if (localData) return localData;
        
        throw gatewayError;
      }
    } catch (error) {
      console.error('Error getting registration from IPFS:', error);
      
      // Try local fallback
      return this._getLocalRegistrationByHash(ipfsHash);
    }
  }

  /**
   * Update registration status
   * @param {Object} registration - Registration data
   * @param {string} newStatus - New status
   * @returns {Promise<string>} - New IPFS hash
   */
  async updateRegistrationStatus(registration, newStatus) {
    try {
      // Make sure registration has required fields
      if (!registration || !registration.walletAddress || !registration.electionId) {
        throw new Error('Invalid registration data');
      }
      
      // Get ipfsHash from registration object or look it up by wallet & election
      let ipfsHash = registration.ipfsHash;
      
      // If no hash in the registration, try to find it in local references
      if (!ipfsHash) {
        console.log('No IPFS hash in registration, checking local references');
        const userRefsKey = `user_registrations_${registration.walletAddress}`;
        const userRefs = JSON.parse(localStorage.getItem(userRefsKey) || '[]');
        const ref = userRefs.find(r => r.electionId === registration.electionId);
        
        if (ref && ref.ipfsHash) {
          ipfsHash = ref.ipfsHash;
          console.log(`Found IPFS hash in local references: ${ipfsHash}`);
        } else {
          // If the registration was created directly in the UI without storage
          // Create a new one instead of failing
          console.log('Creating new registration instead of updating');
          const newRegistration = {
            ...registration,
            status: newStatus,
            updatedAt: new Date().toISOString()
          };
          
          return this.storeRegistration(newRegistration);
        }
      }
      
      // If CORS issues or no credentials, use local storage
      if (!this.hasValidCredentials || this.hasCorsIssues) {
        return this._updateLocalRegistrationStatus(registration, newStatus);
      }
      
      try {
        // Try to unpin the old data if we have an IPFS hash
        if (ipfsHash) {
          try {
            await axios.delete(
              `${this.baseURL}/pinning/unpin/${ipfsHash}`,
              {
                headers: {
                  pinata_api_key: this.apiKey,
                  pinata_secret_api_key: this.apiSecret
                }
              }
            );
          } catch (unpinError) {
            console.warn('Unable to unpin registration, continuing with update', unpinError);
          }
        }
  
        // Create updated registration data
        const updatedData = {
          ...registration,
          ipfsHash,
          status: newStatus,
          updatedAt: new Date().toISOString()
        };
  
        // Save the updated data
        const newHash = await this.storeRegistration(updatedData);
        
        // Clear cache for old hash
        if (ipfsHash) {
          delete this.registrationCache[ipfsHash];
        }
        
        return newHash;
      } catch (apiError) {
        // Check for CORS issues
        if (apiError.message && (
            apiError.message.includes('NetworkError') || 
            apiError.message.includes('Network Error') ||
            apiError.message.includes('CORS'))) {
          console.warn('CORS issue detected with Pinata API, switching to local storage mode');
          this.hasCorsIssues = true;
        }
        throw apiError;
      }
    } catch (error) {
      console.error('Error updating registration on IPFS:', error);
      
      // Fallback to local storage
      return this._updateLocalRegistrationStatus(registration, newStatus);
    }
  }
  
  // --- Local storage fallback methods ---
  
  /**
   * Store registration in localStorage
   * @param {Object} registrationData - Registration data
   * @returns {Promise<string>} - Fake IPFS hash
   * @private
   */
  _storeLocalRegistration(registrationData) {
    try {
      // Generate a fake hash to mimic IPFS behavior
      const fakeHash = 'local-' + Math.random().toString(36).substring(2, 15);
      
      // Add hash to registration data
      const registrationWithHash = {
        ...registrationData,
        ipfsHash: fakeHash
      };
      
      // Get existing registrations
      const allRegistrations = JSON.parse(localStorage.getItem('voterRegistrations') || '[]');
      
      // Add new registration
      allRegistrations.push(registrationWithHash);
      
      // Save back to localStorage
      localStorage.setItem('voterRegistrations', JSON.stringify(allRegistrations));
      
      // Save a reference for this user
      this._updateLocalReference(registrationWithHash);
      
      return fakeHash;
    } catch (error) {
      console.error('Error storing registration locally:', error);
      throw error;
    }
  }
  
  /**
   * Get all registrations for an election from localStorage
   * @param {string|number} electionId - Election ID
   * @returns {Promise<Array>} - Array of registrations
   * @private
   */
  _getLocalElectionRegistrations(electionId) {
    try {
      const allRegistrations = JSON.parse(localStorage.getItem('voterRegistrations') || '[]');
      return allRegistrations.filter(reg => reg.electionId == electionId); // Use == to handle string/number comparison
    } catch (error) {
      console.error('Error getting local registrations:', error);
      return [];
    }
  }
  
  /**
   * Get a specific registration from localStorage
   * @param {string} hash - IPFS hash
   * @returns {Promise<Object>} - Registration data
   * @private
   */
  _getLocalRegistrationByHash(hash) {
    try {
      const allRegistrations = JSON.parse(localStorage.getItem('voterRegistrations') || '[]');
      return allRegistrations.find(reg => reg.ipfsHash === hash);
    } catch (error) {
      console.error('Error getting local registration:', error);
      return null;
    }
  }
  
  /**
   * Update registration status in localStorage
   * @param {Object} registration - Registration data
   * @param {string} newStatus - New status
   * @returns {Promise<string>} - IPFS hash
   * @private
   */
  _updateLocalRegistrationStatus(registration, newStatus) {
    try {
      const allRegistrations = JSON.parse(localStorage.getItem('voterRegistrations') || '[]');
      
      // Try to find the registration by wallet & election ID if no hash
      let index = -1;
      
      if (registration.ipfsHash) {
        // Find by hash
        index = allRegistrations.findIndex(reg => reg.ipfsHash === registration.ipfsHash);
      }
      
      // If not found by hash, try by wallet + election ID
      if (index === -1 && registration.walletAddress && registration.electionId) {
        index = allRegistrations.findIndex(
          reg => reg.walletAddress === registration.walletAddress && 
                 reg.electionId == registration.electionId // Use == to handle string/number comparison
        );
      }
      
      if (index === -1) {
        // If still not found, create a new one
        console.log('Registration not found in local storage, creating new');
        return this._storeLocalRegistration({
          ...registration,
          status: newStatus,
          updatedAt: new Date().toISOString()
        });
      }
      
      // Update the registration
      allRegistrations[index] = {
        ...allRegistrations[index],
        status: newStatus,
        updatedAt: new Date().toISOString()
      };
      
      // Save back to localStorage
      localStorage.setItem('voterRegistrations', JSON.stringify(allRegistrations));
      
      // Save a reference for this user
      this._updateLocalReference(allRegistrations[index]);
      
      return allRegistrations[index].ipfsHash;
    } catch (error) {
      console.error('Error updating local registration:', error);
      throw error;
    }
  }
  
  /**
   * Update user's local registration reference
   * @param {Object} registration - Registration data
   * @private
   */
  _updateLocalReference(registration) {
    try {
      if (!registration.walletAddress) return;
      
      const key = `user_registrations_${registration.walletAddress}`;
      const userRefs = JSON.parse(localStorage.getItem(key) || '[]');
      
      // Check if we already have a reference for this election
      const index = userRefs.findIndex(ref => ref.electionId == registration.electionId); // Use == to handle string/number comparison
      
      const reference = {
        electionId: registration.electionId,
        ipfsHash: registration.ipfsHash,
        status: registration.status,
        timestamp: registration.timestamp || new Date().toISOString(),
        updatedAt: registration.updatedAt || new Date().toISOString()
      };
      
      if (index >= 0) {
        userRefs[index] = reference;
      } else {
        userRefs.push(reference);
      }
      
      localStorage.setItem(key, JSON.stringify(userRefs));
    } catch (error) {
      console.error('Error updating local reference:', error);
    }
  }
  
  /**
   * Check a user's registration status for an election
   * @param {string} walletAddress - Wallet address
   * @param {string|number} electionId - Election ID
   * @returns {Promise<string>} - Registration status
   */
  async getUserRegistrationStatus(walletAddress, electionId) {
    try {
      if (!walletAddress || !electionId) return null;
      
      // First check local references
      const key = `user_registrations_${walletAddress}`;
      const userRefs = JSON.parse(localStorage.getItem(key) || '[]');
      const reference = userRefs.find(ref => ref.electionId == electionId); // Use == to handle string/number comparison
      
      if (reference) {
        // Get the full registration data from the hash
        try {
          const registration = await this.getRegistration(reference.ipfsHash);
          return registration ? registration.status : null;
        } catch (regError) {
          console.warn('Error fetching registration, using cached status', regError);
          return reference.status; // Use cached status if full registration can't be fetched
        }
      }
      
      // If not found in references, try searching all registrations (less efficient)
      try {
        const allRegistrations = await this.getElectionRegistrations(electionId);
        const userRegistration = allRegistrations.find(
          reg => reg.walletAddress && reg.walletAddress.toLowerCase() === walletAddress.toLowerCase()
        );
        
        return userRegistration ? userRegistration.status : null;
      } catch (searchError) {
        console.warn('Error searching registrations', searchError);
        return null;
      }
    } catch (error) {
      console.error('Error checking registration status:', error);
      return null;
    }
  }
  
  /**
   * Generate mock test registrations for development
   * @param {string|number} electionId - Election ID
   * @param {number} count - Number of mock registrations to generate
   * @returns {Promise<Array>} - Array of created registration hashes
   */
  async generateTestRegistrations(electionId, count = 5) {
    const mockData = [
      {
        fullName: 'John Smith',
        email: 'john.smith@example.com',
        identifier: 'ST12345',
        walletAddress: '0x1234567890123456789012345678901234567890',
      },
      {
        fullName: 'Sarah Johnson',
        email: 'sarah.j@example.com',
        identifier: 'ST67890',
        walletAddress: '0x2345678901234567890123456789012345678901',
      },
      {
        fullName: 'Mohammed Al-Farsi',
        email: 'mohammed.a@example.com',
        identifier: 'ST24680',
        walletAddress: '0x3456789012345678901234567890123456789012',
      },
      {
        fullName: 'Maria Garcia',
        email: 'maria.g@example.com',
        identifier: 'ST13579',
        walletAddress: '0x4567890123456789012345678901234567890123',
      },
      {
        fullName: 'Wei Zhang',
        email: 'wei.z@example.com',
        identifier: 'ST98765',
        walletAddress: '0x5678901234567890123456789012345678901234',
      },
      {
        fullName: 'James Wilson',
        email: 'james.w@example.com',
        identifier: 'ST45678',
        walletAddress: '0x6789012345678901234567890123456789012345',
      },
      {
        fullName: 'Aisha Patel',
        email: 'aisha.p@example.com',
        identifier: 'ST87654',
        walletAddress: '0x7890123456789012345678901234567890123456',
      }
    ];
    
    const registrationHashes = [];
    const actualCount = Math.min(count, mockData.length);
    
    // Create the specified number of registrations
    for (let i = 0; i < actualCount; i++) {
      try {
        const registration = {
          ...mockData[i],
          electionId,
          timestamp: new Date().toISOString(),
          status: 'pending'
        };
        
        const hash = await this.storeRegistration(registration);
        registrationHashes.push(hash);
      } catch (error) {
        console.error(`Error creating mock registration ${i}:`, error);
      }
    }
    
    return registrationHashes;
  }
}

export default IPFSRegistrationService;