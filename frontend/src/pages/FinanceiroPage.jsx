import React, { useEffect, useState, useCallback } from 'react';
import { alunos as alunosApi, lancamentos as lancApi, config as configApi } from '../services/api';
import Modal from '../components/Modal';

const METODOS = ['Dinheiro', 'MB Way', 'Transferencia', 'Multibanco', 'Cartao', 'Outro'];

const fmtEUR = (v) => `EUR ${Number(v || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const hojeStr = () => new Date().toISOString().split('T')[0];
const fmtData = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-PT') : '--');
const primeiroDiaMesStr = () => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; };

export default function FinanceiroPage() {
  const [alunos, setAlunos] = useState([]);
  const [lancs, setLancs] = useState([]);
  const [empresa, setEmpresa] = useState('High Pro');
  const [busca, setBusca] = useState('');
  const [sel, setSel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [periodoInicio, setPeriodoInicio] = useState(primeiroDiaMesStr());
  const [periodoFim, setPeriodoFim] = useState(hojeStr());

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [a, l, c] = await Promise.all([
        alunosApi.listar().catch(() => []),
        lancApi.listar().catch(() => []),
        configApi.carregar().catch(() => ({})),
      ]);
      setAlunos(a || []);
      setLancs(l || []);
      if (c?.sistemaNome) setEmpresa(c.sistemaNome);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // Mapa aluno -> lancamentos
  const porAluno = {};
  lancs.forEach((l) => { (porAluno[l.aluno_id] = porAluno[l.aluno_id] || []).push(l); });

  const totalCursos = alunos.reduce((s, a) => s + Number(a.cursos?.valor || 0), 0);
  const totalRegistado = lancs.reduce((s, l) => s + Number(l.valor || 0), 0);

  const linhas = alunos
    .filter((a) => a.curso_id || porAluno[a.id])
    .map((a) => {
      const ls = porAluno[a.id] || [];
      const registado = ls.reduce((s, l) => s + Number(l.valor || 0), 0);
      const valorCurso = Number(a.cursos?.valor || 0);
      return { aluno: a, lancamentos: ls, registado, valorCurso, saldo: valorCurso - registado };
    })
    .filter((l) => !busca || l.aluno.nome.toLowerCase().includes(busca.toLowerCase()))
    .sort((x, y) => y.registado - x.registado);

  // Sincroniza a linha aberta apos recarregar
  useEffect(() => {
    if (!sel) return;
    const nova = linhas.find((l) => l.aluno.id === sel.aluno.id);
    if (nova) setSel(nova);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lancs]);

  const cards = [
    { label: 'Alunos com Curso', value: alunos.filter((a) => a.curso_id).length, color: '#0073EA' },
    { label: 'Valor dos Cursos', value: fmtEUR(totalCursos), color: '#9B59B6' },
    { label: 'Total Registado', value: fmtEUR(totalRegistado), color: '#00C875' },
  ];

  const thStyle = { textAlign: 'left', padding: '12px 16px', fontWeight: 500, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.3, color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border)', background: 'var(--background)' };
  const tdStyle = { padding: '10px 16px', borderBottom: '1px solid var(--border)' };

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 20 }}>
        {cards.map((c) => (
          <div key={c.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, display: 'inline-block' }} />
              {c.label}
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', marginBottom: 16, padding: '14px 20px', display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>Relatorio por periodo — de</label>
          <input type="date" value={periodoInicio} onChange={(e) => setPeriodoInicio(e.target.value)} style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 4, fontFamily: 'inherit', fontSize: 14, outline: 'none' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>ate</label>
          <input type="date" value={periodoFim} onChange={(e) => setPeriodoFim(e.target.value)} style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 4, fontFamily: 'inherit', fontSize: 14, outline: 'none' }} />
        </div>
        <button
          onClick={() => gerarRelatorioPeriodo({ empresa, lancamentos: lancs, inicio: periodoInicio, fim: periodoFim })}
          disabled={!periodoInicio || !periodoFim}
          style={{ padding: '9px 16px', background: periodoInicio && periodoFim ? 'var(--primary)' : 'var(--border)', color: '#fff', border: 'none', borderRadius: 4, fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: periodoInicio && periodoFim ? 'pointer' : 'not-allowed' }}
        >
          Gerar Relatorio (PDF)
        </button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <input placeholder="Buscar aluno..." value={busca} onChange={(e) => setBusca(e.target.value)} style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 4, fontFamily: 'inherit', fontSize: 14, outline: 'none', minWidth: 240 }} />
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 500 }}>Registo Financeiro por Aluno</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr>{['Aluno', 'Curso', 'Valor do Curso', 'Registado', 'Saldo', 'Lanc.', ''].map((h) => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: 'var(--text-tertiary)' }}>A carregar...</td></tr>
              ) : linhas.length ? linhas.map((l) => (
                <tr key={l.aluno.id} style={{ cursor: 'pointer' }} onClick={() => setSel(l)}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{l.aluno.nome}</td>
                  <td style={tdStyle}>{l.aluno.cursos?.nome || '--'}</td>
                  <td style={tdStyle}>{l.valorCurso ? fmtEUR(l.valorCurso) : '--'}</td>
                  <td style={{ ...tdStyle, color: '#00A86B', fontWeight: 600 }}>{fmtEUR(l.registado)}</td>
                  <td style={{ ...tdStyle, color: l.valorCurso && l.saldo > 0 ? 'var(--text-secondary)' : 'var(--text-tertiary)' }}>{l.valorCurso ? fmtEUR(l.saldo) : '--'}</td>
                  <td style={tdStyle}>{l.lancamentos.length}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--primary)', fontWeight: 500 }}>Abrir</td>
                </tr>
              )) : (
                <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: 'var(--text-tertiary)' }}>Nenhum aluno. Atribua um curso a um aluno para o registar aqui.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {sel && (
        <AlunoExtratoModal linha={sel} empresa={empresa} onClose={() => setSel(null)} onChange={carregar} />
      )}
    </div>
  );
}

// ============================================================
// Modal: extrato interno de um aluno
// ============================================================
function AlunoExtratoModal({ linha, empresa, onClose, onChange }) {
  const { aluno, lancamentos, registado, valorCurso, saldo } = linha;
  const [novo, setNovo] = useState({ data: hojeStr(), descricao: '', valor: '', metodo: 'Dinheiro' });
  const [busy, setBusy] = useState(false);

  const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 4, fontFamily: 'inherit', fontSize: 14, outline: 'none' };

  const add = async () => {
    if (!novo.valor) { alert('Informe o valor.'); return; }
    setBusy(true);
    try {
      await lancApi.criar({ alunoId: aluno.id, data: novo.data, descricao: novo.descricao || 'Pagamento', valor: novo.valor, metodo: novo.metodo });
      setNovo({ data: hojeStr(), descricao: '', valor: '', metodo: 'Dinheiro' });
      await onChange();
    } catch (e) { alert(e.message || 'Erro'); }
    finally { setBusy(false); }
  };

  const excluir = async (l) => {
    if (!confirm('Remover este lancamento?')) return;
    setBusy(true);
    try { await lancApi.excluir(l.id); await onChange(); }
    catch (e) { alert(e.message || 'Erro'); }
    finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title={`Financeiro - ${aluno.nome}`} maxWidth={700}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { l: 'Valor do Curso', v: valorCurso ? fmtEUR(valorCurso) : '--', c: 'var(--text-primary)' },
          { l: 'Registado', v: fmtEUR(registado), c: '#00A86B' },
          { l: 'Saldo', v: valorCurso ? fmtEUR(saldo) : '--', c: 'var(--text-secondary)' },
        ].map((x) => (
          <div key={x.l} style={{ background: 'var(--background)', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{x.l}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: x.c }}>{x.v}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
        Curso: <strong>{aluno.cursos?.nome || '--'}</strong>
      </div>

      {/* Historico */}
      {lancamentos.length > 0 ? (
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr>{['Data', 'Descricao', 'Metodo', 'Valor', ''].map((h) => <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontSize: 11, textTransform: 'uppercase', color: 'var(--text-tertiary)', background: 'var(--background)', borderBottom: '1px solid var(--border)' }}>{h}</th>)}</tr></thead>
            <tbody>
              {lancamentos.map((l) => (
                <tr key={l.id}>
                  <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)' }}>{fmtData(l.data)}</td>
                  <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)' }}>{l.descricao || '--'}</td>
                  <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>{l.metodo || '--'}</td>
                  <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>{fmtEUR(l.valor)}</td>
                  <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>
                    <button onClick={() => excluir(l)} disabled={busy} style={{ padding: '3px 8px', background: 'transparent', border: 'none', color: 'var(--danger)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>x</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-tertiary)', background: 'var(--background)', borderRadius: 8, marginBottom: 16 }}>Sem lancamentos ainda.</div>
      )}

      {/* Adicionar lancamento */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ minWidth: 140 }}>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Data</label>
          <input type="date" value={novo.data} onChange={(e) => setNovo({ ...novo, data: e.target.value })} style={{ ...inputStyle, width: 160 }} />
        </div>
        <div style={{ flex: 2, minWidth: 140 }}>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Descricao</label>
          <input value={novo.descricao} onChange={(e) => setNovo({ ...novo, descricao: e.target.value })} placeholder="Ex: Entrada, Matricula, Parcela..." style={inputStyle} />
        </div>
        <div style={{ minWidth: 100 }}>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Valor (EUR)</label>
          <input type="number" step="0.01" min="0" value={novo.valor} onChange={(e) => setNovo({ ...novo, valor: e.target.value })} style={{ ...inputStyle, width: 110 }} />
        </div>
        <div style={{ minWidth: 120 }}>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Metodo</label>
          <select value={novo.metodo} onChange={(e) => setNovo({ ...novo, metodo: e.target.value })} style={{ ...inputStyle, width: 140, cursor: 'pointer' }}>
            {METODOS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>
        <button onClick={add} disabled={busy} style={{ padding: '9px 14px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 4, fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>+ Registar</button>
      </div>

      <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
        <button onClick={() => gerarDocumento({ empresa, aluno, lancamentos, registado, valorCurso })} disabled={lancamentos.length === 0} style={{ flex: 1, padding: 11, background: lancamentos.length ? 'var(--primary)' : 'var(--border)', color: '#fff', border: 'none', borderRadius: 4, fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: lancamentos.length ? 'pointer' : 'not-allowed' }}>
          Exportar Comprovativo (PDF)
        </button>
        <button onClick={onClose} style={{ padding: '11px 20px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 4, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer' }}>Fechar</button>
      </div>
    </Modal>
  );
}

// ============================================================
// Documento PDF (comprovativo/extrato) com logo e nome da empresa
// ============================================================
function gerarDocumento({ empresa, aluno, lancamentos, registado, valorCurso }) {
  const num = `EXT ${new Date().getFullYear()}/${String(aluno.id).padStart(4, '0')}`;
  const hoje = new Date().toLocaleDateString('pt-PT');
  const logoUrl = `${window.location.origin}/images/logo-highpro.svg`;

  const linhas = lancamentos.map((l) => `
    <tr>
      <td>${l.data ? new Date(l.data + 'T00:00:00').toLocaleDateString('pt-PT') : '--'}</td>
      <td>${escapeHtml(l.descricao || 'Pagamento')}</td>
      <td>${escapeHtml(l.metodo || '--')}</td>
      <td class="r">${fmtEUR(l.valor)}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html><html lang="pt-PT"><head><meta charset="UTF-8">
  <title>${escapeHtml(num)} - ${escapeHtml(aluno.nome)}</title>
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
    .doc h1 { font-size:20px; color:#323338; }
    .doc p { color:#676879; font-size:13px; margin-top:4px; }
    .box { background:#F5F7FC; border-radius:8px; padding:16px 20px; margin-bottom:24px; }
    .box .lbl { font-size:11px; text-transform:uppercase; letter-spacing:.5px; color:#9699A6; }
    .box .val { font-size:16px; font-weight:600; }
    table { width:100%; border-collapse:collapse; margin-bottom:24px; }
    th { text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:.3px; color:#9699A6; border-bottom:2px solid #E6E9EF; padding:10px 8px; }
    td { padding:10px 8px; border-bottom:1px solid #E6E9EF; }
    .r { text-align:right; }
    .totais { margin-left:auto; width:280px; }
    .totais .row { display:flex; justify-content:space-between; padding:6px 0; }
    .totais .grand { border-top:2px solid #0073EA; margin-top:6px; padding-top:10px; font-size:18px; font-weight:800; }
    .foot { margin-top:40px; text-align:center; color:#9699A6; font-size:12px; border-top:1px solid #E6E9EF; padding-top:16px; }
    @media print { body { padding:20px; } .noprint { display:none; } }
  </style></head><body>
    <div class="head">
      <div style="display:flex; gap:14px; align-items:center;">
        <img src="${logoUrl}" alt="" onerror="this.style.display='none'"/>
        <div class="empresa">${escapeHtml(empresa)}<small>Escola de Solda</small></div>
      </div>
      <div class="doc"><h1>COMPROVATIVO</h1><p>${escapeHtml(num)}</p><p>Data: ${hoje}</p></div>
    </div>

    <div class="box">
      <div class="lbl">Aluno</div>
      <div class="val">${escapeHtml(aluno.nome)}</div>
      ${aluno.telefone ? `<div style="color:#676879; font-size:13px;">${escapeHtml(aluno.telefone)}</div>` : ''}
      ${aluno.cursos?.nome ? `<div style="color:#676879; font-size:13px; margin-top:6px;">Curso: ${escapeHtml(aluno.cursos.nome)}${valorCurso ? ' &middot; ' + fmtEUR(valorCurso) : ''}</div>` : ''}
    </div>

    <table>
      <thead><tr><th>Data</th><th>Descricao</th><th>Metodo</th><th class="r">Valor</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table>

    <div class="totais">
      <div class="row grand"><span>Total Registado</span><span>${fmtEUR(registado)}</span></div>
    </div>

    <div class="foot">Documento interno gerado por ${escapeHtml(empresa)} em ${hoje}.</div>

    <div class="noprint" style="text-align:center; margin-top:30px;">
      <button onclick="window.print()" style="padding:10px 24px; background:#0073EA; color:#fff; border:none; border-radius:6px; font-size:14px; cursor:pointer;">Imprimir / Guardar PDF</button>
    </div>
    <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 400); };</script>
  </body></html>`;

  const w = window.open('', '_blank');
  if (!w) { alert('Permita pop-ups para gerar o documento.'); return; }
  w.document.write(html);
  w.document.close();
}

// ============================================================
// Documento PDF: relatorio de lancamentos por periodo (todos os alunos)
// ============================================================
function gerarRelatorioPeriodo({ empresa, lancamentos, inicio, fim }) {
  const doPeriodo = (lancamentos || [])
    .filter((l) => (l.data || '') >= inicio && (l.data || '') <= fim)
    .sort((a, b) => (a.data || '').localeCompare(b.data || '') || (a.id - b.id));

  const num = `REL ${new Date().getFullYear()}/${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const hoje = new Date().toLocaleDateString('pt-PT');
  const logoUrl = `${window.location.origin}/images/logo-highpro.svg`;
  const totalPeriodo = doPeriodo.reduce((s, l) => s + Number(l.valor || 0), 0);

  const porAluno = {};
  doPeriodo.forEach((l) => {
    const nome = l.aluno?.nome || 'Sem aluno';
    porAluno[nome] = (porAluno[nome] || 0) + Number(l.valor || 0);
  });
  const resumoAlunos = Object.entries(porAluno).sort((a, b) => b[1] - a[1]);

  const linhas = doPeriodo.map((l) => `
    <tr>
      <td>${fmtData(l.data)}</td>
      <td>${escapeHtml(l.aluno?.nome || '--')}</td>
      <td>${escapeHtml(l.descricao || 'Pagamento')}</td>
      <td>${escapeHtml(l.metodo || '--')}</td>
      <td class="r">${fmtEUR(l.valor)}</td>
    </tr>`).join('');

  const resumoLinhas = resumoAlunos.map(([nome, total]) => `
    <tr><td>${escapeHtml(nome)}</td><td class="r">${fmtEUR(total)}</td></tr>`).join('');

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
    .doc h1 { font-size:20px; color:#323338; }
    .doc p { color:#676879; font-size:13px; margin-top:4px; }
    .box { background:#F5F7FC; border-radius:8px; padding:16px 20px; margin-bottom:24px; }
    .box .lbl { font-size:11px; text-transform:uppercase; letter-spacing:.5px; color:#9699A6; }
    .box .val { font-size:18px; font-weight:700; color:#0073EA; }
    table { width:100%; border-collapse:collapse; margin-bottom:24px; }
    th { text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:.3px; color:#9699A6; border-bottom:2px solid #E6E9EF; padding:10px 8px; }
    td { padding:10px 8px; border-bottom:1px solid #E6E9EF; }
    .r { text-align:right; }
    .totais { margin-left:auto; width:280px; }
    .totais .row { display:flex; justify-content:space-between; padding:6px 0; }
    .totais .grand { border-top:2px solid #0073EA; margin-top:6px; padding-top:10px; font-size:20px; font-weight:800; color:#0073EA; }
    .section-title { font-weight:700; font-size:15px; margin:0 0 10px; color:#323338; }
    .foot { margin-top:40px; text-align:center; color:#9699A6; font-size:12px; border-top:1px solid #E6E9EF; padding-top:16px; }
    @media print { body { padding:20px; } .noprint { display:none; } }
  </style></head><body>
    <div class="head">
      <div style="display:flex; gap:14px; align-items:center;">
        <img src="${logoUrl}" alt="" onerror="this.style.display='none'"/>
        <div class="empresa">${escapeHtml(empresa)}<small>Escola de Solda</small></div>
      </div>
      <div class="doc"><h1>RELATORIO FINANCEIRO</h1><p>${escapeHtml(num)}</p><p>Data: ${hoje}</p></div>
    </div>

    <div class="box">
      <div class="lbl">Periodo</div>
      <div class="val">${fmtData(inicio)} a ${fmtData(fim)}</div>
      <div style="color:#676879; font-size:13px; margin-top:6px;">${doPeriodo.length} lancamento(s) · ${resumoAlunos.length} aluno(s)</div>
    </div>

    <div class="section-title">Lancamentos do Periodo</div>
    <table>
      <thead><tr><th>Data</th><th>Aluno</th><th>Descricao</th><th>Metodo</th><th class="r">Valor</th></tr></thead>
      <tbody>${linhas.length ? linhas : '<tr><td colspan="5" style="text-align:center; color:#9699A6; padding:20px;">Nenhum lancamento neste periodo.</td></tr>'}</tbody>
    </table>

    ${resumoAlunos.length > 1 ? `
    <div class="section-title">Resumo por Aluno</div>
    <table>
      <thead><tr><th>Aluno</th><th class="r">Total no periodo</th></tr></thead>
      <tbody>${resumoLinhas}</tbody>
    </table>` : ''}

    <div class="totais">
      <div class="row grand"><span>Total do Periodo</span><span>${fmtEUR(totalPeriodo)}</span></div>
    </div>

    <div class="foot">Relatorio interno gerado por ${escapeHtml(empresa)} em ${hoje}.</div>

    <div class="noprint" style="text-align:center; margin-top:30px;">
      <button onclick="window.print()" style="padding:10px 24px; background:#0073EA; color:#fff; border:none; border-radius:6px; font-size:14px; cursor:pointer;">Imprimir / Guardar PDF</button>
    </div>
    <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 400); };</script>
  </body></html>`;

  const w = window.open('', '_blank');
  if (!w) { alert('Permita pop-ups para gerar o relatorio.'); return; }
  w.document.write(html);
  w.document.close();
}

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
