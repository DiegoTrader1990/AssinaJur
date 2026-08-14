async function check() {
  const r = await fetch('https://www.assinajur.com.br/dashboard', { headers: { 'Cache-Control': 'no-cache' } });
  console.log('Status:', r.status);
  console.log('Headers x-vercel-id:', r.headers.get('x-vercel-id'));
  console.log('Headers date:', r.headers.get('date'));
  const text = await r.text();
  console.log('Length:', text.length);
  
  // Find JS bundles referenced in HTML
  const matches = text.match(/\/static\/chunks\/[^"']+\.js/g) || [];
  console.log('Found chunk URLs:', matches);

  // Check if any chunk contains our v19 strings
  for (const chunkUrl of matches) {
    const chunkRes = await fetch('https://www.assinajur.com.br' + chunkUrl);
    const chunkText = await chunkRes.text();
    if (chunkText.includes('Estúdio de Formalização Jurídica') || chunkText.includes('1. Enviar PDF Avulso')) {
      console.log('FOUND v19 code in chunk:', chunkUrl);
    }
  }
}
check().catch(console.error);
