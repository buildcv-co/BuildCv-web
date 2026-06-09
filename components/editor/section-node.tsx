"use client";

import { useId } from "react";
import { copy } from "@/lib/copy/es";
import { cn } from "@/lib/utils/cn";
import type { CvSection } from "@/lib/editor/types";

export function SectionNode({
  section,
  onChange,
}: {
  section: CvSection;
  onChange: (next: CvSection) => void;
}) {
  return (
    <section
      aria-labelledby={`section-${section.id}-label`}
      className="space-y-4 rounded-2xl border border-line bg-surface/30 p-5"
    >
      <h2
        id={`section-${section.id}-label`}
        className="font-display text-xl"
      >
        {KIND_LABEL[section.kind]}
      </h2>
      {renderBody(section, onChange)}
    </section>
  );
}

const KIND_LABEL: Record<CvSection["kind"], string> = {
  profile: copy.editor.sections.profile,
  experience: copy.editor.sections.experience,
  education: copy.editor.sections.education,
  skills: copy.editor.sections.skills,
  projects: copy.editor.sections.projects,
  certifications: copy.editor.sections.certifications,
  languages: copy.editor.sections.languages,
  other: copy.editor.sections.other,
};

function renderBody(section: CvSection, onChange: (next: CvSection) => void) {
  switch (section.kind) {
    case "profile":
      return <ProfileBody section={section} onChange={onChange} />;
    case "experience":
      return <ExperienceBody section={section} onChange={onChange} />;
    case "education":
      return <EducationBody section={section} onChange={onChange} />;
    case "skills":
      return <SkillsBody section={section} onChange={onChange} />;
    case "projects":
      return <ProjectsBody section={section} onChange={onChange} />;
    case "certifications":
      return <CertificationsBody section={section} onChange={onChange} />;
    case "languages":
      return <LanguagesBody section={section} onChange={onChange} />;
    case "other":
      return <OtherBody section={section} onChange={onChange} />;
  }
}

function updateField<K extends string, V>(
  section: CvSection,
  field: K,
  value: V,
): CvSection {
  return { ...section, [field]: value } as CvSection;
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && (
        <p id={`${htmlFor}-hint`} className="text-xs text-faint">
          {hint}
        </p>
      )}
    </div>
  );
}

const INPUT = "rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none";

function ProfileBody({
  section,
  onChange,
}: {
  section: Extract<CvSection, { kind: "profile" }>;
  onChange: (next: CvSection) => void;
}) {
  const id = useId();
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label={copy.editor.placeholders.profileFullName} htmlFor={`${id}-fullName`}>
        <input
          id={`${id}-fullName`}
          type="text"
          value={section.fullName}
          onChange={(e) => onChange(updateField(section, "fullName", e.target.value))}
          className={cn(INPUT, "w-full")}
        />
      </Field>
      <Field label={copy.editor.placeholders.profileHeadline} htmlFor={`${id}-headline`}>
        <input
          id={`${id}-headline`}
          type="text"
          value={section.headline}
          onChange={(e) => onChange(updateField(section, "headline", e.target.value))}
          className={cn(INPUT, "w-full")}
        />
      </Field>
      <Field label={copy.editor.placeholders.profileEmail} htmlFor={`${id}-email`}>
        <input
          id={`${id}-email`}
          type="email"
          value={section.email}
          onChange={(e) => onChange(updateField(section, "email", e.target.value))}
          className={cn(INPUT, "w-full")}
        />
      </Field>
      <Field label={copy.editor.placeholders.profilePhone} htmlFor={`${id}-phone`}>
        <input
          id={`${id}-phone`}
          type="tel"
          value={section.phone}
          onChange={(e) => onChange(updateField(section, "phone", e.target.value))}
          className={cn(INPUT, "w-full")}
        />
      </Field>
      <Field label={copy.editor.placeholders.profileLocation} htmlFor={`${id}-location`}>
        <input
          id={`${id}-location`}
          type="text"
          value={section.location}
          onChange={(e) => onChange(updateField(section, "location", e.target.value))}
          className={cn(INPUT, "w-full")}
        />
      </Field>
      <Field label={copy.editor.placeholders.profileSummary} htmlFor={`${id}-summary`}>
        <textarea
          id={`${id}-summary`}
          rows={3}
          value={section.summary}
          onChange={(e) => onChange(updateField(section, "summary", e.target.value))}
          className={cn(INPUT, "w-full")}
        />
      </Field>
    </div>
  );
}

