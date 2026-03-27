import { Suspense } from "react";

import { AcceptInviteWorkspace } from "@/components/accept-invite-workspace";

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading invite...</div>}>
      <AcceptInviteWorkspace />
    </Suspense>
  );
}
