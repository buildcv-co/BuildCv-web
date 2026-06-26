"use client";

import { useId, useMemo, useState } from "react";
import { basicsSchema } from "@/lib/editor/schema/jsonresume";
import type { Basics } from "@/lib/editor/types";
import { cn } from "@/lib/utils/cn";
import { Field, inputClass } from "./_shared/form-field";
import { ConfidenceBadge } from "./_shared/confidence-badge";

const NACIONALIDADES = ["CO", "EC", "PE", "BR", "MX", "AR", "CL"] as const;
const ESTADOS_CIVILES = [
  "soltero",
  "casado",
  "union_libre",
  "divorciado",
  "viudo",
] as const;
const LIBRETA_MILITAR = ["primera", "segunda", "no_aplica"] as const;
const RH = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"] as const;

/**
 * BasicsForm — shell presentacional para la sección `basics` del editor
 * JSON Resume. Recibe `basics: Basics` + `onChange(next: Basics)`.
 *
 *  - Validation inline vía `basicsSchema.safeParse` (solo campos visibles
 *    se incluyen en el partial parse; campos opcionales se omiten si
 *    están vacíos para evitar falsos negativos).
 *  - DatosPersonales: muestra campos colombianos (cédula / libreta
 *    militar / RH) solo cuando `datosPersonales.nacionalidad === "CO"`.
 *    Esos campos son el corazón de la personalización LATAM.
 *  - Cada field referencia `ConfidenceMarker` via `<ConfidenceBadge>`
 *    (PR 4d promoverá `inferred → user_confirmed` en blur).
 *  - **No** muta `confidence` automáticamente — PR 4d es responsable.
 */
