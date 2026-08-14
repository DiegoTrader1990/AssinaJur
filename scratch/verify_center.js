async function verifyDeployment() {
  for (let attempt = 1; attempt <= 20; attempt++) {
    try {
      const res = await fetch('https://www.assinajur.com.br/dashboard', {
        headers: { 'Cache-Control': 'no-cache' },
      });
      const html = await res.text();
      const chunks = html.match(/\/static\/chunks\/app\/\(dashboard\)\/dashboard\/[a-zA-Z0-9_-]+\.js/g) || [];
      if (chunks[0]) {
        const chunkRes = await fetch('https://www.assinajur.com.br/_next' + chunks[0]);
        const chunkCode = await chunkRes.text();
        if (chunkCode.includes('Fluxos em Andamento') && chunkCode.includes('Central de Trabalho')) {
          console.log(`[Attempt ${attempt}] ✅ VERCEL DEPLOYMENT IS 100% CONFIRMED & LIVE!`);
          return true;
        }
      }
      console.log(`[Attempt ${attempt}] Still deploying on Vercel... waiting 4s`);
    } catch (e) {
      console.log(`[Attempt ${attempt}] Network retry:`, e.message);
    }
    await new Promise((r) => setTimeout(r, 4000));
  }
  console.log('Timeout waiting for deployment.');
  return false;
}

verifyDeployment().catch(console.error);
