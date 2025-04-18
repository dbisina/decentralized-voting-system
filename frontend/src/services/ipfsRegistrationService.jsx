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
  }

  // Upload registration data to IPFS
  async storeRegistration(registrationData) {
    try {
      // If not connected to Pinata, use local storage as fallback
      if (!this.hasValidCredentials) {
        console.warn('No valid Pinata credentials found, using localStorage as fallback');
        return this._storeLocalRegistration(registrationData);
      }
      
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
    } catch (error) {
      console.error('Error storing registration on IPFS:', error);
      
      // Fallback to local storage
      return this._storeLocalRegistration(registrationData);
    }
  }

  // Get all registrations for an election
  async getElectionRegistrations(electionId) {
    try {
      // If not connected to Pinata, use local storage as fallback
      if (!this.hasValidCredentials) {
        console.warn('No valid Pinata credentials found, using localStorage as fallback');
        return this._getLocalElectionRegistrations(electionId);
      }
      
      // Query Pinata for files with metadata matching the election ID
      const queryParams = `metadata[name]=voter-registration-${electionId}`;
      const response = await axios.get(
        `${this.baseURL}/data/pinList?${queryParams}`,
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
    } catch (error) {
      console.error('Error getting registrations from IPFS:', error);
      
      // Fallback to local storage
      return this._getLocalElectionRegistrations(electionId);
    }
  }

  // Get a specific registration by IPFS hash
  async getRegistration(ipfsHash) {
    try {
      // Check cache first
      if (this.registrationCache[ipfsHash]) {
        return this.registrationCache[ipfsHash];
      }
      
      // If not connected to Pinata, check local storage
      if (!this.hasValidCredentials) {
        return this._getLocalRegistrationByHash(ipfsHash);
      }
      
      const response = await axios.get(`https://gateway.pinata.cloud/ipfs/${ipfsHash}`);
      const data = response.data;
      
      // Cache the result
      this.registrationCache[ipfsHash] = data;
      
      return data;
    } catch (error) {
      console.error('Error getting registration from IPFS:', error);
      
      // Try local fallback
      return this._getLocalRegistrationByHash(ipfsHash);
    }
  }

  // Update registration status
  async updateRegistrationStatus(registration, newStatus) {
    try {
      // If not connected to Pinata, use local storage
      if (!this.hasValidCredentials) {
        return this._updateLocalRegistrationStatus(registration, newStatus);
      }
      
      // First, check if we have the ipfsHash in the registration object
      const ipfsHash = registration.ipfsHash;
      if (!ipfsHash) {
        throw new Error('No IPFS hash found in registration');
      }
      
      // Try to unpin the old data
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

      // Create updated registration data
      const updatedData = {
        ...registration,
        status: newStatus,
        updatedAt: new Date().toISOString()
      };

      // Save the updated data
      const newHash = await this.storeRegistration(updatedData);
      
      // Clear cache for old hash
      delete this.registrationCache[ipfsHash];
      
      return newHash;
    } catch (error) {
      console.error('Error updating registration on IPFS:', error);
      
      // Fallback to local storage
      return this._updateLocalRegistrationStatus(registration, newStatus);
    }
  }
  
  // --- Local storage fallback methods ---
  
  // Store registration in localStorage
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
  
  // Get all registrations for an election from localStorage
  _getLocalElectionRegistrations(electionId) {
    try {
      const allRegistrations = JSON.parse(localStorage.getItem('voterRegistrations') || '[]');
      return allRegistrations.filter(reg => reg.electionId === electionId);
    } catch (error) {
      console.error('Error getting local registrations:', error);
      return [];
    }
  }
  
  // Get a specific registration from localStorage
  _getLocalRegistrationByHash(hash) {
    try {
      const allRegistrations = JSON.parse(localStorage.getItem('voterRegistrations') || '[]');
      return allRegistrations.find(reg => reg.ipfsHash === hash);
    } catch (error) {
      console.error('Error getting local registration:', error);
      return null;
    }
  }
  
  // Update registration status in localStorage
  _updateLocalRegistrationStatus(registration, newStatus) {
    try {
      const allRegistrations = JSON.parse(localStorage.getItem('voterRegistrations') || '[]');
      
      // Find and update the registration
      const index = allRegistrations.findIndex(
        reg => reg.ipfsHash === registration.ipfsHash
      );
      
      if (index >= 0) {
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
      }
      
      throw new Error('Registration not found');
    } catch (error) {
      console.error('Error updating local registration:', error);
      throw error;
    }
  }
  
  // Update user's local registration reference
  _updateLocalReference(registration) {
    try {
      if (!registration.walletAddress) return;
      
      const key = `user_registrations_${registration.walletAddress}`;
      const userRefs = JSON.parse(localStorage.getItem(key) || '[]');
      
      // Check if we already have a reference for this election
      const index = userRefs.findIndex(ref => ref.electionId === registration.electionId);
      
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
  
  // Check a user's registration status for an election
  async getUserRegistrationStatus(walletAddress, electionId) {
    try {
      if (!walletAddress || !electionId) return null;
      
      // First check local references
      const key = `user_registrations_${walletAddress}`;
      const userRefs = JSON.parse(localStorage.getItem(key) || '[]');
      const reference = userRefs.find(ref => ref.electionId === electionId);
      
      if (reference) {
        // Get the full registration data from the hash
        const registration = await this.getRegistration(reference.ipfsHash);
        return registration ? registration.status : null;
      }
      
      // If not found in references, try searching all registrations (less efficient)
      const allRegistrations = await this.getElectionRegistrations(electionId);
      const userRegistration = allRegistrations.find(
        reg => reg.walletAddress && reg.walletAddress.toLowerCase() === walletAddress.toLowerCase()
      );
      
      return userRegistration ? userRegistration.status : null;
    } catch (error) {
      console.error('Error checking registration status:', error);
      return null;
    }
  }
}

export default IPFSRegistrationService;