function ExperienceBody({
  section,
  onChange,
}: {
  section: Extract<CvSection, { kind: "experience" }>;
  onChange: (next: CvSection) => void;
}) {
  const id = useId();
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={copy.editor.placeholders.experienceRole} htmlFor={`${id}-role`}>
          <input
            id={`${id}-role`}
            type="text"
            value={section.role}
            onChange={(e) => onChange(updateField(section, "role", e.target.value))}
            className={cn(INPUT, "w-full")}
          />
        </Field>
        <Field label={copy.editor.placeholders.experienceCompany} htmlFor={`${id}-company`}>
          <input
            id={`${id}-company`}
            type="text"
            value={section.company}
            onChange={(e) => onChange(updateField(section, "company", e.target.value))}
            className={cn(INPUT, "w-full")}
          />
        </Field>
        <Field label={copy.editor.placeholders.experienceStart} htmlFor={`${id}-start`}>
          <input
            id={`${id}-start`}
            type="text"
            value={section.startDate}
            onChange={(e) => onChange(updateField(section, "startDate", e.target.value))}
            className={cn(INPUT, "w-full")}
          />
        </Field>
        <Field label={copy.editor.placeholders.experienceEnd} htmlFor={`${id}-end`}>
          <input
            id={`${id}-end`}
            type="text"
            value={section.endDate ?? ""}
            onChange={(e) =>
              onChange(updateField(section, "endDate", e.target.value.length === 0 ? null : e.target.value))
            }
            className={cn(INPUT, "w-full")}
          />
        </Field>
        <Field label={copy.editor.placeholders.experienceLocation} htmlFor={`${id}-location`}>
          <input
            id={`${id}-location`}
            type="text"
            value={section.location}
            onChange={(e) => onChange(updateField(section, "location", e.target.value))}
            className={cn(INPUT, "w-full")}
          />
        </Field>
      </div>
      <Field label={copy.editor.placeholders.experienceBullet} htmlFor={`${id}-bullets`}>
        <textarea
          id={`${id}-bullets`}
          rows={4}
          value={section.bullets.join("\n")}
          onChange={(e) =>
            onChange(
              updateField(
                section,
                "bullets",
                e.target.value.split("\n").map((s) => s.trim()).filter((s) => s.length > 0),
              ),
            )
          }
          className={cn(INPUT, "w-full font-mono text-xs")}
        />
      </Field>
      <Field label={copy.editor.placeholders.experienceTech} htmlFor={`${id}-tech`}>
        <input
          id={`${id}-tech`}
          type="text"
          value={section.techStack.join(", ")}
          onChange={(e) =>
            onChange(
              updateField(
                section,
                "techStack",
                e.target.value.split(",").map((s) => s.trim()).filter((s) => s.length > 0),
              ),
            )
          }
          className={cn(INPUT, "w-full")}
        />
      </Field>
    </div>
  );
}

