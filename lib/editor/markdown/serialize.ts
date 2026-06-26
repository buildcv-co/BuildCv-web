import type { LegacyCvDocument, CvSection } from "../types";

const KIND_HEADING: Record<CvSection["kind"], string> = {
  profile: "Perfil",
  experience: "Experiencia",
  education: "Educación",
  skills: "Habilidades",
  projects: "Proyectos",
  certifications: "Certificaciones",
  languages: "Idiomas",
  other: "Otros",
};

export function serializeCvDocument(doc: LegacyCvDocument): string {
  const blocks: string[] = [];
  for (const section of doc.sections) {
    const block = serializeSection(section);
    if (block === null) continue;
    blocks.push(`## ${KIND_HEADING[section.kind]}`);
    blocks.push("");
    blocks.push(block);
    blocks.push("");
  }
  return blocks.join("\n").trim();
}

function serializeSection(section: CvSection): string | null {
  switch (section.kind) {
    case "profile":
      return serializeProfile(section);
    case "experience":
      return serializeExperience(section);
    case "education":
      return serializeEducation(section);
    case "skills":
      return serializeSkills(section);
    case "projects":
      return serializeProjects(section);
    case "certifications":
      return serializeCertifications(section);
    case "languages":
      return serializeLanguages(section);
    case "other":
      return serializeOther(section);
  }
}

function isMeaningful(value: string): boolean {
  return value.trim().length > 0;
}

function serializeProfile(s: Extract<CvSection, { kind: "profile" }>): string | null {
  const bits: string[] = [];
  const headerBits: string[] = [];
  if (isMeaningful(s.fullName)) headerBits.push(`**${s.fullName.trim()}**`);
  if (isMeaningful(s.headline)) headerBits.push(s.headline.trim());
  if (isMeaningful(s.location)) headerBits.push(s.location.trim());
  if (headerBits.length > 0) bits.push(headerBits.join(" · "));

  const contactBits: string[] = [];
  if (isMeaningful(s.email)) contactBits.push(s.email.trim());
  if (isMeaningful(s.phone)) contactBits.push(s.phone.trim());
  for (const link of s.links) {
    if (isMeaningful(link.label) && isMeaningful(link.url)) {
      contactBits.push(`[${link.label.trim()}](${link.url.trim()})`);
    }
  }
  if (contactBits.length > 0) bits.push(contactBits.join(" · "));

  if (isMeaningful(s.summary)) bits.push("", s.summary.trim());

  const out = bits.join("\n").trim();
  return out.length > 0 ? out : null;
}

function serializeExperience(
  s: Extract<CvSection, { kind: "experience" }>,
): string | null {
  const hasBullets = s.bullets.filter(isMeaningful).length > 0;
  const hasTech = s.techStack.length > 0;
  if (
    !isMeaningful(s.role) &&
    !isMeaningful(s.company) &&
    !hasBullets &&
    !hasTech
  ) {
    return null;
  }
  const parts: string[] = [];
  const titleBits: string[] = [];
  if (isMeaningful(s.role)) titleBits.push(s.role.trim());
  if (isMeaningful(s.company)) titleBits.push(s.company.trim());
  const dateBits: string[] = [];
  if (isMeaningful(s.startDate)) dateBits.push(s.startDate.trim());
  dateBits.push(s.endDate === null ? "actualidad" : s.endDate.trim());
  const meta = [
    titleBits.join(" · "),
    dateBits.join(" → "),
    isMeaningful(s.location) ? s.location.trim() : "",
  ]
    .filter((x) => x.length > 0)
    .join(" · ");
  if (meta.length > 0) parts.push(`### ${meta}`);

  const cleanedBullets = s.bullets.filter(isMeaningful).map((b) => b.trim());
  if (cleanedBullets.length > 0) {
    parts.push(cleanedBullets.map((b) => `- ${b}`).join("\n"));
  }
  if (s.techStack.length > 0) {
    parts.push(`Stack: ${s.techStack.join(", ")}`);
  }
  return parts.join("\n\n").trim();
}

