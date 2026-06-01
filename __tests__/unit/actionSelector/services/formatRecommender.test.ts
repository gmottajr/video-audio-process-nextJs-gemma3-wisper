import { getSmartRecommendation } from "@/components/ActionSelector/services/formatRecommender";

describe("getSmartRecommendation", () => {
  it("recommends speech for meeting-style filenames", () => {
    const result = getSmartRecommendation("team_meeting_2024.mp3", false, "none");
    expect(result).toContain("Speech compression");
  });

  it("recommends studio for podcast-style filenames", () => {
    const result = getSmartRecommendation("my_podcast_ep01.mp3", false, "none");
    expect(result).toContain("Studio compression");
  });

  it("returns full-enhancement message when normalize and compression both active", () => {
    const result = getSmartRecommendation("recording.mp3", true, "speech");
    expect(result).toContain("Full audio enhancement");
  });

  it("returns null for generic filename with no enhancements", () => {
    const result = getSmartRecommendation("audio_file.mp3", false, "none");
    expect(result).toBeNull();
  });

  it("does not trigger speech recommendation when compression is already speech", () => {
    const result = getSmartRecommendation("meeting_notes.mp3", false, "speech");
    expect(result).toBeNull();
  });

  it("does not trigger studio recommendation when compression is already studio", () => {
    const result = getSmartRecommendation("podcast_episode.mp3", false, "studio");
    expect(result).toBeNull();
  });
});
