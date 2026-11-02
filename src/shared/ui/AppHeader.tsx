import Link from 'next/link';
import { RotateCcw } from 'lucide-react';

import { BASE_PATH } from '@/shared/config/base-path';
import { cn } from '@/shared/lib/cn';

/**
 * The 56px top bar on every page: logo and product name, and a way back to the start once there's a
 * report on screen. On a phone there isn't room for the product name and that link side by side, so
 * the name gives way.
 */
export function AppHeader({ restart = false }: { restart?: boolean }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-gutter print:hidden">
      <div className="flex min-w-0 items-center gap-3">
        <Link href="/" className="block">
          {/* A plain img for a small SVG; unlike next/image it needs the base path by hand. */}
          <img
            src={`${BASE_PATH}/brand/lb-wordmark-indigo.svg`}
            alt="Lawbrokr"
            className="block h-5 w-auto"
          />
        </Link>
        <span aria-hidden="true" className={cn('h-5 w-px bg-border', restart && 'max-sm:hidden')} />
        <span
          className={cn(
            'text-sm font-medium whitespace-nowrap text-muted-foreground',
            restart && 'max-sm:hidden',
          )}
        >
          Marketing web audit
        </span>
      </div>

      {restart && (
        <Link
          href="/"
          className="inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium text-foreground transition-colors duration-[120ms] ease-out hover:bg-accent hover:text-accent-foreground"
        >
          <RotateCcw aria-hidden="true" className="size-4" />
          Run another audit
        </Link>
      )}
    </header>
  );
}