export function BasicsForm({
  basics,
  onChange,
}: {
  basics: Basics;
  onChange: (next: Basics) => void;
}) {
  const id = useId();
  const [emailTouched, setEmailTouched] = useState(false);

  const emailError = useMemo(() => {
    if (!emailTouched) return null;
    if (!basics.email || basics.email.length === 0) return null;
    const result = basicsSchema.shape.email.safeParse(basics.email);
    return result.success ? null : "Email inválido";
  }, [emailTouched, basics.email]);

  const update = <K extends keyof Basics>(field: K, value: Basics[K]) => {
    onChange({ ...basics, [field]: value });
  };

  const updateDatos = (
    field: keyof NonNullable<Basics["datosPersonales"]>,
    value: string | undefined,
  ) => {
    const dp = basics.datosPersonales ?? {};
    onChange({
      ...basics,
      datosPersonales: { ...dp, [field]: value },
    });
  };

  const toggleDatosPersonales = () => {
    if (basics.datosPersonales) {
      onChange({ ...basics, datosPersonales: undefined });
    } else {
      onChange({
        ...basics,
        datosPersonales: { nacionalidad: "CO" },
        confidence: { ...basics.confidence, datosPersonales: "user_confirmed" },
      });
    }
  };

  const isCO = basics.datosPersonales?.nacionalidad === "CO";

  return (
    <section
      aria-labelledby={`${id}-title`}
      className="space-y-5 rounded-2xl border border-line bg-surface/30 p-5"
    >
      <header className="space-y-1">
        <h2 id={`${id}-title`} className="font-display text-xl text-ink">
          Perfil
        </h2>
        <p className="text-xs text-faint">
          Datos básicos de contacto. Lo que aparece aquí va al encabezado
          de tu CV y a los metadatos del PDF.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nombre completo" htmlFor={`${id}-name`}>
          <input
            id={`${id}-name`}
            type="text"
            value={basics.name}
            onChange={(e) => {
              update("name", e.target.value);
            }}
            className={inputClass()}
          />
        </Field>

        <Field label="Email" htmlFor={`${id}-email`} error={emailError ?? undefined}>
          <input
            id={`${id}-email`}
            type="email"
            value={basics.email}
            onChange={(e) => {
              update("email", e.target.value);
            }}
            onBlur={() => {
              setEmailTouched(true);
            }}
            aria-invalid={emailError ? "true" : undefined}
            aria-describedby={
              emailError ? `${id}-email-error` : undefined
            }
            className={cn(
              inputClass(),
              emailError ? "border-missing focus:border-missing" : null,
            )}
          />
        </Field>

        <Field label="Teléfono" htmlFor={`${id}-phone`}>
          <input
            id={`${id}-phone`}
            type="tel"
            value={basics.phone ?? ""}
            onChange={(e) => {
              update("phone", e.target.value || undefined);
            }}
            className={inputClass()}
          />
        </Field>

        <Field label="Ubicación" htmlFor={`${id}-location`} hint="Ciudad, país">
          <input
            id={`${id}-location`}
            type="text"
            value={basics.location ?? ""}
            onChange={(e) => {
              update("location", e.target.value || undefined);
            }}
            className={inputClass()}
          />
        </Field>

        <Field label="Sitio web" htmlFor={`${id}-url`} hint="https://…">
          <input
            id={`${id}-url`}
            type="url"
            value={basics.url ?? ""}
            onChange={(e) => {
              update("url", e.target.value || undefined);
            }}
            className={inputClass()}
          />
        </Field>
      </div>

      <Field label="Resumen profesional" htmlFor={`${id}-summary`}>
        <textarea
          id={`${id}-summary`}
          rows={4}
          value={basics.summary ?? ""}
          onChange={(e) => {
            update("summary", e.target.value || undefined);
          }}
          className={inputClass()}
        />
      </Field>

      <ProfilesSection
        id={id}
        profiles={basics.profiles}
        onChange={(next) => {
          update("profiles", next);
        }}
      />

      <div className="space-y-3 rounded-xl border border-line bg-surface/50 p-4">
        <header className="flex items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-base text-ink">
              Datos personales (Colombia)
            </h3>
            <p className="text-xs text-faint">
              Opcional. Solo se guarda si lo completas.
            </p>
          </div>
          <button
            type="button"
            onClick={toggleDatosPersonales}
            aria-pressed={Boolean(basics.datosPersonales)}
            className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:border-accent"
          >
            {basics.datosPersonales ? "Quitar" : "Agregar"}
          </button>
        </header>

        {basics.datosPersonales ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nacionalidad" htmlFor={`${id}-dp-nac`}>
              <select
                id={`${id}-dp-nac`}
                value={basics.datosPersonales.nacionalidad ?? ""}
                onChange={(e) => {
                  updateDatos(
                    "nacionalidad",
                    e.target.value === ""
                      ? undefined
                      : (e.target.value as (typeof NACIONALIDADES)[number]),
                  );
                }}
                className={inputClass()}
              >
                <option value="">Selecciona…</option>
                {NACIONALIDADES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Estado civil" htmlFor={`${id}-dp-ec`}>
              <select
                id={`${id}-dp-ec`}
                value={basics.datosPersonales.estadoCivil ?? ""}
                onChange={(e) => {
                  updateDatos(
                    "estadoCivil",
                    e.target.value === ""
                      ? undefined
                      : (e.target.value as (typeof ESTADOS_CIVILES)[number]),
                  );
                }}
                className={inputClass()}
              >
                <option value="">Selecciona…</option>
                {ESTADOS_CIVILES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>

            {isCO ? (
              <>
                <Field label="Cédula" htmlFor={`${id}-dp-cedula`} hint="6-10 dígitos">
                  <input
                    id={`${id}-dp-cedula`}
                    type="text"
                    inputMode="numeric"
                    value={basics.datosPersonales.cedula ?? ""}
                    onChange={(e) => {
                      updateDatos("cedula", e.target.value || undefined);
                    }}
                    className={inputClass()}
                  />
                </Field>
                <Field label="Libreta militar" htmlFor={`${id}-dp-lm`}>
                  <select
                    id={`${id}-dp-lm`}
                    value={basics.datosPersonales.libretaMilitar ?? ""}
                    onChange={(e) => {
                      updateDatos(
                        "libretaMilitar",
                        e.target.value === ""
                          ? undefined
                          : (e.target.value as (typeof LIBRETA_MILITAR)[number]),
                      );
                    }}
                    className={inputClass()}
                  >
                    <option value="">Selecciona…</option>
                    {LIBRETA_MILITAR.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="RH (grupo sanguíneo)" htmlFor={`${id}-dp-rh`}>
                  <select
                    id={`${id}-dp-rh`}
                    value={basics.datosPersonales.rh ?? ""}
                    onChange={(e) => {
                      updateDatos(
                        "rh",
                        e.target.value === ""
                          ? undefined
                          : (e.target.value as (typeof RH)[number]),
                      );
                    }}
                    className={inputClass()}
                  >
                    <option value="">Selecciona…</option>
                    {RH.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </Field>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      <footer className="flex flex-wrap items-center gap-2 border-t border-line pt-3 text-xs text-faint">
        <span>Estado de confianza:</span>
        <ConfidenceBadge marker={basics.confidence.name} value={basics.name} />
        <ConfidenceBadge marker={basics.confidence.email} value={basics.email} />
      </footer>
    </section>
  );
}

function ProfilesSection({
  id,
  profiles,
  onChange,
}: {
  id: string;
  profiles: Basics["profiles"];
  onChange: (next: Basics["profiles"]) => void;
}) {
  return (
    <div className="space-y-3">
      <header className="flex items-center justify-between gap-2">
        <h3 className="font-display text-base text-ink">Perfiles</h3>
        <button
          type="button"
          onClick={() => {
            onChange([
              ...profiles,
              { network: "", username: "", url: "" },
            ]);
          }}
          className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:border-accent"
        >
          + Perfil
        </button>
      </header>
      {profiles.length === 0 ? (
        <p className="text-xs text-faint">
          Sin perfiles todavía. LinkedIn, GitHub, Behance, …
        </p>
      ) : (
        <ul className="space-y-2">
          {profiles.map((p, idx) => (
            <li
              key={idx}
              className="grid gap-2 rounded-xl border border-line bg-surface/50 p-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
            >
              <Field label="Red" htmlFor={`${id}-profile-${idx}-network`}>
                <input
                  id={`${id}-profile-${idx}-network`}
                  type="text"
                  value={p.network}
                  onChange={(e) => {
                    const next = profiles.map((pp, i) =>
                      i === idx ? { ...pp, network: e.target.value } : pp,
                    );
                    onChange(next);
                  }}
                  className={inputClass()}
                />
              </Field>
              <Field label="Usuario" htmlFor={`${id}-profile-${idx}-user`}>
                <input
                  id={`${id}-profile-${idx}-user`}
                  type="text"
                  value={p.username ?? ""}
                  onChange={(e) => {
                    const next = profiles.map((pp, i) =>
                      i === idx
                        ? { ...pp, username: e.target.value || undefined }
                        : pp,
                    );
                    onChange(next);
                  }}
                  className={inputClass()}
                />
              </Field>
              <Field label="URL" htmlFor={`${id}-profile-${idx}-url`}>
                <input
                  id={`${id}-profile-${idx}-url`}
                  type="url"
                  value={p.url ?? ""}
                  onChange={(e) => {
                    const next = profiles.map((pp, i) =>
                      i === idx ? { ...pp, url: e.target.value } : pp,
                    );
                    onChange(next);
                  }}
                  className={inputClass()}
                />
              </Field>
              <button
                type="button"
                aria-label={`Eliminar perfil ${idx + 1}`}
                onClick={() => {
                  onChange(profiles.filter((_, i) => i !== idx));
                }}
                className="self-end rounded-full border border-missing/40 bg-missing/10 px-2.5 py-1 text-xs font-medium text-missing"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
