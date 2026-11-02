import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import '@/shared/styles/global.css';

export const metadata: Metadata = {
  title: 'Free marketing audit for law firms | Lawbrokr',
  description:
    'See how your firm’s website compares with nearby firms on reviews, speed, traffic and visibility.',
};

// The font tokens name the faces as Google serves them, so Google's stylesheet is linked as the mock
// does. next/font would rename them (README → Not built yet).
const FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400..700;1,400..700&family=Host+Grotesk:ital,wght@0,300..800;1,300..800&display=swap';

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en-US">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={FONTS_URL} />
      </head>
      <body className="flex min-h-screen flex-col">{children}</body>
    </html>
  );
}
