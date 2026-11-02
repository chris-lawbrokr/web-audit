'use client';

import { Download } from 'lucide-react';

import { Button } from '@/shared/ui/Button';

/** "Download PDF" opens the browser's print dialog, where the visitor saves the report as a PDF. */
export function PrintButton() {
  return (
    <Button variant="outline" onClick={() => window.print()}>
      <Download aria-hidden="true" className="size-4" />
      Download PDF
    </Button>
  );
}
