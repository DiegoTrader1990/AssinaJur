async function main() {
  const customFetch = globalThis.fetch || (await import('node-fetch')).default;

  const emails = ['diego@rodriguessoares.adv.br', 'diegocrs.adv@gmail.com'];
  const passwords = ['admin123', '123456', 'admin', 'diego123'];

  for (const email of emails) {
    for (const password of passwords) {
      console.log(`Tentando login com ${email} e senha "${password}"...`);
      const res = await customFetch('https://www.assinajur.com.br/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        console.log(`✅ LOGIN COM SUCESSO! Email: ${email} | Senha: ${password}`);
        const cookies = res.headers.get('set-cookie');
        console.log('Set-Cookie:', cookies);

        const clientsRes = await customFetch('https://www.assinajur.com.br/api/clients', {
          headers: { Cookie: cookies },
        });

        console.log('Status Clientes:', clientsRes.status);
        const clientsData = await clientsRes.json();
        console.log('📊 CLIENTES NA VERCEL:', JSON.stringify(clientsData, null, 2));
        return;
      }
    }
  }
  console.log('Nenhuma combinação funcionou.');
}

main();
