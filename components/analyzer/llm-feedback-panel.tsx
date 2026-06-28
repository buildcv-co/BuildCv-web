"use client";

import { useState } from "react";
import { fetchLlmFeedback, type LlmFeedbackRequest, type LlmFeedbackResponse, type LlmFeedbackResult } from "@/lib/api/llm";
import { copy } from "@/lib/copy/es";
import { useSessionToggle } from "@/lib/use-session-toggle";

const SESSION_KEY = "buildcv.llmFeedback.enabled";

export type LlmFeedbackPanelState =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "success"; data: LlmFeedbackResponse }
  | { state: "degraded"; data: LlmFeedbackResponse; reason: string }
  | { state: "disabled" }
  | { state: "unavailable" }
  | { state: "rate_limited"; retryAfter?: string }
  | { state: "timeout" }
  | { state: "error"; message: string };

interface LlmFeedbackPanelProps {
  readonly request: LlmFeedbackRequest;
  readonly configEnabled?: boolean;
  readonly state?: LlmFeedbackPanelState;
  readonly onRequest?: (request: LlmFeedbackRequest) => Promise<LlmFeedbackResult>;
}

export function LlmFeedbackPanel({
  request,
  configEnabled = true,
  state,
  onRequest = fetchLlmFeedback,
}: LlmFeedbackPanelProps) {
  const { enabled, setEnabled } = useSessionToggle(SESSION_KEY, true);
  const [internalState, setInternalState] = useState<LlmFeedbackPanelState>({ state: "idle" });
  const current = state ?? (configEnabled && enabled ? internalState : { state: "disabled" });
  const busy = current.state === "loading";
  const disabledBySession = configEnabled && !enabled;

  async function requestFeedback() {
    setInternalState({ state: "loading" });
    const result = await onRequest({ ...request, sessionToggleState: enabled });
    setInternalState(panelStateFromResult(result));
  }

  return (
    <section
      role="region"
      aria-label={copy.analyze.llmFeedback.ariaLabel}
      aria-busy={busy}
      className="rounded-3xl border border-line bg-surface/70 p-5 shadow-soft"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">{copy.analyze.llmFeedback.title}</p>
          <p className="mt-2 text-sm text-muted">{copy.analyze.llmFeedback.disclaimer}</p>
        </div>
        {configEnabled && (
          <button type="button" onClick={() => setEnabled(!enabled)} className="rounded-full border border-line px-3 py-2 text-xs text-ink">
            {enabled ? copy.analyze.llmFeedback.toggleOff : copy.analyze.llmFeedback.toggleOn}
          </button>
        )}
      </div>

      <div aria-live="polite" className="mt-5 space-y-4">
        {renderState(current, disabledBySession, requestFeedback)}
      </div>
    </section>
  );
}

function panelStateFromResult(result: LlmFeedbackResult): LlmFeedbackPanelState {
  if (result.state === "success") return { state: "success", data: result.data };
  if (result.state === "degraded") return { state: "degraded", data: result.data, reason: result.error?.message ?? copy.analyze.llmFeedback.degraded };
  if (result.state === "rate_limited") return { state: "rate_limited", retryAfter: result.error.retryAfter };
  if (result.state === "timeout") return { state: "timeout" };
  if (result.state === "disabled") return { state: "disabled" };
  if (result.state === "unavailable") return { state: "unavailable" };
  return { state: "error", message: result.error.message };
}

function renderState(state: LlmFeedbackPanelState, disabledBySession: boolean, requestFeedback: () => void) {
  if (state.state === "disabled") {
    return (
      <div>
        <h3 className="font-display text-xl">{disabledBySession ? copy.analyze.llmFeedback.disabledSession : copy.analyze.llmFeedback.disabledTitle}</h3>
        <p className="mt-2 text-sm text-muted">{copy.analyze.llmFeedback.disabledBody}</p>
      </div>
    );
  }
  if (state.state === "idle") {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted">{copy.analyze.llmFeedback.idleBody}</p>
        <button type="button" onClick={requestFeedback} className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black">
          {copy.analyze.llmFeedback.cta}
        </button>
      </div>
    );
  }
  if (state.state === "loading") return <p role="status" className="text-sm text-muted">{copy.analyze.llmFeedback.loading}</p>;
  if (state.state === "success") return <Feedback data={state.data} degraded={false} />;
  if (state.state === "degraded") return <Feedback data={state.data} degraded reason={state.reason} />;
  if (state.state === "rate_limited") {
    return <Message title={copy.analyze.llmFeedback.rateLimited} body={state.retryAfter ? copy.analyze.llmFeedback.retryAfter(state.retryAfter) : undefined} />;
  }
  if (state.state === "timeout") return <Message title={copy.analyze.llmFeedback.timeout} />;
  if (state.state === "unavailable") return <Message title={copy.analyze.llmFeedback.unavailable} />;
  return <Message title={state.message} />;
}

function Feedback({ data, degraded, reason }: { readonly data: LlmFeedbackResponse; readonly degraded: boolean; readonly reason?: string }) {
  return (
    <div className="space-y-4">
      {degraded ? <div role="alert" className="rounded-2xl border border-amber-400/40 p-3 text-sm text-amber-100">{reason ?? copy.analyze.llmFeedback.degraded}</div> : <p className="text-xs font-semibold text-accent">{copy.analyze.llmFeedback.complete}</p>}
      <Group title={copy.analyze.llmFeedback.labels.summary} items={[data.summary]} />
      <Group title={copy.analyze.llmFeedback.labels.strengths} items={data.strengths} empty={copy.analyze.llmFeedback.empty.strengths} />
      <Group title={copy.analyze.llmFeedback.labels.risks} items={data.risks} empty={copy.analyze.llmFeedback.empty.risks} />
      <Group title={copy.analyze.llmFeedback.labels.suggestions} items={data.suggestions.map((item) => item.text)} empty={copy.analyze.llmFeedback.empty.suggestions} />
      <Group title={copy.analyze.llmFeedback.labels.missingKeywords} items={data.missingKeywords} empty={copy.analyze.llmFeedback.empty.missingKeywords} />
      <Group title={copy.analyze.llmFeedback.labels.questions} items={data.questions} empty={copy.analyze.llmFeedback.empty.questions} />
      <p className="font-mono text-xs text-faint">{data.provider} · {data.model}</p>
      <p className="font-mono text-xs text-faint">{data.generatedAt}</p>
    </div>
  );
}

function Group({ title, items, empty }: { readonly title: string; readonly items: readonly string[]; readonly empty?: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {items.length > 0 ? <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">{items.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="mt-2 text-sm text-faint">{empty}</p>}
    </div>
  );
}

function Message({ title, body }: { readonly title: string; readonly body?: string }) {
  return <div><h3 className="font-display text-xl">{title}</h3>{body && <p className="mt-2 text-sm text-muted">{body}</p>}</div>;
}
