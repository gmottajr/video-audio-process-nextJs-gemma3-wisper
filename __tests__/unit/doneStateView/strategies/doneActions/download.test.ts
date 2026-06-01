/**
 * Unit: download done-action strategy
 */

import download from "@/components/states/DoneStateView/strategies/doneActions/download";
import type { DoneActionContext } from "@/components/states/DoneStateView/types";

const base: DoneActionContext = {
  result: { type: "audio", blobUrl: "blob:test", metadata: {} } as any,
  file: new File(["x"], "test.wav", { type: "audio/wav" }),
  format: { name: "WAV" },
  onDownload: jest.fn(),
  onReset: jest.fn(),
  showStats: false,
  setShowStats: jest.fn(),
  waveformSelection: null,
};

describe("download strategy", () => {
  test("id is 'download'", () => {
    expect(download.id).toBe("download");
  });

  test("label returns 'Download WAV' when format is set", () => {
    expect(download.label(base)).toBe("Download WAV");
  });

  test("label returns 'Download' when format is null", () => {
    expect(download.label({ ...base, format: null })).toBe("Download");
  });

  test("isEnabled true for audio with blobUrl", () => {
    expect(download.isEnabled(base)).toBe(true);
  });

  test("isEnabled false for transcription result", () => {
    expect(
      download.isEnabled({ ...base, result: { type: "transcription", metadata: {} } as any })
    ).toBe(false);
  });

  test("isEnabled false when blobUrl is absent", () => {
    expect(
      download.isEnabled({ ...base, result: { type: "audio", blobUrl: undefined, metadata: {} } as any })
    ).toBe(false);
  });

  test("onInvoke calls onDownload", () => {
    const onDownload = jest.fn();
    download.onInvoke({ ...base, onDownload });
    expect(onDownload).toHaveBeenCalledTimes(1);
  });
});
