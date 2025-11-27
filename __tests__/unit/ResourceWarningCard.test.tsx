/**
 * Unit Tests: ResourceWarningCard Component
 * 
 * Tests the reusable resource warning display component
 * 
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ResourceWarningCard } from '@/components/ResourceWarningCard';

describe('ResourceWarningCard', () => {
  const createMockFile = (sizeMB: number, name: string = 'test.mp4'): File => {
    return new File([new ArrayBuffer(sizeMB * 1024 * 1024)], name, {
      type: 'video/mp4',
    });
  };

  describe('Visibility Logic', () => {
    test('should NOT render for files below RAM threshold', () => {
      const smallFile = createMockFile(10); // ~5GB with tiny model
      const { container } = render(
        <ResourceWarningCard file={smallFile} modelKey="tiny" />
      );

      expect(container.firstChild).toBeNull();
    });

    test('should render for files above RAM threshold', () => {
      const largeFile = createMockFile(700); // ~78GB with small model
      render(<ResourceWarningCard file={largeFile} modelKey="small" />);

      expect(screen.getByTestId('resource-warning-card')).toBeInTheDocument();
    });

    test('should respect custom minRAMThreshold', () => {
      const mediumFile = createMockFile(100); // ~75GB with small model
      
      // With default threshold (50GB): should show
      const { rerender } = render(
        <ResourceWarningCard file={mediumFile} modelKey="small" />
      );
      expect(screen.getByTestId('resource-warning-card')).toBeInTheDocument();

      // With high threshold (80GB): should NOT show
      rerender(
        <ResourceWarningCard 
          file={mediumFile} 
          modelKey="small" 
          minRAMThreshold={80} 
        />
      );
      expect(screen.queryByTestId('resource-warning-card')).not.toBeInTheDocument();
    });
  });

  describe('Warning Levels', () => {
    test('should display "extreme" level for 700MB + Small model', () => {
      const file = createMockFile(700);
      render(<ResourceWarningCard file={file} modelKey="small" />);

      const card = screen.getByTestId('resource-warning-card');
      expect(card).toHaveAttribute('data-level', 'extreme');
    });

    test('should display correct level styling', () => {
      const file = createMockFile(700);
      render(<ResourceWarningCard file={file} modelKey="small" />);

      const card = screen.getByTestId('resource-warning-card');
      // Orange border for extreme level
      expect(card.className).toContain('border-orange-500');
    });
  });

  describe('Content Display', () => {
    test('should display RAM estimate', () => {
      const file = createMockFile(700); // 75 + (0.7 * 3) = 77GB
      render(<ResourceWarningCard file={file} modelKey="small" />);

      const ramCell = screen.getByTestId('ram-estimate');
      expect(ramCell).toHaveTextContent('77GB+');
    });

    test('should display time estimate', () => {
      const file = createMockFile(700);
      render(<ResourceWarningCard file={file} modelKey="small" />);

      const timeCell = screen.getByTestId('time-estimate');
      expect(timeCell).toHaveTextContent('min');
    });

    test('should display warning message', () => {
      const file = createMockFile(700);
      render(<ResourceWarningCard file={file} modelKey="small" />);

      // Message should mention HIGH or EXTREME (use heading role)
      const heading = screen.getByRole('heading', { level: 4 });
      expect(heading).toHaveTextContent(/HIGH|EXTREME/i);
    });

    test('should display recommendation text', () => {
      const file = createMockFile(700);
      render(<ResourceWarningCard file={file} modelKey="small" />);

      // Recommendation should be present (query more specifically)
      const recommendation = screen.getByText(/Requires powerful system/i);
      expect(recommendation).toBeInTheDocument();
    });
  });

  describe('Hardware Requirements', () => {
    test('should show CPU requirement for heavy workloads', () => {
      const file = createMockFile(700);
      render(<ResourceWarningCard file={file} modelKey="small" />);

      expect(screen.getByTestId('cpu-requirement')).toBeInTheDocument();
      expect(screen.getByText(/High-end required/i)).toBeInTheDocument();
    });

    test('should show GPU requirement for heavy workloads', () => {
      const file = createMockFile(700);
      render(<ResourceWarningCard file={file} modelKey="small" />);

      expect(screen.getByTestId('gpu-requirement')).toBeInTheDocument();
      expect(screen.getByText(/Dedicated recommended/i)).toBeInTheDocument();
    });

    test('should NOT show CPU/GPU for light workloads', () => {
      const file = createMockFile(100); // Light for tiny model
      render(<ResourceWarningCard file={file} modelKey="tiny" minRAMThreshold={0} />);

      expect(screen.queryByTestId('cpu-requirement')).not.toBeInTheDocument();
      expect(screen.queryByTestId('gpu-requirement')).not.toBeInTheDocument();
    });
  });

  describe('Custom Styling', () => {
    test('should accept custom className', () => {
      const file = createMockFile(700);
      render(
        <ResourceWarningCard 
          file={file} 
          modelKey="small" 
          className="my-custom-class"
        />
      );

      const card = screen.getByTestId('resource-warning-card');
      expect(card.className).toContain('my-custom-class');
    });
  });

  describe('Accessibility', () => {
    test('should have appropriate ARIA attributes', () => {
      const file = createMockFile(700);
      const { container } = render(<ResourceWarningCard file={file} modelKey="small" />);

      // Icon should have aria-hidden
      const icon = container.querySelector('[aria-hidden="true"]');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveTextContent('🟠'); // Orange icon for extreme level
    });

    test('should have semantic HTML structure', () => {
      const file = createMockFile(700);
      render(<ResourceWarningCard file={file} modelKey="small" />);

      // Should have heading for message
      const heading = screen.getByRole('heading', { level: 4 });
      expect(heading).toBeInTheDocument();
    });
  });
});

