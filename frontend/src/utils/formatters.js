/**
 * Format an Ethereum address for display
 * @param {string} address - Ethereum address
 * @param {number} prefix - Number of characters to show at the beginning
 * @param {number} suffix - Number of characters to show at the end
 * @returns {string} Formatted address
 */
export const formatAddress = (address, prefix = 6, suffix = 4) => {
    if (!address) return '';
    if (address.length <= prefix + suffix) return address;
    
    return `${address.slice(0, prefix)}...${address.slice(-suffix)}`;
  };
  
  /**
   * Format a number with commas as thousands separators
   * @param {number|string} value - Number to format
   * @returns {string} Formatted number
   */
  export const formatNumber = (value) => {
    if (value === null || value === undefined) return '';
    
    // Convert to number if it's a string
    const num = typeof value === 'string' ? parseFloat(value) : value;
    
    // Check if it's a valid number
    if (isNaN(num)) return value.toString();
    
    // Format the number with commas
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };
  
  /**
   * Format a crypto amount with appropriate decimal places
   * @param {number|string} amount - Amount to format
   * @param {number} decimals - Number of decimal places
   * @returns {string} Formatted amount
   */
  export const formatCrypto = (amount, decimals = 6) => {
    if (amount === null || amount === undefined) return '';
    
    // Convert to number if it's a string
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    // Check if it's a valid number
    if (isNaN(num)) return amount.toString();
    
    // Format the number with the specified decimals
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals
    });
  };
  
  /**
   * Format wei value to ETH/MATIC with appropriate decimal places
   * @param {string|number} wei - Amount in wei
   * @param {number} decimals - Number of decimal places
   * @param {string} symbol - Currency symbol (ETH, MATIC)
   * @returns {string} Formatted amount with symbol
   */
  export const formatWei = (wei, decimals = 6, symbol = 'ETH') => {
    if (!wei) return `0 ${symbol}`;
    
    // Convert wei to ETH (1 ETH = 10^18 wei)
    const eth = parseFloat(wei) / 1e18;
    
    // Format the number
    return `${eth.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals
    })} ${symbol}`;
  };
  
  /**
   * Format a percentage value
   * @param {number|string} value - Percentage value (e.g., 0.75 for 75%)
   * @param {number} decimals - Number of decimal places
   * @param {boolean} includeSymbol - Whether to include % symbol
   * @returns {string} Formatted percentage
   */
  export const formatPercentage = (value, decimals = 1, includeSymbol = true) => {
    if (value === null || value === undefined) return '';
    
    // Convert to number if it's a string
    const num = typeof value === 'string' ? parseFloat(value) : value;
    
    // Check if it's a valid number
    if (isNaN(num)) return value.toString();
    
    // If value is already in percentage format (e.g., 75 instead of 0.75)
    const percentage = num > 0 && num <= 1 ? num * 100 : num;
    
    // Format the percentage
    const formatted = percentage.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals
    });
    
    return includeSymbol ? `${formatted}%` : formatted;
  };
  
  /**
   * Format a transaction hash for display
   * @param {string} hash - Transaction hash
   * @param {number} length - Length of the formatted hash
   * @returns {string} Formatted transaction hash
   */
  export const formatTxHash = (hash, length = 14) => {
    if (!hash) return '';
    
    // If hash is shorter than desired length
    if (hash.length <= length) return hash;
    
    // Calculate how many characters to show on each side
    const sideLength = Math.floor((length - 3) / 2);
    
    return `${hash.slice(0, sideLength)}...${hash.slice(-sideLength)}`;
  };
  
  /**
   * Add ordinal suffix to a number (1st, 2nd, 3rd, etc.)
   * @param {number} number - Number to format
   * @returns {string} Number with ordinal suffix
   */
  export const formatOrdinal = (number) => {
    if (isNaN(number)) return '';
    
    const num = parseInt(number);
    const j = num % 10;
    const k = num % 100;
    
    if (j === 1 && k !== 11) {
      return `${num}st`;
    }
    if (j === 2 && k !== 12) {
      return `${num}nd`;
    }
    if (j === 3 && k !== 13) {
      return `${num}rd`;
    }
    return `${num}th`;
  };
  
  /**
   * Format a file size in bytes to human-readable format
   * @param {number} bytes - File size in bytes
   * @param {number} decimals - Number of decimal places
   * @returns {string} Formatted file size
   */
  export const formatFileSize = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
  };