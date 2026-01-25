import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Milestones | SiteSync OS',
  description: 'Track construction milestones and trigger draw eligibility',
};

export default function MilestonesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
