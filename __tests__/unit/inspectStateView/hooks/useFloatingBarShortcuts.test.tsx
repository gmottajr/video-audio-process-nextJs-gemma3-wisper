/**
 * @jest-environment jsdom
 */
import { renderHook } from "@testing-library/react";
import { useFloatingBarShortcuts } from "@/components/states/InspectStateView/hooks/useFloatingBarShortcuts";

function fireKey(key: string, target?: HTMLElement) {
  const event = new KeyboardEvent("keydown", { key, bubbles: true });
  if (target) {
    Object.defineProperty(event, "target", { value: target, writable: false });
  }
  window.dispatchEvent(event);
}

describe("useFloatingBarShortcuts", () => {
  it("calls onBack on ArrowLeft", () => {
    const onBack = jest.fn();
    const triggerAction = jest.fn();
    renderHook(() =>
      useFloatingBarShortcuts({ isTranscribing: false, onBack, triggerAction })
    );
    fireKey("ArrowLeft");
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("calls onBack on '1'", () => {
    const onBack = jest.fn();
    renderHook(() =>
      useFloatingBarShortcuts({ isTranscribing: false, onBack, triggerAction: jest.fn() })
    );
    fireKey("1");
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("calls triggerAction on ArrowRight", () => {
    const triggerAction = jest.fn();
    renderHook(() =>
      useFloatingBarShortcuts({ isTranscribing: false, onBack: jest.fn(), triggerAction })
    );
    fireKey("ArrowRight");
    expect(triggerAction).toHaveBeenCalledTimes(1);
  });

  it("calls triggerAction on Enter", () => {
    const triggerAction = jest.fn();
    renderHook(() =>
      useFloatingBarShortcuts({ isTranscribing: false, onBack: jest.fn(), triggerAction })
    );
    fireKey("Enter");
    expect(triggerAction).toHaveBeenCalledTimes(1);
  });

  it("does not fire when isTranscribing is true", () => {
    const onBack = jest.fn();
    const triggerAction = jest.fn();
    renderHook(() =>
      useFloatingBarShortcuts({ isTranscribing: true, onBack, triggerAction })
    );
    fireKey("ArrowLeft");
    fireKey("ArrowRight");
    expect(onBack).not.toHaveBeenCalled();
    expect(triggerAction).not.toHaveBeenCalled();
  });
});
