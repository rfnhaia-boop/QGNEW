import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'New Holding | Empresa Virtual',
  description: 'Laboratório de Simulação com Agentes Autônomos',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          if (typeof window !== 'undefined' && (!window.crypto || !window.crypto.randomUUID)) {
            window.crypto = window.crypto || {};
            window.crypto.randomUUID = function() {
              return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
              });
            };
          }
        `}} />
      </head>
      <body>{children}</body>
    </html>
  );
}
