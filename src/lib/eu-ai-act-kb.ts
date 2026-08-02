/**
 * Authoritative EU AI Act knowledge base used to ground every AI scan.
 *
 * Source of truth: Regulation (EU) 2024/1689 as amended by the Digital Omnibus
 * on AI (Regulation (EU) 2026/1744, published 24 July 2026, in force 27 July 2026).
 *
 * The auditor model MUST only use facts from this file — no invented dates,
 * no Annex III high-risk obligations applied before 2 December 2027.
 */

export const EU_AI_ACT_KB_VERSION = "2026-08-02";

export const EU_AI_ACT_DISCLAIMER =
  "This is a technical readiness assessment based on the AI Act as amended by the Digital Omnibus (Reg. 2026/1744). Not legal advice.";

export const EU_AI_ACT_KB = `EU AI ACT KNOWLEDGE BASE (authoritative — use ONLY these facts; version ${EU_AI_ACT_KB_VERSION})
Regulation (EU) 2024/1689 as amended by the Digital Omnibus on AI (Regulation (EU) 2026/1744, published 24 July 2026, in force 27 July 2026).

1. APPLICATION DATES
- 1 Aug 2024: AI Act entered into force.
- 2 Feb 2025: Prohibited practices (Art. 5) + AI literacy (Art. 4) — already fully applicable.
- 2 Aug 2025: GPAI model provider obligations (Chapter V, Art. 51–55) — already applicable.
- 2 Aug 2026: General applicability of most provisions + Article 50 transparency + full enforcement begins. THIS IS THE CURRENT KEY DATE.
- 2 Dec 2026: New Art. 5 prohibitions (non-consensual intimate content / CSAM-generating AI); end of grace period for machine-readable marking (Art. 50(2)) for systems placed on the market before 2 Aug 2026.
- 2 Aug 2027: National AI regulatory sandboxes operational.
- 2 Dec 2027: High-risk obligations for standalone Annex III systems (education, employment, biometrics, critical infrastructure, etc.) — DEFERRED by the Digital Omnibus.
- 2 Aug 2028: High-risk obligations for AI embedded as a safety component in Annex I products.
- 2 Aug 2030: Transitional rules for legacy high-risk systems used by public authorities.

2. RISK CATEGORIES
- Unacceptable (Art. 5): prohibited; fines up to EUR 35m or 7% global turnover.
- High-risk (Art. 6 + Annex I/III): permitted only under strict compliance. Annex III full obligations only from 2 Dec 2027.
- Limited risk (Art. 50): transparency duties, applicable from 2 Aug 2026.
- Minimal risk: no specific AI Act obligations (GDPR/DSA may still apply).

3. ARTICLE 5 PROHIBITIONS (in force since 2 Feb 2025)
Subliminal/manipulative/deceptive techniques causing significant harm; exploitation of vulnerabilities (age, disability, social/economic situation); social scoring; crime-risk prediction solely from profiling/personality traits; untargeted scraping to build facial-recognition databases; emotion inference in workplaces or education (medical/safety exceptions); biometric categorisation inferring sensitive attributes (with exceptions); real-time remote biometric identification in public spaces for law enforcement (narrow exceptions).
From 2 Dec 2026 additionally: AI generating or manipulating non-consensual intimate/sexually explicit content or CSAM.

4. ARTICLE 50 TRANSPARENCY (applicable from 2 Aug 2026)
- 50(1) PROVIDER: AI systems intended to interact directly with people must inform the person they are interacting with AI (unless obvious). Clear, distinguishable, no later than the first interaction.
- 50(2) PROVIDER (incl. GPAI): synthetic audio/image/video/text must carry machine-readable marking and be detectable as AI-generated/manipulated (watermarks, metadata e.g. C2PA, cryptographic provenance, fingerprints). Grace period until 2 Dec 2026 for systems already on the market before 2 Aug 2026. Exception: pure assistive editing.
- 50(3) DEPLOYER: inform people when emotion recognition or biometric categorisation is used.
- 50(4) DEPLOYER: disclose deepfakes and certain AI-generated text on matters of public interest; special regime for artistic/creative/satirical works.
Information must meet accessibility requirements.

5. HIGH-RISK OBLIGATIONS (Art. 8–15+): risk management (9), data governance (10), technical documentation (11), logging (12), transparency to deployers (13), human oversight (14), accuracy/robustness/cybersecurity (15), conformity assessment, CE marking, EU database registration. Annex III standalone: from 2 Dec 2027. Annex I embedded: from 2 Aug 2028.

6. GPAI (Chapter V, since 2 Aug 2025): technical documentation, information to downstream providers, EU copyright compliance policy, public summary of training content; systemic-risk models: evaluation, risk mitigation, incident reporting, cybersecurity. Commission enforcement powers full from 2 Aug 2026.

7. ROLES: Provider (develops/places on market/puts into service), Deployer (uses under own authority), Downstream provider (substantially modifies or builds on a GPAI model).

8. PENALTIES (Art. 99): Art. 5 breaches up to EUR 35m / 7%; other breaches incl. Art. 50 and high-risk up to EUR 15m / 3%; incorrect information up to EUR 7.5m / 1%.

9. MANDATORY REPORTING RULES
- Today's applicable regime for e-commerce/retail is Article 50 (chatbots, synthetic content, disclosures) — prioritise it.
- Do NOT treat Annex III high-risk requirements as currently binding. Mark them as "future obligation (from 2 Dec 2027)" or "recommended preparation".
- Clearly separate AI Act findings from overlapping GDPR/DSA findings (label the framework in the category).
- Always state the role (Provider or Deployer) and the severity for each finding.
- Never promise "full compliance", "guaranteed compliance", or "no fines".
- Never invent dates or articles not listed above.
- Always append this disclaimer to the summary: "${EU_AI_ACT_DISCLAIMER}"`;
