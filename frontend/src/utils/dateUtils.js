/**
 * Format a date to a readable string
 * @param {Date|string|number} date - Date to format
 * @param {boolean} includeTime - Whether to include time
 * @returns {string} Formatted date string
 */
export const formatDate = (date, includeTime = false) => {
    if (!date) return '';
    
    const dateObj = typeof date === 'string' || typeof date === 'number' 
      ? new Date(date) 
      : date;
    
    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    };
    
    if (includeTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
    }
    
    return dateObj.toLocaleDateString('en-US', options);
  };
  
  /**
   * Calculate time remaining from a given date
   * @param {Date|string|number} endDate - End date
   * @returns {string} Formatted time remaining
   */
  export const timeRemaining = (endDate) => {
    if (!endDate) return '';
    
    const end = typeof endDate === 'string' || typeof endDate === 'number' 
      ? new Date(endDate) 
      : endDate;
    
    const now = new Date();
    
    // If date is in the past
    if (now > end) return 'Ended';
    
    const diffMs = end - now;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffDays > 0) {
      return `${diffDays}d ${diffHours}h remaining`;
    } else if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m remaining`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes}m remaining`;
    } else {
      return 'Ending soon';
    }
  };
  
  /**
   * Format a date range between two dates
   * @param {Date|string|number} startDate - Start date
   * @param {Date|string|number} endDate - End date
   * @returns {string} Formatted date range
   */
  export const formatDateRange = (startDate, endDate) => {
    if (!startDate || !endDate) return '';
    
    const start = typeof startDate === 'string' || typeof startDate === 'number' 
      ? new Date(startDate) 
      : startDate;
    
    const end = typeof endDate === 'string' || typeof endDate === 'number' 
      ? new Date(endDate) 
      : endDate;
    
    // If start and end are on the same day
    if (start.toDateString() === end.toDateString()) {
      return `${formatDate(start)} ${start.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })} - ${end.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })}`;
    }
    
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };
  
  /**
   * Check if a date is in the past
   * @param {Date|string|number} date - Date to check
   * @returns {boolean} True if date is in the past
   */
  export const isPastDate = (date) => {
    if (!date) return false;
    
    const dateObj = typeof date === 'string' || typeof date === 'number' 
      ? new Date(date) 
      : date;
    
    return dateObj < new Date();
  };
  
  /**
   * Check if a date is in the future
   * @param {Date|string|number} date - Date to check
   * @returns {boolean} True if date is in the future
   */
  export const isFutureDate = (date) => {
    if (!date) return false;
    
    const dateObj = typeof date === 'string' || typeof date === 'number' 
      ? new Date(date) 
      : date;
    
    return dateObj > new Date();
  };
  
  /**
   * Check if current date is between start and end dates
   * @param {Date|string|number} startDate - Start date
   * @param {Date|string|number} endDate - End date
   * @returns {boolean} True if current date is between start and end
   */
  export const isDateActive = (startDate, endDate) => {
    if (!startDate || !endDate) return false;
    
    const start = typeof startDate === 'string' || typeof startDate === 'number' 
      ? new Date(startDate) 
      : startDate;
    
    const end = typeof endDate === 'string' || typeof endDate === 'number' 
      ? new Date(endDate) 
      : endDate;
    
    const now = new Date();
    
    return now >= start && now <= end;
  };
  
  /**
   * Get a relative time string (e.g. "2 hours ago", "in 3 days")
   * @param {Date|string|number} date - Date to format
   * @returns {string} Relative time string
   */
  export const getRelativeTime = (date) => {
    if (!date) return '';
    
    const dateObj = typeof date === 'string' || typeof date === 'number' 
      ? new Date(date) 
      : date;
    
    const now = new Date();
    const diffMs = dateObj - now;
    const diffSeconds = Math.round(diffMs / 1000);
    const diffMinutes = Math.round(diffSeconds / 60);
    const diffHours = Math.round(diffMinutes / 60);
    const diffDays = Math.round(diffHours / 24);
    
    // Future date
    if (diffMs > 0) {
      if (diffSeconds < 60) return `in ${diffSeconds} seconds`;
      if (diffMinutes < 60) return `in ${diffMinutes} minutes`;
      if (diffHours < 24) return `in ${diffHours} hours`;
      if (diffDays < 30) return `in ${diffDays} days`;
      return formatDate(dateObj);
    }
    
    // Past date
    const absDiffSeconds = Math.abs(diffSeconds);
    const absDiffMinutes = Math.abs(diffMinutes);
    const absDiffHours = Math.abs(diffHours);
    const absDiffDays = Math.abs(diffDays);
    
    if (absDiffSeconds < 60) return `${absDiffSeconds} seconds ago`;
    if (absDiffMinutes < 60) return `${absDiffMinutes} minutes ago`;
    if (absDiffHours < 24) return `${absDiffHours} hours ago`;
    if (absDiffDays < 30) return `${absDiffDays} days ago`;
    return formatDate(dateObj);
  };