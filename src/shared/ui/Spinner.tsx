import { LoaderCircle } from 'lucide-react';

/** The design system's spinner: a 16px open ring in brand ink, turning once a second. */
export function Spinner({ label }: { label: string }) {
  return (
    <span role="status" aria-label={label} className="inline-flex shrink-0 text-primary">
      <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
    </span>
  );
}
