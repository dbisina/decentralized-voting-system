import React from 'react';

/**
 * Status badge component to display status with consistent styling
 * 
 * @param {string} status - Status to display (active, completed, upcoming, ended, draft)
 * @param {string} className - Additional CSS classes
 * @param {boolean} large - Whether to use a larger size
 * @param {Object} props - Additional props
 */
const StatusBadge = ({ status, className = '', large = false, ...props }) => {
  // Define color variants based on status
  const getVariantStyles = () => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'upcoming':
        return 'bg-indigo-100 text-indigo-800';
      case 'ended':
        return 'bg-yellow-100 text-yellow-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'processing':
        return 'bg-purple-100 text-purple-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Format the display text
  const getDisplayText = () => {
    if (!status) return '';
    
    // If status is already in a nice format (e.g. "Active" instead of "active")
    if (status.charAt(0) === status.charAt(0).toUpperCase()) {
      return status;
    }
    
    // Capitalize first letter
    return status.charAt(0).toUpperCase() + status.slice(1);
  };
  
  // Size variant
  const sizeClass = large ? 'px-3 py-1 text-sm' : 'px-2.5 py-0.5 text-xs';
  
  return (
    <span 
      className={`inline-flex items-center rounded-full font-medium ${sizeClass} ${getVariantStyles()} ${className}`}
      {...props}
    >
      {getDisplayText()}
    </span>
  );
};

/**
 * Pre-configured StatusBadge for active status
 */
StatusBadge.Active = (props) => <StatusBadge status="active" {...props} />;

/**
 * Pre-configured StatusBadge for completed status
 */
StatusBadge.Completed = (props) => <StatusBadge status="completed" {...props} />;

/**
 * Pre-configured StatusBadge for upcoming status
 */
StatusBadge.Upcoming = (props) => <StatusBadge status="upcoming" {...props} />;

/**
 * Pre-configured StatusBadge for ended status
 */
StatusBadge.Ended = (props) => <StatusBadge status="ended" {...props} />;

/**
 * Pre-configured StatusBadge for draft status
 */
StatusBadge.Draft = (props) => <StatusBadge status="draft" {...props} />;

/**
 * Pre-configured StatusBadge for error status
 */
StatusBadge.Error = (props) => <StatusBadge status="error" {...props} />;

/**
 * Pre-configured StatusBadge for success status
 */
StatusBadge.Success = (props) => <StatusBadge status="success" {...props} />;

/**
 * Pre-configured StatusBadge for warning status
 */
StatusBadge.Warning = (props) => <StatusBadge status="warning" {...props} />;

export default StatusBadge;