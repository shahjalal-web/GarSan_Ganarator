/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import React from 'react';

export default function Header({ }: { companyName?: string }) {
  return (
    <header className="p-4 bg-slate-50 border-b sticky top-0 z-10">
      <div className="max-w-3xl mx-auto flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2">
          <img src="/logo.jpeg" alt="logo" className="w-28 h-10 object-contain" />
        </Link>
        <div>
          <div className="text-sm text-slate-600">GarSan Plumbing Services</div>
          <div className="text-xs text-slate-400">Generator Quote App</div>
        </div>
        <div className="ml-auto text-xs">Mobile-friendly • PIN access</div>
      </div>
    </header>
  );
}
