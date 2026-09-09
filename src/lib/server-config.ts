// As credenciais são lidas somente do ambiente, nunca de valores alternativos no código.
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret?.trim()) {
    throw new Error('JWT_SECRET não configurado. O acesso está indisponível até corrigir o ambiente.');
  }
  return secret;
}

export function getDatabaseUrl(): string {
  for (const name of ['POSTGRES_PRISMA_URL', 'DATABASE_URL', 'POSTGRES_URL']) {
    const value = process.env[name];
    if (value?.trim()) return value;
  }
  throw new Error('Conexão do banco não configurada no ambiente.');
}
