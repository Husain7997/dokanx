import type { KeyboardEvent } from "react";

import { Badge } from "./badge";
import { Input } from "./input";

export function TagInput({
  tags,
  placeholder = "Add tag"
}: {
  tags: string[];
  placeholder?: string;
}) {
  function preventSubmission(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
    }
  }

  return (
    <div className="rounded-[var(--radius-md)] border border-input bg-card p-2">
      <div className="mb-2 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Badge key={tag}>{tag}</Badge>
        ))}
      </div>
      <Input className="border-0 px-1 shadow-none focus-visible:ring-0" placeholder={placeholder} onKeyDown={preventSubmission} />
    </div>
  );
}
