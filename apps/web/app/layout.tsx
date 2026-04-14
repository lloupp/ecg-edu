import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ECG Edu Platform',
  description: 'Plataforma web educacional para ensino clínico de cardiologia com casos reais de ECG.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
