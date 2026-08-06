import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AssinaJur — Contratação e Assinatura Eletrônica para Advogados',
  description: 'Cadastre o cliente uma vez, escolha o kit jurídico e envie todos os documentos em um único link seguro.',
  keywords: ['assinatura eletronica', 'advocacia', 'contrato de honorarios', 'procuracao', 'kit juridico', 'assinajur'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen flex flex-col antialiased selection:bg-gold-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
