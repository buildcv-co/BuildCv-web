import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import {
  WebVitalsReporter,
  __resetWebVitalsReporterStateForTests,
} from "./web-vitals-reporter";

const mockUseReportWebVitals = vi.fn();

vi.mock("@/lib/observability/use-report-web-vitals", () => ({
  useReportWebVitals: () => mockUseReportWebVitals(),
}));

describe("WebVitalsReporter", () => {
  beforeEach(() => {
    mockUseReportWebVitals.mockClear();
    __resetWebVitalsReporterStateForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("es un client component que monta useReportWebVitals", () => {
    const { container } = render(<WebVitalsReporter />);
    expect(container).toBeEmptyDOMElement();
    expect(mockUseReportWebVitals).toHaveBeenCalledTimes(1);
  });

  it("NO renderiza nada visible (es un side-effect mount)", () => {
    const { container } = render(<WebVitalsReporter />);
    expect(container.firstChild).toBeNull();
  });
});
