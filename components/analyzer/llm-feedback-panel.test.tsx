import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { LlmFeedbackRequest, LlmFeedbackResult } from "@/lib/api/llm";
import { LlmFeedbackPanel } from "./llm-feedback-panel";

const request = {
  cv: {
    basics: {
      name: "Mariana Gómez",
      email: "mariana@example.com",
      profiles: [],
      confidence: {
        name: "user_confirmed",
        email: "explicit",
        phone: "inferred",
        location: "inferred",
        url: "inferred",
        profiles: "inferred",
        summary: "inferred",
        datosPersonales: "inferred",
      },
    },
    work: [],
    education: [],
    skills: [],
    projects: [],
    certificates: [],
    languages: [],
    meta: { engineVersion: "2.0.0" },
  },
  job: {
    title: "Backend .NET",
    company: "BuildCv",
    description: "Build APIs",
    location: "Remoto",
    employmentType: "full_time",
    requirements: ["C#", "ASP.NET Core"],
  },
  sessionToggleState: true,
} satisfies LlmFeedbackRequest;

const successData = {
  summary: "Buen encaje técnico para backend .NET.",
  strengths: ["Experiencia explícita en C#"],
  risks: ["Kubernetes aparece como brecha"],
  suggestions: [{ category: "skills", text: "Refuerza Docker con métricas", severity: "medium" }],
  missingKeywords: ["Azure"],
  questions: ["¿Has liderado despliegues productivos?"],
  provider: "fake",
  model: "fake-local-v1",
  generatedAt: "2026-06-28T12:00:00.000Z",
  degraded: false,
} satisfies Extract<LlmFeedbackResult, { state: "success" }>["data"];

describe("LlmFeedbackPanel", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("renders config disabled copy and does not show the CTA", () => {
    render(<LlmFeedbackPanel request={request} configEnabled={false} />);

    expect(screen.getByRole("region", { name: "AI Feedback" })).toBeInTheDocument();
    expect(screen.getByText("Feedback IA desactivado")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Obtener feedback IA" })).not.toBeInTheDocument();
  });

  it("renders the idle CTA when the session toggle is enabled", () => {
    render(<LlmFeedbackPanel request={request} configEnabled onRequest={async () => ({ state: "success", data: successData })} />);

    expect(screen.getByRole("button", { name: "Obtener feedback IA" })).toBeInTheDocument();
  });

  it("shows loading semantics while requesting feedback", async () => {
    const user = userEvent.setup();
    render(<LlmFeedbackPanel request={request} configEnabled onRequest={() => new Promise(() => undefined)} />);

    await user.click(screen.getByRole("button", { name: "Obtener feedback IA" }));

    expect(screen.getByRole("region", { name: "AI Feedback" })).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Generando feedback IA…");
  });

  it("renders all success fields from the 10-field response", async () => {
    const user = userEvent.setup();
    render(<LlmFeedbackPanel request={request} configEnabled onRequest={async () => ({ state: "success", data: successData })} />);

    await user.click(screen.getByRole("button", { name: "Obtener feedback IA" }));

    expect(await screen.findByText(successData.summary)).toBeInTheDocument();
    expect(screen.getByText("Experiencia explícita en C#")).toBeInTheDocument();
    expect(screen.getByText("Kubernetes aparece como brecha")).toBeInTheDocument();
    expect(screen.getByText("Refuerza Docker con métricas")).toBeInTheDocument();
    expect(screen.getByText("Azure")).toBeInTheDocument();
    expect(screen.getByText("¿Has liderado despliegues productivos?")).toBeInTheDocument();
    expect(screen.getByText("fake · fake-local-v1")).toBeInTheDocument();
    expect(screen.getByText("2026-06-28T12:00:00.000Z")).toBeInTheDocument();
    expect(screen.getByText("Feedback completo")).toBeInTheDocument();
  });

  it("renders degraded feedback with a reason and empty-array copy", async () => {
    const user = userEvent.setup();
    render(<LlmFeedbackPanel request={request} configEnabled onRequest={async () => ({ state: "degraded", data: { ...successData, strengths: [], risks: [], suggestions: [], missingKeywords: [], questions: [], degraded: true }, error: { status: 504, kind: "timeout", message: "Timeout del proveedor" } })} />);

    await user.click(screen.getByRole("button", { name: "Obtener feedback IA" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Timeout del proveedor");
    expect(screen.getByText("Sin fortalezas reportadas.")).toBeInTheDocument();
  });

  it("renders unavailable, rate limited, timeout, and generic error states", () => {
    const { rerender } = render(<LlmFeedbackPanel request={request} state={{ state: "unavailable" }} />);
    expect(screen.getByText("Feedback IA no disponible")).toBeInTheDocument();

    rerender(<LlmFeedbackPanel request={request} state={{ state: "rate_limited", retryAfter: "60" }} />);
    expect(screen.getByText(/espera 60 segundos/i)).toBeInTheDocument();

    rerender(<LlmFeedbackPanel request={request} state={{ state: "timeout" }} />);
    expect(screen.getByText("Feedback IA tardó demasiado")).toBeInTheDocument();

    rerender(<LlmFeedbackPanel request={request} state={{ state: "error", message: "Solicitud inválida" }} />);
    expect(screen.getByText("Solicitud inválida")).toBeInTheDocument();
  });

  it("uses native buttons for keyboard toggle and CTA activation", async () => {
    const user = userEvent.setup();
    let calls = 0;
    render(<LlmFeedbackPanel request={request} configEnabled onRequest={async () => { calls += 1; return { state: "success", data: successData }; }} />);

    await user.tab();
    expect(screen.getByRole("button", { name: "Desactivar feedback IA" })).toHaveFocus();
    await user.keyboard(" ");
    expect(screen.getByText("Feedback IA desactivado para esta sesión")).toBeInTheDocument();
    await user.keyboard(" ");
    await user.tab();
    expect(screen.getByRole("button", { name: "Obtener feedback IA" })).toHaveFocus();
    await user.keyboard("{Enter}");

    await waitFor(() => expect(calls).toBe(1));
  });
});
