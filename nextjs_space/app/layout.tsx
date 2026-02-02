import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';

const interFontClass = 'font-sans';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000'),
  title: 'SiteSync OS - Asset Management Intelligence',
  description: 'Enterprise asset management intelligence powered by Zenflow AI and Quantum Ledger. SiteSync Vault™ | SiteSync Build™ | SiteSync Ops™',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
  openGraph: {
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script src="https://apps.abacus.ai/chatllm/appllm-lib.js"></script>
      </head>
      <body className={interFontClass} suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
