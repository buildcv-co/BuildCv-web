import { describe, expect, it, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useSessionToggle } from "./use-session-toggle";

describe("useSessionToggle", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  it("defaults to enabled and writes the configured sessionStorage key", () => {
    const { result } = renderHook(() => useSessionToggle("buildcv.llmFeedback.enabled", true));

    expect(result.current.enabled).toBe(true);

    act(() => result.current.setEnabled(false));

    expect(window.sessionStorage.getItem("buildcv.llmFeedback.enabled")).toBe("false");
    expect(window.localStorage.getItem("buildcv.llmFeedback.enabled")).toBeNull();
  });

  it("reads the persisted value within the same browser session", () => {
    window.sessionStorage.setItem("buildcv.llmFeedback.enabled", "false");

    const { result } = renderHook(() => useSessionToggle("buildcv.llmFeedback.enabled", true));

    expect(result.current.enabled).toBe(false);
  });

  it("resets to the default when sessionStorage no longer has the key", () => {
    window.sessionStorage.setItem("buildcv.llmFeedback.enabled", "false");
    window.sessionStorage.clear();

    const { result } = renderHook(() => useSessionToggle("buildcv.llmFeedback.enabled", true));

    expect(result.current.enabled).toBe(true);
  });
});
