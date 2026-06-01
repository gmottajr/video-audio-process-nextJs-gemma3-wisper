import { transcribeActionTile } from "@/components/states/InspectStateView/strategies/actionTile/transcribe";

describe("transcribeActionTile strategy", () => {
  it("id is 'transcribe'", () => {
    expect(transcribeActionTile.id).toBe("transcribe");
  });

  it("applicableTo both video and audio", () => {
    expect(transcribeActionTile.applicableTo).toContain("video");
    expect(transcribeActionTile.applicableTo).toContain("audio");
  });

  it("getTile returns expected config", () => {
    for (const kind of ["video", "audio"] as const) {
      const tile = transcribeActionTile.getTile(kind);
      expect(tile.title).toBe("AI transcription");
      expect(tile.sub).toBe("Speech-to-text via Whisper");
      expect(tile.icon).toBeTruthy();
    }
  });
});
