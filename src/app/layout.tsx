import './globals.css';
import type { Metadata } from 'next';
import { Inter, Manrope } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  weight: ['400', '500', '600', '700'],
});

const manrope = Manrope({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-manrope',
  weight: ['600', '700', '800'],
});

const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
const APP_URL = configuredAppUrl && /^https?:\/\//i.test(configuredAppUrl)
  ? configuredAppUrl
  : 'https://assinajur.com.br';

export const metadata: Metadata = {
  title: 'AssinaJur — Assinatura eletrônica jurídica com evidências para advogados',
  description: 'Cadastre o cliente uma única vez, prepare contrato, procuração e declarações e envie tudo em um único link para assinatura pelo celular com prova de presença, certificado de evidências e validade jurídica.',
  keywords: ['assinatura eletronica', 'advocacia', 'contrato de honorarios', 'procuracao', 'kit juridico', 'assinajur', 'legaltech', 'prova de presença', 'certificado digital'],
  authors: [{ name: 'AssinaJur' }],
  metadataBase: new URL(APP_URL),
  openGraph: {
    title: 'AssinaJur — Assinatura eletrônica jurídica com evidências para advogados',
    description: 'Cadastre o cliente uma única vez, prepare contrato, procuração e declarações e envie tudo em um único link para assinatura pelo celular.',
    url: APP_URL,
    siteName: 'AssinaJur',
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AssinaJur — Assinatura eletrônica jurídica com evidências',
    description: 'Plataforma de assinatura eletrônica desenvolvida para advogados e escritórios de advocacia.',
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
    <html lang="pt-BR" className={`scroll-smooth ${inter.variable} ${manrope.variable}`}>
      <body className="min-h-screen flex flex-col antialiased bg-surface-50 text-slate-800 font-sans">
        {children}
      </body>
    </html>
  );
}
