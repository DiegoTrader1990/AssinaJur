const fs=require('fs'),ts=require('typescript'),assert=require('assert/strict');
function load(file){const module={exports:{}};new Function('module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(module,module.exports);return module.exports;}
const s=load('src/lib/signer-stamps.ts');const people=[{signatureOrder:1,name:'Pessoa Alfa',role:'CLIENTE'},{signatureOrder:2,name:'Pessoa Beta',role:'PARTE'},{signatureOrder:3,name:'Pessoa Gama',role:'TESTEMUNHA_1'}];
const good={order:1,page:2,x:0.1,y:0.4,width:0.4,height:0.1};let checks=0;
assert.deepEqual(s.decodeStamps(s.encodeStamps([good]),2,people),[good]);checks++;
for(const bad of [{...good,page:3},{...good,order:4},{...good,x:0.9},{...good,width:NaN},{...good,height:0.01},{...good,page:1.5}]){assert.throws(()=>s.validateStamps([bad],2,people));checks++;}
assert.throws(()=>s.validateStamps([good,good],2,people));checks++;
for(const legacy of ['BOTTOM','TOP','LEFT_MARGIN','RIGHT_MARGIN','CUSTOM:1:0.1:0.2:0.3:0.1']){assert.equal(s.decodeStamps(legacy,2,people),null);checks++;}
assert.deepEqual(s.suggestStamps([{...good,caption:'Clausula sem nome'}],people),[]);checks++;
assert.equal(s.suggestStamps([{...good,caption:'Pessoa Beta'}],people)[0].order,2);checks++;
assert.deepEqual(s.editorParticipants([{name:'Cliente',role:'CLIENTE'},{name:'Testemunha',role:'TESTEMUNHA'},{name:'Outra Parte',role:'PARTE'}],true,'A rogo').map(p=>p.signatureOrder),[1,3,4]);checks++;
const groups=load('src/lib/participant-groups.ts');
const rogo={name:'Acompanhante ficticio',cpf:'00000000000',birthDate:'1980-01-01',address:'Ficticio'};
const input=[{name:'Alfa',role:'CLIENTE',signatureOrder:1,rogo},{name:'Beta',role:'PARTE',signatureOrder:2,rogo:{...rogo,name:'Segundo acompanhante'}},{name:'Gama',role:'TESTEMUNHA',signatureOrder:3}];
const expanded=groups.expandRogoParticipants(input,false);
assert.deepEqual(s.editorParticipants(input,false,'').map(p=>p.signatureOrder),s.stampParticipants(expanded.participants,false).map(p=>p.signatureOrder));checks++;
const config={events:[{eventType:groups.PARTICIPANT_GROUPS_EVENT,metadata:JSON.stringify(expanded.groups)}]};
assert.equal(groups.configuredGroups(config,expanded.participants).length,2);checks++;
assert.throws(()=>groups.configuredGroups({events:[{eventType:groups.PARTICIPANT_GROUPS_EVENT,metadata:JSON.stringify([{partyOrder:1,rogoOrder:2},{partyOrder:3,rogoOrder:2}])}]},expanded.participants));checks++;
assert.throws(()=>groups.expandRogoParticipants([{...input[2],rogo}],false));checks++;
assert.throws(()=>groups.expandRogoParticipants([{name:'Sem vinculo',role:'ASSINANTE_A_ROGO',signatureOrder:1}],false));checks++;
const mixed=groups.expandRogoParticipants([{name:'Titular',role:'CLIENTE',signatureOrder:1},{...rogo,role:'ASSINANTE_A_ROGO',signatureOrder:2},{...input[1],signatureOrder:3}],true);
assert.deepEqual(mixed.groups.map(g=>[g.partyOrder,g.rogoOrder]),[[1,2],[3,4]]);checks++;
const q=load('src/lib/participant-qualification.ts');
const qualified={name:'Parte <Alfa>',cpf:'00000000000',role:'PARTE',signatureOrder:1,qualification:{roleLabel:'Herdeiro',birthDate:'1980-01-01',nationality:'Brasileira',maritalStatus:'Solteiro',profession:'Professor',address:'Rua ficticia',city:'Salvador',state:'BA',cep:'40000000'}};
assert.doesNotThrow(()=>q.validateParticipantQualifications([qualified],false));checks++;
assert.throws(()=>q.validateParticipantQualifications([{...qualified,qualification:{...qualified.qualification,birthDate:'1980-02-31'}}],false));checks++;
assert.throws(()=>q.validateParticipantQualifications([{...qualified,qualification:{...qualified.qualification,address:''}}],false));checks++;
const vars=q.participantVariables([qualified,{...qualified,name:'Parte Beta',signatureOrder:2,qualification:{...qualified.qualification,roleLabel:'Inventariante'}}]);
assert.equal(vars.parte2_papel,'Inventariante');assert.equal(vars.parte1_rg,'');assert(vars.parte1_qualificacao.includes('&lt;Alfa&gt;'));checks++;
const reordered=groups.expandRogoParticipants([input[0],input[2],input[1]],false);
assert.deepEqual(reordered.participants.map(p=>p.role),['CLIENTE','ASSINANTE_A_ROGO','PARTE','ASSINANTE_A_ROGO','TESTEMUNHA_1']);checks++;
console.log(JSON.stringify({passed:true,checks}));
