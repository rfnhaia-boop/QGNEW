import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'New Holding | Empresa Virtual',
  description: 'Laboratório de Simulação com Agentes Autônomos',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
