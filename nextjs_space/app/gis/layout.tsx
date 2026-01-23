import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GIS Intelligence | SiteSync OS',
  description: 'Property mapping, site visualization, and risk analysis powered by geospatial intelligence',
};

export default function GISLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
