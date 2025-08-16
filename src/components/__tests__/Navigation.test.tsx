import React from 'react';
import { render, screen, fireEvent } from '../../tests/utils/testUtils';
import { BrowserRouter } from 'react-router-dom';
import Navigation from '../Navigation';

// Custom render with router
const renderWithRouter = (ui: React.ReactElement, { route = '/' } = {}) => {
  window.history.pushState({}, 'Test page', route);
  return render(ui, { wrapper: BrowserRouter });
};

describe('Navigation', () => {
  it('should render navigation links', () => {
    renderWithRouter(<Navigation />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Daily View')).toBeInTheDocument();
    expect(screen.getByText('Full Stats')).toBeInTheDocument();
    expect(screen.getByText('Charts')).toBeInTheDocument();
    expect(screen.getByText('Volume Analysis')).toBeInTheDocument();
    expect(screen.getByText('Performance')).toBeInTheDocument();
  });

  it('should render skip-to-content link', () => {
    renderWithRouter(<Navigation />);

    const skipLink = screen.getByText('Skip to main content');
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute('href', '#main-content');
  });

  it('should show mobile menu toggle on small screens', () => {
    // Mock small screen
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 640,
    });

    renderWithRouter(<Navigation />);

    const menuToggle = screen.getByRole('button', { name: /toggle menu/i });
    expect(menuToggle).toBeInTheDocument();
  });

  it('should toggle mobile menu when clicked', () => {
    renderWithRouter(<Navigation />);

    const menuToggle = screen.getByRole('button', { name: /toggle menu/i });

    // Menu should be closed initially
    const mobileMenu = screen.getByRole('navigation').querySelector('[data-mobile-menu]');
    expect(mobileMenu).toHaveClass('hidden');

    // Click to open
    fireEvent.click(menuToggle);
    expect(mobileMenu).not.toHaveClass('hidden');

    // Click to close
    fireEvent.click(menuToggle);
    expect(mobileMenu).toHaveClass('hidden');
  });

  it('should close mobile menu when clicking outside', () => {
    renderWithRouter(<Navigation />);

    const menuToggle = screen.getByRole('button', { name: /toggle menu/i });
    fireEvent.click(menuToggle);

    const mobileMenu = screen.getByRole('navigation').querySelector('[data-mobile-menu]');
    expect(mobileMenu).not.toHaveClass('hidden');

    // Click outside the navigation
    fireEvent.mouseDown(document.body);
    expect(mobileMenu).toHaveClass('hidden');
  });

  it('should handle keyboard navigation', () => {
    renderWithRouter(<Navigation />);

    const skipLink = screen.getByText('Skip to main content');

    // Focus skip link
    skipLink.focus();
    expect(skipLink).toHaveFocus();

    // Tab to first navigation link
    fireEvent.keyDown(skipLink, { key: 'Tab', code: 'Tab' });
    const dashboardLink = screen.getByText('Dashboard');
    dashboardLink.focus();
    expect(dashboardLink).toHaveFocus();
  });

  it('should highlight active navigation item', () => {
    renderWithRouter(<Navigation />, { route: '/daily' });

    const dailyLink = screen.getByText('Daily View');
    expect(dailyLink.closest('a')).toHaveClass('text-yellow-400');
    expect(dailyLink.closest('a')).toHaveAttribute('aria-current', 'page');
  });

  it('should have proper ARIA labels', () => {
    renderWithRouter(<Navigation />);

    const nav = screen.getByRole('navigation');
    expect(nav).toHaveAttribute('aria-label', 'Main navigation');

    const menuToggle = screen.getByRole('button', { name: /toggle menu/i });
    expect(menuToggle).toHaveAttribute('aria-expanded', 'false');
    expect(menuToggle).toHaveAttribute('aria-controls');

    // Check that menu toggle controls the mobile menu
    const menuId = menuToggle.getAttribute('aria-controls');
    const mobileMenu = document.getElementById(menuId!);
    expect(mobileMenu).toBeInTheDocument();
  });

  it('should update aria-expanded when menu is toggled', () => {
    renderWithRouter(<Navigation />);

    const menuToggle = screen.getByRole('button', { name: /toggle menu/i });
    expect(menuToggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(menuToggle);
    expect(menuToggle).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(menuToggle);
    expect(menuToggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('should close menu on Escape key', () => {
    renderWithRouter(<Navigation />);

    const menuToggle = screen.getByRole('button', { name: /toggle menu/i });
    fireEvent.click(menuToggle);

    const mobileMenu = screen.getByRole('navigation').querySelector('[data-mobile-menu]');
    expect(mobileMenu).not.toHaveClass('hidden');

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    expect(mobileMenu).toHaveClass('hidden');
  });

  it('should have proper link attributes', () => {
    renderWithRouter(<Navigation />);

    const links = screen.getAllByRole('link');
    links.forEach(link => {
      // Skip the skip-to-content link
      if (link.getAttribute('href') === '#main-content') return;

      // All navigation links should have href attributes
      expect(link).toHaveAttribute('href');

      // Links should be properly formatted
      const href = link.getAttribute('href');
      expect(href).toMatch(/^\/|^#/); // Should start with / or #
    });
  });
});
