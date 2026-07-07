import React, { useEffect, useState, useCallback } from 'react';
import { alunos as alunosApi, pagamentos as pagApi, config as configApi } from '../services/api';
import Modal from '../components/Modal';

const METODOS = ['Dinheiro', 'MB Way', 'Transferencia', 'Multibanco', 'Cartao'];

const fmtEUR = (v) => `EUR ${Number(v || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const hojeStr = () => new Date().toISOString().split('T')[0];
const fmtData = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-PT') : '--');

// Estado de uma parcela: pago / atraso / pendente
function statusParcela(p) {
  if (p.pago) return { label: 'Pago', bg: '#E6F9F3', color: '#00A86B' };
  if (p.vencimento && p.vencimento < hojeStr()) return { label: 'Em Atraso', bg: '#FFE6E9', color: '#E2445C' };
  return { label: 'Pendente', bg: '#FFF9E6', color: '#B8860B' };
}

export default function FinanceiroPage() {
  const [alunos, setAlunos] = useState([]);
  const [pags, setPags] = useState([]);
  const [empresa, setEmpresa] = useState('High Pro');
  const [sel, setSel] = useState(null); // aluno selecionado no modal
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [a, p, c] = await Promise.all([
        alunosApi.listar().catch(() => []),
        pagApi.listar().catch(() => []),
        configApi.carregar().catch(() => ({})),
      ]);
      setAlunos(a || []);
      setPags(p || []);
      if (c?.sistemaNome) setEmpresa(c.sistemaNome);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // Agregacoes ---------------------------------------------------
  const totalPrevisto = pags.reduce((s, p) => s + Number(p.valor || 0), 0);
  const totalRecebido = pags.reduce((s, p) => s + (p.pago ? Number(p.valor || 0) : 0), 0);
  const totalPendente = totalPrevisto - totalRecebido;
  const totalAtraso = pags.reduce((s, p) => s + (!p.pago && p.vencimento && p.vencimento < hojeStr() ? Number(p.valor || 0) : 0), 0);

  // Mapa aluno -> parcelas
  const porAluno = {};
  pags.forEach((p) => {
    (porAluno[p.aluno_id] = porAluno[p.aluno_id] || []).push(p);
  });

  // Linhas da tabela: alunos que tem curso OU tem parcelas
  const linhas = alunos
    .filter((a) => a.curso_id || porAluno[a.id])
    .map((a) => {
      const ps = porAluno[a.id] || [];
      const total = ps.reduce((s, p) => s + Number(p.valor || 0), 0);
      const pago = ps.reduce((s, p) => s + (p.pago ? Number(p.valor || 0) : 0), 0);
      const temAtraso = ps.some((p) => !p.pago && p.vencimento && p.vencimento < hojeStr());
      return { aluno: a, parcelas: ps, total, pago, pendente: total - pago, temAtraso, valorCurso: Number(a.cursos?.valor || 0) };
    })
    .sort((x, y) => y.pendente - x.pendente);

  const cards = [
    { label: 'Receita Prevista', value: fmtEUR(totalPrevisto), color: '#0073EA' },
    { label: 'Recebido', value: fmtEUR(totalRecebido), color: '#00C875' },
    { label: 'Pendente', value: fmtEUR(totalPendente), color: '#FFCB00' },
    { label: 'Em Atraso', value: fmtEUR(totalAtraso), color: '#E2445C' },
  ];

  const abrirAluno = (linha) => setSel(linha);
  const recarregarSel = async () => {
    await carregar();
  };

  // Sincroniza a linha selecionada apos recarregar
  useEffect(() => {
    if (!sel) return;
    const nova = linhas.find((l) => l.aluno.id === sel.aluno.id);
    if (nova) setSel(nova);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pags]);

  const thStyle = { textAlign: 'left', padding: '12px 16px', fontWeight: 500, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.3, color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border)', background: 'var(--background)' };
  const tdStyle = { padding: '10px 16px', borderBottom: '1px solid var(--border)' };

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      {/* Cards resumo */}
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

      {/* Tabela de alunos */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 500 }}>Financeiro por Aluno</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr>{['Aluno', 'Curso', 'Total', 'Pago', 'Pendente', 'Estado', ''].map((h) => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: 'var(--text-tertiary)' }}>A carregar...</td></tr>
              ) : linhas.length ? linhas.map((l) => (
                <tr key={l.aluno.id} style={{ cursor: 'pointer' }} onClick={() => abrirAluno(l)}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{l.aluno.nome}</td>
                  <td style={tdStyle}>{l.aluno.cursos?.nome || '--'}</td>
                  <td style={tdStyle}>{fmtEUR(l.total)}</td>
                  <td style={{ ...tdStyle, color: '#00A86B', fontWeight: 600 }}>{fmtEUR(l.pago)}</td>
                  <td style={{ ...tdStyle, color: l.pendente > 0 ? '#E2445C' : 'var(--text-secondary)', fontWeight: 600 }}>{fmtEUR(l.pendente)}</td>
                  <td style={tdStyle}>
                    {l.parcelas.length === 0
                      ? <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: 'var(--background)', color: 'var(--text-tertiary)' }}>Sem plano</span>
                      : l.pendente <= 0
                        ? <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#E6F9F3', color: '#00A86B' }}>Liquidado</span>
                        : l.temAtraso
                          ? <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#FFE6E9', color: '#E2445C' }}>Em Atraso</span>
                          : <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#FFF9E6', color: '#B8860B' }}>A pagar</span>}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--primary)', fontWeight: 500 }}>Gerir</td>
                </tr>
              )) : (
                <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: 'var(--text-tertiary)' }}>Nenhum aluno com curso. Atribua um curso a um aluno para gerir o financeiro.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {sel && (
        <AlunoFinanceiroModal
          linha={sel}
          empresa={empresa}
          onClose={() => setSel(null)}
          onChange={recarregarSel}
        />
      )}
    </div>
  );
}

// ============================================================
// Modal de gestao financeira de um aluno
// ============================================================
function AlunoFinanceiroModal({ linha, empresa, onClose, onChange }) {
  const { aluno, parcelas, total, pago, pendente, valorCurso } = linha;
  const [nParcelas, setNParcelas] = useState(1);
  const [primeiroVenc, setPrimeiroVenc] = useState(hojeStr());
  const [novo, setNovo] = useState({ descricao: '', valor: '', vencimento: hojeStr() });
  const [busy, setBusy] = useState(false);

  const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 4, fontFamily: 'inherit', fontSize: 14, outline: 'none' };

  const gerarPlano = async () => {
    const base = valorCurso > 0 ? valorCurso : parseFloat(novo.valor) || 0;
    if (!base) { alert('Defina o valor do curso do aluno ou use "adicionar parcela".'); return; }
    const n = Math.max(1, parseInt(nParcelas) || 1);
    const parcela = Math.floor((base / n) * 100) / 100;
    const parcelasArr = [];
    let acumulado = 0;
    const inicio = new Date(primeiroVenc + 'T00:00:00');
    for (let i = 0; i < n; i++) {
      const venc = new Date(inicio);
      venc.setMonth(venc.getMonth() + i);
      const valor = i === n - 1 ? Math.round((base - acumulado) * 100) / 100 : parcela;
      acumulado += parcela;
      parcelasArr.push({
        descricao: n > 1 ? `Parcela ${i + 1}/${n}` : 'Pagamento unico',
        valor,
        vencimento: venc.toISOString().split('T')[0],
      });
    }
    setBusy(true);
    try {
      await pagApi.criarPlano(aluno.id, parcelasArr);
      await onChange();
    } catch (e) { alert(e.message || 'Erro ao gerar plano'); }
    finally { setBusy(false); }
  };

  const addParcela = async () => {
    if (!novo.valor) { alert('Informe o valor.'); return; }
    setBusy(true);
    try {
      await pagApi.criar({ alunoId: aluno.id, descricao: novo.descricao || 'Pagamento', valor: novo.valor, vencimento: novo.vencimento });
      setNovo({ descricao: '', valor: '', vencimento: hojeStr() });
      await onChange();
    } catch (e) { alert(e.message || 'Erro'); }
    finally { setBusy(false); }
  };

  const togglePago = async (p) => {
    setBusy(true);
    try {
      let metodo = null;
      if (!p.pago) { metodo = prompt('Metodo de pagamento (Dinheiro, MB Way, Transferencia, Multibanco, Cartao):', 'Dinheiro') || null; }
      await pagApi.marcarPago(p.id, !p.pago, metodo);
      await onChange();
    } catch (e) { alert(e.message || 'Erro'); }
    finally { setBusy(false); }
  };

  const excluir = async (p) => {
    if (!confirm('Remover esta parcela?')) return;
    setBusy(true);
    try { await pagApi.excluir(p.id); await onChange(); }
    catch (e) { alert(e.message || 'Erro'); }
    finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title={`Financeiro - ${aluno.nome}`} maxWidth={720}>
      {/* Resumo do aluno */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { l: 'Total', v: fmtEUR(total), c: 'var(--text-primary)' },
          { l: 'Pago', v: fmtEUR(pago), c: '#00A86B' },
          { l: 'Pendente', v: fmtEUR(pendente), c: pendente > 0 ? '#E2445C' : 'var(--text-secondary)' },
        ].map((x) => (
          <div key={x.l} style={{ background: 'var(--background)', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{x.l}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: x.c }}>{x.v}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
        Curso: <strong>{aluno.cursos?.nome || '--'}</strong> &middot; Valor do curso: <strong>{fmtEUR(valorCurso)}</strong>
      </div>

      {/* Gerar plano (se ainda nao ha parcelas) */}
      {parcelas.length === 0 && (
        <div style={{ border: '1px dashed var(--border)', borderRadius: 8, padding: 16, marginBottom: 16, background: 'var(--primary-highlighted)' }}>
          <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 14 }}>Gerar plano de pagamento</div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Nº de parcelas</label>
              <input type="number" min="1" max="36" value={nParcelas} onChange={(e) => setNParcelas(e.target.value)} style={{ ...inputStyle, width: 110 }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>1º vencimento</label>
              <input type="date" value={primeiroVenc} onChange={(e) => setPrimeiroVenc(e.target.value)} style={{ ...inputStyle, width: 160 }} />
            </div>
            <button onClick={gerarPlano} disabled={busy} style={{ padding: '9px 16px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 4, fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>
              Gerar {valorCurso > 0 ? `(${fmtEUR(valorCurso)})` : ''}
            </button>
          </div>
        </div>
      )}

      {/* Lista de parcelas */}
      {parcelas.length > 0 && (
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr>{['Descricao', 'Vencimento', 'Valor', 'Estado', 'Acoes'].map((h) => <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontSize: 11, textTransform: 'uppercase', color: 'var(--text-tertiary)', background: 'var(--background)', borderBottom: '1px solid var(--border)' }}>{h}</th>)}</tr></thead>
            <tbody>
              {parcelas.map((p) => {
                const s = statusParcela(p);
                return (
                  <tr key={p.id}>
                    <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)' }}>{p.descricao || 'Pagamento'}{p.pago && p.metodo ? <span style={{ color: 'var(--text-tertiary)', fontSize: 11 }}> &middot; {p.metodo}</span> : ''}</td>
                    <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)' }}>{fmtData(p.vencimento)}</td>
                    <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>{fmtEUR(p.valor)}</td>
                    <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)' }}><span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color }}>{s.label}</span></td>
                    <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                      <button onClick={() => togglePago(p)} disabled={busy} style={{ padding: '3px 10px', background: p.pago ? 'transparent' : 'var(--success)', color: p.pago ? 'var(--text-secondary)' : '#fff', border: p.pago ? '1px solid var(--border)' : 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', marginRight: 6 }}>{p.pago ? 'Desfazer' : 'Marcar pago'}</button>
                      <button onClick={() => excluir(p)} disabled={busy} style={{ padding: '3px 8px', background: 'transparent', border: 'none', color: 'var(--danger)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>x</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Adicionar parcela avulsa */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ flex: 2, minWidth: 140 }}>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Descricao</label>
          <input value={novo.descricao} onChange={(e) => setNovo({ ...novo, descricao: e.target.value })} placeholder="Ex: Matricula, Parcela extra..." style={inputStyle} />
        </div>
        <div style={{ minWidth: 100 }}>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Valor (EUR)</label>
          <input type="number" step="0.01" min="0" value={novo.valor} onChange={(e) => setNovo({ ...novo, valor: e.target.value })} style={{ ...inputStyle, width: 110 }} />
        </div>
        <div style={{ minWidth: 140 }}>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Vencimento</label>
          <input type="date" value={novo.vencimento} onChange={(e) => setNovo({ ...novo, vencimento: e.target.value })} style={{ ...inputStyle, width: 160 }} />
        </div>
        <button onClick={addParcela} disabled={busy} style={{ padding: '9px 14px', background: 'transparent', border: '1px solid var(--primary)', color: 'var(--primary)', borderRadius: 4, fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>+ Adicionar</button>
      </div>

      {/* Acoes finais */}
      <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
        <button onClick={() => gerarFatura({ empresa, aluno, parcelas, total, pago, pendente })} disabled={parcelas.length === 0} style={{ flex: 1, padding: 11, background: parcelas.length ? 'var(--primary)' : 'var(--border)', color: '#fff', border: 'none', borderRadius: 4, fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: parcelas.length ? 'pointer' : 'not-allowed' }}>
          Exportar Fatura (PDF)
        </button>
        <button onClick={onClose} style={{ padding: '11px 20px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 4, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer' }}>Fechar</button>
      </div>
    </Modal>
  );
}

// ============================================================
// Geracao da fatura (janela de impressao -> guardar como PDF)
// ============================================================
function gerarFatura({ empresa, aluno, parcelas, total, pago, pendente }) {
  const num = `FAT ${new Date().getFullYear()}/${String(aluno.id).padStart(4, '0')}`;
  const hoje = new Date().toLocaleDateString('pt-PT');
  const logoUrl = `${window.location.origin}/images/logo-full.jpeg`;

  const linhas = parcelas.map((p) => `
    <tr>
      <td>${escapeHtml(p.descricao || 'Pagamento')}</td>
      <td>${p.vencimento ? new Date(p.vencimento + 'T00:00:00').toLocaleDateString('pt-PT') : '--'}</td>
      <td>${p.pago ? 'Pago' + (p.metodo ? ' (' + escapeHtml(p.metodo) + ')' : '') : 'Pendente'}</td>
      <td class="r">${fmtEUR(p.valor)}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html><html lang="pt-PT"><head><meta charset="UTF-8">
  <title>${escapeHtml(num)} - ${escapeHtml(aluno.nome)}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color:#323338; padding:40px; font-size:14px; }
    .head { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #0073EA; padding-bottom:20px; margin-bottom:24px; }
    .head img { height:70px; }
    .empresa { font-size:20px; font-weight:800; color:#0073EA; }
    .empresa small { display:block; font-weight:400; color:#676879; font-size:12px; letter-spacing:1px; text-transform:uppercase; }
    .doc { text-align:right; }
    .doc h1 { font-size:22px; color:#323338; }
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
    .pend { color:#E2445C; }
    .paid { color:#00A86B; }
    .foot { margin-top:40px; text-align:center; color:#9699A6; font-size:12px; border-top:1px solid #E6E9EF; padding-top:16px; }
    @media print { body { padding:20px; } .noprint { display:none; } }
  </style></head><body>
    <div class="head">
      <div style="display:flex; gap:14px; align-items:center;">
        <img src="${logoUrl}" alt="" onerror="this.style.display='none'"/>
        <div class="empresa">${escapeHtml(empresa)}<small>Escola de Solda</small></div>
      </div>
      <div class="doc"><h1>FATURA</h1><p>${escapeHtml(num)}</p><p>Data: ${hoje}</p></div>
    </div>

    <div class="box">
      <div class="lbl">Cliente</div>
      <div class="val">${escapeHtml(aluno.nome)}</div>
      ${aluno.telefone ? `<div style="color:#676879; font-size:13px;">${escapeHtml(aluno.telefone)}</div>` : ''}
      ${aluno.cursos?.nome ? `<div style="color:#676879; font-size:13px; margin-top:6px;">Curso: ${escapeHtml(aluno.cursos.nome)}</div>` : ''}
    </div>

    <table>
      <thead><tr><th>Descricao</th><th>Vencimento</th><th>Estado</th><th class="r">Valor</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table>

    <div class="totais">
      <div class="row"><span>Total</span><span>${fmtEUR(total)}</span></div>
      <div class="row"><span>Pago</span><span class="paid">${fmtEUR(pago)}</span></div>
      <div class="row grand"><span>Em divida</span><span class="pend">${fmtEUR(pendente)}</span></div>
    </div>

    <div class="foot">Documento gerado por ${escapeHtml(empresa)} em ${hoje}. Este documento nao serve como fatura fiscal.</div>

    <div class="noprint" style="text-align:center; margin-top:30px;">
      <button onclick="window.print()" style="padding:10px 24px; background:#0073EA; color:#fff; border:none; border-radius:6px; font-size:14px; cursor:pointer;">Imprimir / Guardar PDF</button>
    </div>
    <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 400); };</script>
  </body></html>`;

  const w = window.open('', '_blank');
  if (!w) { alert('Permita pop-ups para gerar a fatura.'); return; }
  w.document.write(html);
  w.document.close();
}

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
