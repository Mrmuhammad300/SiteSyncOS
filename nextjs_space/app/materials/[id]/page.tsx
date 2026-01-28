'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import MaterialDetail from '@/components/materials/MaterialDetail';

export default function MaterialDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [material, setMaterial] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/materials/library/${params.id}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Failed to load material (${res.status})`);
        }
        const data = await res.json();
        setMaterial(data.material);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (params.id) load();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !material) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4 gap-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <div className="text-center py-16">
          <p className="text-red-600 font-medium">{error || 'Material not found'}</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push('/materials')}>
            Return to Material Library
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Button variant="ghost" onClick={() => router.back()} className="mb-4 gap-1">
        <ArrowLeft className="w-4 h-4" /> Back to Library
      </Button>
      <MaterialDetail material={material} />
    </div>
  );
}
