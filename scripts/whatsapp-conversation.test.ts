import assert from 'node:assert/strict';
import test from 'node:test';
import {
  brazilianPhoneVariants,
  extractClientConversationCorrections,
  isApprovalIntent,
  isCancelIntent,
  isGenerateLinkIntent,
  looksLikeUnverifiedOperationalClaim,
} from '../src/lib/whatsapp/conversation';

test('considera equivalentes os formatos brasileiros com e sem nono dígito', () => {
  const variants = brazilianPhoneVariants('55 73 98825-0201');
  assert.ok(variants.includes('5573988250201'));
  assert.ok(variants.includes('557388250201'));
  assert.ok(variants.includes('73988250201'));
  assert.ok(variants.includes('7388250201'));
});

test('extrai correções naturais de telefone e CPF', () => {
  const result = extractClientConversationCorrections(
    'Corrija o telefone para 73 99999-8888 e o CPF para 529.982.247-25.'
  );
  assert.equal(result.changes.phone, '73999998888');
  assert.equal(result.changes.whatsapp, '73999998888');
  assert.equal(result.changes.cpfCnpj, '52998224725');
  assert.deepEqual(result.requestedWithoutValue, []);
});

test('pede o novo valor quando a correção não contém o dado', () => {
  const result = extractClientConversationCorrections('O telefone está errado, quero corrigir.');
  assert.deepEqual(result.changes, {});
  assert.deepEqual(result.requestedWithoutValue, ['telefone']);
});

test('extrai qualificação sem confundir pontuação final', () => {
  const result = extractClientConversationCorrections(
    'O nome correto é Maria de Souza, estado civil: casada; profissão: professora.'
  );
  assert.equal(result.changes.name, 'Maria de Souza');
  assert.equal(result.changes.maritalStatus?.toLowerCase(), 'casada');
  assert.equal(result.changes.profession?.toLowerCase(), 'professora');
});

test('reconhece aprovações naturais no singular e plural', () => {
  assert.equal(isApprovalIntent('Certo'), true);
  assert.equal(isApprovalIntent('Ok aprovadas'), true);
  assert.equal(isApprovalIntent('Confirmar, e pode fazer uma procuração'), true);
  assert.equal(isApprovalIntent('A minuta está aprovada?'), false);
});

test('reconhece geração efetiva do link sem confundir pergunta', () => {
  assert.equal(isGenerateLinkIntent('Sim, vamos gerar o link de assinatura'), true);
  assert.equal(isGenerateLinkIntent('Pode finalizar o documento para assinatura'), true);
  assert.equal(isGenerateLinkIntent('O link já foi gerado?'), false);
  assert.equal(isGenerateLinkIntent('Não quero gerar o link agora'), false);
});

test('reconhece cancelamentos em linguagem natural', () => {
  assert.equal(isCancelIntent('Deixa isso pra lá'), true);
  assert.equal(isCancelIntent('Pode descartar'), true);
});

test('bloqueia promessa operacional sem bloquear resposta negativa', () => {
  assert.equal(looksLikeUnverifiedOperationalClaim('O link será gerado e enviado em breve.'), true);
  assert.equal(looksLikeUnverifiedOperationalClaim('A minuta foi aprovada e prosseguiremos.'), true);
  assert.equal(looksLikeUnverifiedOperationalClaim('O link ainda não foi gerado.'), false);
});

test('extrai qualificação enviada em uma frase curta', () => {
  const result = extractClientConversationCorrections('Solteira, advogada, dominick.adv@gmail.com');
  assert.equal(result.changes.maritalStatus?.toLowerCase(), 'solteira');
  assert.equal(result.changes.profession?.toLowerCase(), 'advogada');
  assert.equal(result.changes.email, 'dominick.adv@gmail.com');
});
