import React, { useState, useMemo, useEffect } from 'react';
import { PARAMETROS_PADRAO, POSICOES, consumoSessao, pecasSugeridas } from '../services/motorConsumo';
import { alunos as alunosApi } from '../services/api';

const fmtEUR = (v) => `EUR ${Number(v || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const clone = (o) => JSON.parse(JSON.stringify(o));

// Mapeia o processo do curso para o processo do motor
function procDoCurso(processo = '') {
  const p = (processo || '').toUpperCase();
  if (p.includes('GTAW') || p.includes('TIG')) return 'tig';
  if (p.includes('SMAW') || p.includes('ELETRODO') || p.includes('REVESTIDO')) return 'eletrodo';
  return 'mig';
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
  const [proc, setProc] = useState('mig');
  const [horas, setHoras] = useState(5);
  const [nivel, setNivel] = useState(0);
  const [posicao, setPosicao] = useState('PA');
  const [pecasManual, setPecasManual] = useState('');
  const [usos, setUsos] = useState(4);
  const [reuso, setReuso] = useState(false);
  const [params, setParams] = useState(clone(PARAMETROS_PADRAO));
  const [showParams, setShowParams] = useState(false);
  const [alunos, setAlunos] = useState([]);
  const [alunoId, setAlunoId] = useState('');

  useEffect(() => { alunosApi.listar().then(setAlunos).catch(() => {}); }, []);

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

  const posMult = (POSICOES.find((p) => p.key === posicao) || POSICOES[0]).mult;
  const fatorArco = (params.fatorArcoPorNivel[nivel] || 0.25) * posMult;
  const pecasAuto = pecasSugeridas(proc, params, parseFloat(horas) || 0);
  const pecas = pecasManual !== '' ? Math.max(0, parseInt(pecasManual) || 0) : pecasAuto;

  const res = useMemo(
    () => consumoSessao(proc, params, parseFloat(horas) || 0, fatorArco, pecas, reuso ? usos : 1),
    [proc, params, horas, fatorArco, pecas, usos, reuso],
  );

  const matLabel = proc === 'tig' ? 'Tubo (kg)' : 'Aco (kg)';
  const adicaoLabel = proc === 'mig' ? 'Arame (kg)' : proc === 'tig' ? 'Vareta (kg)' : 'Eletrodo (kg)';
  const custoArcoLabel = proc === 'eletrodo' ? 'Custo de arco (eletrodo)' : 'Custo de arco (arame/vareta + gas)';

  const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 4, fontFamily: 'inherit', fontSize: 14, outline: 'none' };
  const label = { display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' };

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(280px, 1.2fr)', gap: 16, alignItems: 'start' }}>
        {/* Entradas */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', padding: 20 }}>
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>Projecao de Consumo</div>
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 16 }}>Estime material e custo por tempo de aula.</div>

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
            <div><label style={label}>Nº de pecas</label><input type="number" min="0" value={pecasManual} onChange={(e) => setPecasManual(e.target.value)} placeholder={`auto: ${pecasAuto}`} style={inputStyle} /></div>
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
        </div>

        {/* Resultado */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ background: 'var(--primary)', borderRadius: 8, padding: '18px 20px', color: '#fff' }}>
              <div style={{ fontSize: 13, opacity: 0.9 }}>Custo total da aula</div>
              <div style={{ fontSize: 30, fontWeight: 800 }}>{fmtEUR(res.total)}</div>
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '18px 20px' }}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Custo por hora</div>
              <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--primary)' }}>{fmtEUR(res.porHora)}</div>
            </div>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontWeight: 500 }}>Consumo previsto</div>
            <div style={{ padding: '8px 20px' }}>
              {[
                ['Tempo de arco', `${res.arcoMin} min`],
                ['Nº de pecas praticadas', `${res.pecas}`],
                ...(reuso && usos > 1 ? [['Pecas compradas (reaproveita ' + usos + 'x)', `${res.pecasNovas}`]] : []),
                [matLabel, `${res.materialKg} kg`],
                [adicaoLabel, `${res.metalAdicaoKg} kg`],
                ...(proc !== 'eletrodo' ? [['Gas', `${res.gasM3} m3`]] : []),
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{k}</span>
                  <span style={{ fontWeight: 600 }}>{v}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Custo material (pecas)</span>
                <span style={{ fontWeight: 600 }}>{fmtEUR(res.custoPecas)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 14 }}>
                <span style={{ color: 'var(--text-secondary)' }}>{custoArcoLabel}</span>
                <span style={{ fontWeight: 600 }}>{fmtEUR(res.custoArco)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
