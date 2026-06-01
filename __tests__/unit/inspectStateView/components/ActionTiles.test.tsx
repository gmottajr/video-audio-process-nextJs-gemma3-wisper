/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ActionTiles } from "@/components/states/InspectStateView/components/ActionTiles";

describe("ActionTiles", () => {
  it("renders 3 tiles for video kind", () => {
    render(
      <ActionTiles kind="video" value="extract" onChange={jest.fn()} />
    );
    expect(screen.getByText("Extract audio")).toBeInTheDocument();
    expect(screen.getByText("Convert container")).toBeInTheDocument();
    expect(screen.getByText("AI transcription")).toBeInTheDocument();
  });

  it("renders 2 tiles for audio kind", () => {
    render(
      <ActionTiles kind="audio" value="convert" onChange={jest.fn()} />
    );
    expect(screen.getByText("Convert format")).toBeInTheDocument();
    expect(screen.getByText("AI transcription")).toBeInTheDocument();
    expect(screen.queryByText("Extract audio")).not.toBeInTheDocument();
  });

  it("calls onChange when a tile is clicked", () => {
    const onChange = jest.fn();
    render(<ActionTiles kind="video" value="extract" onChange={onChange} />);
    fireEvent.click(screen.getByText("AI transcription").closest("button")!);
    expect(onChange).toHaveBeenCalledWith("transcribe");
  });

  it("does not call onChange when disabled", () => {
    const onChange = jest.fn();
    render(
      <ActionTiles kind="video" value="extract" onChange={onChange} disabled />
    );
    fireEvent.click(screen.getByText("AI transcription").closest("button")!);
    expect(onChange).not.toHaveBeenCalled();
  });
});
