import { ethers } from 'ethers';

/**
 * Validate an Ethereum address
 * @param {string} address - Address to validate
 * @returns {boolean} Whether the address is valid
 */
export const isValidAddress = (address) => {
  try {
    if (!address) return false;
    return ethers.utils.isAddress(address);
  } catch (error) {
    return false;
  }
};

/**
 * Validate if a value is empty
 * @param {*} value - Value to check
 * @returns {boolean} Whether the value is empty
 */
export const isEmpty = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

/**
 * Validate if a string has minimum length
 * @param {string} value - String to validate
 * @param {number} minLength - Minimum length required
 * @returns {boolean} Whether the string meets minimum length
 */
export const hasMinLength = (value, minLength) => {
  if (typeof value !== 'string') return false;
  return value.length >= minLength;
};

/**
 * Validate if a string has maximum length
 * @param {string} value - String to validate
 * @param {number} maxLength - Maximum length allowed
 * @returns {boolean} Whether the string meets maximum length
 */
export const hasMaxLength = (value, maxLength) => {
  if (typeof value !== 'string') return false;
  return value.length <= maxLength;
};

/**
 * Validate if a value is a valid number
 * @param {*} value - Value to validate
 * @returns {boolean} Whether the value is a valid number
 */
export const isNumber = (value) => {
  if (value === null || value === undefined) return false;
  return !isNaN(parseFloat(value)) && isFinite(value);
};

/**
 * Validate if a number is within a range
 * @param {number} value - Number to validate
 * @param {number} min - Minimum value (inclusive)
 * @param {number} max - Maximum value (inclusive)
 * @returns {boolean} Whether the number is within range
 */
export const isInRange = (value, min, max) => {
  if (!isNumber(value)) return false;
  const num = parseFloat(value);
  return num >= min && num <= max;
};

/**
 * Validate if a value is a valid transaction hash
 * @param {string} hash - Transaction hash to validate
 * @returns {boolean} Whether the hash is valid
 */
export const isValidTxHash = (hash) => {
  if (!hash || typeof hash !== 'string') return false;
  return /^0x([A-Fa-f0-9]{64})$/.test(hash);
};

/**
 * Validate if a date is valid
 * @param {Date|string|number} date - Date to validate
 * @returns {boolean} Whether the date is valid
 */
export const isValidDate = (date) => {
  if (!date) return false;
  
  const d = new Date(date);
  return !isNaN(d.getTime());
};

/**
 * Validate if a date is in the future
 * @param {Date|string|number} date - Date to validate
 * @returns {boolean} Whether the date is in the future
 */
export const isFutureDate = (date) => {
  if (!isValidDate(date)) return false;
  
  const d = new Date(date);
  const now = new Date();
  
  return d > now;
};

/**
 * Validate if a date is in the past
 * @param {Date|string|number} date - Date to validate
 * @returns {boolean} Whether the date is in the past
 */
export const isPastDate = (date) => {
  if (!isValidDate(date)) return false;
  
  const d = new Date(date);
  const now = new Date();
  
  return d < now;
};

/**
 * Validate if end date is after start date
 * @param {Date|string|number} startDate - Start date
 * @param {Date|string|number} endDate - End date
 * @returns {boolean} Whether end date is after start date
 */
export const isValidDateRange = (startDate, endDate) => {
  if (!isValidDate(startDate) || !isValidDate(endDate)) return false;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return end > start;
};

/**
 * Validate if a string is a valid URL
 * @param {string} url - URL to validate
 * @returns {boolean} Whether the URL is valid
 */
export const isValidUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Validate if a string is a valid IPFS CID (Content Identifier)
 * @param {string} cid - IPFS CID to validate
 * @returns {boolean} Whether the CID is valid
 */
export const isValidIpfsCid = (cid) => {
  if (!cid || typeof cid !== 'string') return false;
  
  // Basic validation for IPFS CID v0 (starts with Qm) and CID v1
  return /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[A-Za-z2-7]{58,})$/.test(cid);
};

/**
 * Validate election data before submission
 * @param {Object} data - Election data to validate
 * @returns {Object} Validation result with status and error messages
 */
export const validateElectionData = (data) => {
  const errors = {};
  
  // Title is required
  if (!data.title || !data.title.trim()) {
    errors.title = 'Election title is required';
  }
  
  // Start and end dates are required
  if (!data.startDate) {
    errors.startDate = 'Start date is required';
  } else if (!isValidDate(data.startDate)) {
    errors.startDate = 'Invalid start date';
  }
  
  if (!data.endDate) {
    errors.endDate = 'End date is required';
  } else if (!isValidDate(data.endDate)) {
    errors.endDate = 'Invalid end date';
  }
  
  // Start date must be before end date
  if (data.startDate && data.endDate && !isValidDateRange(data.startDate, data.endDate)) {
    errors.endDate = 'End date must be after start date';
  }
  
  // At least one candidate is required
  if (!data.candidates || !Array.isArray(data.candidates) || data.candidates.length === 0) {
    errors.candidates = 'At least one candidate is required';
  } else {
    // Check if at least one candidate has a name
    const hasCandidate = data.candidates.some(candidate => 
      candidate.name && candidate.name.trim() !== ''
    );
    
    if (!hasCandidate) {
      errors.candidates = 'At least one candidate with a name is required';
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};