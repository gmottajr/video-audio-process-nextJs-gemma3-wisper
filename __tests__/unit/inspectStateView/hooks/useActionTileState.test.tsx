/**
 * @jest-environment jsdom
 */
import { renderHook, act } from "@testing-library/react";
import { useActionTileState } from "@/components/states/InspectStateView/hooks/useActionTileState";

describe("useActionTileState", () => {
  it("defaults to 'convert' for audio kind", () => {
    const { result } = renderHook(() => useActionTileState("audio"));
    expect(result.current.actionTile).toBe("convert");
  });

  it("defaults to 'extract' for video kind", () => {
    const { result } = renderHook(() => useActionTileState("video"));
    expect(result.current.actionTile).toBe("extract");
  });

  it("defaults to 'extract' for unknown kind", () => {
    const { result } = renderHook(() => useActionTileState("unknown"));
    expect(result.current.actionTile).toBe("extract");
  });

  it("setActionTile updates the value", () => {
    const { result } = renderHook(() => useActionTileState("video"));
    act(() => result.current.setActionTile("transcribe"));
    expect(result.current.actionTile).toBe("transcribe");
  });
});
