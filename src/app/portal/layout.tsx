import { ReactNode } from "react";
import { getPortalContext } from "@/lib/portal";
import { BoardReadOnlyShell } from "@/components/board-read-only-shell";

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const context = await getPortalContext();
  return (
    <BoardReadOnlyShell readOnly={context.isBoardOnly}>
      {children}
    </BoardReadOnlyShell>
  );
}
