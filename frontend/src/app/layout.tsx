import type { Metadata } from 'next';
import '@/styles/globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'EA Management',
  description: 'Lenovo Enterprise Architecture Management',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
