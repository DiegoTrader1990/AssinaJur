import './globals.css';
import type { Metadata } from 'next';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://assinajur.vercel.app';

export const metadata: Metadata = {
  title: 'AssinaJur — Contratação e assinatura eletrônica para advogados',
  description: 'Cadastre o cliente uma única vez, prepare contrato, procuração e declarações e envie tudo em um único link para assinatura.',
  keywords: ['assinatura eletronica', 'advocacia', 'contrato de honorarios', 'procuracao', 'kit juridico', 'assinajur', 'legaltech'],
  authors: [{ name: 'AssinaJur' }],
  metadataBase: new URL(APP_URL),
  openGraph: {
    title: 'AssinaJur — Contratação e assinatura eletrônica para advogados',
    description: 'Cadastre o cliente uma única vez, prepare contrato, procuração e declarações e envie tudo em um único link para assinatura.',
    url: APP_URL,
    siteName: 'AssinaJur',
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AssinaJur — Contratação e assinatura eletrônica para advogados',
    description: 'Cadastre o cliente uma única vez, prepare contrato, procuração e declarações e envie tudo em um único link para assinatura.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="scroll-smooth">
      <body className="min-h-screen flex flex-col antialiased selection:bg-blue-600 selection:text-white bg-[#F8FAFC] text-slate-800">
        {children}
      </body>
    </html>
  );
}
