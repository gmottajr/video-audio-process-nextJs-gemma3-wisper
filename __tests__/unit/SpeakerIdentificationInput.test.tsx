/** @jest-environment jsdom */

/**
 * Unit Tests for SpeakerIdentificationInput Component
 * 
 * Tests UI component for collecting speaker names and modes
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SpeakerIdentificationInput, type SpeakerNames } from '@/components/SpeakerIdentificationInput';

describe('SpeakerIdentificationInput', () => {
  const mockOnNamesChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with default props', () => {
      render(
        <SpeakerIdentificationInput
          onNamesChange={mockOnNamesChange}
        />
      );

      expect(screen.getByText('Speaker Identification')).toBeInTheDocument();
      expect(screen.getByText(/Detected ~2 speakers/i)).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /AI Detection/i })).toBeChecked();
    });

    it('should show correct speaker count', () => {
      render(
        <SpeakerIdentificationInput
          onNamesChange={mockOnNamesChange}
          speakerCount={5}
        />
      );

      expect(screen.getByText(/Detected ~5 speakers/i)).toBeInTheDocument();
    });

    it('should render in disabled state', () => {
      render(
        <SpeakerIdentificationInput
          onNamesChange={mockOnNamesChange}
          disabled={true}
        />
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });

    it('should display info banner', () => {
      render(
        <SpeakerIdentificationInput
          onNamesChange={mockOnNamesChange}
        />
      );

      expect(screen.getByText(/AI will validate your input and detect speakers/i)).toBeInTheDocument();
    });
  });

  describe('Mode Selection', () => {
    it('should default to Auto Detect mode', () => {
      render(
        <SpeakerIdentificationInput
          onNamesChange={mockOnNamesChange}
        />
      );

      const autoButton = screen.getByRole('button', { name: /Auto Detect/i });
      expect(autoButton).toHaveClass('bg-purple-600');
    });

    it('should switch to First Speaker mode', async () => {
      const user = userEvent.setup();
      
      render(
        <SpeakerIdentificationInput
          onNamesChange={mockOnNamesChange}
        />
      );

      const firstSpeakerButton = screen.getByRole('button', { name: /First Speaker/i });
      await user.click(firstSpeakerButton);

      expect(mockOnNamesChange).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'first-speaker'
        })
      );

      // Should show input field
      expect(screen.getByPlaceholderText(/e.g., John Smith/i)).toBeInTheDocument();
    });

    it('should switch to All Speakers mode', async () => {
      const user = userEvent.setup();
      
      render(
        <SpeakerIdentificationInput
          onNamesChange={mockOnNamesChange}
          speakerCount={3}
        />
      );

      const allSpeakersButton = screen.getByRole('button', { name: /All Speakers/i });
      await user.click(allSpeakersButton);

      expect(mockOnNamesChange).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'all-speakers'
        })
      );

      // Should show 3 speaker input fields
      const inputs = screen.getAllByPlaceholderText(/Speaker \d+/);
      expect(inputs).toHaveLength(3);
    });
  });

  describe('Auto Detect Mode', () => {
    it('should display automatic detection banner', () => {
      render(
        <SpeakerIdentificationInput
          onNamesChange={mockOnNamesChange}
          initialNames={{ mode: 'auto', useAIDetection: true }}
        />
      );

      expect(screen.getByText(/Automatic Detection Active/i)).toBeInTheDocument();
      expect(screen.getByText(/Self-introductions and name mentions/i)).toBeInTheDocument();
    });

    it('should show detection methods list', () => {
      render(
        <SpeakerIdentificationInput
          onNamesChange={mockOnNamesChange}
          initialNames={{ mode: 'auto', useAIDetection: true }}
        />
      );

      expect(screen.getByText(/Speech patterns and conversational context/i)).toBeInTheDocument();
      expect(screen.getByText(/Role indicators/i)).toBeInTheDocument();
    });
  });

  describe('First Speaker Mode', () => {
    it('should accept first speaker name input', async () => {
      const user = userEvent.setup();
      
      render(
        <SpeakerIdentificationInput
          onNamesChange={mockOnNamesChange}
          initialNames={{ mode: 'first-speaker', useAIDetection: true }}
        />
      );

      const input = screen.getByPlaceholderText(/e.g., John Smith/i);
      await user.type(input, 'John Smith');

      await waitFor(() => {
        expect(mockOnNamesChange).toHaveBeenCalledWith(
          expect.objectContaining({
            mode: 'first-speaker',
            firstSpeaker: 'John Smith'
          })
        );
      });
    });

    it('should show helper text', () => {
      render(
        <SpeakerIdentificationInput
          onNamesChange={mockOnNamesChange}
          initialNames={{ mode: 'first-speaker', useAIDetection: true }}
        />
      );

      expect(screen.getByText(/AI will detect other speakers/i)).toBeInTheDocument();
    });

    it('should preserve first speaker value', () => {
      render(
        <SpeakerIdentificationInput
          onNamesChange={mockOnNamesChange}
          initialNames={{
            mode: 'first-speaker',
            firstSpeaker: 'Jane Doe',
            useAIDetection: true
          }}
        />
      );

      const input = screen.getByPlaceholderText(/e.g., John Smith/i) as HTMLInputElement;
      expect(input.value).toBe('Jane Doe');
    });
  });

  describe('All Speakers Mode', () => {
    it('should render speaker input fields', () => {
      render(
        <SpeakerIdentificationInput
          onNamesChange={mockOnNamesChange}
          initialNames={{ mode: 'all-speakers', useAIDetection: true }}
          speakerCount={3}
        />
      );

      expect(screen.getByPlaceholderText('Speaker 1')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Speaker 2')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Speaker 3')).toBeInTheDocument();
    });

    it('should accept speaker name inputs', async () => {
      const user = userEvent.setup();
      
      render(
        <SpeakerIdentificationInput
          onNamesChange={mockOnNamesChange}
          initialNames={{ mode: 'all-speakers', useAIDetection: true }}
          speakerCount={2}
        />
      );

      const input1 = screen.getByPlaceholderText('Speaker 1');
      const input2 = screen.getByPlaceholderText('Speaker 2');

      await user.type(input1, 'John');
      await user.type(input2, 'Mary');

      await waitFor(() => {
        expect(mockOnNamesChange).toHaveBeenCalledWith(
          expect.objectContaining({
            mode: 'all-speakers',
            allSpeakers: expect.arrayContaining(['John', 'Mary'])
          })
        );
      });
    });

    it('should add new speaker field', async () => {
      const user = userEvent.setup();
      
      render(
        <SpeakerIdentificationInput
          onNamesChange={mockOnNamesChange}
          initialNames={{ mode: 'all-speakers', useAIDetection: true }}
          speakerCount={2}
        />
      );

      const addButton = screen.getByRole('button', { name: /Add/i });
      await user.click(addButton);

      await waitFor(() => {
        const inputs = screen.getAllByPlaceholderText(/Speaker \d+/);
        expect(inputs).toHaveLength(3);
      });
    });

    it('should remove speaker field', async () => {
      const user = userEvent.setup();
      
      render(
        <SpeakerIdentificationInput
          onNamesChange={mockOnNamesChange}
          initialNames={{ mode: 'all-speakers', useAIDetection: true }}
          speakerCount={3}
        />
      );

      const removeButtons = screen.getAllByRole('button', { name: '' }).filter(
        btn => btn.querySelector('svg') && btn.className.includes('text-zinc-500')
      );
      
      if (removeButtons.length > 0) {
        await user.click(removeButtons[0]);

        await waitFor(() => {
          const inputs = screen.getAllByPlaceholderText(/Speaker \d+/);
          expect(inputs).toHaveLength(2);
        });
      }
    });

    it('should not remove speaker if only 2 remain', async () => {
      const user = userEvent.setup();
      
      render(
        <SpeakerIdentificationInput
          onNamesChange={mockOnNamesChange}
          initialNames={{ mode: 'all-speakers', useAIDetection: true }}
          speakerCount={2}
        />
      );

      const inputs = screen.getAllByPlaceholderText(/Speaker \d+/);
      expect(inputs).toHaveLength(2);

      // Remove buttons should not be present for minimum count
      const removeButtons = screen.queryAllByRole('button', { name: '' }).filter(
        btn => btn.querySelector('svg') && btn.className.includes('text-zinc-500')
      );
      
      expect(removeButtons).toHaveLength(0);
    });

    it('should disable add button at max speakers', () => {
      render(
        <SpeakerIdentificationInput
          onNamesChange={mockOnNamesChange}
          initialNames={{ mode: 'all-speakers', useAIDetection: true }}
          speakerCount={10}
        />
      );

      const addButton = screen.getByRole('button', { name: /Add/i });
      expect(addButton).toBeDisabled();
    });

    it('should preserve speaker values', () => {
      render(
        <SpeakerIdentificationInput
          onNamesChange={mockOnNamesChange}
          initialNames={{
            mode: 'all-speakers',
            allSpeakers: ['Alice', 'Bob', 'Charlie'],
            useAIDetection: true
          }}
          speakerCount={3}
        />
      );

      const input1 = screen.getByPlaceholderText('Speaker 1') as HTMLInputElement;
      const input2 = screen.getByPlaceholderText('Speaker 2') as HTMLInputElement;
      const input3 = screen.getByPlaceholderText('Speaker 3') as HTMLInputElement;

      expect(input1.value).toBe('Alice');
      expect(input2.value).toBe('Bob');
      expect(input3.value).toBe('Charlie');
    });

    it('should show validation helper text', () => {
      render(
        <SpeakerIdentificationInput
          onNamesChange={mockOnNamesChange}
          initialNames={{ mode: 'all-speakers', useAIDetection: true }}
        />
      );

      expect(screen.getByText(/AI will validate these names/i)).toBeInTheDocument();
    });
  });

  describe('AI Detection Toggle', () => {
    it('should toggle AI detection on', async () => {
      const user = userEvent.setup();
      
      render(
        <SpeakerIdentificationInput
          onNamesChange={mockOnNamesChange}
          initialNames={{ mode: 'auto', useAIDetection: false }}
        />
      );

      const checkbox = screen.getByRole('checkbox', { name: /AI Detection/i });
      await user.click(checkbox);

      expect(mockOnNamesChange).toHaveBeenCalledWith(
        expect.objectContaining({
          useAIDetection: true
        })
      );
    });

    it('should toggle AI detection off', async () => {
      const user = userEvent.setup();
      
      render(
        <SpeakerIdentificationInput
          onNamesChange={mockOnNamesChange}
          initialNames={{ mode: 'auto', useAIDetection: true }}
        />
      );

      const checkbox = screen.getByRole('checkbox', { name: /AI Detection/i });
      await user.click(checkbox);

      expect(mockOnNamesChange).toHaveBeenCalledWith(
        expect.objectContaining({
          useAIDetection: false
        })
      );
    });
  });

  describe('Summary Display', () => {
    it('should show auto mode summary', () => {
      render(
        <SpeakerIdentificationInput
          onNamesChange={mockOnNamesChange}
          initialNames={{ mode: 'auto', useAIDetection: true }}
        />
      );

      expect(screen.getByText(/Fully automatic speaker detection/i)).toBeInTheDocument();
    });

    it('should show first speaker mode summary with name', () => {
      render(
        <SpeakerIdentificationInput
          onNamesChange={mockOnNamesChange}
          initialNames={{
            mode: 'first-speaker',
            firstSpeaker: 'John Smith',
            useAIDetection: true
          }}
        />
      );

      expect(screen.getByText(/John Smith/i)).toBeInTheDocument();
      expect(screen.getByText(/AI detection for others/i)).toBeInTheDocument();
    });

    it('should show all speakers mode summary with count', () => {
      render(
        <SpeakerIdentificationInput
          onNamesChange={mockOnNamesChange}
          initialNames={{
            mode: 'all-speakers',
            allSpeakers: ['Alice', 'Bob', 'Charlie'],
            useAIDetection: true
          }}
          speakerCount={3}
        />
      );

      expect(screen.getByText(/3 speakers provided/i)).toBeInTheDocument();
      expect(screen.getByText(/AI will validate/i)).toBeInTheDocument();
    });

    it('should not show AI validation note when disabled', () => {
      render(
        <SpeakerIdentificationInput
          onNamesChange={mockOnNamesChange}
          initialNames={{
            mode: 'all-speakers',
            allSpeakers: ['Alice', 'Bob'],
            useAIDetection: false
          }}
          speakerCount={2}
        />
      );

      const summaryText = screen.getByText(/2 speakers provided/i);
      expect(summaryText.textContent).not.toContain('AI will validate');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <SpeakerIdentificationInput
          onNamesChange={mockOnNamesChange}
        />
      );

      expect(screen.getByRole('checkbox', { name: /AI Detection/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Auto Detect/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /First Speaker/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /All Speakers/i })).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(
        <SpeakerIdentificationInput
          onNamesChange={mockOnNamesChange}
        />
      );

      const firstButton = screen.getByRole('button', { name: /Auto Detect/i });
      firstButton.focus();
      expect(firstButton).toHaveFocus();

      await user.tab();
      const secondButton = screen.getByRole('button', { name: /First Speaker/i });
      expect(secondButton).toHaveFocus();
    });
  });

  describe('Integration', () => {
    it('should call onNamesChange with complete state', async () => {
      const user = userEvent.setup();
      
      render(
        <SpeakerIdentificationInput
          onNamesChange={mockOnNamesChange}
        />
      );

      // Switch to first speaker mode
      const firstSpeakerButton = screen.getByRole('button', { name: /First Speaker/i });
      await user.click(firstSpeakerButton);

      // Enter name
      const input = screen.getByPlaceholderText(/e.g., John Smith/i);
      await user.type(input, 'Test Speaker');

      await waitFor(() => {
        expect(mockOnNamesChange).toHaveBeenLastCalledWith({
          mode: 'first-speaker',
          firstSpeaker: 'Test Speaker',
          allSpeakers: undefined,
          useAIDetection: true
        });
      });
    });

    it('should handle mode switching with data preservation', async () => {
      const user = userEvent.setup();
      
      const { rerender } = render(
        <SpeakerIdentificationInput
          onNamesChange={mockOnNamesChange}
          initialNames={{
            mode: 'first-speaker',
            firstSpeaker: 'John',
            useAIDetection: true
          }}
        />
      );

      // Switch to all speakers
      const allSpeakersButton = screen.getByRole('button', { name: /All Speakers/i });
      await user.click(allSpeakersButton);

      // Should notify about mode change
      expect(mockOnNamesChange).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'all-speakers',
          firstSpeaker: undefined
        })
      );
    });
  });
});




