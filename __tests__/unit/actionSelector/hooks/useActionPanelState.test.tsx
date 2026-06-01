/**
 * @jest-environment jsdom
 */
import { renderHook, act } from "@testing-library/react";
import { useActionPanelState } from "@/components/ActionSelector/hooks/useActionPanelState";

const makeFile = (name = "test.mp3", type = "audio/mp3") => new File([""], name, { type });

describe("useActionPanelState", () => {
  it("returns default state for audio file in standard mode", () => {
    const file = makeFile();
    const { result } = renderHook(() => useActionPanelState(file, "standard"));
    const { state } = result.current;
    expect(state.normalizeAudio).toBe(false);
    expect(state.compressionType).toBe("none");
    expect(state.waveformSelection).toBeNull();
    expect(state.audioDuration).toBe(0);
    expect(typeof state.selectedAudioFormat).toBe("string");
  });

  it("resets enhancements to off when transcriptionMode is fast", () => {
    const file = makeFile();
    const { result, rerender } = renderHook(
      ({ mode }: { mode: "standard" | "fast" }) => useActionPanelState(file, mode),
      { initialProps: { mode: "standard" as "standard" | "fast" } },
    );

    act(() => {
      result.current.patch({ normalizeAudio: true, compressionType: "speech" });
    });
    expect(result.current.state.normalizeAudio).toBe(true);

    rerender({ mode: "fast" });
    expect(result.current.state.compressionType).toBe("none");
    expect(result.current.state.normalizeAudio).toBe(false);
  });

  it("patch updates individual state fields", () => {
    const file = makeFile();
    const { result } = renderHook(() => useActionPanelState(file, "standard"));

    act(() => {
      result.current.patch({ selectedAudioFormat: "ogg" });
    });
    expect(result.current.state.selectedAudioFormat).toBe("ogg");

    act(() => {
      result.current.patch({ normalizeAudio: true });
    });
    expect(result.current.state.normalizeAudio).toBe(true);

    act(() => {
      result.current.patch({ compressionType: "studio" });
    });
    expect(result.current.state.compressionType).toBe("studio");
  });

  it("audioUrl is null for video files", () => {
    const videoFile = makeFile("clip.mp4", "video/mp4");
    const { result } = renderHook(() => useActionPanelState(videoFile, "standard"));
    expect(result.current.audioUrl).toBeNull();
  });
});
