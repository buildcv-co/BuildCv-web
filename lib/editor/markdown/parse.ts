import { CvSectionSchema } from "../schema";
import { EntityNotAllowedError, SectionValidationFailedError } from "../errors";
import type {
  LegacyCvDocument,
  CvSection,
  EntityRef,
  ExperienceSection,
  OtherSection,
  ProfileSection,
  SkillsSection,
  CertificationsSection,
  LanguagesSection,
  EducationSection,
  ProjectsSection,
} from "../types";

export interface ParseContext {
  readonly originalEntities: ReadonlySet<string>;
  readonly userTypedEntities: ReadonlySet<string>;
}

const KIND_HEADING: Record<string, CvSection["kind"]> = {
  perfil: "profile",
  profile: "profile",
  experiencia: "experience",
  experience: "experience",
  educacion: "education",
  education: "education",
  educaci\u00f3n: "education",
  habilidades: "skills",
  skills: "skills",
  proyectos: "projects",
  projects: "projects",
  certificaciones: "certifications",
  certifications: "certifications",
  idiomas: "languages",
  languages: "languages",
  otros: "other",
  other: "other",
};

const H2_RE = /^##\s+(.+?)\s*$/;
const H3_RE = /^###\s+(.+?)\s*$/;
const LIST_RE = /^- (.+)$/;
const BOLD_RE = /^\*\*(.+?)\*\*(.*)$/;
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const PHONE_RE = /\+\d[\d\s()-]{6,}/;
const LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;

const ISO_NOW = new Date(0).toISOString();

function newSectionBase(kind: CvSection["kind"], source: "imported" | "user-typed") {
  return {
    id: `sec_${kind}_${Math.random().toString(36).slice(2, 10)}`,
    kind,
    source,
    createdAt: ISO_NOW,
    updatedAt: ISO_NOW,
  };
}

export function parseCvDocument(
  md: string,
  ctx: ParseContext,
): LegacyCvDocument {
  const blocks = splitByH2(md);
  const sections: CvSection[] = [];
  const entities: EntityRef[] = [];

  for (const block of blocks) {
    const heading = block.heading.trim();
    const kind = KIND_HEADING[heading.toLowerCase()];
    if (kind === undefined) continue;
    const parsed = parseSectionBlock(kind, block.body, ctx);
    if (parsed) {
      sections.push(parsed.section);
      for (const ent of parsed.entities) entities.push(ent);
    }
  }

  return {
    id: `doc_${Math.random().toString(36).slice(2, 10)}`,
    version: "0.5.0",
    locale: "es-CO",
    sections,
    entities,
    createdAt: ISO_NOW,
    updatedAt: ISO_NOW,
    source: "blank",
  };
}

interface Block {
  heading: string;
  body: string;
}

function splitByH2(md: string): Block[] {
  const lines = md.split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]?.trim() ?? "";
    const m = H2_RE.exec(line);
    if (m && m[1]) {
      const heading = m[1];
      const bodyLines: string[] = [];
      i++;
      while (i < lines.length) {
        const next = lines[i]?.trim() ?? "";
        if (H2_RE.test(next)) break;
        bodyLines.push(lines[i] ?? "");
        i++;
      }
      blocks.push({ heading, body: bodyLines.join("\n") });
    } else {
      i++;
    }
  }
  return blocks;
}

interface ParseBlockResult {
  section: CvSection;
  entities: ReadonlyArray<EntityRef>;
}

function parseSectionBlock(
  kind: CvSection["kind"],
  body: string,
  ctx: ParseContext,
): ParseBlockResult | null {
  const source: "imported" | "user-typed" = "imported";
  const lines = body.split("\n").map((l) => l.trim());
  const tokens = collectTokens(body);

  switch (kind) {
    case "profile":
      return wrap(
        parseProfile(lines, source, ctx),
        kind,
        tokens,
        ctx,
      );
    case "experience":
      return wrap(parseExperience(lines, source, ctx), kind, tokens, ctx);
    case "education":
      return wrap(parseEducation(lines, source, ctx), kind, tokens, ctx);
    case "skills":
      return wrap(parseSkills(lines, source, ctx), kind, tokens, ctx);
    case "projects":
      return wrap(parseProjects(lines, source, ctx), kind, tokens, ctx);
    case "certifications":
      return wrap(
        parseCertifications(lines, source, ctx),
        kind,
        tokens,
        ctx,
      );
    case "languages":
      return wrap(parseLanguages(lines, source, ctx), kind, tokens, ctx);
    case "other":
      return wrap(parseOther(lines, source, ctx), kind, tokens, ctx);
  }
}

