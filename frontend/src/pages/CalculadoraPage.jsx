import React, { useEffect, useMemo, useState } from 'react';
import { cursos as cursosApi, alunos as alunosApi, config as configApi } from '../services/api';

const fmtEUR = (v) => `EUR ${Number(v || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const toYMD = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
const daquiDias = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return toYMD(d); };
const fmtDataBR = (ymd) => (ymd ? new Date(ymd + 'T00:00:00').toLocaleDateString('pt-PT') : '');

// ============================================================
// Componente reutilizavel: montador de pacotes personalizados
// ============================================================
export function CalculadoraPacotes({ empresa = 'High Pro' }) {
  const [cursos, setCursos] = useState([]);
  const [alunos, setAlunos] = useState([]);
  const [itens, setItens] = useState([]);
  const [nomePacote, setNomePacote] = useState('');
  const [descontoPct, setDescontoPct] = useState('');
  const [addSel, setAddSel] = useState('');
  const [cliente, setCliente] = useState({ id: '', nome: '', email: '', telefone: '' });
  const [validade, setValidade] = useState(daquiDias(15));

  useEffect(() => { cursosApi.listar().then(setCursos).catch(() => {}); }, []);
  useEffect(() => { alunosApi.listar().then(setAlunos).catch(() => {}); }, []);

  const escolherAluno = (id) => {
    const a = alunos.find((x) => String(x.id) === String(id));
    if (a) setCliente({ id: a.id, nome: a.nome, email: a.email || '', telefone: a.telefone || '' });
    else setCliente({ id: '', nome: '', email: '', telefone: '' });
  };

  const addCurso = (id) => {
    const c = cursos.find((x) => String(x.id) === String(id));
    if (!c) return;
    setItens((prev) => [...prev, { key: uid(), nome: c.nome, horas: Number(c.carga || 0), valor: Number(c.valor || 0) }]);
    setAddSel('');
  };

  const addManual = () => setItens((prev) => [...prev, { key: uid(), nome: '', horas: 0, valor: 0 }]);
  const remover = (key) => setItens((prev) => prev.filter((i) => i.key !== key));
  const editar = (key, campo, valor) => setItens((prev) => prev.map((i) => (i.key === key ? { ...i, [campo]: valor } : i)));

  const totais = useMemo(() => {
    const totalHoras = itens.reduce((s, i) => s + Number(i.horas || 0), 0);
    const subtotal = itens.reduce((s, i) => s + Number(i.valor || 0), 0);
    const pct = Math.max(0, Math.min(100, parseFloat(descontoPct) || 0));
    const descontoValor = subtotal * (pct / 100);
    const total = subtotal - descontoValor;
    const valorHora = totalHoras > 0 ? total / totalHoras : 0;
    return { totalHoras, subtotal, pct, descontoValor, total, valorHora };
  }, [itens, descontoPct]);

  // Texto da proposta para WhatsApp / Email
  const montarTexto = () => {
    const linhas = itens.map((i) => `- ${i.nome || 'Item'}: ${Number(i.horas || 0)}h - ${fmtEUR(i.valor)}`).join('\n');
    const p = [];
    if (cliente.nome) p.push(`Ola ${cliente.nome}!`);
    p.push(`Proposta ${empresa}${nomePacote ? ' - ' + nomePacote : ''}:`);
    p.push(linhas);
    if (totais.pct > 0) p.push(`Subtotal: ${fmtEUR(totais.subtotal)} | Desconto ${totais.pct}%: -${fmtEUR(totais.descontoValor)}`);
    p.push(`Total: ${fmtEUR(totais.total)} (${totais.totalHoras}h)`);
    if (validade) p.push(`Proposta valida ate ${fmtDataBR(validade)}.`);
    return p.join('\n');
  };

  const enviarWhatsapp = () => {
    let tel = (cliente.telefone || '').replace(/\D/g, '');
    if (!tel) { alert('Informe o telefone do aluno (selecione o aluno ou preencha).'); return; }
    if (tel.length === 9) tel = '351' + tel; // assume Portugal se vier sem indicativo
    window.open(`https://wa.me/${tel}?text=${encodeURIComponent(montarTexto())}`, '_blank');
  };

  const enviarEmail = () => {
    if (!cliente.email) { alert('Informe o email do aluno (selecione o aluno ou preencha).'); return; }
    const assunto = `Proposta ${empresa}${nomePacote ? ' - ' + nomePacote : ''}`;
    window.location.href = `mailto:${cliente.email}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(montarTexto())}`;
  };

  const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 4, fontFamily: 'inherit', fontSize: 14, outline: 'none' };
  const thStyle = { textAlign: 'left', padding: '10px 12px', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.3, color: 'var(--text-tertiary)', background: 'var(--background)', borderBottom: '1px solid var(--border)' };
  const tdStyle = { padding: '8px 12px', borderBottom: '1px solid var(--border)' };

  return (
    <div>
      {/* Nome + adicionar */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 16 }}>
        <div style={{ flex: 2, minWidth: 200 }}>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Nome do Pacote</label>
          <input value={nomePacote} onChange={(e) => setNomePacote(e.target.value)} placeholder="Ex: Pacote Profissional MIG + TIG" style={inputStyle} />
        </div>
        <div style={{ flex: 2, minWidth: 200 }}>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Adicionar curso</label>
          <select value={addSel} onChange={(e) => addCurso(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
            <option value="">Selecione um curso...</option>
            {cursos.map((c) => <option key={c.id} value={c.id}>{c.nome} ({c.carga}h - {fmtEUR(c.valor)})</option>)}
          </select>
        </div>
        <button onClick={addManual} style={{ padding: '9px 14px', background: 'transparent', border: '1px solid var(--primary)', color: 'var(--primary)', borderRadius: 4, fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>+ Linha manual</button>
      </div>

      {/* Cliente + validade */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 16 }}>
        <div style={{ flex: 1, minWidth: 160 }}>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Aluno</label>
          <select value={cliente.id} onChange={(e) => escolherAluno(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
            <option value="">Selecione ou preencha...</option>
            {alunos.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 150 }}>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Email</label>
          <input value={cliente.email} onChange={(e) => setCliente({ ...cliente, email: e.target.value })} placeholder="email@exemplo.com" style={inputStyle} />
        </div>
        <div style={{ flex: 1, minWidth: 130 }}>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Telefone</label>
          <input value={cliente.telefone} onChange={(e) => setCliente({ ...cliente, telefone: e.target.value })} placeholder="+351 912 345 678" style={inputStyle} />
        </div>
        <div style={{ minWidth: 150 }}>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Validade da proposta</label>
          <input type="date" value={validade} onChange={(e) => setValidade(e.target.value)} style={inputStyle} />
        </div>
      </div>

      {/* Itens */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr>{['Item / Curso', 'Horas', 'Valor (EUR)', ''].map((h) => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
          <tbody>
            {itens.length ? itens.map((i) => (
              <tr key={i.key}>
                <td style={tdStyle}><input value={i.nome} onChange={(e) => editar(i.key, 'nome', e.target.value)} placeholder="Descricao" style={{ ...inputStyle, padding: '6px 10px' }} /></td>
                <td style={{ ...tdStyle, width: 110 }}><input type="number" min="0" value={i.horas} onChange={(e) => editar(i.key, 'horas', e.target.value)} style={{ ...inputStyle, padding: '6px 10px', width: 90 }} /></td>
                <td style={{ ...tdStyle, width: 140 }}><input type="number" min="0" step="0.01" value={i.valor} onChange={(e) => editar(i.key, 'valor', e.target.value)} style={{ ...inputStyle, padding: '6px 10px', width: 120 }} /></td>
                <td style={{ ...tdStyle, width: 40, textAlign: 'right' }}><button onClick={() => remover(i.key)} style={{ padding: '3px 8px', background: 'transparent', border: 'none', color: 'var(--danger)', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>x</button></td>
              </tr>
            )) : (
              <tr><td colSpan={4} style={{ padding: 20, textAlign: 'center', color: 'var(--text-tertiary)' }}>Adicione cursos ou linhas manuais para montar o pacote.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Totais */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Desconto (%)</label>
          <input type="number" min="0" max="100" step="0.5" value={descontoPct} onChange={(e) => setDescontoPct(e.target.value)} placeholder="0" style={{ ...inputStyle, maxWidth: 140 }} />
        </div>
        <div style={{ flex: 2, minWidth: 260, background: 'var(--background)', borderRadius: 8, padding: '14px 18px' }}>
          <Linha label="Total de Horas" valor={`${totais.totalHoras} h`} />
          <Linha label="Subtotal" valor={fmtEUR(totais.subtotal)} />
          {totais.pct > 0 && <Linha label={`Desconto (${totais.pct}%)`} valor={`- ${fmtEUR(totais.descontoValor)}`} cor="var(--danger)" />}
          <div style={{ borderTop: '2px solid var(--primary)', marginTop: 8, paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontWeight: 700, fontSize: 16 }}>Total do Pacote</span>
            <span style={{ fontWeight: 800, fontSize: 20, color: 'var(--primary)' }}>{fmtEUR(totais.total)}</span>
          </div>
          <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>Valor por hora: {fmtEUR(totais.valorHora)}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
        <button
          onClick={() => gerarProposta({ empresa, nomePacote, itens, totais, validade, cliente })}
          disabled={itens.length === 0}
          style={{ flex: 2, minWidth: 200, padding: 12, background: itens.length ? 'var(--primary)' : 'var(--border)', color: '#fff', border: 'none', borderRadius: 4, fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: itens.length ? 'pointer' : 'not-allowed' }}
        >
          Exportar PDF
        </button>
        <button
          onClick={enviarWhatsapp}
          disabled={itens.length === 0}
          style={{ flex: 1, minWidth: 130, padding: 12, background: itens.length ? '#25D366' : 'var(--border)', color: '#fff', border: 'none', borderRadius: 4, fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: itens.length ? 'pointer' : 'not-allowed' }}
        >
          WhatsApp
        </button>
        <button
          onClick={enviarEmail}
          disabled={itens.length === 0}
          style={{ flex: 1, minWidth: 130, padding: 12, background: 'transparent', color: 'var(--primary)', border: '1px solid var(--primary)', borderRadius: 4, fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: itens.length ? 'pointer' : 'not-allowed' }}
        >
          Email
        </button>
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 8 }}>WhatsApp e Email abrem com o texto da proposta pronto. Para anexar o documento, clique em Exportar PDF, guarde e anexe na mensagem.</p>
    </div>
  );
}

function Linha({ label, valor, cor }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 14 }}>
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontWeight: 600, color: cor || 'var(--text-primary)' }}>{valor}</span>
    </div>
  );
}

// ============================================================
// Pagina (aba propria)
// ============================================================
export default function CalculadoraPage() {
  const [empresa, setEmpresa] = useState('High Pro');
  useEffect(() => { configApi.carregar().then((c) => c?.sistemaNome && setEmpresa(c.sistemaNome)).catch(() => {}); }, []);

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', padding: 24, maxWidth: 900 }}>
        <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>Calculadora de Pacotes</div>
        <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 20 }}>Combine cursos e valores num pacote personalizado.</div>
        <CalculadoraPacotes empresa={empresa} />
      </div>
    </div>
  );
}

