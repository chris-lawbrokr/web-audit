import type { Metadata } from 'next';
import { Host_Grotesk, Instrument_Sans } from 'next/font/google';
import type { ReactNode } from 'react';

import '@/shared/styles/global.css';

export const metadata: Metadata = {
  title: 'Free marketing audit for law firms | Lawbrokr',
  description:
    'See how your firm’s website compares with nearby firms on reviews, speed, traffic and visibility.',
};

// Self-hosted by next/font, so visitors' browsers never call Google. The faces get generated names,
// handed to the font tokens (tokens.css) through these variables. Nothing is set in italic, so only the
// upright styles load.
const instrumentSans = Instrument_Sans({ subsets: ['latin'], variable: '--font-instrument-sans' });
const hostGrotesk = Host_Grotesk({ subsets: ['latin'], variable: '--font-host-grotesk' });

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    // On <html>, where the tokens are declared, so they can read the variables.
    <html lang="en-US" className={`${instrumentSans.variable} ${hostGrotesk.variable}`}>
      <body className="flex min-h-screen flex-col">{children}</body>
    </html>
  );
}
