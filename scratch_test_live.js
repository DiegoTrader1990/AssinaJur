const jwt = require('jsonwebtoken');

// Usando JWT_SECRET fallback 'assinajur-default-secret-key-change-in-prod'
const JWT_SECRET = process.env.JWT_SECRET || 'assinajur-default-secret-key-change-in-prod';

async function testAuthRealUser() {
  console.log('=== TESTANDO AUTENTICAÇÃO COM USER ID REAL 99b22a26-09dc-4953-b237-c25d585a6343 ===');

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

  const sampleJpgBase64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAAZABkBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
  const blob = new Blob([Buffer.from(sampleJpgBase64, 'base64')], { type: 'image/jpeg' });
  const formData = new FormData();
  formData.append('file', blob, 'rg_teste.jpg');

  try {
    const res = await fetch('https://www.assinajur.com.br/api/clients/parse-document', {
      method: 'POST',
      headers: {
        Cookie: `assinajur_token=${token}`,
      },
      body: formData,
    });

    console.log('Status HTTP Vercel:', res.status);
    const json = await res.json();
    console.log('Resultado Vercel Ao Vivo:', JSON.stringify(json, null, 2));
  } catch (err) {
    console.error(err);
  }
}

testAuthRealUser();