function EducationBody({
  section,
  onChange,
}: {
  section: Extract<CvSection, { kind: "education" }>;
  onChange: (next: CvSection) => void;
}) {
  const id = useId();
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label={copy.editor.placeholders.educationDegree} htmlFor={`${id}-degree`}>
        <input
          id={`${id}-degree`}
          type="text"
          value={section.degree}
          onChange={(e) => onChange(updateField(section, "degree", e.target.value))}
          className={cn(INPUT, "w-full")}
        />
      </Field>
      <Field label={copy.editor.placeholders.educationInstitution} htmlFor={`${id}-inst`}>
        <input
          id={`${id}-inst`}
          type="text"
          value={section.institution}
          onChange={(e) => onChange(updateField(section, "institution", e.target.value))}
          className={cn(INPUT, "w-full")}
        />
      </Field>
      <Field label={copy.editor.placeholders.educationStart} htmlFor={`${id}-start`}>
        <input
          id={`${id}-start`}
          type="text"
          value={section.startDate}
          onChange={(e) => onChange(updateField(section, "startDate", e.target.value))}
          className={cn(INPUT, "w-full")}
        />
      </Field>
      <Field label={copy.editor.placeholders.educationEnd} htmlFor={`${id}-end`}>
        <input
          id={`${id}-end`}
          type="text"
          value={section.endDate ?? ""}
          onChange={(e) =>
            onChange(updateField(section, "endDate", e.target.value.length === 0 ? null : e.target.value))
          }
          className={cn(INPUT, "w-full")}
        />
      </Field>
      <Field label={copy.editor.placeholders.educationLocation} htmlFor={`${id}-location`}>
        <input
          id={`${id}-location`}
          type="text"
          value={section.location}
          onChange={(e) => onChange(updateField(section, "location", e.target.value))}
          className={cn(INPUT, "w-full")}
        />
      </Field>
      <Field label={copy.editor.placeholders.educationDescription} htmlFor={`${id}-desc`}>
        <textarea
          id={`${id}-desc`}
          rows={3}
          value={section.description}
          onChange={(e) => onChange(updateField(section, "description", e.target.value))}
          className={cn(INPUT, "w-full")}
        />
      </Field>
    </div>
  );
}

