const {test}=require('node:test'), assert=require('node:assert/strict'), fs=require('fs'), ts=require('typescript'), sharp=require('sharp');
const mod={exports:{}};
new Function('require','module','exports',ts.transpileModule(fs.readFileSync('src/lib/evidence-image.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText)(require,mod,mod.exports);
const validate=mod.exports.validateEvidenceImage;
test('aceita JPEG e PNG decodificáveis sem modificar a imagem',async()=>{
 for(const format of ['jpeg','png']) {const b=await sharp({create:{width:320,height:240,channels:3,background:'white'}})[format]().toBuffer();await validate(`data:image/${format};base64,${b.toString('base64')}`);}
});
test('recusa texto, base64 inválido, conteúdo falso e arquivo truncado',async()=>{
 const jpg=await sharp({create:{width:320,height:240,channels:3,background:'white'}}).jpeg().toBuffer();
 for(const bad of ['',null,'foto','data:image/jpeg;base64,AAAA','data:image/jpeg;base64,@@@@',`data:image/png;base64,${jpg.toString('base64')}`,`data:image/jpeg;base64,${jpg.subarray(0,jpg.length-30).toString('base64')}`]) await assert.rejects(validate(bad));
});
test('recusa dimensões insuficientes e payload excessivo',async()=>{
 const tiny=await sharp({create:{width:1,height:1,channels:3,background:'white'}}).png().toBuffer();
 await assert.rejects(validate('data:image/png;base64,'+tiny.toString('base64')));
 await assert.rejects(validate('x'.repeat(4*1024*1024+1)));
});
