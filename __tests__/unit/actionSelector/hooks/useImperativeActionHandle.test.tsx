/**
 * @jest-environment jsdom
 */
import { createRef } from "react";
import { renderHook } from "@testing-library/react";
import { useImperativeActionHandle } from "@/components/ActionSelector/hooks/useImperativeActionHandle";
import type { ActionSelectorHandle } from "@/components/ActionSelector/types";

describe("useImperativeActionHandle", () => {
  it("exposes triggerAction via ref that calls the provided function", () => {
    const ref = createRef<ActionSelectorHandle>();
    const triggerFn = jest.fn();

    renderHook(() => useImperativeActionHandle(ref, triggerFn));

    ref.current?.triggerAction();
    expect(triggerFn).toHaveBeenCalledTimes(1);
  });

  it("updates ref when triggerFn changes", () => {
    const ref = createRef<ActionSelectorHandle>();
    const first = jest.fn();
    const second = jest.fn();

    const { rerender } = renderHook(
      ({ fn }: { fn: () => void }) => useImperativeActionHandle(ref, fn),
      { initialProps: { fn: first } },
    );

    rerender({ fn: second });
    ref.current?.triggerAction();
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
  });
});
