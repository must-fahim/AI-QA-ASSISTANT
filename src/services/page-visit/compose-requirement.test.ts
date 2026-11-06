import { describe, expect, it } from "vitest";
import { composeRequirement } from "@/services/page-visit/compose-requirement";

describe("compose requirement from a visited page", () => {
  it("adds the observed controls and leaves the login secret out", () => {
    const requirement = composeRequirement("Check the create campaign page.", {
      finalUrl: "https://stg.example.com/create-campaign",
      title: "Add Campaign",
      controls: ["text: Campaign Title max 25", "button: Apply Campaign"],
      text: "Campaign Title\nCampaign Content",
    });

    expect(requirement).toContain("Campaign Title");
    expect(requirement).toContain("Apply Campaign");
    expect(requirement).not.toContain("secret-password");
  });
});