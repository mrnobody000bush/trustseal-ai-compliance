/**
 * Compliance scoring presentation helpers.
 *
 * We never claim absolute compliance: we report how many automated checks
 * passed and always attach an AI disclaimer.
 */

export const COMPLIANCE_TOTAL_CHECKS = 14;

export { EU_AI_ACT_DISCLAIMER } from "@/lib/eu-ai-act-kb";

export const AI_DISCLAIMER =
  "Technical readiness assessment based on the AI Act as amended by the Digital Omnibus (Reg. 2026/1744). Not legal advice.";


/** How many of the automated checks passed, derived from score/findings. */
export function passedChecks(
  score: number | null | undefined,
  findingsCount?: number,
): number {
  if (typeof findingsCount === "number") {
    return Math.max(0, COMPLIANCE_TOTAL_CHECKS - findingsCount);
  }
  if (typeof score !== "number") return 0;
  const clamped = Math.max(0, Math.min(100, score));
  return Math.round((clamped / 100) * COMPLIANCE_TOTAL_CHECKS);
}

/** "12/14 Checks Passed" */
export function checksLabel(
  score: number | null | undefined,
  findingsCount?: number,
): string {
  return `${passedChecks(score, findingsCount)}/${COMPLIANCE_TOTAL_CHECKS} Checks Passed`;
}

/** Factual status label — never guarantees legal compliance. */
export function complianceStatusLabel(score: number | null | undefined): string {
  if (typeof score !== "number") return "Not scanned";
  if (score >= 95) return "Audit Ready";
  if (score >= 80) return "No Critical Issues";
  if (score >= 50) return "Issues Found";
  return "Action Required";
}
