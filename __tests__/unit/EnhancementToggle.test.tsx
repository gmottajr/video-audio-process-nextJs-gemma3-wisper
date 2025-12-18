/**
 * @jest-environment jsdom
 */

/**
 * Unit Tests: EnhancementToggle Component
 * 
 * Tests the AI Enhancement toggle UI component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EnhancementToggle } from '@/components/EnhancementToggle';
import type { HardwareCapabilities } from '@/types/enhancement';

// Mock lucide-react icons
jest.mock('lucide-react', () => {
  const React = require('react');
  return {
    Sparkles: (props: any) => React.createElement('span', { 'data-testid': 'sparkles-icon', ...props }),
    Cpu: (props: any) => React.createElement('span', { 'data-testid': 'cpu-icon', ...props }),
    HardDrive: (props: any) => React.createElement('span', { 'data-testid': 'harddrive-icon', ...props }),
    Clock: (props: any) => React.createElement('span', { 'data-testid': 'clock-icon', ...props }),
    AlertTriangle: (props: any) => React.createElement('span', { 'data-testid': 'alert-icon', ...props }),
    ChevronDown: (props: any) => React.createElement('span', { 'data-testid': 'chevron-down', ...props }),
    ChevronUp: (props: any) => React.createElement('span', { 'data-testid': 'chevron-up', ...props }),
  };
});

describe('EnhancementToggle', () => {
  const createMockCapabilities = (overrides: Partial<HardwareCapabilities> = {}): HardwareCapabilities => ({
    webGpuSupported: true,
    gpuTier: 'medium',
    gpuInfo: {
      vendor: 'NVIDIA',
      architecture: 'Test',
      device: 'Test GPU',
      description: 'NVIDIA GeForce RTX 3080',
    },
    estimatedVRAM: 10,
    deviceMemory: 16,
    cpuCores: 8,
    isCapable: true,
    recommendation: {
      canRun: true,
      suggestedModel: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
      estimatedLoadTime: '1-2 minutes',
      estimatedProcessTime: '30-60 seconds',
      warnings: [],
    },
    ...overrides,
  });

  const defaultProps = {
    capabilities: createMockCapabilities(),
    enabled: false,
    onToggle: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('should render when hardware is capable', () => {
      render(<EnhancementToggle {...defaultProps} />);
      
      expect(screen.getByText('AI Enhancement')).toBeInTheDocument();
      expect(screen.getByText(/Remove filler words/)).toBeInTheDocument();
    });

    test('should not render when hardware is incapable', () => {
      const incapableProps = {
        ...defaultProps,
        capabilities: createMockCapabilities({ isCapable: false }),
      };

      const { container } = render(<EnhancementToggle {...incapableProps} />);
      
      expect(container).toBeEmptyDOMElement();
    });

    test('should show "Ready" badge when model is loaded', () => {
      render(<EnhancementToggle {...defaultProps} isModelLoaded={true} />);
      
      expect(screen.getByText('Ready')).toBeInTheDocument();
    });

    test('should show "Loading..." badge when model is loading', () => {
      render(<EnhancementToggle {...defaultProps} isModelLoading={true} />);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Toggle Interaction', () => {
    test('should call onToggle when clicked', () => {
      const onToggle = jest.fn();
      render(<EnhancementToggle {...defaultProps} onToggle={onToggle} />);
      
      const toggle = screen.getByRole('switch');
      fireEvent.click(toggle);
      
      expect(onToggle).toHaveBeenCalledWith(true);
    });

    test('should toggle off when enabled', () => {
      const onToggle = jest.fn();
      render(<EnhancementToggle {...defaultProps} enabled={true} onToggle={onToggle} />);
      
      const toggle = screen.getByRole('switch');
      fireEvent.click(toggle);
      
      expect(onToggle).toHaveBeenCalledWith(false);
    });

    test('should be disabled when disabled prop is true', () => {
      render(<EnhancementToggle {...defaultProps} disabled={true} />);
      
      const toggle = screen.getByRole('switch');
      expect(toggle).toBeDisabled();
    });

    test('should be disabled when model is loading', () => {
      render(<EnhancementToggle {...defaultProps} isModelLoading={true} />);
      
      const toggle = screen.getByRole('switch');
      expect(toggle).toBeDisabled();
    });
  });

  describe('Details Panel', () => {
    test('should show performance tier when enabled', () => {
      render(<EnhancementToggle {...defaultProps} enabled={true} />);
      
      expect(screen.getByText('Good Performance')).toBeInTheDocument();
    });

    test('should show processing time estimate when enabled', () => {
      render(<EnhancementToggle {...defaultProps} enabled={true} />);
      
      expect(screen.getByText(/30-60 seconds/)).toBeInTheDocument();
    });

    test('should show "Show Details" button when enabled', () => {
      render(<EnhancementToggle {...defaultProps} enabled={true} />);
      
      expect(screen.getByText('Show Details')).toBeInTheDocument();
    });

    test('should expand details when "Show Details" is clicked', () => {
      render(<EnhancementToggle {...defaultProps} enabled={true} />);
      
      const showDetailsButton = screen.getByText('Show Details');
      fireEvent.click(showDetailsButton);
      
      // Should now show hardware info
      expect(screen.getByText('GPU')).toBeInTheDocument();
      expect(screen.getByText('VRAM')).toBeInTheDocument();
      expect(screen.getByText('AI Model')).toBeInTheDocument();
    });

    test('should show warnings when present', () => {
      const capabilitiesWithWarnings = createMockCapabilities({
        recommendation: {
          canRun: true,
          suggestedModel: 'test',
          estimatedLoadTime: '1-2 min',
          estimatedProcessTime: '30s',
          warnings: ['Your GPU may provide slower performance.'],
        },
      });

      render(
        <EnhancementToggle
          {...defaultProps}
          capabilities={capabilitiesWithWarnings}
          enabled={true}
        />
      );
      
      // Click to show details
      fireEvent.click(screen.getByText('Show Details'));
      
      expect(screen.getByText('Your GPU may provide slower performance.')).toBeInTheDocument();
    });
  });

  describe('Performance Tier Display', () => {
    test('should show correct label for high tier', () => {
      const highTierCapabilities = createMockCapabilities({ gpuTier: 'high' });
      
      render(
        <EnhancementToggle
          {...defaultProps}
          capabilities={highTierCapabilities}
          enabled={true}
        />
      );
      
      expect(screen.getByText('High Performance')).toBeInTheDocument();
    });

    test('should show correct label for medium tier', () => {
      const mediumTierCapabilities = createMockCapabilities({ gpuTier: 'medium' });
      
      render(
        <EnhancementToggle
          {...defaultProps}
          capabilities={mediumTierCapabilities}
          enabled={true}
        />
      );
      
      expect(screen.getByText('Good Performance')).toBeInTheDocument();
    });

    test('should show correct label for low tier', () => {
      const lowTierCapabilities = createMockCapabilities({ gpuTier: 'low' });
      
      render(
        <EnhancementToggle
          {...defaultProps}
          capabilities={lowTierCapabilities}
          enabled={true}
        />
      );
      
      expect(screen.getByText('Basic Performance')).toBeInTheDocument();
    });
  });

  describe('Feature List', () => {
    test('should show what AI enhancement does when details expanded', () => {
      render(<EnhancementToggle {...defaultProps} enabled={true} />);
      
      // Click to show details
      fireEvent.click(screen.getByText('Show Details'));
      
      expect(screen.getByText(/Removes filler words/)).toBeInTheDocument();
      expect(screen.getByText(/Fixes grammar and punctuation/)).toBeInTheDocument();
      expect(screen.getByText(/Cleans up run-on sentences/)).toBeInTheDocument();
      expect(screen.getByText(/Preserves original meaning/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('should have accessible toggle button', () => {
      render(<EnhancementToggle {...defaultProps} />);
      
      const toggle = screen.getByRole('switch');
      expect(toggle).toHaveAttribute('aria-checked', 'false');
    });

    test('should update aria-checked when enabled', () => {
      render(<EnhancementToggle {...defaultProps} enabled={true} />);
      
      const toggle = screen.getByRole('switch');
      expect(toggle).toHaveAttribute('aria-checked', 'true');
    });
  });
});
