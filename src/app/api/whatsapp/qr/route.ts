import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    success: false,
    status: 'DISABLED',
    message: 'Conexão por QR Code desativada permanentemente para proteção total da conta do usuário.',
  });
}

export async function POST() {
  return NextResponse.json({
    success: false,
    status: 'DISABLED',
    message: 'Conexão por QR Code desativada permanentemente.',
  });
}
