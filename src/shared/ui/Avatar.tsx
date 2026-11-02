/** A small round initials badge, 24px, white on brand purple. */
export function Avatar({ initials }: { initials: string }) {
  return (
    <span className="inline-grid size-6 shrink-0 place-content-center rounded-full bg-primary text-xs leading-none font-semibold text-primary-foreground">
      {initials}
    </span>
  );
}
