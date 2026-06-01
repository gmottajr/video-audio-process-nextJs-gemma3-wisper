/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ModelTilesGrid } from "@/components/states/InspectStateView/components/ModelTilesGrid";

describe("ModelTilesGrid", () => {
  const defaultProps = {
    selected: "base" as const,
    currentlyLoaded: null,
    onSelect: jest.fn(),
    fastMode: false,
  };

  it("renders all 4 model tiles", () => {
    render(<ModelTilesGrid {...defaultProps} />);
    expect(screen.getByText("Tiny")).toBeInTheDocument();
    expect(screen.getByText("Base")).toBeInTheDocument();
    expect(screen.getByText("Small")).toBeInTheDocument();
    expect(screen.getByText("Distil-Whisper")).toBeInTheDocument();
  });

  it("shows fast mode badge when fastMode is true", () => {
    render(<ModelTilesGrid {...defaultProps} fastMode />);
    expect(screen.getByText("Fast mode · Parallel")).toBeInTheDocument();
  });

  it("does not show fast mode badge when fastMode is false", () => {
    render(<ModelTilesGrid {...defaultProps} />);
    expect(screen.queryByText("Fast mode · Parallel")).not.toBeInTheDocument();
  });

  it("calls onSelect when a model tile is clicked", () => {
    const onSelect = jest.fn();
    render(<ModelTilesGrid {...defaultProps} onSelect={onSelect} />);
    fireEvent.click(screen.getByText("Tiny").closest("button")!);
    expect(onSelect).toHaveBeenCalledWith("tiny");
  });

  it("shows 'Loaded' badge for currently loaded model", () => {
    render(
      <ModelTilesGrid
        {...defaultProps}
        currentlyLoaded="Xenova/whisper-base"
      />
    );
    expect(screen.getByText("Loaded")).toBeInTheDocument();
  });
});
