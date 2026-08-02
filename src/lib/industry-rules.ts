export const INDUSTRIES = [
  { value: "ecommerce", label: "E-commerce & Retail", highRisk: false },
  { value: "hr", label: "HR & Recruitment (High Risk)", highRisk: true },
  { value: "edtech", label: "EdTech & Education (High Risk)", highRisk: true },
  { value: "fintech", label: "FinTech & SaaS", highRisk: false },
] as const;

export type Industry = (typeof INDUSTRIES)[number]["value"];

export const INDUSTRY_VALUES = INDUSTRIES.map((i) => i.value) as unknown as [
  Industry,
  ...Industry[],
];

export function isIndustry(value: string): value is Industry {
  return INDUSTRIES.some((i) => i.value === value);
}

export function industryLabel(value: string): string {
  return INDUSTRIES.find((i) => i.value === value)?.label ?? value;
}

export function isHighRisk(value: string): boolean {
  return INDUSTRIES.find((i) => i.value === value)?.highRisk ?? false;
}

type IndustryProfile = {
  /** Regulatory framing sent to the auditor model. */
  regulatoryContext: string;
  /** Sector-specific compliance criteria that must be checked. */
  criteria: string[];
  /** Strictness guidance: how harshly to score gaps. */
  scoringPolicy: string;
};

const BASE_CRITERIA = [
  "Disclosure of AI-generated content (images, descriptions, media)",
  "Chatbot / AI assistant disclosure to users (AI Act Art. 50 transparency)",
  "Cookie & data-processing disclosures (GDPR Art. 13/14)",
  "Clear human contact / complaint channel",
];

export const INDUSTRY_PROFILES: Record<Industry, IndustryProfile> = {
  ecommerce: {
    regulatoryContext:
      "EU AI Act (Reg. 2024/1689) transparency obligations, Omnibus Directive, Consumer Rights Directive and GDPR for an EU-facing online store.",
    criteria: [
      ...BASE_CRITERIA,
      "Personalized pricing transparency (Omnibus Directive Art. 6a)",
      "Recommendation-system parameter disclosure (P2B / DSA Art. 27)",
      "Review authenticity signals and fake-review controls",
      "Deepfake / synthetic media labelling of product visuals",
      "Age verification for restricted goods",
    ],
    scoringPolicy:
      "Standard strictness: deduct heavily for missing AI disclosure or fake-review risk, moderately for other gaps.",
  },
  hr: {
    regulatoryContext:
      "EU AI Act Annex III(4) HIGH-RISK: AI used for recruitment, candidate filtering, evaluation or promotion decisions. Full high-risk obligations apply (risk management, data governance, logging, human oversight, technical documentation, registration) plus strict GDPR duties.",
    criteria: [
      ...BASE_CRITERIA,
      "Explicit notice that AI is used in candidate screening/ranking (AI Act Art. 26(7), Art. 86 right to explanation)",
      "Documented human oversight of every automated rejection (GDPR Art. 22 – no solely automated decisions)",
      "Bias, fairness and non-discrimination testing evidence for the model",
      "Data-minimisation, retention limits and lawful basis for candidate personal data (GDPR Art. 5/6)",
      "DPIA published or referenced for high-risk profiling",
      "Candidate rights: access, rectification, contest the decision, opt-out of automated processing",
      "Logging / traceability of automated decisions (AI Act Art. 12)",
    ],
    scoringPolicy:
      "Annex III high-risk duties are NOT yet binding (they apply from 2 Dec 2027): report them as 'low'/'medium' future obligations. Score strictly on what applies today: Art. 50 transparency (disclosure of AI in candidate interaction/screening) and GDPR Art. 22 safeguards — missing GDPR automated-decision safeguards can be 'high'.",

  },
  edtech: {
    regulatoryContext:
      "EU AI Act Annex III(3) HIGH-RISK: AI used for access to education, learner evaluation, or proctoring. Full high-risk obligations apply, plus GDPR protections for minors.",
    criteria: [
      ...BASE_CRITERIA,
      "Disclosure of AI-based grading, admission or learner-evaluation systems",
      "Human review of AI-assigned grades and access decisions",
      "Special protection and parental consent for minors' data (GDPR Art. 8)",
      "Proctoring / biometric monitoring disclosure and lawful basis (AI Act prohibits emotion recognition in education, Art. 5)",
      "Data-minimisation and retention limits for learner records",
      "Bias testing for evaluation models across learner groups",
      "DPIA and accessibility statement for learners with disabilities",
    ],
    scoringPolicy:
      "Art. 5 prohibitions apply today: emotion recognition in education without a medical/safety exception is 'critical'. Annex III high-risk duties apply only from 2 Dec 2027 — report them as 'low'/'medium' future obligations. Score strictly on Art. 50 transparency and GDPR minors' safeguards (Art. 8), which can be 'high'.",

  },
  fintech: {
    regulatoryContext:
      "EU AI Act Annex III(5)(b) high-risk creditworthiness assessment where applicable, plus DORA, PSD2/SCA, MiCA (if crypto), AMLD and GDPR financial-data duties.",
    criteria: [
      ...BASE_CRITERIA,
      "Disclosure of AI/automated credit scoring or risk assessment and the right to explanation",
      "Human review and contestability of automated credit or account decisions (GDPR Art. 22)",
      "Transparent fees, APR and risk warnings for financial products",
      "Strong Customer Authentication and secure payment flows (PSD2)",
      "DORA operational-resilience and incident-reporting statements",
      "AML/KYC disclosures and identity-verification transparency",
      "Regulatory licence / authority registration details published",
      "Data security posture: encryption, breach notification commitments",
    ],
    scoringPolicy:
      "Annex III(5)(b) creditworthiness high-risk duties apply only from 2 Dec 2027 — report them as future obligations ('low'/'medium'). Score strictly on today's binding duties: Art. 50 transparency, GDPR Art. 22 contestability, licence disclosure and SCA/security statements ('high' when absent).",

  },
};

export function buildIndustryPromptSection(industry: Industry): string {
  const profile = INDUSTRY_PROFILES[industry];
  return `INDUSTRY / SECTOR: ${industryLabel(industry)}${isHighRisk(industry) ? " — CLASSIFIED HIGH-RISK UNDER EU AI ACT ANNEX III" : ""}

REGULATORY CONTEXT:
${profile.regulatoryContext}

SECTOR-SPECIFIC CRITERIA (check every one):
${profile.criteria.map((c, i) => `${i + 1}. ${c}`).join("\n")}

SCORING POLICY:
${profile.scoringPolicy}`;
}
