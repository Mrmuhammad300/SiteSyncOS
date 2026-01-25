import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Quantum Ledger | SiteSync OS',
  description: 'Event-driven treasury with immutable audit trails and automated reconciliation',
};

export default function LedgerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
