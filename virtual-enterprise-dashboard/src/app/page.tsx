'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const Office3D = dynamic(() => import('@/components/Office3D'), { ssr: false });

export default function HomePage() {
  return (
    <div className="w-screen h-screen bg-[#0a0a12] overflow-hidden">
      <Suspense fallback={
        <div className="w-full h-full flex items-center justify-center bg-[#0a0a12]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-indigo-400/60 font-mono text-xs tracking-[0.3em] uppercase">Carregando escritório...</p>
          </div>
        </div>
      }>
        <Office3D />
      </Suspense>
    </div>
  );
}
