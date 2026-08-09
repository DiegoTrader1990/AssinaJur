import assert from 'node:assert/strict';
import test from 'node:test';
import {
  brazilianPhoneVariants,
  extractClientConversationCorrections,
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
