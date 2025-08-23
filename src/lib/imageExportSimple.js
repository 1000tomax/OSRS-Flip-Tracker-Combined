/**
 * Simple Image Export Utility
 * 
 * Alternative approach using dom-to-image-more library or fallback canvas method
 * to avoid html2canvas issues with modern CSS
 */

import html2canvas from 'html2canvas-pro';

/**
 * Exports a DOM element as a PNG image with simplified approach
 * @param {HTMLElement} element - The DOM element to capture
 * @param {string} filename - Name for the downloaded file
 */
export async function exportToImageSimple(element, filename) {
  if (!element) {
    console.error('No element provided for image export');
    return;
  }

  try {
    // Use a simpler configuration that avoids CSS parsing issues
    const canvas = await html2canvas(element, {
      backgroundColor: '#1f2937',
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: true,
      foreignObjectRendering: false, // Disable foreign object rendering
      removeContainer: true,
      // Preprocess the element to remove problematic styles
      onclone: (document, element) => {
        // Get all elements in the cloned document
        const elements = element.querySelectorAll('*');
        
        elements.forEach(el => {
          // Remove all class attributes to avoid Tailwind CSS issues
          if (el.classList.length > 0) {
            // Store color info based on common class patterns
            const classes = Array.from(el.classList);
            
            // Apply inline styles based on common Tailwind classes
            classes.forEach(cls => {
              if (cls.startsWith('text-white')) el.style.color = '#ffffff';
              else if (cls.startsWith('text-gray-400')) el.style.color = '#9ca3af';
              else if (cls.startsWith('text-gray-300')) el.style.color = '#d1d5db';
              else if (cls.startsWith('text-yellow')) el.style.color = '#facc15';
              else if (cls.startsWith('text-green')) el.style.color = '#4ade80';
              else if (cls.startsWith('text-red')) el.style.color = '#f87171';
              else if (cls.startsWith('text-blue')) el.style.color = '#60a5fa';
              
              if (cls.startsWith('bg-gray-800')) el.style.backgroundColor = '#1f2937';
              else if (cls.startsWith('bg-gray-700')) el.style.backgroundColor = '#374151';
              else if (cls.startsWith('bg-gray-900')) el.style.backgroundColor = '#111827';
              else if (cls.startsWith('bg-gray-600')) el.style.backgroundColor = '#4b5563';
              
              if (cls.startsWith('border-gray')) el.style.borderColor = '#4b5563';
              
              if (cls === 'font-bold') el.style.fontWeight = '700';
              else if (cls === 'font-medium') el.style.fontWeight = '500';
              else if (cls === 'font-mono') el.style.fontFamily = 'monospace';
              
              if (cls.startsWith('text-xl')) el.style.fontSize = '1.25rem';
              else if (cls.startsWith('text-lg')) el.style.fontSize = '1.125rem';
              else if (cls.startsWith('text-sm')) el.style.fontSize = '0.875rem';
              else if (cls.startsWith('text-xs')) el.style.fontSize = '0.75rem';
              
              if (cls.startsWith('p-4')) el.style.padding = '1rem';
              else if (cls.startsWith('p-6')) el.style.padding = '1.5rem';
              else if (cls.startsWith('p-3')) el.style.padding = '0.75rem';
              
              if (cls.startsWith('rounded-xl')) el.style.borderRadius = '0.75rem';
              else if (cls.startsWith('rounded-lg')) el.style.borderRadius = '0.5rem';
              else if (cls.startsWith('rounded')) el.style.borderRadius = '0.25rem';
              
              if (cls.startsWith('mb-4')) el.style.marginBottom = '1rem';
              else if (cls.startsWith('mb-1')) el.style.marginBottom = '0.25rem';
              
              if (cls === 'flex') el.style.display = 'flex';
              else if (cls === 'hidden') el.style.display = 'none';
              
              if (cls === 'justify-between') el.style.justifyContent = 'space-between';
              else if (cls === 'items-center') el.style.alignItems = 'center';
              else if (cls === 'items-start') el.style.alignItems = 'flex-start';
            });
            
            // Remove classes after applying inline styles
            el.removeAttribute('class');
          }
          
          // Ensure SVG elements have proper fill/stroke
          if (el.tagName === 'path' || el.tagName === 'line' || el.tagName === 'rect') {
            if (!el.style.fill && el.getAttribute('fill')) {
              el.style.fill = el.getAttribute('fill');
            }
            if (!el.style.stroke && el.getAttribute('stroke')) {
              el.style.stroke = el.getAttribute('stroke');
            }
          }
        });
        
        // Remove any style tags to prevent CSS conflicts
        const styleTags = element.querySelectorAll('style');
        styleTags.forEach(tag => tag.remove());
      }
    });

    // Convert to blob and download
    canvas.toBlob((blob) => {
      if (!blob) {
        throw new Error('Failed to create image blob');
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log('Image exported successfully:', filename);
    }, 'image/png');
  } catch (error) {
    console.error('Failed to export image:', error);
    throw error;
  }
}

/**
 * Generates a filename with current date
 * @param {string} prefix - Prefix for the filename
 * @returns {string} - Formatted filename with date
 */
export function generateImageFilename(prefix) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  
  return `${prefix}-${year}-${month}-${day}.png`;
}