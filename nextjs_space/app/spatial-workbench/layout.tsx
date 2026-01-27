import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Spatial Workbench | SiteSync OS',
  description: 'Generate and iterate on 3D spatial models from layout specifications using Kimi K2.5 AI',
};

export default function SpatialWorkbenchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
