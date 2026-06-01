/**
 * @jest-environment jsdom
 */
import { renderHook, act } from "@testing-library/react";
import { useLargeFileBanner } from "@/app/forge/_hooks/useLargeFileBanner";

const LARGE = 500 * 1024 * 1024 + 1; // just over 500 MB

function makeFile(sizeBytes: number, name = "test.mp3"): File {
  const f = new File([""], name, { type: "audio/mp3" });
  Object.defineProperty(f, "size", { value: sizeBytes, writable: false });
  return f;
}

describe("useLargeFileBanner", () => {
  test("dismissed is false initially", () => {
    const { result } = renderHook(() => useLargeFileBanner(null));
    expect(result.current.dismissed).toBe(false);
  });

  test("isLargeFile is false for null file", () => {
    const { result } = renderHook(() => useLargeFileBanner(null));
    expect(result.current.isLargeFile).toBe(false);
  });

  test("isLargeFile is false for small file", () => {
    const { result } = renderHook(() => useLargeFileBanner(makeFile(1024)));
    expect(result.current.isLargeFile).toBe(false);
  });

  test("isLargeFile is true for file over 500 MB", () => {
    const { result } = renderHook(() => useLargeFileBanner(makeFile(LARGE)));
    expect(result.current.isLargeFile).toBe(true);
  });

  test("dismiss() sets dismissed to true", () => {
    const { result } = renderHook(() => useLargeFileBanner(makeFile(LARGE)));
    act(() => { result.current.dismiss(); });
    expect(result.current.dismissed).toBe(true);
  });

  test("dismissed resets when file name changes", () => {
    let file = makeFile(LARGE, "a.mp3");
    const { result, rerender } = renderHook(({ f }) => useLargeFileBanner(f), {
      initialProps: { f: file },
    });
    act(() => { result.current.dismiss(); });
    expect(result.current.dismissed).toBe(true);

    file = makeFile(LARGE, "b.mp3");
    rerender({ f: file });
    expect(result.current.dismissed).toBe(false);
  });
});
