import { ethers } from 'ethers';
import IPFSService from './ipfsService';

/**
 * Service for authentication and user profile management
 */
class AuthService {
  constructor() {
    this.ipfsService = new IPFSService();
    
    // In a production app, this would connect to a user database
    // For this demo, we're storing profiles in localStorage
    this.storageKey = 'blockvote_user_profiles';
  }
  
  /**
   * Generate a nonce for message signing
   * @returns {string} Random nonce
   */
  _generateNonce() {
    return Math.floor(Math.random() * 1000000).toString();
  }
  
  /**
   * Create a message for the user to sign to verify their identity
   * @param {string} address User's Ethereum address
   * @param {string} nonce Random nonce
   * @returns {string} Message to sign
   */
  _createSignMessage(address, nonce) {
    return `Welcome to BlockVote!\n\nPlease sign this message to authenticate.\n\nThis signature does not cost any fees.\n\nAddress: ${address}\nNonce: ${nonce}\nDate: ${new Date().toISOString()}`;
  }
  
  /**
   * Verify a signature against a message
   * @param {string} message Original message
   * @param {string} signature The signature to verify
   * @param {string} address The address that should have signed
   * @returns {boolean} Whether the signature is valid
   */
  _verifySignature(message, signature, address) {
    try {
      const recoveredAddress = ethers.utils.verifyMessage(message, signature);
      return recoveredAddress.toLowerCase() === address.toLowerCase();
    } catch (error) {
      console.error('Error verifying signature:', error);
      return false;
    }
  }
  
  /**
   * Store profile data in local storage
   * @param {Object} profiles All user profiles
   */
  _storeProfiles(profiles) {
    localStorage.setItem(this.storageKey, JSON.stringify(profiles));
  }
  
  /**
   * Retrieve all profiles from local storage
   * @returns {Object} All user profiles
   */
  _getProfiles() {
    const profiles = localStorage.getItem(this.storageKey);
    return profiles ? JSON.parse(profiles) : {};
  }
  
  /**
   * Request signature from the user's wallet
   * @param {string} address The address to request a signature from
   * @returns {Promise<{signature: string, message: string}>} The signature and original message
   */
  async requestSignature(address) {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed');
      }
      
      // Create a message to sign
      const nonce = this._generateNonce();
      const message = this._createSignMessage(address, nonce);
      
      // Request signature from wallet
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const signature = await signer.signMessage(message);
      
      return { signature, message };
    } catch (error) {
      console.error('Error requesting signature:', error);
      throw error;
    }
  }
  
  /**
   * Get a user's profile data
   * @param {string} address Ethereum address of the user
   * @returns {Promise<Object|null>} User profile data or null if not found
   */
  async getUserProfile(address) {
    try {
      if (!address) return null;
      
      // Normalize address to lowercase for consistency
      const normalizedAddress = address.toLowerCase();
      
      // Get all profiles
      const profiles = this._getProfiles();
      
      // Check if profile exists
      if (profiles[normalizedAddress]) {
        return {
          address: normalizedAddress,
          ...profiles[normalizedAddress]
        };
      }
      
      // If no profile exists, create a basic one
      const newProfile = {
        address: normalizedAddress,
        createdAt: new Date().toISOString()
      };
      
      // Store the new profile
      profiles[normalizedAddress] = newProfile;
      this._storeProfiles(profiles);
      
      return newProfile;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }
  
  /**
   * Update a user's profile data
   * @param {string} address Ethereum address of the user
   * @param {Object} profileData Profile data to update
   * @returns {Promise<Object>} Updated profile data
   */
  async updateUserProfile(address, profileData) {
    try {
      if (!address) {
        throw new Error('Address is required');
      }
      
      // Normalize address
      const normalizedAddress = address.toLowerCase();
      
      // Get all profiles
      const profiles = this._getProfiles();
      
      // Get existing profile or create a new one
      const existingProfile = profiles[normalizedAddress] || {};
      
      // Create updated profile
      const updatedProfile = {
        ...existingProfile,
        ...profileData,
        updatedAt: new Date().toISOString()
      };
      
      // Store on IPFS if needed (for larger profile data)
      if (profileData.bio || profileData.image) {
        try {
          // Only store certain fields on IPFS
          const ipfsData = {
            bio: profileData.bio,
            image: profileData.image,
            updatedAt: updatedProfile.updatedAt
          };
          
          const ipfsCid = await this.ipfsService.uploadToIPFS(ipfsData);
          updatedProfile.ipfsProfile = ipfsCid;
        } catch (ipfsError) {
          console.error('Error storing profile on IPFS:', ipfsError);
          // Continue even if IPFS storage fails
        }
      }
      
      // Save updated profile
      profiles[normalizedAddress] = updatedProfile;
      this._storeProfiles(profiles);
      
      return {
        address: normalizedAddress,
        ...updatedProfile
      };
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }
  
  /**
   * Check if a user has admin privileges
   * @param {string} address Ethereum address to check
   * @returns {Promise<boolean>} Whether the user is an admin
   */
  async isAdmin(address) {
    try {
      if (!address) return false;
      
      // In a real dApp, this would check against the contract's admin list
      // For simplicity, we're checking a hardcoded list
      const normalizedAddress = address.toLowerCase();
      const profile = await this.getUserProfile(normalizedAddress);
      
      // Check if user has admin flag
      return profile && profile.isAdmin === true;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }
  
  /**
   * Grant admin privileges to a user (only for development)
   * @param {string} address Ethereum address to grant admin to
   */
  async grantAdminPrivilege(address) {
    try {
      if (!address) return;
      
      // This would normally be restricted to contract owner or existing admins
      const normalizedAddress = address.toLowerCase();
      
      // Update profile with admin flag
      await this.updateUserProfile(normalizedAddress, { isAdmin: true });
      
      console.log(`Admin privileges granted to ${normalizedAddress}`);
    } catch (error) {
      console.error('Error granting admin privilege:', error);
    }
  }
}

export default AuthService;