function SkillsBody({
  section,
  onChange,
}: {
  section: Extract<CvSection, { kind: "skills" }>;
  onChange: (next: CvSection) => void;
}) {
  const id = useId();
  return (
    <div className="space-y-3">
      {section.groups.map((g, idx) => (
        <div key={idx} className="grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
          <Field label={copy.editor.placeholders.skillsCategory} htmlFor={`${id}-cat-${idx}`}>
            <input
              id={`${id}-cat-${idx}`}
              type="text"
              value={g.category}
              onChange={(e) => {
                const groups = section.groups.map((gg, i) =>
                  i === idx ? { ...gg, category: e.target.value } : gg,
                );
                onChange(updateField(section, "groups", groups));
              }}
              className={cn(INPUT, "w-full")}
            />
          </Field>
          <Field label={copy.editor.placeholders.skillsItem} htmlFor={`${id}-items-${idx}`}>
            <input
              id={`${id}-items-${idx}`}
              type="text"
              value={g.items.join(", ")}
              onChange={(e) => {
                const items = e.target.value.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
                const groups = section.groups.map((gg, i) =>
                  i === idx ? { ...gg, items } : gg,
                );
                onChange(updateField(section, "groups", groups));
              }}
              className={cn(INPUT, "w-full")}
            />
          </Field>
          <button
            type="button"
            onClick={() => {
              const groups = section.groups.filter((_, i) => i !== idx);
              onChange(updateField(section, "groups", groups));
            }}
            aria-label="Eliminar categoría"
            className="self-end rounded-full border border-missing/40 bg-missing/10 px-3 py-2 text-xs font-medium text-missing"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => {
          const groups = [...section.groups, { category: "", items: [] }];
          onChange(updateField(section, "groups", groups));
        }}
        className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium hover:border-muted"
      >
        + Categoría
      </button>
    </div>
  );
}

function ProjectsBody({
  section,
  onChange,
}: {
  section: Extract<CvSection, { kind: "projects" }>;
  onChange: (next: CvSection) => void;
}) {
  const id = useId();
  return (
    <div className="space-y-3">
      {section.items.map((p, idx) => (
        <div key={idx} className="space-y-2 rounded-xl border border-line bg-surface p-3">
          <Field label={copy.editor.placeholders.projectName} htmlFor={`${id}-name-${idx}`}>
            <input
              id={`${id}-name-${idx}`}
              type="text"
              value={p.name}
              onChange={(e) => {
                const items = section.items.map((pp, i) =>
                  i === idx ? { ...pp, name: e.target.value } : pp,
                );
                onChange(updateField(section, "items", items));
              }}
              className={cn(INPUT, "w-full")}
            />
          </Field>
          <Field label={copy.editor.placeholders.projectDescription} htmlFor={`${id}-desc-${idx}`}>
            <textarea
              id={`${id}-desc-${idx}`}
              rows={2}
              value={p.description}
              onChange={(e) => {
                const items = section.items.map((pp, i) =>
                  i === idx ? { ...pp, description: e.target.value } : pp,
                );
                onChange(updateField(section, "items", items));
              }}
              className={cn(INPUT, "w-full")}
            />
          </Field>
          <Field label={copy.editor.placeholders.projectTech} htmlFor={`${id}-tech-${idx}`}>
            <input
              id={`${id}-tech-${idx}`}
              type="text"
              value={p.techStack.join(", ")}
              onChange={(e) => {
                const items = section.items.map((pp, i) =>
                  i === idx
                    ? {
                        ...pp,
                        techStack: e.target.value.split(",").map((s) => s.trim()).filter((s) => s.length > 0),
                      }
                    : pp,
                );
                onChange(updateField(section, "items", items));
              }}
              className={cn(INPUT, "w-full")}
            />
          </Field>
          <Field label={copy.editor.placeholders.projectLink} htmlFor={`${id}-link-${idx}`}>
            <input
              id={`${id}-link-${idx}`}
              type="url"
              value={p.link ?? ""}
              onChange={(e) => {
                const items = section.items.map((pp, i) =>
                  i === idx ? { ...pp, link: e.target.value.length === 0 ? null : e.target.value } : pp,
                );
                onChange(updateField(section, "items", items));
              }}
              className={cn(INPUT, "w-full")}
            />
          </Field>
        </div>
      ))}
      <button
        type="button"
        onClick={() => {
          const items = [...section.items, { name: "", description: "", techStack: [], link: null }];
          onChange(updateField(section, "items", items));
        }}
        className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium hover:border-muted"
      >
        + Proyecto
      </button>
    </div>
  );
}

function CertificationsBody({
  section,
  onChange,
}: {
  section: Extract<CvSection, { kind: "certifications" }>;
  onChange: (next: CvSection) => void;
}) {
  const id = useId();
  return (
    <div className="space-y-3">
      {section.items.map((c, idx) => (
        <div key={idx} className="grid gap-3 sm:grid-cols-2">
          <Field label={copy.editor.placeholders.certificationName} htmlFor={`${id}-name-${idx}`}>
            <input
              id={`${id}-name-${idx}`}
              type="text"
              value={c.name}
              onChange={(e) => {
                const items = section.items.map((cc, i) =>
                  i === idx ? { ...cc, name: e.target.value } : cc,
                );
                onChange(updateField(section, "items", items));
              }}
              className={cn(INPUT, "w-full")}
            />
          </Field>
          <Field label={copy.editor.placeholders.certificationIssuer} htmlFor={`${id}-issuer-${idx}`}>
            <input
              id={`${id}-issuer-${idx}`}
              type="text"
              value={c.issuer}
              onChange={(e) => {
                const items = section.items.map((cc, i) =>
                  i === idx ? { ...cc, issuer: e.target.value } : cc,
                );
                onChange(updateField(section, "items", items));
              }}
              className={cn(INPUT, "w-full")}
            />
          </Field>
          <Field label={copy.editor.placeholders.certificationDate} htmlFor={`${id}-date-${idx}`}>
            <input
              id={`${id}-date-${idx}`}
              type="text"
              value={c.date}
              onChange={(e) => {
                const items = section.items.map((cc, i) =>
                  i === idx ? { ...cc, date: e.target.value } : cc,
                );
                onChange(updateField(section, "items", items));
              }}
              className={cn(INPUT, "w-full")}
            />
          </Field>
          <Field label={copy.editor.placeholders.certificationCredentialId} htmlFor={`${id}-cred-${idx}`}>
            <input
              id={`${id}-cred-${idx}`}
              type="text"
              value={c.credentialId ?? ""}
              onChange={(e) => {
                const items = section.items.map((cc, i) =>
                  i === idx
                    ? { ...cc, credentialId: e.target.value.length === 0 ? null : e.target.value }
                    : cc,
                );
                onChange(updateField(section, "items", items));
              }}
              className={cn(INPUT, "w-full")}
            />
          </Field>
        </div>
      ))}
      <button
        type="button"
        onClick={() => {
          const items = [...section.items, { name: "", issuer: "", date: "", credentialId: null }];
          onChange(updateField(section, "items", items));
        }}
        className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium hover:border-muted"
      >
        + Certificación
      </button>
    </div>
  );
}

function LanguagesBody({
  section,
  onChange,
}: {
  section: Extract<CvSection, { kind: "languages" }>;
  onChange: (next: CvSection) => void;
}) {
  const id = useId();
  return (
    <div className="space-y-3">
      {section.items.map((l, idx) => (
        <div key={idx} className="grid gap-3 sm:grid-cols-[2fr_1fr]">
          <Field label={copy.editor.placeholders.languageName} htmlFor={`${id}-lang-${idx}`}>
            <input
              id={`${id}-lang-${idx}`}
              type="text"
              value={l.language}
              onChange={(e) => {
                const items = section.items.map((ll, i) =>
                  i === idx ? { ...ll, language: e.target.value } : ll,
                );
                onChange(updateField(section, "items", items));
              }}
              className={cn(INPUT, "w-full")}
            />
          </Field>
          <Field label="Nivel" htmlFor={`${id}-lvl-${idx}`}>
            <select
              id={`${id}-lvl-${idx}`}
              value={l.level}
              onChange={(e) => {
                const items = section.items.map((ll, i) =>
                  i === idx ? { ...ll, level: e.target.value as typeof l.level } : ll,
                );
                onChange(updateField(section, "items", items));
              }}
              className={cn(INPUT, "w-full")}
            >
              {(["A1", "A2", "B1", "B2", "C1", "C2", "Native"] as const).map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </Field>
        </div>
      ))}
      <button
        type="button"
        onClick={() => {
          const items = [...section.items, { language: "", level: "A1" as const }];
          onChange(updateField(section, "items", items));
        }}
        className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium hover:border-muted"
      >
        + Idioma
      </button>
    </div>
  );
}

function OtherBody({
  section,
  onChange,
}: {
  section: Extract<CvSection, { kind: "other" }>;
  onChange: (next: CvSection) => void;
}) {
  const id = useId();
  return (
    <div className="space-y-3">
      <Field label={copy.editor.placeholders.otherTitle} htmlFor={`${id}-title`}>
        <input
          id={`${id}-title`}
          type="text"
          value={section.title}
          onChange={(e) => onChange(updateField(section, "title", e.target.value))}
          className={cn(INPUT, "w-full")}
        />
      </Field>
      <Field label={copy.editor.placeholders.otherContent} htmlFor={`${id}-content`}>
        <textarea
          id={`${id}-content`}
          rows={4}
          value={section.content}
          onChange={(e) => onChange(updateField(section, "content", e.target.value))}
          className={cn(INPUT, "w-full font-mono text-xs")}
        />
      </Field>
    </div>
  );
}
