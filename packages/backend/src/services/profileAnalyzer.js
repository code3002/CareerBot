const PERSONAS = {
  RECENT_GRAD: "Recent Graduate",
  PIVOT: "Pivot from Current Role",
  GROW: "Grow in Current Career"
};

function estimateExperienceYears(text) {
  const normalized = text.toLowerCase();
  const explicitMatch = normalized.match(/(\d+)\+?\s*(?:years|yrs)\s+of\s+experience/);

  if (explicitMatch) {
    return Number(explicitMatch[1]);
  }

  const yearMentions = [...normalized.matchAll(/\b(20\d{2})\b/g)].map((match) =>
    Number(match[1])
  );

  if (yearMentions.length >= 2) {
    const minYear = Math.min(...yearMentions);
    const maxYear = Math.max(...yearMentions);
    const diff = maxYear - minYear;

    if (diff > 0 && diff < 20) {
      return diff;
    }
  }

  return null;
}

function detectPersona(text) {
  const normalized = text.toLowerCase();
  const years = estimateExperienceYears(text);
  const recentGradKeywords = ["recent graduate", "bachelor", "student", "intern"];
  const pivotKeywords = ["analyst", "sdr", "business analyst", "sales", "marketing"];
  const growKeywords = ["manager", "lead", "senior", "staff", "principal"];

  if (
    (years !== null && years <= 1) ||
    recentGradKeywords.some((keyword) => normalized.includes(keyword))
  ) {
    return {
      key: "RECENT_GRAD",
      label: PERSONAS.RECENT_GRAD,
      years
    };
  }

  if (
    pivotKeywords.some((keyword) => normalized.includes(keyword)) &&
    (years === null || years <= 5)
  ) {
    return {
      key: "PIVOT",
      label: PERSONAS.PIVOT,
      years
    };
  }

  if (
    (years !== null && years >= 4) ||
    growKeywords.some((keyword) => normalized.includes(keyword))
  ) {
    return {
      key: "GROW",
      label: PERSONAS.GROW,
      years
    };
  }

  return {
    key: "PIVOT",
    label: PERSONAS.PIVOT,
    years
  };
}

function collectKeywords(text) {
  const normalized = text.toLowerCase();
  const signals = [
    ["backend APIs", ["backend", "api", "node", "express", "microservice"]],
    ["data analysis", ["sql", "python", "analytics", "dashboard", "tableau"]],
    ["customer-facing work", ["sales", "customer", "success", "account"]],
    ["ownership", ["led", "owned", "launched", "shipped", "managed"]],
    ["cross-functional work", ["stakeholder", "cross-functional", "product", "design"]],
    ["systems thinking", ["architecture", "scalability", "system", "infrastructure"]]
  ];

  return signals
    .filter(([, keywords]) => keywords.some((keyword) => normalized.includes(keyword)))
    .map(([label]) => label);
}

function buildVisibleGaps(personaKey, signals) {
  const gaps = [];

  if (!signals.includes("ownership")) {
    gaps.push("documented ownership or leadership of outcomes");
  }

  if (personaKey === "RECENT_GRAD") {
    gaps.push("proof-of-work outside academic or internship projects");
    gaps.push("clarity on which domain to pursue first");
  } else if (personaKey === "PIVOT") {
    gaps.push("proof of fit for the target role type");
    gaps.push("narrative bridge from current role to next");
  } else {
    gaps.push("scope and title that reflect actual level of impact");
    gaps.push("external positioning that matches seniority");
  }

  if (!signals.includes("cross-functional work")) {
    gaps.push("cross-functional or stakeholder visibility");
  }

  if (!signals.includes("systems thinking") && personaKey !== "RECENT_GRAD") {
    gaps.push("systems-level thinking or architectural contributions");
  }

  return gaps.slice(0, 3);
}

function buildCareerSnapshot(profileText, sourceLabel = "resume") {
  const persona = detectPersona(profileText);
  const signals = collectKeywords(profileText);
  const yearsLabel =
    persona.years === null ? "Experience level inferred from profile" : `${persona.years}+ years of experience`;

  return {
    persona: persona.label,
    persona_key: persona.key,
    experience_estimate: yearsLabel,
    top_strengths: signals.slice(0, 3).length
      ? signals.slice(0, 3)
      : ["technical depth", "career momentum", "clear growth potential"],
    visible_gaps: buildVisibleGaps(persona.key, signals),
    market_positioning:
      persona.key === "RECENT_GRAD"
        ? "Early-career candidate with broad optionality but needs sharper focus."
        : persona.key === "GROW"
          ? "Experienced operator who can command stronger roles with clearer positioning."
          : "Transferable talent with room to reposition into a higher-upside path.",
    opportunity_area:
      persona.key === "RECENT_GRAD"
        ? "Reduce overwhelm and narrow to one credible first move."
        : persona.key === "GROW"
          ? "Translate current impact into stronger scope, title, or ownership."
          : "Use existing skills to pivot into a more strategic or leveraged role.",
    source: sourceLabel
  };
}

module.exports = {
  buildCareerSnapshot,
  detectPersona
};
