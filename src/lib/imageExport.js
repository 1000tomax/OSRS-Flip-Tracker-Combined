/**
 * Image Export Utility
 * 
 * Provides functionality to export chart components as PNG images using html2canvas-pro.
 * Handles chart capture, image generation, and download triggering.
 * html2canvas-pro supports modern CSS including oklch() colors from Tailwind CSS v4.
 */

import html2canvas from 'html2canvas-pro';
import React from 'react';

/**
 * Exports a DOM element as a PNG image
 * @param {HTMLElement} element - The DOM element to capture
 * @param {string} filename - Name for the downloaded file
 * @param {Object} options - Optional configuration for html2canvas-pro
 */
export async function exportToImage(element, filename, options = {}) {
  if (!element) {
    console.error('No element provided for image export');
    return;
  }

  try {
    // Default options for better quality charts
    const defaultOptions = {
      scale: 2, // Higher resolution
      backgroundColor: '#1f2937', // Match chart background (gray-800)
      logging: false,
      useCORS: true,
      allowTaint: true,
      width: Math.max(element.scrollWidth, 800), // Minimum 800px width
      ignoreElements: (element) => {
        // Ignore export buttons and any elements with data-html2canvas-ignore attribute
        return element.classList?.contains('export-button') || 
               element.hasAttribute('data-html2canvas-ignore');
      },
      ...options
    };

    // Generate canvas from element
    const canvas = await html2canvas(element, defaultOptions);
    
    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (!blob) {
        console.error('Failed to generate image blob');
        return;
      }

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.visibility = 'hidden';
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      URL.revokeObjectURL(url);
    }, 'image/png');
  } catch (error) {
    console.error('Error exporting chart to image:', error);
    throw error;
  }
}

/**
 * Generates a filename with current date for image exports
 * @param {string} prefix - Prefix for the filename (e.g., 'osrs-networth-chart')
 * @returns {string} - Formatted filename with date
 */
export function generateImageFilename(prefix) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  
  return `${prefix}-${year}-${month}-${day}.png`;
}

/**
 * Hook for managing image export state and functionality
 * @param {React.RefObject} chartRef - Reference to the chart container element
 * @param {string} chartName - Name of the chart for filename generation
 * @returns {Object} - Export handler and loading state
 */
export function useImageExport(chartRef, chartName) {
  const [isExporting, setIsExporting] = React.useState(false);

  const handleExport = React.useCallback(async () => {
    if (!chartRef.current) {
      console.error('Chart reference not available');
      return;
    }

    setIsExporting(true);
    
    try {
      const filename = generateImageFilename(chartName);
      await exportToImage(chartRef.current, filename);
    } catch (error) {
      console.error('Failed to export chart:', error);
      alert('Failed to export chart. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [chartRef, chartName]);

  return { handleExport, isExporting };
}