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
console.log(JSON.stringify({passed:true,checks}));
