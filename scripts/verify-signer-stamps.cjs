const fs=require('fs'),path=require('path'),vm=require('vm'),ts=require('typescript'),assert=require('assert/strict');
const {PDFDocument,StandardFonts,degrees}=require('pdf-lib');
const root=path.resolve(__dirname,'..');const out=path.join(root,'output/pdf');fs.mkdirSync(out,{recursive:true});
const deps={};
function load(file){const module={exports:{}};const code=ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;new Function('require','module','exports','process',code)((id)=>{if(deps[id])return deps[id];if(['pdf-lib','fs','path','qrcode','sharp','crypto'].includes(id))return require(id);throw Error('Dependência não simulada: '+id)},module,module.exports,{cwd:()=>root,env:{NEXT_PUBLIC_APP_URL:'https://example.invalid'}});return module.exports;}
deps['./participant-qualification']=load('src/lib/participant-qualification.ts');
deps['./participant-groups']=load('src/lib/participant-groups.ts');
const stamps=load('src/lib/signer-stamps.ts');deps['./signer-stamps']=stamps;
deps['./dateUtils']=load('src/lib/dateUtils.ts');deps['./publicAuditTrail']=load('src/lib/publicAuditTrail.ts');deps['./pdfHash']={calculateHash:buf=>require('crypto').createHash('sha256').update(buf).digest('hex')};
let current,original,outputName;
deps['@/lib/prisma']={prisma:{document:{findUnique:async()=>current,updateMany:async()=>({count:1})}}};
deps['./storage']={getFileBuffer:async()=>original,saveFile:async({fileBuffer})=>{fs.writeFileSync(path.join(out,outputName),fileBuffer);return{id:'arquivo-ficticio',storageKey:'ficticio'}}};
(async()=>{
const pdf=await PDFDocument.create();const p=pdf.addPage([595.28,841.89]);const f=await pdf.embedFont(StandardFonts.Helvetica);p.drawText('EXEMPLO FICTICIO - TESTE DE SELOS',{x:55,y:775,size:16,font:f});p.drawText('Documento sem efeito. Participantes ficticios, sem assinatura real.',{x:55,y:745,size:10,font:f});original=Buffer.from(await pdf.save());
const compiler=load('src/lib/templateCompiler.ts');
const rendered=await compiler.compileTemplatePreviewToPdf({title:'Ficticio',contentHtml:'<p>Termos ficticios.</p><p>____________</p><p>Pessoa Alfa</p><p>____________</p><p>Pessoa Beta</p>',variables:{},officeName:'Ficticio',version:1});
assert.equal(rendered.signaturePlacements.length,2);
assert(rendered.signaturePlacements[0].caption.includes('Pessoa Alfa'));
assert(rendered.signaturePlacements[1].caption.includes('Pessoa Beta'));
const cert=load('src/lib/pdfCertificate.ts');
for(const scenario of ['multipartes','muitas-partes','a-rogo','duplas-a-rogo','rotacao-90','rotacao-180','rotacao-270','recorte','selo-pequeno']){
original=Buffer.from(await pdf.save());
if(scenario.startsWith('rotacao-') || scenario==='recorte') {
 const variant=await PDFDocument.create(); const page=variant.addPage([700,900]);
 page.setCropBox(50,80,595.28,741.89);
 page.setRotation(degrees(scenario.startsWith('rotacao-')?Number(scenario.split('-')[1]):0));
 original=Buffer.from(await variant.save());
}
const count=scenario==='muitas-partes'?12:scenario==='duplas-a-rogo'?6:4;const rogo=scenario==='a-rogo';const now=new Date('2026-09-10T15:00:00Z');
const signers=Array.from({length:count},(_,i)=>({id:'p'+i,name:i===1?'Participante Ficticio Com Nome Muito Longo Para Conferir a Quebra de Linha':'Participante Ficticio '+(i+1),cpf:'00000000000',role:i===0?'CLIENTE':(rogo&&i===1 || scenario==='duplas-a-rogo' && [1,3].includes(i))?'ASSINANTE_A_ROGO':i>=count-2?'TESTEMUNHA_'+(i-count+3):'PARTE',signatureOrder:i+1,status:'ASSINADO',signedAt:now,signingMode:'INDIVIDUAL',ipAddress:'127.0.0.1',userAgent:'Teste local',selfieCenterImage:null,signatureType:'SELO_DIGITAL'}));
const targets=stamps.stampParticipants(signers,rogo);const positions=targets.slice(0,4).map((person,i)=>({order:person.signatureOrder,page:1,x:i%2?0.54:0.06,y:0.35+Math.floor(i/2)*0.22,width:0.4,height:0.14}));
if(scenario==='selo-pequeno') positions.forEach(p=>{p.width=0.22;p.height=0.07});
current={id:'ficticio',officeId:'ficticio',office:{name:'Escritorio Ficticio',cpfCnpj:'00000000000000'},title:'Exemplo de '+scenario,status:'CONCLUIDO',reviewStatus:'PENDENTE_REVISAO',updatedAt:now,completedAt:now,originalFile:{storageKey:'original'},originalHash:'0'.repeat(64),verificationCode:'EXEMPLO-SEM-VALIDADE',signers,events:scenario==='duplas-a-rogo'?[{eventType:'PARTICIPANT_GROUPS_CONFIGURED',metadata:JSON.stringify([{partyOrder:1,rogoOrder:2},{partyOrder:3,rogoOrder:4}]),createdAt:now}]:[],isIlliterate:rogo,signaturePosition:stamps.encodeStamps(positions)};
current.events.push({eventType:'PARTICIPANT_DETAILS_CONFIGURED',metadata:JSON.stringify(signers.filter(p=>!p.role.startsWith('TESTEMUNHA')&&p.role!=='ASSINANTE_A_ROGO').map(p=>({order:p.signatureOrder,qualification:{roleLabel:p.signatureOrder===1?'Herdeiro':'Inventariante',birthDate:'1980-01-01',nationality:'Brasileira',maritalStatus:'Solteiro',profession:'Professor',address:'Rua ficticia, 100, bairro de teste',city:'Salvador',state:'BA',cep:'40000000'}}))),createdAt:now});
outputName='selos-'+scenario+'.pdf';await cert.generateFinalPdfCertificate(current.id);
assert((await PDFDocument.load(fs.readFileSync(path.join(out,outputName)))).getPageCount()>1);
console.log(outputName);
}
})().catch(e=>{console.error(e);process.exitCode=1});
