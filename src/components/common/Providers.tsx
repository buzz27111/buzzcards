'use client';

import { ThemeProvider } from 'next-themes';
import AuthProvider from '@/components/auth/AuthProvider';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ThemeProvider>
  );
}
