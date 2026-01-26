import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Agent Orchestrator | SiteSync OS',
  description: 'Multi-agent system with autonomous decision-making and human oversight',
};

export default function AIAssistantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
