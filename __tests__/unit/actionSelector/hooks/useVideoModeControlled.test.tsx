/**
 * @jest-environment jsdom
 */
import { renderHook, act } from "@testing-library/react";
import { useVideoModeControlled } from "@/components/ActionSelector/hooks/useVideoModeControlled";

describe("useVideoModeControlled", () => {
  it("uncontrolled: returns 'extract' as default", () => {
    const { result } = renderHook(() => useVideoModeControlled(undefined, undefined));
    expect(result.current.videoMode).toBe("extract");
  });

  it("uncontrolled: setVideoMode updates internal state", () => {
    const { result } = renderHook(() => useVideoModeControlled(undefined, undefined));
    act(() => result.current.setVideoMode("convert"));
    expect(result.current.videoMode).toBe("convert");
  });

  it("controlled: returns the prop value", () => {
    const { result } = renderHook(() => useVideoModeControlled("transcribe", undefined));
    expect(result.current.videoMode).toBe("transcribe");
  });

  it("controlled: setVideoMode fires onVideoModeChange without touching internal state", () => {
    const onChange = jest.fn();
    const { result } = renderHook(() => useVideoModeControlled("extract", onChange));
    act(() => result.current.setVideoMode("convert"));
    expect(onChange).toHaveBeenCalledWith("convert");
    // prop value still 'extract' — parent controls the value
    expect(result.current.videoMode).toBe("extract");
  });
});
