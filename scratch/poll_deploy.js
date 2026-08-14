async function poll() {
  for (let i = 1; i <= 15; i++) {
    const res = await fetch('https://www.assinajur.com.br/dashboard', { headers: { 'Cache-Control': 'no-cache' } });
    const html = await res.text();
    const matches = html.match(/\/static\/chunks\/app\/\(dashboard\)\/dashboard\/[a-zA-Z0-9_-]+\.js/g) || [];
    console.log(`[Attempt ${i}] Dashboard Chunk URL:`, matches[0]);
    if (matches[0]) {
      const chunkRes = await fetch('https://www.assinajur.com.br/_next' + matches[0]);
      const chunkCode = await chunkRes.text();
      if (chunkCode.includes('Estúdio de Formalização Jurídica') || chunkCode.includes('1. Enviar PDF Avulso')) {
        console.log('✅ CONFIRMED: VERCEL DEPLOYMENT IS FULLY LIVE WITH LATEST COMMIT!');
        return true;
      }
    }
    await new Promise((r) => setTimeout(r, 4000));
  }
  console.log('Waiting timed out.');
  return false;
}

poll().catch(console.error);