function wrap(
  result: ParseBlockResult | null,
  kind: CvSection["kind"],
  tokens: ReadonlyArray<string>,
  ctx: ParseContext,
): ParseBlockResult | null {
  if (result === null) return null;
  for (const tok of tokens) {
    const norm = tok.toLowerCase().trim();
    if (norm.length === 0) continue;
    if (ctx.originalEntities.has(norm)) continue;
    if (ctx.userTypedEntities.has(norm)) continue;
    throw new EntityNotAllowedError(tok, kind);
  }
  return result;
}

function collectTokens(body: string): ReadonlyArray<string> {
  const out: string[] = [];
  const lines = body.split("\n");
  for (const raw of lines) {
    const line = raw.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "«$1»«$2»");
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    if (H3_RE.test(trimmed)) {
      const m = H3_RE.exec(trimmed);
      if (m && m[1]) {
        const normalized = (m[1] ?? "").replace(/→/g, "·");
        for (const part of normalized.split("·").map((s) => s.trim())) {
          if (part.length === 0) continue;
          for (const sub of part.split(",")) {
            const t = sub.trim();
            if (t.length > 0 && t !== "→" && t !== "actualidad") {
              out.push(t);
            }
          }
        }
      }
      continue;
    }
    if (LIST_RE.test(trimmed)) {
      const m = LIST_RE.exec(trimmed);
      if (m && m[1]) {
        const body = m[1].replace(/\*\*/g, "");
        const colonIdx = body.indexOf(":");
        if (colonIdx >= 0) {
          const before = body.slice(0, colonIdx).trim();
          if (before.length > 0) out.push(before);
          const after = body.slice(colonIdx + 1).trim();
          for (const part of after.split(",")) {
            const t = part.trim();
            if (t.length > 0) out.push(t);
          }
        } else {
          if (body.length > 0) out.push(body);
        }
      }
      continue;
    }
    const bm = BOLD_RE.exec(trimmed);
    if (bm) {
      const name = (bm[1] ?? "").trim();
      if (name.length > 0) out.push(name);
      const rest = (bm[2] ?? "").replace(/^·\s*/, "").trim();
      if (rest.length > 0) {
        for (const part of rest.split("·")) {
          const t = part.trim();
          if (t.length === 0) continue;
          for (const sub of t.split(",")) {
            const tt = sub.trim();
            if (tt.length > 0 && tt !== "→" && tt !== "actualidad") {
              out.push(tt);
            }
          }
        }
      }
      continue;
    }
    const normalized = trimmed.replace(/→/g, "·");
    for (const part of normalized.split("·")) {
      const t = part.trim();
      if (t.length === 0) continue;
      if (t === "actualidad") continue;
      if (t.includes("«")) {
        for (const sub of t.split("«")) {
          const tt = sub.replace(/»/g, "").trim();
          if (tt.length > 0) out.push(tt);
        }
      } else {
        out.push(t);
      }
    }
  }
  return out;
}

function parseProfile(
  lines: ReadonlyArray<string>,
  source: "imported" | "user-typed",
  _ctx: ParseContext,
): ParseBlockResult | null {
  const base = newSectionBase("profile", source);
  let fullName = "";
  let headline = "";
  let location = "";
  let email = "";
  let phone = "";
  const links: { label: string; url: string }[] = [];
  let summary = "";
  let capturedHeader = false;
  const summaryLines: string[] = [];

  for (const line of lines) {
    if (line.length === 0) continue;
    if (H3_RE.test(line)) continue;
    const boldMatch = BOLD_RE.exec(line);
    if (boldMatch && !capturedHeader) {
      fullName = (boldMatch[1] ?? "").trim();
      const rest = (boldMatch[2] ?? "").trim();
      const headerBits = rest
        .split("·")
        .map((b) => b.trim())
        .filter((b) => b.length > 0);
      if (headerBits[0]) headline = headerBits[0];
      if (headerBits[1]) location = headerBits[1];
      capturedHeader = true;
      continue;
    }
    if (!capturedHeader) {
      const headerBits = line
        .split("·")
        .map((b) => b.trim())
        .filter((b) => b.length > 0);
      if (headerBits[0]) fullName = headerBits[0];
      if (headerBits[1]) headline = headerBits[1];
      if (headerBits[2]) location = headerBits[2];
      capturedHeader = true;
      continue;
    }
    const contactLine = line;
    if (EMAIL_RE.test(contactLine)) {
      const em = contactLine.match(EMAIL_RE);
      if (em) email = em[0];
    }
    if (PHONE_RE.test(contactLine)) {
      const ph = contactLine.match(PHONE_RE);
      if (ph) phone = ph[0].trim();
    }
    let m: RegExpExecArray | null;
    LINK_RE.lastIndex = 0;
    while ((m = LINK_RE.exec(contactLine)) !== null) {
      links.push({ label: m[1] ?? "", url: m[2] ?? "" });
    }
    if (
      !EMAIL_RE.test(contactLine) &&
      !PHONE_RE.test(contactLine) &&
      !LINK_RE.test(contactLine) &&
      summary.length === 0
    ) {
      summaryLines.push(contactLine);
    }
  }

  if (summaryLines.length > 0) summary = summaryLines.join(" ").trim();
  void _ctx;

  if (
    fullName.length === 0 &&
    headline.length === 0 &&
    location.length === 0 &&
    email.length === 0 &&
    phone.length === 0 &&
    links.length === 0 &&
    summary.length === 0
  ) {
    return null;
  }

  const section: ProfileSection = {
    ...base,
    kind: "profile",
    fullName,
    headline,
    email,
    phone,
    location,
    links,
    summary,
  };
  return { section, entities: [] };
}

