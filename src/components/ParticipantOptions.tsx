'use client';
import type { ParticipantQualification } from '@/lib/participant-qualification';
import type { RogoDetails } from '@/lib/participant-groups';
export default function ParticipantOptions({ name, role, rogo, signingMode, allowRogo = true, qualification, onQualification, onRogo, onMode }: {
 qualification?: ParticipantQualification; onQualification?: (value: ParticipantQualification) => void;
 name: string; role: string; rogo?: RogoDetails; signingMode?: string; allowRogo?: boolean;
 onRogo: (value: RogoDetails | undefined) => void; onMode: (value: string) => void;
}) {
 const q = qualification || {};
 return <div className="space-y-3 border-t pt-3">
  {onQualification && !role.startsWith('TESTEMUNHA') && <fieldset className="space-y-2"><legend className="font-semibold text-sm">Qualificação do signatário</legend>
   <label className="block text-xs">Denominação neste documento (ex.: herdeiro, requerente, contratante)<input className="block w-full border rounded p-2" maxLength={60} value={q.roleLabel || ''} onChange={e => onQualification({ ...q, roleLabel: e.target.value })} /></label>
   <div className="grid sm:grid-cols-2 gap-3">{([['rg','RG (opcional)','text'],['issuingOrgan','Órgão emissor (opcional)','text'],['birthDate','Nascimento','date'],['nationality','Nacionalidade','text'],['maritalStatus','Estado civil','text'],['profession','Profissão','text'],['address','Endereço completo','text'],['city','Cidade','text'],['state','UF','text'],['cep','CEP','text']] as const).map(([key,label,type]) => <label key={key} className="block text-xs">{label}<input className="block w-full border rounded p-2" type={type} required={!['rg','issuingOrgan'].includes(key)} value={q[key] || ''} onChange={e => onQualification({ ...q, [key]: e.target.value })} /></label>)}
    <label className="block text-xs">Gênero<select className="block w-full border rounded p-2" value={q.gender || ''} onChange={e => onQualification({ ...q, gender: e.target.value })}><option value="">Não informado</option><option value="FEMININO">Feminino</option><option value="MASCULINO">Masculino</option></select></label>
   </div>
  </fieldset>}
  <label className="block text-xs">Aparelho para esta participação
   <select className="block border rounded p-2 w-full" value={signingMode || 'INDIVIDUAL'} onChange={e => onMode(e.target.value)}>
    <option value="INDIVIDUAL">Link individual / outro aparelho</option><option value="SAME_DEVICE">Continuar no mesmo aparelho</option>
   </select>
  </label>
  {allowRogo && !role.startsWith('TESTEMUNHA') && <>
   <label className="flex gap-2 text-sm"><input type="checkbox" checked={Boolean(rogo)} onChange={e => onRogo(e.target.checked ? { name: '', cpf: '', birthDate: '', address: '' } : undefined)} />Esta parte terá um assinante a rogo</label>
   {rogo && <div className="rounded border bg-blue-50 p-3 space-y-2">
    <p className="text-xs">Acompanhante de {name || 'esta parte'}. Ambos realizarão as fotos e a participação no mesmo aparelho.</p>
    {([['name', 'Nome completo', 'text'], ['cpf', 'CPF', 'text'], ['birthDate', 'Nascimento', 'date'], ['address', 'Endereço completo', 'text'], ['relationship', 'Vínculo com a parte (opcional)', 'text']] as const).map(([key, label, type]) => <label key={key} className="block text-xs">{label}<input className="block w-full border rounded p-2" type={type} required={key !== 'relationship'} value={rogo[key] || ''} onChange={e => onRogo({ ...rogo, [key]: e.target.value })} /></label>)}
   </div>}
  </>}
 </div>;
}
