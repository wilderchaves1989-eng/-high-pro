import React, { useState, useMemo, useEffect } from 'react';
import { PARAMETROS_PADRAO, POSICOES, consumoSessao, pecasSugeridas } from '../services/motorConsumo';
import { alunos as alunosApi, config as configApi } from '../services/api';

const fmtEUR = (v) => `EUR ${Number(v || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const clone = (o) => JSON.parse(JSON.stringify(o));
const r2 = (x) => Math.round(x * 100) / 100;
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const PROC_LABEL = { mig: 'MIG/MAG', tig: 'TIG', eletrodo: 'Eletrodo' };

// Mapeia o processo do curso para o processo do motor
function procDoCurso(processo = '') {
  const p = (processo || '').toUpperCase();
  if (p.includes('GTAW') || p.includes('TIG')) return 'tig';
  if (p.includes('SMAW') || p.includes('ELETRODO') || p.includes('REVESTIDO')) return 'eletrodo';
  return 'mig';
}

// Calcula o consumo de uma linha do plano a partir dos campos "crus"
// (sempre recalculado com os params atuais — assim editar material/precos
// atualiza tambem as linhas ja adicionadas ao plano)
function calcularLinha(l, params) {
  const posMult = (POSICOES.find((p) => p.key === l.posicao) || POSICOES[0]).mult;
  const fatorArco = (params.fatorArcoPorNivel[l.nivel] ?? 0.25) * posMult;
  const pecasAuto = pecasSugeridas(l.proc, params, l.horas);
  const pecas = l.pecasManual !== '' && l.pecasManual != null ? Math.max(0, parseInt(l.pecasManual) || 0) : pecasAuto;
  return consumoSessao(l.proc, params, l.horas, fatorArco, pecas, l.reuso ? l.usos : 1);
}

// Campos editaveis de material/precos por processo
const CAMPOS = {
  mig: [
    ['chapaAmm', 'Chapa A (mm)'], ['chapaBmm', 'Chapa B (mm)'], ['espessuraMm', 'Espessura (mm)'], ['precoAcoKg', 'Preco aco (EUR/kg)'],
    ['arameDiamMm', 'Arame diam. (mm)'], ['wfsMMin', 'WFS (m/min)'], ['precoArameKg', 'Preco arame (EUR/kg)'],
    ['vazaoLMin', 'Gas (L/min)'], ['fatorDesperdicioGas', 'Fator desperd. gas'], ['precoGarrafa', 'Preco garrafa (EUR)'], ['garrafaM3', 'Garrafa (m3)'],
    ['overhead', 'Overhead (0-1)'], ['taxaPecasHora', 'Pecas/hora'],
  ],
  tig: [
    ['tuboOdMm', 'Tubo OD (mm)'], ['espessuraMm', 'Espessura (mm)'], ['comprimentoMm', 'Comprimento (mm)'], ['precoTuboKg', 'Preco tubo (EUR/kg)'],
    ['deposicaoKgH', 'Deposicao (kg/h)'], ['fatorPerdaVareta', 'Fator perda vareta'], ['precoVaretaKg', 'Preco vareta (EUR/kg)'],
    ['vazaoLMin', 'Gas (L/min)'], ['fatorDesperdicioGas', 'Fator desperd. gas'], ['precoGarrafa', 'Preco garrafa (EUR)'], ['garrafaM3', 'Garrafa (m3)'],
    ['overhead', 'Overhead (0-1)'], ['taxaPecasHora', 'Pecas/hora'],
  ],
  eletrodo: [
    ['chapaAmm', 'Chapa A (mm)'], ['chapaBmm', 'Chapa B (mm)'], ['espessuraMm', 'Espessura (mm)'], ['precoAcoKg', 'Preco aco (EUR/kg)'],
    ['deposicaoKgH', 'Deposicao (kg/h)'], ['fatorPerdaEletrodo', 'Fator perda eletrodo'], ['precoEletrodoKg', 'Preco eletrodo (EUR/kg)'],
    ['overhead', 'Overhead (0-1)'], ['taxaPecasHora', 'Pecas/hora'],
  ],
};

export default function ConsumoPage() {
  // Construtor da linha atual
  const [proc, setProc] = useState('mig');
  const [horas, setHoras] = useState(5);
  const [nivel, setNivel] = useState(0);
  const [posicao, setPosicao] = useState('PA');
  const [pecasManual, setPecasManual] = useState('');
  const [usos, setUsos] = useState(4);
  const [reuso, setReuso] = useState(false);
  const [descricaoLinha, setDescricaoLinha] = useState('');
  const [params, setParams] = useState(clone(PARAMETROS_PADRAO));
  const [showParams, setShowParams] = useState(false);
  const [alunos, setAlunos] = useState([]);
  const [alunoId, setAlunoId] = useState('');
  const [empresa, setEmpresa] = useState('High Pro');

  // Plano de custo (varias linhas, cada uma com seu processo e posicao)
  const [nomePlano, setNomePlano] = useState('');
  const [linhas, setLinhas] = useState([]);

  useEffect(() => { alunosApi.listar().then(setAlunos).catch(() => {}); }, []);
  useEffect(() => { configApi.carregar().then((c) => c?.sistemaNome && setEmpresa(c.sistemaNome)).catch(() => {}); }, []);

  const setParam = (campo, valor) => setParams((prev) => {
    const novo = clone(prev);
    novo[proc][campo] = parseFloat(valor) || 0;
    return novo;
  });

  // Ao escolher um aluno, preenche processo e carga com base no curso dele
  const escolherAluno = (id) => {
    setAlunoId(id);
    const a = alunos.find((x) => String(x.id) === String(id));
    if (a && a.cursos) {
      setProc(procDoCurso(a.cursos.processo));
      if (a.cursos.carga) { setHoras(a.cursos.carga); setPecasManual(''); }
    }
  };

  const alunoSel = alunos.find((x) => String(x.id) === String(alunoId));

  const linhaAtual = { proc, horas: parseFloat(horas) || 0, nivel, posicao, pecasManual, reuso, usos };
  const resAtual = useMemo(() => calcularLinha(linhaAtual, params), [proc, horas, nivel, posicao, pecasManual, reuso, usos, params]);

  const adicionarLinha = () => {
    if (linhaAtual.horas <= 0) { alert('Informe o tempo de aula.'); return; }
    setLinhas((prev) => [...prev, { id: uid(), ...linhaAtual, descricao: descricaoLinha }]);
    setDescricaoLinha('');
  };

  const removerLinha = (id) => setLinhas((prev) => prev.filter((l) => l.id !== id));

  const resultadosPlano = useMemo(() => linhas.map((l) => ({ ...l, res: calcularLinha(l, params) })), [linhas, params]);

  const totais = useMemo(() => {
    const totalHoras = resultadosPlano.reduce((s, l) => s + l.horas, 0);
    const totalCusto = resultadosPlano.reduce((s, l) => s + l.res.total, 0);
    const totalPecas = resultadosPlano.reduce((s, l) => s + l.res.pecas, 0);
    return { totalHoras: r2(totalHoras), totalCusto: r2(totalCusto), totalPecas, mediaHora: totalHoras > 0 ? r2(totalCusto / totalHoras) : 0 };
  }, [resultadosPlano]);

  const matLabel = proc === 'tig' ? 'Tubo (kg)' : 'Aco (kg)';
  const adicaoLabel = proc === 'mig' ? 'Arame (kg)' : proc === 'tig' ? 'Vareta (kg)' : 'Eletrodo (kg)';
  const custoArcoLabel = proc === 'eletrodo' ? 'Custo de arco (eletrodo)' : 'Custo de arco (arame/vareta + gas)';

  const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 4, fontFamily: 'inherit', fontSize: 14, outline: 'none' };
  const label = { display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' };
  const thStyle = { textAlign: 'left', padding: '10px 12px', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.3, color: 'var(--text-tertiary)', background: 'var(--background)', borderBottom: '1px solid var(--border)' };
  const tdStyle = { padding: '8px 12px', borderBottom: '1px solid var(--border)', fontSize: 13 };

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(340px, 1.3fr)', gap: 16, alignItems: 'start' }}>
        {/* Construtor de linha */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', padding: 20 }}>
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>Nova Linha do Plano</div>
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 16 }}>Configure processo, posicao e horas — depois adicione ao plano. Repita para combinar quantos processos/posicoes quiser.</div>

          {/* Aluno (preenche pelo curso) */}
          <div style={{ marginBottom: 14 }}>
            <label style={label}>Aluno (opcional — preenche pelo curso)</label>
            <select value={alunoId} onChange={(e) => escolherAluno(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="">Manual...</option>
              {alunos.filter((a) => a.cursos).map((a) => <option key={a.id} value={a.id}>{a.nome} — {a.cursos.nome}</option>)}
            </select>
            {alunoSel?.cursos && (
              <div style={{ fontSize: 12, color: 'var(--primary)', marginTop: 6, background: 'var(--primary-highlighted)', borderRadius: 4, padding: '6px 10px' }}>
                Base do curso: <strong>{alunoSel.cursos.nome}</strong> · carga {alunoSel.cursos.carga || 0}h · {alunoSel.cursos.processo || '--'}
              </div>
            )}
          </div>

          {/* Processo */}
          <div style={{ marginBottom: 14 }}>
            <label style={label}>Processo</label>
            <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
              {[['mig', 'MIG / MAG'], ['tig', 'TIG'], ['eletrodo', 'Eletrodo']].map(([k, v]) => (
                <button key={k} onClick={() => setProc(k)} style={{ flex: 1, padding: '8px 0', border: 'none', background: proc === k ? 'var(--primary)' : 'transparent', color: proc === k ? '#fff' : 'var(--text-secondary)', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{v}</button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={label}>Descricao da linha (opcional)</label>
            <input value={descricaoLinha} onChange={(e) => setDescricaoLinha(e.target.value)} placeholder="Ex: Turma manha - filete FW" style={inputStyle} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={label}>Tempo de aula (horas)</label><input type="number" min="0" step="0.5" value={horas} onChange={(e) => setHoras(e.target.value)} style={inputStyle} /></div>
            <div><label style={label}>Nivel do aluno (0-4)</label>
              <select value={nivel} onChange={(e) => setNivel(parseInt(e.target.value))} style={{ ...inputStyle, cursor: 'pointer' }}>
                {[0, 1, 2, 3, 4].map((n) => <option key={n} value={n}>Nivel {n} (fator {params.fatorArcoPorNivel[n]})</option>)}
              </select>
            </div>
            <div><label style={label}>Posicao</label>
              <select value={posicao} onChange={(e) => setPosicao(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                {POSICOES.map((p) => <option key={p.key} value={p.key}>{p.nome}</option>)}
              </select>
            </div>
            <div><label style={label}>Nº de pecas</label><input type="number" min="0" value={pecasManual} onChange={(e) => setPecasManual(e.target.value)} placeholder={`auto: ${pecasSugeridas(proc, params, parseFloat(horas) || 0)}`} style={inputStyle} /></div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={reuso} onChange={(e) => setReuso(e.target.checked)} style={{ accentColor: 'var(--primary)' }} />
            Reaproveitamento de pecas
            {reuso && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 4, color: 'var(--text-secondary)' }}>
                — cada peca serve
                <input type="number" min="1" value={usos} onChange={(e) => setUsos(Math.max(1, parseInt(e.target.value) || 1))} style={{ ...inputStyle, width: 60, padding: '5px 8px' }} />
                usos
              </span>
            )}
          </label>

          {/* Parametros editaveis */}
          <button onClick={() => setShowParams(!showParams)} style={{ marginTop: 14, padding: '8px 12px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 4, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer', color: 'var(--text-secondary)', width: '100%' }}>
            {showParams ? 'Ocultar' : 'Ajustar'} material e precos ({proc.toUpperCase()})
          </button>
          {showParams && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
              {CAMPOS[proc].map(([campo, nome]) => (
                <div key={campo}>
                  <label style={{ ...label, fontSize: 11 }}>{nome}</label>
                  <input type="number" step="any" value={params[proc][campo]} onChange={(e) => setParam(campo, e.target.value)} style={{ ...inputStyle, padding: '6px 10px', fontSize: 13 }} />
                </div>
              ))}
            </div>
          )}

          {/* Previa da linha atual */}
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <div style={{ flex: 1, background: 'var(--background)', borderRadius: 6, padding: '10px 14px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Custo desta linha</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary)' }}>{fmtEUR(resAtual.total)}</div>
            </div>
            <div style={{ flex: 1, background: 'var(--background)', borderRadius: 6, padding: '10px 14px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Por hora</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{fmtEUR(resAtual.porHora)}</div>
            </div>
          </div>
          <button onClick={adicionarLinha} style={{ width: '100%', marginTop: 10, padding: 11, background: 'var(--success)', color: '#fff', border: 'none', borderRadius: 4, fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>+ Adicionar ao plano</button>
        </div>

        {/* Plano de custo */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <div style={{ background: 'var(--primary)', borderRadius: 8, padding: '16px 18px', color: '#fff' }}>
              <div style={{ fontSize: 12, opacity: 0.9 }}>Total do plano</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{fmtEUR(totais.totalCusto)}</div>
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 18px' }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Total de horas</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{totais.totalHoras}h</div>
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 18px' }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Media EUR/h</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary)' }}>{fmtEUR(totais.mediaHora)}</div>
            </div>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <input value={nomePlano} onChange={(e) => setNomePlano(e.target.value)} placeholder="Nome do plano (opcional)" style={{ ...inputStyle, maxWidth: 260, padding: '6px 10px' }} />
              <button
                onClick={() => gerarRelatorio({ empresa, nomePlano, alunoNome: alunoSel?.nome, resultadosPlano, totais })}
                disabled={linhas.length === 0}
                style={{ padding: '8px 16px', background: linhas.length ? 'var(--primary)' : 'var(--border)', color: '#fff', border: 'none', borderRadius: 4, fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: linhas.length ? 'pointer' : 'not-allowed' }}
              >
                Gerar Relatorio (PDF)
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>{['Descricao', 'Processo', 'Posicao', 'Horas', 'Pecas', 'Total', ''].map((h) => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                <tbody>
                  {resultadosPlano.length ? resultadosPlano.map((l) => (
                    <tr key={l.id}>
                      <td style={tdStyle}>{l.descricao || '--'}</td>
                      <td style={tdStyle}>{PROC_LABEL[l.proc]}</td>
                      <td style={tdStyle}>{l.posicao}</td>
                      <td style={tdStyle}>{l.horas}h</td>
                      <td style={tdStyle}>{l.res.pecas}</td>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{fmtEUR(l.res.total)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}><button onClick={() => removerLinha(l.id)} style={{ padding: '3px 8px', background: 'transparent', border: 'none', color: 'var(--danger)', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>x</button></td>
                    </tr>
                  )) : (
                    <tr><td colSpan={7} style={{ padding: 20, textAlign: 'center', color: 'var(--text-tertiary)' }}>Nenhuma linha no plano. Configure ao lado e clique em "+ Adicionar ao plano".</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontWeight: 500 }}>Consumo previsto (linha atual)</div>
            <div style={{ padding: '8px 20px' }}>
              {[
                ['Tempo de arco', `${resAtual.arcoMin} min`],
                ['Nº de pecas praticadas', `${resAtual.pecas}`],
                ...(reuso && usos > 1 ? [['Pecas compradas (reaproveita ' + usos + 'x)', `${resAtual.pecasNovas}`]] : []),
                [matLabel, `${resAtual.materialKg} kg`],
                [adicaoLabel, `${resAtual.metalAdicaoKg} kg`],
                ...(proc !== 'eletrodo' ? [['Gas', `${resAtual.gasM3} m3`]] : []),
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{k}</span>
                  <span style={{ fontWeight: 600 }}>{v}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Custo material (pecas)</span>
                <span style={{ fontWeight: 600 }}>{fmtEUR(resAtual.custoPecas)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 14 }}>
                <span style={{ color: 'var(--text-secondary)' }}>{custoArcoLabel}</span>
                <span style={{ fontWeight: 600 }}>{fmtEUR(resAtual.custoArco)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ============================================================
// Relatorio PDF: plano de custo com multiplas linhas
// ============================================================
function gerarRelatorio({ empresa, nomePlano, alunoNome, resultadosPlano, totais }) {
  const num = `PLANO ${new Date().getFullYear()}/${uid().slice(-4).toUpperCase()}`;
  const hoje = new Date().toLocaleDateString('pt-PT');
  const logoUrl = `${window.location.origin}/images/logo-highpro.svg`;

  const linhas = resultadosPlano.map((l) => `
    <tr>
      <td>${escapeHtml(l.descricao || '--')}</td>
      <td class="c">${PROC_LABEL[l.proc]}</td>
      <td class="c">${escapeHtml(l.posicao)}</td>
      <td class="c">${l.horas}h</td>
      <td class="c">${l.res.pecas}</td>
      <td class="r">${fmtEUR(l.res.total)}</td>
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
    .totais { margin-left:auto; width:320px; }
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
      <div class="doc"><h1>PLANO DE CUSTO</h1><p>${escapeHtml(num)}</p><p>Data: ${hoje}</p></div>
    </div>

    ${alunoNome ? `<div class="box">
      <div class="lbl">Aluno</div>
      <div class="val" style="color:#323338; font-size:16px;">${escapeHtml(alunoNome)}</div>
    </div>` : ''}

    <div class="box">
      <div class="lbl">Plano</div>
      <div class="val">${escapeHtml(nomePlano || 'Plano de Custo Personalizado')}</div>
      <div style="color:#676879; font-size:13px; margin-top:6px;">${resultadosPlano.length} linha(s) · ${totais.totalHoras}h no total</div>
    </div>

    <table>
      <thead><tr><th>Descricao</th><th class="c">Processo</th><th class="c">Posicao</th><th class="c">Horas</th><th class="c">Pecas</th><th class="r">Total</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table>

    <div class="totais">
      <div class="row"><span>Total de horas</span><span>${totais.totalHoras}h</span></div>
      <div class="row"><span>Total de pecas</span><span>${totais.totalPecas}</span></div>
      <div class="row grand"><span>Custo total</span><span>${fmtEUR(totais.totalCusto)}</span></div>
      <div class="row" style="color:#9699A6; font-size:12px;"><span>Media por hora</span><span>${fmtEUR(totais.mediaHora)}</span></div>
    </div>

    <div class="foot">Relatorio gerado por ${escapeHtml(empresa)} em ${hoje}. Valores estimados com base nos parametros de material e precos configurados.</div>

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
