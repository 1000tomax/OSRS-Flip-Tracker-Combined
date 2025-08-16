/**
 * NAVIGATION CARDS COMPONENT
 *
 * This component creates attractive, interactive cards for navigation between
 * different sections of the app. It's used primarily on landing/dashboard pages
 * to showcase key features and guide users to important functionality.
 *
 * Features:
 * - Beautiful gradient backgrounds and animations
 * - Support for internal links (React Router) and external links
 * - Configurable styling (gradients, borders, colors)
 * - Responsive design that works on all devices
 * - Hover effects and scaling animations
 */

import React from 'react';
import { Link } from 'react-router-dom';

/**
 * NavigationCards Component - Displays a grid of navigation cards
 *
 * @param {Array} cards - Array of card configuration objects
 * @param {string} className - Additional CSS classes for the container
 * @returns {JSX.Element} - Grid of navigation cards
 */
export default function NavigationCards({ cards, className = '' }) {
  return (
    <div className={`grid md:grid-cols-2 gap-6 max-w-4xl mx-auto ${className}`}>
      {/* Map through each card configuration and create a NavigationCard */}
      {cards.map((card, index) => (
        <NavigationCard key={index} {...card} />
      ))}
    </div>
  );
}

/**
 * Individual Navigation Card Component - Single interactive card
 *
 * This component handles the different types of navigation (internal, external, button)
 * and applies appropriate styling and behavior based on the configuration.
 *
 * @param {Object} props - Card configuration object with all styling and behavior options
 * @returns {JSX.Element} - Styled navigation card with appropriate link/button wrapper
 */
function NavigationCard({
  to, // Destination URL/path
  title, // Card title
  description, // Card description text
  icon, // Emoji or icon to display
  gradient = 'from-blue-600/20 to-purple-600/20', // Background gradient
  border = 'border-blue-500/30', // Border color
  hoverGradient = 'hover:from-blue-600/30 hover:to-purple-600/30', // Hover gradient
  linkText = 'Learn More →', // Call-to-action text
  linkColor = 'text-blue-400', // Link text color
  onClick = null, // Click handler for button mode
  external = false, // Whether link opens in new tab
}) {
  // Shared CSS classes for all card types
  const baseClasses = `bg-gradient-to-br ${gradient} border ${border} rounded-2xl p-6 ${hoverGradient} transition-all duration-300 hover:scale-105 group`;

  // Shared content structure for all card types
  const content = (
    <>
      {/* Icon with scaling animation on hover */}
      <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">{icon}</div>

      {/* Card title */}
      <h3 className="text-xl font-bold mb-2">{title}</h3>

      {/* Description text */}
      <p className="text-gray-400 text-sm mb-4">{description}</p>

      {/* Call-to-action text */}
      <div className={`mt-4 ${linkColor} text-sm font-medium`}>{linkText}</div>
    </>
  );

  // Button mode - for cards that trigger actions instead of navigation
  if (onClick) {
    return (
      <button className={baseClasses} onClick={onClick}>
        {content}
      </button>
    );
  }

  // External link mode - opens in new tab
  if (external) {
    return (
      <a
        href={to}
        target="_blank"
        rel="noopener noreferrer" // Security best practice for external links
        className={baseClasses}
      >
        {content}
      </a>
    );
  }

  // Default: Internal navigation using React Router
  return (
    <Link to={to} className={baseClasses}>
      {content}
    </Link>
  );
}

/**
 * Predefined Card Configurations
 *
 * These are pre-configured card sets for specific pages/sections.
 * They define the styling, content, and behavior for navigation cards.
 */

/**
 * NAVIGATION CARDS PATTERNS - LEARNING NOTES
 *
 * 1. **Flexible Navigation Types**:
 *    - Internal navigation via React Router Link
 *    - External links that open in new tabs
 *    - Button actions for non-navigation interactions
 *    - Automatic selection based on props provided
 *
 * 2. **Visual Design System**:
 *    - Consistent gradient and color schemes
 *    - Configurable styling through props
 *    - Smooth animations and transitions
 *    - Responsive design for all screen sizes
 *
 * 3. **Component Composition**:
 *    - Shared content structure across all card types
 *    - Conditional wrapper components (Link vs button vs anchor)
 *    - Clean separation of styling and behavior
 *
 * 4. **User Experience**:
 *    - Clear visual hierarchy (icon → title → description → CTA)
 *    - Engaging hover effects (scaling, color changes)
 *    - Accessibility considerations (proper link attributes)
 *
 * 5. **Configuration-Driven Design**:
 *    - Predefined card sets for consistency
 *    - Easy to add new card types or modify existing ones
 *    - Flexible prop system allows customization
 *
 * 6. **React Patterns**:
 *    - Conditional rendering based on props
 *    - Props destructuring with defaults
 *    - Spread operator for prop passing
 *    - Component specialization through configuration
 *
 * 7. **CSS and Animation**:
 *    - Tailwind utility classes for styling
 *    - CSS transitions for smooth effects
 *    - Group hover effects for coordinated animations
 *    - Mobile-first responsive design
 */
