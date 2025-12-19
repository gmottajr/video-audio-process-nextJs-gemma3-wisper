/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TabbedTranscriptionView } from '@/components/TabbedTranscriptionView';
import type { EnhancementQualityMetrics } from '@/types/quality-metrics';

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  FileText: () => <svg data-testid="icon-file-text" />,
  Sparkles: () => <svg data-testid="icon-sparkles" />,
  Columns: () => <svg data-testid="icon-columns" />,
  GitCompare: () => <svg data-testid="icon-git-compare" />,
  Copy: () => <svg data-testid="icon-copy" />,
  Check: () => <svg data-testid="icon-check" />,
  Download: () => <svg data-testid="icon-download" />,
  RefreshCw: () => <svg data-testid="icon-refresh" />,
  ChevronDown: () => <svg data-testid="icon-chevron-down" />,
  Keyboard: () => <svg data-testid="icon-keyboard" />,
  Hash: () => <svg data-testid="icon-hash" />,
  Clock: () => <svg data-testid="icon-clock" />,
  AlignLeft: () => <svg data-testid="icon-align-left" />,
  TrendingUp: () => <svg data-testid="icon-trending-up" />,
  TrendingDown: () => <svg data-testid="icon-trending-down" />,
  ArrowRight: () => <svg data-testid="icon-arrow-right" />,
  Zap: () => <svg data-testid="icon-zap" />,
  Plus: () => <svg data-testid="icon-plus" />,
  Minus: () => <svg data-testid="icon-minus" />,
  Equal: () => <svg data-testid="icon-equal" />,
  // Phase 4.5 icons
  Edit3: () => <svg data-testid="icon-edit" />,
  RotateCcw: () => <svg data-testid="icon-rotate-ccw" />,
  Link2: () => <svg data-testid="icon-link" />,
  Link2Off: () => <svg data-testid="icon-link-off" />,
}));

// Mock clipboard API
const mockWriteText = jest.fn();
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

// Mock URL methods
const mockCreateObjectURL = jest.fn(() => 'blob:mock-url');
const mockRevokeObjectURL = jest.fn();
global.URL.createObjectURL = mockCreateObjectURL;
global.URL.revokeObjectURL = mockRevokeObjectURL;

// Phase 4.5: Mock history.replaceState to prevent URL changes
const mockReplaceState = jest.fn();
Object.defineProperty(window.history, 'replaceState', {
  writable: true,
  value: mockReplaceState,
});

// Sample data
const originalText = 'Um, so like, the quarterly results, you know, were pretty good. I mean, we saw significant growth.';
const enhancedText = 'The quarterly results were excellent. We saw significant growth.';

const mockQualityMetrics: EnhancementQualityMetrics = {
  originalLength: 100,
  enhancedLength: 65,
  compressionRatio: 0.65,
  reductionPercentage: 35,
  originalWordCount: 18,
  enhancedWordCount: 10,
  wordsRemoved: 8,
  wordsAdded: 0,
  originalSentenceCount: 2,
  enhancedSentenceCount: 2,
  avgSentenceLengthOriginal: 9,
  avgSentenceLengthEnhanced: 5,
  readabilityBefore: {
    fleschKincaidReadingEase: 60,
    fleschKincaidGradeLevel: 8,
    smogIndex: 7,
    automatedReadabilityIndex: 7,
    colemanLiauIndex: 8,
    gunningFogIndex: 9,
  },
  readabilityAfter: {
    fleschKincaidReadingEase: 75,
    fleschKincaidGradeLevel: 6,
    smogIndex: 5,
    automatedReadabilityIndex: 5,
    colemanLiauIndex: 6,
    gunningFogIndex: 7,
  },
  readabilityImprovement: 15,
  fillerWordsRemoved: 5,
  fillerRemovalRate: 27.8,
  technicalTermsPreserved: 0,
  acronymsPreserved: 0,
  numbersPreserved: 0,
  properNounsPreserved: 0,
  sentimentOriginal: 'positive',
  sentimentEnhanced: 'positive',
  sentimentPreserved: true,
  qualityScore: 85,
  confidenceScore: 0.9,
  qualityBreakdown: {
    baseScore: 50,
    readabilityPoints: 15,
    compressionPoints: 10,
    sentimentPoints: 10,
    technicalPoints: 0,
    fillerPoints: 10,
    penaltyPoints: 0,
    totalScore: 85,
  },
};

