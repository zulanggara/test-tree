import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'The Living Archive — Silsilah Keluarga',
  description: 'Jelajahi dan temukan jejak keluarga Anda dalam pohon silsilah yang interaktif.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="noise-bg">{children}</body>
    </html>
  );
}
