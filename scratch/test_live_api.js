async function main() {
  const customFetch = globalThis.fetch || (await import('node-fetch')).default;
  console.log('🌐 TESTANDO API EM PRODUÇÃO: https://www.assinajur.com.br/api/clients');

  try {
    const res = await customFetch('https://www.assinajur.com.br/api/clients');
    console.log('Status HTTP:', res.status);
    const data = await res.json();
    console.log('Resposta da API sem auth:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Erro ao chamar API de producao:', err);
  }
}

main();