// ============================================================
// Documento PDF: proposta / orcamento do pacote
// ============================================================
function gerarProposta({ empresa, nomePacote, itens, totais, validade, cliente }) {
  const num = `PROP ${new Date().getFullYear()}/${uid().slice(-4).toUpperCase()}`;
  const hoje = new Date().toLocaleDateString('pt-PT');
  const validadeFmt = validade ? fmtDataBR(validade) : '';
  const cli = cliente || {};
  const logoUrl = `${window.location.origin}/images/logo-highpro.svg`;

  const linhas = itens.map((i) => `
    <tr>
      <td>${escapeHtml(i.nome || 'Item')}</td>
      <td class="c">${Number(i.horas || 0)} h</td>
      <td class="r">${fmtEUR(i.valor)}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html><html lang="pt-PT"><head><meta charset="UTF-8">
  <title>${escapeHtml(num)}</title>
  <style>
    @font-face { font-family:'Clear Sans'; font-weight:700; src:url('${window.location.origin}/fonts/ClearSans-Bold.woff') format('woff'); }
    @font-face { font-family:'Clear Sans'; font-weight:400; src:url('${window.location.origin}/fonts/ClearSans-Regular.woff') format('woff'); }
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color:#323338; padding:40px; font-size:14px; }
    .head { display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid #0073EA; padding-bottom:20px; margin-bottom:24px; }
    .head img { height:110px; }
    .empresa { font-family:'Clear Sans','Segoe UI',Arial,sans-serif; font-size:38px; font-weight:700; color:#111111; letter-spacing:-0.5px; line-height:1; }
    .empresa small { display:block; font-family:'Clear Sans','Segoe UI',Arial,sans-serif; font-weight:400; color:#676879; font-size:16px; letter-spacing:1px; text-transform:uppercase; margin-top:6px; }
    .doc { text-align:right; }
    .doc h1 { font-size:20px; }
    .doc p { color:#676879; font-size:13px; margin-top:4px; }
    .box { background:#F5F7FC; border-radius:8px; padding:16px 20px; margin-bottom:24px; }
    .box .lbl { font-size:11px; text-transform:uppercase; letter-spacing:.5px; color:#9699A6; }
    .box .val { font-size:18px; font-weight:700; color:#0073EA; }
    table { width:100%; border-collapse:collapse; margin-bottom:24px; }
    th { text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:.3px; color:#9699A6; border-bottom:2px solid #E6E9EF; padding:10px 8px; }
    td { padding:10px 8px; border-bottom:1px solid #E6E9EF; }
    .c { text-align:center; } .r { text-align:right; }
    .totais { margin-left:auto; width:300px; }
    .totais .row { display:flex; justify-content:space-between; padding:6px 0; }
    .totais .grand { border-top:2px solid #0073EA; margin-top:6px; padding-top:10px; font-size:20px; font-weight:800; color:#0073EA; }
    .foot { margin-top:40px; text-align:center; color:#9699A6; font-size:12px; border-top:1px solid #E6E9EF; padding-top:16px; }
    @media print { body { padding:20px; } .noprint { display:none; } }
  </style></head><body>
    <div class="head">
      <div style="display:flex; gap:14px; align-items:center;">
        <img src="${logoUrl}" alt="" onerror="this.style.display='none'"/>
        <div class="empresa">${escapeHtml(empresa)}<small>Escola de Solda</small></div>
      </div>
      <div class="doc"><h1>PROPOSTA</h1><p>${escapeHtml(num)}</p><p>Data: ${hoje}</p>${validadeFmt ? `<p style="color:#E2445C; font-weight:600;">Valida ate: ${validadeFmt}</p>` : ''}</div>
    </div>

    ${cli.nome ? `<div class="box">
      <div class="lbl">Aluno</div>
      <div class="val" style="color:#323338; font-size:16px;">${escapeHtml(cli.nome)}</div>
      ${cli.telefone ? `<div style="color:#676879; font-size:13px;">${escapeHtml(cli.telefone)}</div>` : ''}
      ${cli.email ? `<div style="color:#676879; font-size:13px;">${escapeHtml(cli.email)}</div>` : ''}
    </div>` : ''}

    <div class="box">
      <div class="lbl">Pacote</div>
      <div class="val">${escapeHtml(nomePacote || 'Pacote Personalizado')}</div>
      <div style="color:#676879; font-size:13px; margin-top:6px;">Carga horaria total: ${totais.totalHoras} horas</div>
    </div>

    <table>
      <thead><tr><th>Curso / Item</th><th class="c">Horas</th><th class="r">Valor</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table>

    <div class="totais">
      <div class="row"><span>Subtotal</span><span>${fmtEUR(totais.subtotal)}</span></div>
      ${totais.pct > 0 ? `<div class="row"><span>Desconto (${totais.pct}%)</span><span>- ${fmtEUR(totais.descontoValor)}</span></div>` : ''}
      <div class="row grand"><span>Total</span><span>${fmtEUR(totais.total)}</span></div>
      <div class="row" style="color:#9699A6; font-size:12px;"><span>Valor por hora</span><span>${fmtEUR(totais.valorHora)}</span></div>
    </div>

    <div class="foot">Proposta gerada por ${escapeHtml(empresa)} em ${hoje}.${validadeFmt ? ` Valida ate ${validadeFmt}.` : ''} Valores sujeitos a confirmacao.</div>

    <div class="noprint" style="text-align:center; margin-top:30px;">
      <button onclick="window.print()" style="padding:10px 24px; background:#0073EA; color:#fff; border:none; border-radius:6px; font-size:14px; cursor:pointer;">Imprimir / Guardar PDF</button>
    </div>
    <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 400); };</script>
  </body></html>`;

  const w = window.open('', '_blank');
  if (!w) { alert('Permita pop-ups para gerar a proposta.'); return; }
  w.document.write(html);
  w.document.close();
}

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
