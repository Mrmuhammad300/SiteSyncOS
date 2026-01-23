import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Scenarios | SiteSync OS',
  description: 'Run live what-if scenarios on your projects',
};

export default function ScenariosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
