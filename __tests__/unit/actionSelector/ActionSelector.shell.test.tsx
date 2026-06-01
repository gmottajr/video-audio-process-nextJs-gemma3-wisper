/**
 * @jest-environment jsdom
 */
import React, { createRef } from "react";
import { render, screen } from "@testing-library/react";
import "@/components/ActionSelector/index";
import { ActionSelector } from "@/components/ActionSelector/ActionSelector";
import type { ActionSelectorHandle } from "@/components/ActionSelector/types";

jest.mock("@/utils/audioExtraction", () => ({
  extractAudioFromVideo: jest.fn(),
}));

jest.mock("wavesurfer.js", () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => ({
      on: jest.fn(),
      destroy: jest.fn(),
      load: jest.fn().mockResolvedValue(undefined),
      getDuration: jest.fn().mockReturnValue(0),
      play: jest.fn(),
      pause: jest.fn(),
      isPlaying: jest.fn().mockReturnValue(false),
      setZoom: jest.fn(),
    })),
  },
}));

jest.mock("wavesurfer.js/dist/plugins/regions.js", () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => ({
      on: jest.fn(),
      addRegion: jest.fn(),
      enableDragSelection: jest.fn(),
      destroy: jest.fn(),
    })),
  },
}));

const makeFile = (name: string, type: string) => new File([""], name, { type });
const noop = () => {};

describe("ActionSelector shell", () => {
  it("renders for video file + extract mode without crashing", () => {
    const { container } = render(
      <ActionSelector
        file={makeFile("clip.mp4", "video/mp4")}
        onAction={noop}
        disabled={false}
        videoMode="extract"
        hideInternalTabs
        hideHeader
        hideActionButton
      />,
    );
    expect(container.firstChild).not.toBeNull();
  });

  it("renders for video file + convert mode without crashing", () => {
    const { container } = render(
      <ActionSelector
        file={makeFile("clip.mp4", "video/mp4")}
        onAction={noop}
        disabled={false}
        videoMode="convert"
        hideInternalTabs
        hideHeader
        hideActionButton
      />,
    );
    expect(container.firstChild).not.toBeNull();
  });

  it("renders for video file + transcribe mode without crashing", () => {
    const { container } = render(
      <ActionSelector
        file={makeFile("clip.mp4", "video/mp4")}
        onAction={noop}
        disabled={false}
        videoMode="transcribe"
        hideInternalTabs
        hideHeader
        hideActionButton
      />,
    );
    expect(container.firstChild).not.toBeNull();
  });

  it("renders for audio file without crashing", () => {
    const { container } = render(
      <ActionSelector
        file={makeFile("song.mp3", "audio/mp3")}
        onAction={noop}
        disabled={false}
        hideHeader
        hideActionButton
      />,
    );
    expect(container.firstChild).not.toBeNull();
  });

  it("shows Unsupported File Type error for unknown file", () => {
    render(
      <ActionSelector
        file={makeFile("doc.pdf", "application/pdf")}
        onAction={noop}
        disabled={false}
      />,
    );
    expect(screen.getByText("Unsupported File Type")).toBeInTheDocument();
  });

  it("exposes triggerAction via ref that fires onAction", () => {
    const onAction = jest.fn();
    const ref = createRef<ActionSelectorHandle>();
    render(
      <ActionSelector
        ref={ref}
        file={makeFile("clip.mp4", "video/mp4")}
        onAction={onAction}
        disabled={false}
        videoMode="extract"
        hideInternalTabs
        hideHeader
        hideActionButton
      />,
    );
    ref.current?.triggerAction();
    expect(onAction).toHaveBeenCalledWith("extract", expect.any(String), expect.any(Object));
  });
});
