const jwt = require('jsonwebtoken');

const JWT_SECRET = 'assinajur-default-secret-key-change-in-prod';

async function main() {
  const customFetch = globalThis.fetch || (await import('node-fetch')).default;

  const token = jwt.sign(
    {
      userId: '99b22a26-09dc-4953-b237-c25d585a6343',
      officeId: 'd5eeac12-c73b-43e4-93f8-03d3d8fb255f',
      email: 'diego@rodriguessoares.adv.br',
      role: 'OFFICE_ADMIN',
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  try {
    const res = await customFetch('https://www.assinajur.com.br/api/clients', {
      headers: {
        Cookie: `assinajur_token=${token}`,
      },
    });

    console.log('Status HTTP com Token Padrão:', res.status);
    const data = await res.json();
    console.log('📊 Clientes retornados da API online (Vercel):', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Erro:', err);
  }
}

main();
