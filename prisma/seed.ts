import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Iniciando Seed do AssinaJur (Atualização de Senhas) ---');

  const seedPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!seedPassword || seedPassword.length < 12) {
    throw new Error('Defina SEED_ADMIN_PASSWORD com pelo menos 12 caracteres antes de executar o seed.');
  }

  const salt = await bcrypt.genSalt(10);
  const userPasswordHash = await bcrypt.hash(seedPassword, salt);

  // 1. Criar ou Atualizar Super Admin da Plataforma AssinaJur
  const platformAdmin = await prisma.platformUser.upsert({
    where: { email: 'diegocrs.adv@gmail.com' },
    update: {
      name: 'Diego - Super Admin AssinaJur',
      passwordHash: userPasswordHash,
    },
    create: {
      name: 'Diego - Super Admin AssinaJur',
      email: 'diegocrs.adv@gmail.com',
      passwordHash: userPasswordHash,
    },
  });

  // 2. Criar ou Atualizar Escritório Piloto 1 (Rodrigues & Soares Advocacia)
  let office = await prisma.office.findFirst({
    where: { cpfCnpj: '12.345.678/0001-90' },
  });

  if (!office) {
    office = await prisma.office.create({
      data: {
        name: 'Rodrigues & Soares Advocacia',
        tradeName: 'Rodrigues & Soares',
        cpfCnpj: '12.345.678/0001-90',
        oabNumber: 'OAB/SP 123.456',
        phone: '(11) 98888-7777',
        email: 'contato@rodriguessoares.adv.br',
        primaryColor: '#0B1D3D',
        secondaryColor: '#D4AF37',
        address: 'Av. Paulista, 1000, Cj. 501 - São Paulo/SP',
        plan: 'PROFISSIONAL',
        planStatus: 'ACTIVE',
        monthlyDocLimit: 100,
        maxUsersLimit: 5,
      },
    });
  } else {
    office = await prisma.office.update({
      where: { id: office.id },
      data: {
        plan: 'PROFISSIONAL',
        planStatus: 'ACTIVE',
        monthlyDocLimit: 100,
        maxUsersLimit: 5,
      },
    });
  }

  // 3. Atualizar ou Criar Usuário Advogado (Diego)
  const adminUser = await prisma.user.upsert({
    where: { email: 'diegocrs.adv@gmail.com' },
    update: {
      name: 'Diego Rodrigues',
      passwordHash: userPasswordHash,
      role: 'OFFICE_ADMIN',
    },
    create: {
      officeId: office.id,
      name: 'Diego Rodrigues',
      email: 'diegocrs.adv@gmail.com',
      passwordHash: userPasswordHash,
      role: 'OFFICE_ADMIN',
      oabNumber: 'OAB/SP 123.456',
      phone: '(11) 98888-7777',
    },
  });

  // 4. Criar ou Atualizar Cliente
  let client = await prisma.client.findFirst({
    where: { officeId: office.id, cpfCnpj: '111.222.333-44' },
  });

  if (!client) {
    client = await prisma.client.create({
      data: {
        officeId: office.id,
        name: 'João da Silva Santos',
        cpfCnpj: '111.222.333-44',
        rg: 'MG-12.345.678',
        phone: '(11) 97777-6666',
        email: 'joao.silva@email.com',
        legalArea: 'Previdenciário',
        lawyerInChargeId: adminUser.id,
      },
    });
  }

  // 5. Criar ou Atualizar Modelos Jurídicos Padrão
  let templateContrato = await prisma.template.findFirst({
    where: { officeId: office.id, title: 'Contrato de Honorários Advocatícios' },
  });

  if (!templateContrato) {
    templateContrato = await prisma.template.create({
      data: {
        officeId: office.id,
        title: 'Contrato de Honorários Advocatícios',
        category: 'Previdenciário',
        documentType: 'CONTRATO',
        contentHtml: `CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS\nPelo presente instrumento, {{cliente_nome}}, CPF nº {{cliente_cpf}}, RG nº {{cliente_rg}}, residente em {{cliente_endereco}}, doravante CONTRATANTE, e de outro lado {{escritorio_nome}}, representado por {{advogado_nome}}, OAB {{advogado_oab}}, doravante CONTRATADO, ajustam a prestação de serviços advocatícios na área previdenciária.\nHONORÁRIOS: O CONTRATANTE pagará a título de honorários o valor de {{valor_honorarios}}, acrescido do percentual de êxito de {{percentual_exito}} sobre o proveito econômico obtido.\n{{cidade}}, {{data_atual}}.`,
      },
    });
  }

  let templateProcuracao = await prisma.template.findFirst({
    where: { officeId: office.id, title: 'Procuração Ad Judicia' },
  });

  if (!templateProcuracao) {
    templateProcuracao = await prisma.template.create({
      data: {
        officeId: office.id,
        title: 'Procuração Ad Judicia',
        category: 'Previdenciário',
        documentType: 'PROCURACAO',
        contentHtml: `PROCURAÇÃO AD JUDICIA E ET EXTRA\nOUTORGANTE: {{cliente_nome}}, nacionalidade {{cliente_nacionalidade}}, estado civil {{cliente_estado_civil}}, profissão {{cliente_profissao}}, portador do CPF nº {{cliente_cpf}} e RG {{cliente_rg}}, residente em {{cliente_endereco}}.\nOUTORGADOS: {{escritorio_nome}}, através do advogado {{advogado_nome}}, inscrito na OAB sob o nº {{advogado_oab}}.\nPODERES: Amplos poderes para o foro em geral, em especial para propor ações previdenciárias perante o INSS e a Justiça Federal, transigir, firmar acordos e receber quantias.\n{{cidade}}, {{data_atual}}.`,
      },
    });
  }

  let templateDeclaracao = await prisma.template.findFirst({
    where: { officeId: office.id, title: 'Declaração de Hipossuficiência' },
  });

  if (!templateDeclaracao) {
    templateDeclaracao = await prisma.template.create({
      data: {
        officeId: office.id,
        title: 'Declaração de Hipossuficiência',
        category: 'Previdenciário',
        documentType: 'DECLARACAO',
        contentHtml: `DECLARAÇÃO DE HIPOSSUFIÊNCIA FINANCEIRA\nEu, {{cliente_nome}}, inscrito no CPF sob o nº {{cliente_cpf}}, DECLARO sob as penas da lei que não possuo condições financeiras de arcar com as custas processuais sem prejuízo do sustento próprio e de minha família, requerendo os benefícios da Justiça Gratuita.\n{{cidade}}, {{data_atual}}.`,
      },
    });
  }

  // 6. Criar ou Atualizar Kit Previdenciário Completo
  let kitPrevidenciario = await prisma.legalKit.findFirst({
    where: { officeId: office.id, name: 'Kit Previdenciário Completo' },
  });

  if (!kitPrevidenciario) {
    kitPrevidenciario = await prisma.legalKit.create({
      data: {
        officeId: office.id,
        name: 'Kit Previdenciário Completo',
        category: 'Previdenciário',
        description: 'Pacote completo contendo Contrato de Honorários, Procuração e Declaração de Hipossuficiência.',
      },
    });

    await prisma.kitItem.createMany({
      data: [
        { kitId: kitPrevidenciario.id, templateId: templateContrato.id, displayOrder: 1 },
        { kitId: kitPrevidenciario.id, templateId: templateProcuracao.id, displayOrder: 2 },
        { kitId: kitPrevidenciario.id, templateId: templateDeclaracao.id, displayOrder: 3 },
      ],
    });
  }

  console.log('✅ Atualização de Senhas Concluída!');
  console.log('- Credenciais atualizadas usando SEED_ADMIN_PASSWORD (valor não exibido).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