function parseExperience(
  lines: ReadonlyArray<string>,
  source: "imported" | "user-typed",
  _ctx: ParseContext,
): ParseBlockResult | null {
  const base = newSectionBase("experience", source);
  let role = "";
  let company = "";
  let startDate = "";
  let endDate: string | null = null;
  let location = "";
  const bullets: string[] = [];
  let techStack: string[] = [];

  for (const line of lines) {
    if (line.length === 0) continue;
    if (H3_RE.test(line)) {
      const m = H3_RE.exec(line);
      const normalized = (m?.[1] ?? "").replace(/→/g, "·");
      const parts = normalized
        .split("·")
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
      if (parts[0]) role = parts[0];
      if (parts[1]) company = parts[1];
      if (parts[2]) startDate = parts[2];
      if (parts[3]) {
        endDate = parts[3] === "actualidad" ? null : parts[3];
      }
      if (parts[4]) location = parts[4];
      continue;
    }
    if (line.toLowerCase().startsWith("stack:")) {
      techStack = line
        .slice("stack:".length)
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      continue;
    }
    const lm = LIST_RE.exec(line);
    if (lm && lm[1]) {
      bullets.push(lm[1].trim());
    }
  }
  void _ctx;

  if (
    role.length === 0 &&
    company.length === 0 &&
    bullets.length === 0 &&
    techStack.length === 0
  ) {
    return null;
  }

  const section: ExperienceSection = {
    ...base,
    kind: "experience",
    role,
    company,
    startDate,
    endDate,
    location,
    bullets,
    techStack,
  };
  return { section, entities: [] };
}

function parseEducation(
  lines: ReadonlyArray<string>,
  source: "imported" | "user-typed",
  _ctx: ParseContext,
): ParseBlockResult | null {
  const base = newSectionBase("education", source);
  let degree = "";
  let institution = "";
  let startDate = "";
  let endDate: string | null = null;
  let location = "";
  let description = "";
  const desc: string[] = [];

  for (const line of lines) {
    if (line.length === 0) continue;
    if (H3_RE.test(line)) {
      const m = H3_RE.exec(line);
      const normalized = (m?.[1] ?? "").replace(/→/g, "·");
      const parts = normalized
        .split("·")
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
      if (parts[0]) degree = parts[0];
      if (parts[1]) institution = parts[1];
      if (parts[2]) startDate = parts[2];
      if (parts[3]) {
        endDate = parts[3] === "actualidad" ? null : parts[3];
      }
      if (parts[4]) location = parts[4];
      continue;
    }
    desc.push(line);
  }
  description = desc.join(" ").trim();
  void _ctx;

  if (
    degree.length === 0 &&
    institution.length === 0 &&
    description.length === 0
  ) {
    return null;
  }

  const section: EducationSection = {
    ...base,
    kind: "education",
    degree,
    institution,
    startDate,
    endDate,
    location,
    description,
  };
  return { section, entities: [] };
}

function parseSkills(
  lines: ReadonlyArray<string>,
  source: "imported" | "user-typed",
  _ctx: ParseContext,
): ParseBlockResult | null {
  const base = newSectionBase("skills", source);
  const groups: { category: string; items: string[] }[] = [];
  for (const line of lines) {
    if (line.length === 0) continue;
    if (H3_RE.test(line)) continue;
    const lm = LIST_RE.exec(line);
    if (!lm || !lm[1]) continue;
    const body = lm[1];
    const bm = BOLD_RE.exec(body);
    if (bm) {
      const category = (bm[1] ?? "").trim();
      const rest = (bm[2] ?? "").replace(/^:\s*/, "");
      const items = rest
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      groups.push({ category, items });
    }
  }
  void _ctx;
  if (groups.length === 0) return null;
  const section: SkillsSection = { ...base, kind: "skills", groups };
  return { section, entities: [] };
}

