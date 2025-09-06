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
  it('renders current navigation links', () => {
    renderWithRouter(<Navigation />);

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Items')).toBeInTheDocument();
    expect(screen.getByText('Charts')).toBeInTheDocument();
    expect(screen.getByText('Query')).toBeInTheDocument();
    expect(screen.getByText('Performance')).toBeInTheDocument();
    expect(screen.getByText('Heat Map')).toBeInTheDocument();
    expect(screen.getByText('Flip Logs')).toBeInTheDocument();
    expect(screen.getByText('Guest Mode')).toBeInTheDocument();
  });

  it('renders skip-to-content link', () => {
    renderWithRouter(<Navigation />);
    const skipLink = screen.getByText('Skip to main content');
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute('href', '#main-content');
  });

  it('shows mobile menu toggle button', () => {
    renderWithRouter(<Navigation />);
    const menuToggle = screen.getByRole('button', { name: /toggle mobile menu/i });
    expect(menuToggle).toBeInTheDocument();
  });

  it('toggles mobile menu on click', () => {
    renderWithRouter(<Navigation />);
    const menuToggle = screen.getByRole('button', { name: /toggle mobile menu/i });

    // Initially not rendered
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    // Open
    fireEvent.click(menuToggle);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Close
    fireEvent.click(menuToggle);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes mobile menu when clicking outside', () => {
    renderWithRouter(<Navigation />);
    const menuToggle = screen.getByRole('button', { name: /toggle mobile menu/i });
    fireEvent.click(menuToggle);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('highlights active navigation item for current route', () => {
    renderWithRouter(<Navigation />, { route: '/performance' });
    const perfLink = screen.getByText('Performance');
    expect(perfLink.closest('a')).toHaveAttribute('aria-current', 'page');
    expect(perfLink.closest('a')!.className).toMatch(/bg-yellow-600/);
  });

  it('has proper ARIA labels and controls', () => {
    renderWithRouter(<Navigation />);
    const nav = screen.getByRole('navigation');
    expect(nav).toHaveAttribute('aria-label', 'Main navigation');

    const menuToggle = screen.getByRole('button', { name: /toggle mobile menu/i });
    expect(menuToggle).toHaveAttribute('aria-expanded', 'false');
    expect(menuToggle).toHaveAttribute('aria-controls');
  });

  it('updates aria-expanded when toggled', () => {
    renderWithRouter(<Navigation />);
    const menuToggle = screen.getByRole('button', { name: /toggle mobile menu/i });
    expect(menuToggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(menuToggle);
    expect(menuToggle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(menuToggle);
    expect(menuToggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('links have proper hrefs', () => {
    renderWithRouter(<Navigation />);
    const links = screen.getAllByRole('link');
    links.forEach(link => {
      if (link.getAttribute('href') === '#main-content') return;
      expect(link).toHaveAttribute('href');
      const href = link.getAttribute('href');
      expect(href).toMatch(/^\/|^#/);
    });
  });
});
