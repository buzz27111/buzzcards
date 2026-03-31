'use client';

import dynamic from 'next/dynamic';
import Navbar from '@/components/layout/Navbar';
import BottomNav from '@/components/layout/BottomNav';

import 'leaflet/dist/leaflet.css';

const NewsMap = dynamic(() => import('@/components/map/NewsMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
    </div>
  ),
});

export default function MapPage() {
  return (
    <div className="flex h-dvh flex-col bg-background">
      <Navbar />
      {/* Map fills remaining space between navbar and bottom nav */}
      <main className="flex-1 pt-14 pb-16 md:pb-0">
        <NewsMap />
      </main>
      <BottomNav />
    </div>
  );
}
