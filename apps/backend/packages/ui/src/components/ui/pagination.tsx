import { Button } from "./button";

export function Pagination({
  page,
  totalPages
}: {
  page: number;
  totalPages: number;
}) {
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-4">
      <Button type="button" variant="outline" disabled={page <= 1}>
        Previous
      </Button>
      <span className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      <Button type="button" variant="outline" disabled={page >= totalPages}>
        Next
      </Button>
    </nav>
  );
}