function parseProjects(
  lines: ReadonlyArray<string>,
  source: "imported" | "user-typed",
  _ctx: ParseContext,
): ParseBlockResult | null {
  const base = newSectionBase("projects", source);
  const items: {
    name: string;
    description: string;
    techStack: string[];
    link: string | null;
  }[] = [];
  let current: {
    name: string;
    description: string;
    techStack: string[];
    link: string | null;
  } | null = null;
  for (const line of lines) {
    if (line.length === 0) continue;
    if (H3_RE.test(line)) {
      if (current) items.push(current);
      const m = H3_RE.exec(line);
      const parts = (m?.[1] ?? "")
        .split("·")
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
      const name = parts[0] ?? "";
      const linkCandidate = parts[1] ?? "";
      const link = linkCandidate.startsWith("http") ? linkCandidate : null;
      current = { name, description: "", techStack: [], link };
      continue;
    }
    if (current) {
      if (line.toLowerCase().startsWith("stack:")) {
        current.techStack = line
          .slice("stack:".length)
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
      } else {
        current.description = current.description
          ? `${current.description} ${line}`
          : line;
      }
    }
  }
  if (current) items.push(current);
  void _ctx;
  if (items.length === 0) return null;
  const section: ProjectsSection = { ...base, kind: "projects", items };
  return { section, entities: [] };
}

function parseCertifications(
  lines: ReadonlyArray<string>,
  source: "imported" | "user-typed",
  _ctx: ParseContext,
): ParseBlockResult | null {
  const base = newSectionBase("certifications", source);
  const items: {
    name: string;
    issuer: string;
    date: string;
    credentialId: string | null;
  }[] = [];
  for (const line of lines) {
    if (line.length === 0) continue;
    if (H3_RE.test(line)) continue;
    const lm = LIST_RE.exec(line);
    if (!lm || !lm[1]) continue;
    const parts = lm[1]
      .split("·")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    items.push({
      name: parts[0] ?? "",
      issuer: parts[1] ?? "",
      date: parts[2] ?? "",
      credentialId: parts[3] ?? null,
    });
  }
  void _ctx;
  if (items.length === 0) return null;
  const section: CertificationsSection = {
    ...base,
    kind: "certifications",
    items,
  };
  return { section, entities: [] };
}

function parseLanguages(
  lines: ReadonlyArray<string>,
  source: "imported" | "user-typed",
  _ctx: ParseContext,
): ParseBlockResult | null {
  const base = newSectionBase("languages", source);
  const items: { language: string; level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | "Native" }[] = [];
  for (const line of lines) {
    if (line.length === 0) continue;
    if (H3_RE.test(line)) continue;
    const lm = LIST_RE.exec(line);
    if (!lm || !lm[1]) continue;
    const parts = lm[1]
      .split("·")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    const rawLevel = (parts[1] ?? "").toLowerCase();
    const level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | "Native" =
      rawLevel === "nativo" ? "Native" : (rawLevel.toUpperCase() as "A1" | "A2" | "B1" | "B2" | "C1" | "C2");
    items.push({ language: parts[0] ?? "", level });
  }
  void _ctx;
  if (items.length === 0) return null;
  const section: LanguagesSection = { ...base, kind: "languages", items };
  return { section, entities: [] };
}

function parseOther(
  lines: ReadonlyArray<string>,
  source: "imported" | "user-typed",
  _ctx: ParseContext,
): ParseBlockResult | null {
  const base = newSectionBase("other", source);
  let title = "";
  const contentLines: string[] = [];
  for (const line of lines) {
    if (line.length === 0) continue;
    if (H3_RE.test(line)) {
      const m = H3_RE.exec(line);
      title = (m?.[1] ?? "").trim();
      continue;
    }
    contentLines.push(line);
  }
  const content = contentLines.join("\n").trim();
  void _ctx;
  if (title.length === 0 && content.length === 0) return null;
  const section: OtherSection = {
    ...base,
    kind: "other",
    title: title.length > 0 ? title : "Otros",
    content,
  };
  return { section, entities: [] };
}

export function runSectionSchemaCheck(section: CvSection): void {
  const result = CvSectionSchema.safeParse(section);
  if (!result.success) {
    const issues = result.error.issues.map((i) => ({
      path: i.path.join("."),
      message: i.message,
    }));
    throw new SectionValidationFailedError(section.kind, issues);
  }
}