function serializeEducation(
  s: Extract<CvSection, { kind: "education" }>,
): string | null {
  if (
    !isMeaningful(s.degree) &&
    !isMeaningful(s.institution) &&
    !isMeaningful(s.description)
  ) {
    return null;
  }
  const titleBits: string[] = [];
  if (isMeaningful(s.degree)) titleBits.push(s.degree.trim());
  if (isMeaningful(s.institution)) titleBits.push(s.institution.trim());
  const dateBits: string[] = [];
  if (isMeaningful(s.startDate)) dateBits.push(s.startDate.trim());
  dateBits.push(s.endDate === null ? "actualidad" : s.endDate.trim());
  const meta = [
    titleBits.join(" · "),
    dateBits.join(" → "),
    isMeaningful(s.location) ? s.location.trim() : "",
  ]
    .filter((x) => x.length > 0)
    .join(" · ");
  const parts: string[] = [`### ${meta}`];
  if (isMeaningful(s.description)) parts.push(s.description.trim());
  return parts.join("\n\n").trim();
}

function serializeSkills(
  s: Extract<CvSection, { kind: "skills" }>,
): string | null {
  const nonEmpty = s.groups.filter(
    (g) => isMeaningful(g.category) && g.items.length > 0,
  );
  if (nonEmpty.length === 0) return null;
  return nonEmpty
    .map((g) => `- **${g.category.trim()}**: ${g.items.join(", ")}`)
    .join("\n");
}

function serializeProjects(
  s: Extract<CvSection, { kind: "projects" }>,
): string | null {
  const nonEmpty = s.items.filter(
    (it) => isMeaningful(it.name) || isMeaningful(it.description),
  );
  if (nonEmpty.length === 0) return null;
  return nonEmpty
    .map((it) => {
      const lines: string[] = [];
      const link = it.link ?? null;
      const title =
        link !== null && isMeaningful(link)
          ? `### ${it.name.trim()} · ${link.trim()}`
          : `### ${it.name.trim()}`;
      lines.push(title);
      if (isMeaningful(it.description)) lines.push(it.description.trim());
      if (it.techStack.length > 0) {
        lines.push(`Stack: ${it.techStack.join(", ")}`);
      }
      return lines.join("\n");
    })
    .join("\n\n");
}

function serializeCertifications(
  s: Extract<CvSection, { kind: "certifications" }>,
): string | null {
  const nonEmpty = s.items.filter((it) => isMeaningful(it.name));
  if (nonEmpty.length === 0) return null;
  return nonEmpty
    .map((it) => {
      const bits: string[] = [it.name.trim()];
      if (isMeaningful(it.issuer)) bits.push(it.issuer.trim());
      if (isMeaningful(it.date)) bits.push(it.date.trim());
      if (it.credentialId !== null && isMeaningful(it.credentialId)) {
        bits.push(it.credentialId.trim());
      }
      return `- ${bits.join(" · ")}`;
    })
    .join("\n");
}

function serializeLanguages(
  s: Extract<CvSection, { kind: "languages" }>,
): string | null {
  if (s.items.length === 0) return null;
  return s.items
    .filter((it) => isMeaningful(it.language))
    .map((it) => {
      const level = it.level === "Native" ? "Nativo" : it.level;
      return `- ${it.language.trim()} · ${level}`;
    })
    .join("\n");
}

function serializeOther(
  s: Extract<CvSection, { kind: "other" }>,
): string | null {
  if (!isMeaningful(s.title) && !isMeaningful(s.content)) return null;
  const parts: string[] = [];
  if (isMeaningful(s.title)) parts.push(`### ${s.title.trim()}`);
  if (isMeaningful(s.content)) parts.push(s.content.trim());
  return parts.join("\n\n").trim();
}