describe('TabbedTranscriptionView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock sessionStorage
    const mockSessionStorage: Record<string, string> = {};
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => mockSessionStorage[key] || null);
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
      mockSessionStorage[key] = value;
    });
    
    // Phase 4.5: Clear the hash for consistent test behavior
    window.location.hash = '';
  });

  describe('Tab Navigation', () => {
    test('renders all four tabs', () => {
      render(
        <TabbedTranscriptionView
          originalText={originalText}
          enhancedText={enhancedText}
        />
      );
      
      expect(screen.getByRole('tab', { name: /original/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /enhanced/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /side-by-side/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /diff/i })).toBeInTheDocument();
    });

    test('starts with Enhanced tab active by default', () => {
      render(
        <TabbedTranscriptionView
          originalText={originalText}
          enhancedText={enhancedText}
        />
      );
      
      const enhancedTab = screen.getByRole('tab', { name: /enhanced/i });
      expect(enhancedTab).toHaveAttribute('aria-selected', 'true');
    });

    test('switches tabs on click', () => {
      render(
        <TabbedTranscriptionView
          originalText={originalText}
          enhancedText={enhancedText}
        />
      );
      
      const originalTab = screen.getByRole('tab', { name: /original/i });
      fireEvent.click(originalTab);
      
      expect(originalTab).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('tabpanel', { name: /original/i })).toBeInTheDocument();
    });

    test('has proper ARIA attributes', () => {
      render(
        <TabbedTranscriptionView
          originalText={originalText}
          enhancedText={enhancedText}
        />
      );
      
      expect(screen.getByRole('tablist')).toHaveAttribute('aria-label', 'Transcription view options');
      
      const tabs = screen.getAllByRole('tab');
      tabs.forEach(tab => {
        expect(tab).toHaveAttribute('aria-selected');
        expect(tab).toHaveAttribute('aria-controls');
      });
    });
  });

  describe('Original Tab', () => {
    test('displays original text correctly', () => {
      render(
        <TabbedTranscriptionView
          originalText={originalText}
          enhancedText={enhancedText}
        />
      );
      
      fireEvent.click(screen.getByRole('tab', { name: /original/i }));
      
      expect(screen.getByText(/quarterly results/i)).toBeInTheDocument();
      expect(screen.getByText(/um, so like/i)).toBeInTheDocument();
    });

    test('shows word and sentence count', () => {
      render(
        <TabbedTranscriptionView
          originalText={originalText}
          enhancedText={enhancedText}
        />
      );
      
      fireEvent.click(screen.getByRole('tab', { name: /original/i }));
      
      expect(screen.getByText(/words/i)).toBeInTheDocument();
      expect(screen.getByText(/sentences/i)).toBeInTheDocument();
    });
  });

  describe('Enhanced Tab', () => {
    test('displays enhanced text correctly', () => {
      render(
        <TabbedTranscriptionView
          originalText={originalText}
          enhancedText={enhancedText}
        />
      );
      
      // Enhanced tab is active by default
      expect(screen.getByText(/The quarterly results were excellent/i)).toBeInTheDocument();
    });

    test('shows improvement summary when metrics available', () => {
      render(
        <TabbedTranscriptionView
          originalText={originalText}
          enhancedText={enhancedText}
          qualityMetrics={mockQualityMetrics}
        />
      );
      
      expect(screen.getByText(/improvements made/i)).toBeInTheDocument();
      expect(screen.getByText(/5 filler words/i)).toBeInTheDocument();
    });

    test('displays quality score badge', () => {
      render(
        <TabbedTranscriptionView
          originalText={originalText}
          enhancedText={enhancedText}
          qualityMetrics={mockQualityMetrics}
        />
      );
      
      // Quality score appears in both header and badge - verify at least one exists
      const qualityElements = screen.getAllByText(/quality: 85\/100/i);
      expect(qualityElements.length).toBeGreaterThan(0);
    });
  });

  describe('Side-by-Side Tab', () => {
    test('displays both texts in columns', () => {
      render(
        <TabbedTranscriptionView
          originalText={originalText}
          enhancedText={enhancedText}
        />
      );
      
      fireEvent.click(screen.getByRole('tab', { name: /side-by-side/i }));
      
      // Both texts should be visible
      expect(screen.getByText(/um, so like/i)).toBeInTheDocument();
      expect(screen.getByText(/quarterly results were excellent/i)).toBeInTheDocument();
    });

    test('shows comparison statistics', () => {
      render(
        <TabbedTranscriptionView
          originalText={originalText}
          enhancedText={enhancedText}
          qualityMetrics={mockQualityMetrics}
        />
      );
      
      fireEvent.click(screen.getByRole('tab', { name: /side-by-side/i }));
      
      expect(screen.getByText(/words:/i)).toBeInTheDocument();
    });
  });

  describe('Diff Tab', () => {
    test('shows changes in diff view', () => {
      render(
        <TabbedTranscriptionView
          originalText={originalText}
          enhancedText={enhancedText}
        />
      );
      
      fireEvent.click(screen.getByRole('tab', { name: /diff/i }));
      
      expect(screen.getByText(/changes view/i)).toBeInTheDocument();
    });

    test('shows legend for diff colors', () => {
      render(
        <TabbedTranscriptionView
          originalText={originalText}
          enhancedText={enhancedText}
        />
      );
      
      fireEvent.click(screen.getByRole('tab', { name: /diff/i }));
      
      expect(screen.getByText(/deleted text/i)).toBeInTheDocument();
      expect(screen.getByText(/new text/i)).toBeInTheDocument();
    });

    test('shows change statistics', () => {
      render(
        <TabbedTranscriptionView
          originalText={originalText}
          enhancedText={enhancedText}
        />
      );
      
      fireEvent.click(screen.getByRole('tab', { name: /diff/i }));
      
      expect(screen.getByText(/words removed/i)).toBeInTheDocument();
      expect(screen.getByText(/words added/i)).toBeInTheDocument();
    });
  });

  describe('Copy Button', () => {
    test('copies enhanced text when on Enhanced tab', async () => {
      mockWriteText.mockResolvedValue(undefined);
      
      render(
        <TabbedTranscriptionView
          originalText={originalText}
          enhancedText={enhancedText}
        />
      );
      
      const copyButton = screen.getByRole('button', { name: /copy/i });
      fireEvent.click(copyButton);
      
      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith(enhancedText);
      });
    });

    test('copies original text when on Original tab', async () => {
      mockWriteText.mockResolvedValue(undefined);
      
      render(
        <TabbedTranscriptionView
          originalText={originalText}
          enhancedText={enhancedText}
        />
      );
      
      fireEvent.click(screen.getByRole('tab', { name: /original/i }));
      
      const copyButton = screen.getByRole('button', { name: /copy/i });
      fireEvent.click(copyButton);
      
      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith(originalText);
      });
    });

    test('shows success feedback after copying', async () => {
      mockWriteText.mockResolvedValue(undefined);
      
      render(
        <TabbedTranscriptionView
          originalText={originalText}
          enhancedText={enhancedText}
        />
      );
      
      const copyButton = screen.getByRole('button', { name: /copy/i });
      fireEvent.click(copyButton);
      
      await waitFor(() => {
        expect(screen.getByText(/copied!/i)).toBeInTheDocument();
      });
    });

    test('calls onCopy callback when provided', async () => {
      mockWriteText.mockResolvedValue(undefined);
      const onCopy = jest.fn();
      
      render(
        <TabbedTranscriptionView
          originalText={originalText}
          enhancedText={enhancedText}
          onCopy={onCopy}
        />
      );
      
      const copyButton = screen.getByRole('button', { name: /copy/i });
      fireEvent.click(copyButton);
      
      await waitFor(() => {
        expect(onCopy).toHaveBeenCalledWith(enhancedText, 'enhanced');
      });
    });
  });

  describe('Export Button', () => {
    test('shows export menu on click', () => {
      render(
        <TabbedTranscriptionView
          originalText={originalText}
          enhancedText={enhancedText}
        />
      );
      
      const exportButton = screen.getByRole('button', { name: /export/i });
      fireEvent.click(exportButton);
      
      expect(screen.getByText(/plain text/i)).toBeInTheDocument();
      expect(screen.getByText(/json/i)).toBeInTheDocument();
    });

    test('exports as txt file', () => {
      // Render first, then mock createElement only for link element
      render(
        <TabbedTranscriptionView
          originalText={originalText}
          enhancedText={enhancedText}
          metadata={{ filename: 'test' }}
        />
      );
      
      const mockClick = jest.fn();
      const originalCreateElement = document.createElement.bind(document);
      jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        const element = originalCreateElement(tagName);
        if (tagName === 'a') {
          element.click = mockClick;
        }
        return element;
      });
      
      const exportButton = screen.getByRole('button', { name: /export/i });
      fireEvent.click(exportButton);
      
      const txtOption = screen.getByText(/plain text/i);
      fireEvent.click(txtOption);
      
      expect(mockCreateObjectURL).toHaveBeenCalled();
      
      // Restore createElement
      jest.restoreAllMocks();
    });
  });

  describe('Re-enhance Button', () => {
    test('calls onReEnhance when clicked', () => {
      const onReEnhance = jest.fn();
      
      render(
        <TabbedTranscriptionView
          originalText={originalText}
          enhancedText={enhancedText}
          onReEnhance={onReEnhance}
        />
      );
      
      const reEnhanceButton = screen.getByRole('button', { name: /re-enhance/i });
      fireEvent.click(reEnhanceButton);
      
      expect(onReEnhance).toHaveBeenCalled();
    });

    test('is hidden when onReEnhance is not provided', () => {
      render(
        <TabbedTranscriptionView
          originalText={originalText}
          enhancedText={enhancedText}
        />
      );
      
      expect(screen.queryByRole('button', { name: /re-enhance/i })).not.toBeInTheDocument();
    });
  });

  describe('Keyboard Shortcuts', () => {
    test('opens keyboard help modal when ? is pressed', () => {
      render(
        <TabbedTranscriptionView
          originalText={originalText}
          enhancedText={enhancedText}
        />
      );
      
      fireEvent.keyDown(window, { key: '?' });
      
      expect(screen.getByText(/keyboard shortcuts/i)).toBeInTheDocument();
    });

    test('closes keyboard help modal on Escape', () => {
      render(
        <TabbedTranscriptionView
          originalText={originalText}
          enhancedText={enhancedText}
        />
      );
      
      // Open modal
      fireEvent.keyDown(window, { key: '?' });
      expect(screen.getByText(/keyboard shortcuts/i)).toBeInTheDocument();
      
      // Close modal
      fireEvent.keyDown(window, { key: 'Escape' });
      
      // Modal should be closed (check for specific modal content)
      expect(screen.queryByText(/switch to tab/i)).not.toBeInTheDocument();
    });

    test('Ctrl+1 switches to Original tab', () => {
      render(
        <TabbedTranscriptionView
          originalText={originalText}
          enhancedText={enhancedText}
        />
      );
      
      fireEvent.keyDown(window, { key: '1', ctrlKey: true });
      
      const originalTab = screen.getByRole('tab', { name: /original/i });
      expect(originalTab).toHaveAttribute('aria-selected', 'true');
    });

    test('Ctrl+E toggles between Original and Enhanced', () => {
      render(
        <TabbedTranscriptionView
          originalText={originalText}
          enhancedText={enhancedText}
        />
      );
      
      // Start on Enhanced
      expect(screen.getByRole('tab', { name: /enhanced/i })).toHaveAttribute('aria-selected', 'true');
      
      // Press Ctrl+E
      fireEvent.keyDown(window, { key: 'e', ctrlKey: true });
      
      // Should be on Original now
      expect(screen.getByRole('tab', { name: /original/i })).toHaveAttribute('aria-selected', 'true');
      
      // Press Ctrl+E again
      fireEvent.keyDown(window, { key: 'e', ctrlKey: true });
      
      // Should be back on Enhanced
      expect(screen.getByRole('tab', { name: /enhanced/i })).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Quality Metrics', () => {
    test('displays quality score in header when metrics provided', () => {
      render(
        <TabbedTranscriptionView
          originalText={originalText}
          enhancedText={enhancedText}
          qualityMetrics={mockQualityMetrics}
        />
      );
      
      // Quality score appears in both header and badge
      const qualityElements = screen.getAllByText(/quality: 85\/100/i);
      expect(qualityElements.length).toBeGreaterThan(0);
    });

    test('shows readability improvement', () => {
      render(
        <TabbedTranscriptionView
          originalText={originalText}
          enhancedText={enhancedText}
          qualityMetrics={mockQualityMetrics}
        />
      );
      
      expect(screen.getByText(/readability \+15 points/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA roles', () => {
      render(
        <TabbedTranscriptionView
          originalText={originalText}
          enhancedText={enhancedText}
        />
      );
      
      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(screen.getAllByRole('tab')).toHaveLength(4);
      expect(screen.getByRole('tabpanel')).toBeInTheDocument();
    });

    test('keyboard help button is accessible', () => {
      render(
        <TabbedTranscriptionView
          originalText={originalText}
          enhancedText={enhancedText}
        />
      );
      
      const helpButton = screen.getByTitle(/keyboard shortcuts/i);
      expect(helpButton).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // PHASE 4.5 TESTS
  // ==========================================================================

  describe('Phase 4.5: SRT Export', () => {
    const mockChunks = [
      { text: 'Hello world.', timestamp: [0, 2.5] as [number, number | null] },
      { text: 'This is a test.', timestamp: [2.5, 5.0] as [number, number | null] },
      { text: 'Goodbye.', timestamp: [5.0, 7.0] as [number, number | null] },
    ];

    test('shows SRT export option when chunks are provided', () => {
      render(
        <TabbedTranscriptionView
          originalText={originalText}
          enhancedText={enhancedText}
          chunks={mockChunks}
        />
      );
      
      // Open export menu
      fireEvent.click(screen.getByText(/export/i));
      
      // SRT option should be visible
      expect(screen.getByText(/subtitles \(\.srt\)/i)).toBeInTheDocument();
    });

    test('does not show SRT export option when chunks are not provided', () => {
      render(
        <TabbedTranscriptionView
          originalText={originalText}
          enhancedText={enhancedText}
        />
      );
      
      // Open export menu
      fireEvent.click(screen.getByText(/export/i));
      
      // SRT option should NOT be visible
      expect(screen.queryByText(/subtitles \(\.srt\)/i)).not.toBeInTheDocument();
    });

    test('exports SRT file with correct format', () => {
      render(
        <TabbedTranscriptionView
          originalText={originalText}
          enhancedText={enhancedText}
          chunks={mockChunks}
          metadata={{ filename: 'test-video' }}
        />
      );
      
      // Open export menu and click SRT
      fireEvent.click(screen.getByText(/export/i));
      fireEvent.click(screen.getByText(/subtitles \(\.srt\)/i));
      
      // Check that createObjectURL was called
      expect(mockCreateObjectURL).toHaveBeenCalled();
      
      // Get the blob that was passed
      const blobArg = mockCreateObjectURL.mock.calls[mockCreateObjectURL.mock.calls.length - 1][0];
      expect(blobArg).toBeInstanceOf(Blob);
    });
  });

  describe('Phase 4.5: URL Hash Sync', () => {
    test('updates URL hash when tab changes', () => {
      render(
        <TabbedTranscriptionView
          originalText={originalText}
          enhancedText={enhancedText}
        />
      );
      
      // Click on Original tab
      fireEvent.click(screen.getByRole('tab', { name: /original/i }));
      
      // Check that replaceState was called with the correct hash
      expect(mockReplaceState).toHaveBeenCalled();
      const lastCall = mockReplaceState.mock.calls[mockReplaceState.mock.calls.length - 1];
      expect(lastCall[2]).toContain('#original');
    });

    test('reads initial tab from URL hash', () => {
      // Set hash to diff
      window.location.hash = '#diff';
      
      render(
        <TabbedTranscriptionView
          originalText={originalText}
          enhancedText={enhancedText}
        />
      );
      
      // Diff tab should be active
      expect(screen.getByRole('tab', { name: /diff/i })).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Phase 4.5: Editable Enhanced Text', () => {
    test('shows Edit button on Enhanced tab', () => {
      render(
        <TabbedTranscriptionView
          originalText={originalText}
          enhancedText={enhancedText}
        />
      );
      
      // Should be on Enhanced tab by default
      const editButton = screen.getByTitle(/edit enhanced text/i);
      expect(editButton).toBeInTheDocument();
    });

    test('Edit button is not shown on other tabs', () => {
      render(
        <TabbedTranscriptionView
          originalText={originalText}
          enhancedText={enhancedText}
        />
      );
      
      // Switch to Original tab
      fireEvent.click(screen.getByRole('tab', { name: /original/i }));
      
      // Edit button should not be visible
      expect(screen.queryByTitle(/edit enhanced text/i)).not.toBeInTheDocument();
    });

    test('clicking Edit enables edit mode', () => {
      render(
        <TabbedTranscriptionView
          originalText={originalText}
          enhancedText={enhancedText}
        />
      );
      
      // Click Edit button
      fireEvent.click(screen.getByTitle(/edit enhanced text/i));
      
      // Button should now say "Done"
      expect(screen.getByText(/done/i)).toBeInTheDocument();
    });

    test('calls onEnhancedTextChange when text is edited', () => {
      const mockOnChange = jest.fn();
      
      render(
        <TabbedTranscriptionView
          originalText={originalText}
          enhancedText={enhancedText}
          onEnhancedTextChange={mockOnChange}
        />
      );
      
      // Enter edit mode
      fireEvent.click(screen.getByTitle(/edit enhanced text/i));
      
      // Find textarea and type
      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'Edited text' } });
      
      // Callback should be called
      expect(mockOnChange).toHaveBeenCalledWith('Edited text');
    });

    test('shows Reset button when text has been edited', () => {
      const mockOnChange = jest.fn();
      
      render(
        <TabbedTranscriptionView
          originalText={originalText}
          enhancedText={enhancedText}
          onEnhancedTextChange={mockOnChange}
        />
      );
      
      // Enter edit mode and make changes
      fireEvent.click(screen.getByTitle(/edit enhanced text/i));
      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'Edited text' } });
      
      // Exit edit mode
      fireEvent.click(screen.getByText(/done/i));
      
      // Reset button should appear
      expect(screen.getByTitle(/reset to ai-generated text/i)).toBeInTheDocument();
    });

    test('shows "edited" badge on Enhanced tab when text has been edited', () => {
      render(
        <TabbedTranscriptionView
          originalText={originalText}
          enhancedText={enhancedText}
        />
      );
      
      // Enter edit mode and make changes
      fireEvent.click(screen.getByTitle(/edit enhanced text/i));
      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'Edited text' } });
      
      // Exit edit mode
      fireEvent.click(screen.getByText(/done/i));
      
      // "edited" badge should appear
      expect(screen.getByText('edited')).toBeInTheDocument();
    });
  });

  describe('Phase 4.5: Synchronized Scrolling', () => {
    test('shows Sync Scroll toggle in Side-by-Side view', () => {
      render(
        <TabbedTranscriptionView
          originalText={originalText}
          enhancedText={enhancedText}
        />
      );
      
      // Switch to Side-by-Side tab
      fireEvent.click(screen.getByRole('tab', { name: /side-by-side/i }));
      
      // Sync Scroll toggle should be visible
      expect(screen.getByTitle(/synchronized scrolling/i)).toBeInTheDocument();
    });

    test('Sync Scroll is enabled by default', () => {
      render(
        <TabbedTranscriptionView
          originalText={originalText}
          enhancedText={enhancedText}
        />
      );
      
      // Switch to Side-by-Side tab
      fireEvent.click(screen.getByRole('tab', { name: /side-by-side/i }));
      
      // Toggle should show enabled state (contains Link2 icon)
      const toggle = screen.getByTitle(/disable synchronized scrolling/i);
      expect(toggle).toBeInTheDocument();
    });

    test('clicking Sync Scroll toggle changes state', () => {
      render(
        <TabbedTranscriptionView
          originalText={originalText}
          enhancedText={enhancedText}
        />
      );
      
      // Switch to Side-by-Side tab
      fireEvent.click(screen.getByRole('tab', { name: /side-by-side/i }));
      
      // Click toggle to disable
      fireEvent.click(screen.getByTitle(/disable synchronized scrolling/i));
      
      // Should now show "enable" title
      expect(screen.getByTitle(/enable synchronized scrolling/i)).toBeInTheDocument();
    });
  });
});

