'use client';

import { Geist, Geist_Mono } from "next/font/google";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useState } from 'react';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5000,
        gcTime: 10 * 60 * 1000,
      },
    },
  }));

  return (
    <html lang="en">
      <head>
        <title>Tailscale Funnel Manager</title>
        <meta name="description" content="Manage your Tailscale Funnel services" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryClientProvider client={queryClient}>
          {children}
          <Toaster
            richColors
            position="top-right"
            closeButton
            theme="system"
          />
        </QueryClientProvider>
      </body>
    </html>
  );
}
