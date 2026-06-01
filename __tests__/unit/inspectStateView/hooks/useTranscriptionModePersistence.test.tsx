/**
 * @jest-environment jsdom
 */
import { renderHook } from "@testing-library/react";
import { useTranscriptionModePersistence } from "@/components/states/InspectStateView/hooks/useTranscriptionModePersistence";
import { MODE_STORAGE_KEY } from "@/components/states/InspectStateView/types";
import type { TranscriptionMode } from "@/types/fast-mode";

describe("useTranscriptionModePersistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("restores stored 'fast' mode on mount", () => {
    localStorage.setItem(MODE_STORAGE_KEY, "fast");
    const onSelect = jest.fn();
    renderHook(() => useTranscriptionModePersistence("standard", onSelect));
    expect(onSelect).toHaveBeenCalledWith("fast");
  });

  it("does not call onSelect if stored value matches current", () => {
    localStorage.setItem(MODE_STORAGE_KEY, "standard");
    const onSelect = jest.fn();
    renderHook(() => useTranscriptionModePersistence("standard", onSelect));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("does not call onSelect if nothing stored", () => {
    const onSelect = jest.fn();
    renderHook(() => useTranscriptionModePersistence("standard", onSelect));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("persists the selected value to localStorage on change", () => {
    const { rerender } = renderHook(
      ({ mode }) => useTranscriptionModePersistence(mode, jest.fn()),
      { initialProps: { mode: "standard" as TranscriptionMode } }
    );
    expect(localStorage.getItem(MODE_STORAGE_KEY)).toBe("standard");
    rerender({ mode: "fast" });
    expect(localStorage.getItem(MODE_STORAGE_KEY)).toBe("fast");
  });
});
