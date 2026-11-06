import { LIMITS } from "@/constants/limits";

export interface PageObservation {
  finalUrl: string;
  title: string;
  controls: string[];
  text: string;
}

export function composeRequirement(goal: string, observation: PageObservation | null) {
  const trimmed = goal.trim();
  if (!observation) return trimmed;

  const controls = observation.controls.slice(0, 80).map((control) => `- ${control}`);
  const text = observation.text.replace(/\s+\n/g, "\n").trim().slice(0, 6_000);
  const composed = [
    trimmed || "Generate test cases for the page that was opened.",
    "",
    "Observed by opening the page in a browser. Use these visible controls. Do not invent fields that are not listed.",
    `Final URL: ${observation.finalUrl}`,
    `Title: ${observation.title || "Untitled"}`,
    "Controls:",
    ...(controls.length > 0 ? controls : ["- No form controls were visible."]),
    "",
    "Visible text:",
    text || "No visible text was captured.",
  ].join("\n");

  return composed.slice(0, LIMITS.requirementMax);
}
