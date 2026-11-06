"use client";

import { Button, Card } from "antd";
import { REQUIREMENT_EXAMPLES } from "@/constants/examples";
import type { RequirementExample } from "@/types/domain";

export function ExampleCards({
  onUse,
  onViewSample,
}: {
  onUse: (example: RequirementExample) => void;
  onViewSample: (example: RequirementExample) => void;
}) {
  return (
    <Card title="Try an example">
      <p className="mb-4 text-sm text-[#6b7280]">
        These examples fill the form only. Generation starts when you choose Generate Test Cases.
      </p>
      <div className="grid gap-3 lg:grid-cols-3">
        {REQUIREMENT_EXAMPLES.map((example) => (
          <div key={example.id} className="rounded-lg border border-[#e5e7eb] bg-white p-4">
            <h3 className="text-sm font-semibold text-[#1c1c1c]">{example.title}</h3>
            <p className="mt-1 min-h-10 text-sm text-[#6b7280]">{example.summary}</p>
            <p className="mt-3 text-xs text-[#6b7280]">{example.jiraTicketId}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="small" type="primary" onClick={() => onUse(example)}>
                Use example
              </Button>
              <Button size="small" onClick={() => onViewSample(example)}>
                View sample output
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
