import React from 'react';

/**
 * Reusable Card component with header, body, and footer sections
 * 
 * @param {string} className - Additional CSS classes for the card
 * @param {React.ReactNode} children - Card content
 * @param {React.ReactNode} header - Card header content
 * @param {React.ReactNode} footer - Card footer content
 * @param {boolean} hover - Whether to add hover effect
 * @param {boolean} border - Whether to add border
 * @param {boolean} shadow - Whether to add shadow
 * @param {Object} props - Additional props
 */
const Card = ({
  className = '',
  children,
  header,
  footer,
  hover = false,
  border = true,
  shadow = true,
  ...props
}) => {
  // Define base styles
  const baseStyles = 'bg-white rounded-lg overflow-hidden';
  
  // Define conditional styles
  const hoverStyles = hover ? 'transition-shadow hover:shadow-md' : '';
  const borderStyles = border ? 'border border-gray-200' : '';
  const shadowStyles = shadow ? 'shadow-sm' : '';
  
  // Combine all styles
  const cardStyles = `
    ${baseStyles}
    ${hoverStyles}
    ${borderStyles}
    ${shadowStyles}
    ${className}
  `;
  
  return (
    <div className={cardStyles} {...props}>
      {header && (
        <div className="px-6 py-4 border-b border-gray-200">
          {header}
        </div>
      )}
      
      <div className="p-6">
        {children}
      </div>
      
      {footer && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          {footer}
        </div>
      )}
    </div>
  );
};

/**
 * Card.Header component for consistent card headers
 */
Card.Header = ({ className = '', children, ...props }) => (
  <div className={`font-medium text-gray-800 ${className}`} {...props}>
    {children}
  </div>
);

/**
 * Card.Title component for card titles
 */
Card.Title = ({ className = '', children, ...props }) => (
  <h3 className={`text-lg font-bold text-gray-800 ${className}`} {...props}>
    {children}
  </h3>
);

/**
 * Card.Body component for consistent card body styling
 */
Card.Body = ({ className = '', children, ...props }) => (
  <div className={className} {...props}>
    {children}
  </div>
);

/**
 * Card.Footer component for consistent card footers
 */
Card.Footer = ({ className = '', children, ...props }) => (
  <div className={`flex justify-between items-center ${className}`} {...props}>
    {children}
  </div>
);

/**
 * Card.Grid component for displaying multiple cards in a grid
 */
Card.Grid = ({ className = '', children, cols = 3, gap = 6, ...props }) => {
  // Define column styles based on the 'cols' prop
  const colsStyles = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };
  
  // Define gap styles based on the 'gap' prop
  const gapStyles = {
    4: 'gap-4',
    6: 'gap-6',
    8: 'gap-8',
  };
  
  return (
    <div 
      className={`grid ${colsStyles[cols] || colsStyles[3]} ${gapStyles[gap] || gapStyles[6]} ${className}`} 
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;