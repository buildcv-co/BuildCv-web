"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useArco } from "@/lib/use-arco";
import { signOut } from "@/lib/api/sign-out";
import { copy } from "@/lib/copy/es";
import {
  RateLimitError,
  UserDataError,
  ValidationError,
  type UserDataResponse,
} from "@/lib/api/user-data-types";
import { ArcoCancelModal } from "@/components/account/arco-cancel-modal";

/** ARCO panel (Access/Rectify/Cancel) — PR6b (REQ-FN-014/015/016).
 * NO loguea email (Art. III); NO expone tokens (CR-TOK-1). */
export interface ArcoPanelProps {
  userData: UserDataResponse;
}

const inputClass =
  "rounded border border-line bg-background px-3 py-2 text-sm";
const buttonSecondary =
  "rounded border border-line bg-surface px-4 py-2 text-sm hover:bg-background";

function describeArcoError(err: Error | null): string {
  if (!err) return "";
  if (err instanceof RateLimitError) return copy.account.arco.errors.rateLimit;
  if (err instanceof ValidationError) return copy.account.arco.errors.validation;
  if (err instanceof UserDataError && err.status === 503)
    return copy.account.arco.errors.network;
  return copy.account.arco.errors.generic;
}

function errorKind(err: Error | null): "rate-limit" | "validation" | "network" | "generic" {
  if (err instanceof RateLimitError) return "rate-limit";
  if (err instanceof ValidationError) return "validation";
  if (err instanceof UserDataError && err.status === 503) return "network";
  return "generic";
}

export function ArcoPanel({ userData }: ArcoPanelProps): React.ReactElement {
  const router = useRouter();
  const [accessOpen, setAccessOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [rectifyName, setRectifyName] = useState(userData.name);
  const [rectifyEmail, setRectifyEmail] = useState(userData.email);

  const handleEmailRotated = useCallback(
    (newEmail: string): void => {
      void signOut();
      router.push(
        `/auth/signin?reason=email-rotated&email=${encodeURIComponent(newEmail)}`,
      );
    },
    [router],
  );

  const arco = useArco({ userData, onEmailRotated: handleEmailRotated });

  const handleRectifySubmit = async (
    e: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    e.preventDefault();
    const payload: { name?: string; email?: string } = {};
    if (rectifyName !== userData.name) payload.name = rectifyName;
    if (rectifyEmail !== userData.email) payload.email = rectifyEmail;
    if (Object.keys(payload).length === 0) return;
    await arco.rectify(payload);
  };

  const handleCancelConfirm = async (): Promise<void> => {
    await arco.cancel();
    setModalOpen(false);
    void signOut();
    router.push("/auth/signin?reason=arco-cancel");
  };

  const errorMessage = describeArcoError(arco.error);
  const isLoading = arco.status === "loading";
  const isSuccess = arco.status === "success";

  return (
    <>
      <section
        id="arco"
        aria-labelledby="arco-title"
        className="flex flex-col gap-6 border-t border-line pt-6"
        data-testid="arco-panel"
        data-slot="arco"
      >
        <h2 id="arco-title" className="font-display text-xl">
          {copy.account.arcoSlot.title}
        </h2>

        <div className="flex flex-col gap-2">
          <h3 className="font-display text-base">{copy.account.arco.access.title}</h3>
          <button
            type="button"
            aria-expanded={accessOpen}
            onClick={() => setAccessOpen((v) => !v)}
            className={`${buttonSecondary} self-start`}
            data-testid="arco-access-toggle"
          >
            {copy.account.arco.access.button}
          </button>
          <details
            open={accessOpen}
            data-testid="arco-access-details"
            className="rounded border border-line bg-surface/40 p-3 text-xs"
          >
            <summary className="cursor-pointer text-sm">
              {copy.account.arco.access.jsonLabel}
            </summary>
            <pre
              data-testid="arco-access-json"
              className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-xs"
            >
              {JSON.stringify(userData, null, 2)}
            </pre>
          </details>
        </div>

        <form
          onSubmit={(e) => {
            void handleRectifySubmit(e);
          }}
          aria-labelledby="arco-rectify-title"
          className="flex flex-col gap-3"
          data-testid="arco-rectify-form"
        >
          <h3 id="arco-rectify-title" className="font-display text-base">
            {copy.account.arco.rectify.title}
          </h3>
          <label className="flex flex-col gap-1 text-sm">
            <span>{copy.account.arco.rectify.nameLabel}</span>
            <input
              type="text"
              value={rectifyName}
              onChange={(e) => setRectifyName(e.target.value)}
              disabled={isLoading}
              className={inputClass}
              data-testid="arco-rectify-name"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>{copy.account.arco.rectify.emailLabel}</span>
            <input
              type="email"
              value={rectifyEmail}
              onChange={(e) => setRectifyEmail(e.target.value)}
              disabled={isLoading}
              className={inputClass}
              data-testid="arco-rectify-email"
            />
          </label>
          <p className="text-xs text-muted" data-testid="arco-rectify-note">
            {copy.account.arco.rectify.emailRotationNote}
          </p>
          <button
            type="submit"
            disabled={isLoading}
            className="self-start rounded bg-foreground px-4 py-2 text-sm text-background hover:opacity-90 disabled:opacity-50"
            data-testid="arco-rectify-submit"
          >
            {isLoading ? copy.account.arco.rectify.submitting : copy.account.arco.rectify.submit}
          </button>
          {isSuccess ? (
            <p role="status" aria-live="polite" className="text-sm text-emerald-400" data-testid="arco-rectify-success">
              {copy.account.arco.rectify.success}
            </p>
          ) : null}
          {errorMessage ? (
            <p role="alert" aria-live="polite" className="text-sm text-rose-400" data-testid="arco-rectify-error" data-error-kind={errorKind(arco.error)}>
              {errorMessage}
            </p>
          ) : null}
        </form>

        <div className="flex flex-col gap-2">
          <h3 className="font-display text-base">{copy.account.arco.cancel.title}</h3>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="self-start rounded bg-red-700 px-4 py-2 text-sm text-white hover:bg-red-800"
            data-testid="arco-cancel-trigger"
          >
            {copy.account.arco.cancel.button}
          </button>
        </div>
      </section>

      {modalOpen ? (
        <ArcoCancelModal
          userEmail={userData.email}
          onConfirm={handleCancelConfirm}
          onCancel={() => setModalOpen(false)}
        />
      ) : null}
    </>
  );
}