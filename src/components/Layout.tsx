import React from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <div className="flex-grow flex flex-col min-w-0">
        <main className="p-8 space-y-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
