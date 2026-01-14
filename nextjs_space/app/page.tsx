'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { data: session, status } = useSession() || {};

  useEffect(() => {
    if (status === 'loading') return;

    if (session) {
      router.replace('/dashboard');
    } else {
      router.replace('/auth/login');
    }
  }, [session, status, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-400 mx-auto" />
        <p className="mt-4 text-slate-300 tracking-wider font-medium">STRATOS</p>
        <p className="mt-1 text-slate-400 text-sm">Loading...</p>
      </div>
    </div>
  );
}
