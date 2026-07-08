import React, { useState, useMemo } from 'react';
import { PARAMETROS_PADRAO, POSICOES, consumoSessao, pecasSugeridas } from '../services/motorConsumo';

const fmtEUR = (v) => `EUR ${Number(v || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const clone = (o) => JSON.parse(JSON.stringify(o));

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
};

export default function ConsumoPage() {
  const [proc, setProc] = useState('mig');
  const [horas, setHoras] = useState(5);
  const [nivel, setNivel] = useState(0);
  const [posicao, setPosicao] = useState('PA');
  const [pecasManual, setPecasManual] = useState('');
  const [params, setParams] = useState(clone(PARAMETROS_PADRAO));
  const [showParams, setShowParams] = useState(false);

  const setParam = (campo, valor) => setParams((prev) => {
    const novo = clone(prev);
    novo[proc][campo] = parseFloat(valor) || 0;
    return novo;
  });

  const posMult = (POSICOES.find((p) => p.key === posicao) || POSICOES[0]).mult;
  const fatorArco = (params.fatorArcoPorNivel[nivel] || 0.25) * posMult;
  const pecasAuto = pecasSugeridas(proc, params, parseFloat(horas) || 0);
  const pecas = pecasManual !== '' ? Math.max(0, parseInt(pecasManual) || 0) : pecasAuto;

  const res = useMemo(
    () => consumoSessao(proc, params, parseFloat(horas) || 0, fatorArco, pecas),
    [proc, params, horas, fatorArco, pecas],
  );

  const matLabel = proc === 'mig' ? 'Aco (kg)' : 'Tubo (kg)';
  const adicaoLabel = proc === 'mig' ? 'Arame (kg)' : 'Vareta (kg)';

  const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 4, fontFamily: 'inherit', fontSize: 14, outline: 'none' };
  const label = { display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' };

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(280px, 1.2fr)', gap: 16, alignItems: 'start' }}>
        {/* Entradas */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', padding: 20 }}>
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>Projecao de Consumo</div>
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 16 }}>Estime material e custo por tempo de aula.</div>

          {/* Processo */}
          <div style={{ marginBottom: 14 }}>
            <label style={label}>Processo</label>
            <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
              {[['mig', 'MIG / MAG'], ['tig', 'TIG']].map(([k, v]) => (
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

          <div style={{ marginTop: 12, background: 'var(--background)', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: 'var(--text-secondary)' }}>
            Fator de arco aplicado: <strong>{fatorArco.toFixed(3)}</strong> (nivel {params.fatorArcoPorNivel[nivel]} × posicao {posMult}) · pecas: <strong>{pecas}</strong>
          </div>

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
                ['Nº de pecas', `${res.pecas}`],
                [matLabel, `${res.materialKg} kg`],
                [adicaoLabel, `${res.metalAdicaoKg} kg`],
                ['Gas', `${res.gasM3} m3`],
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
                <span style={{ color: 'var(--text-secondary)' }}>Custo de arco (arame/vareta + gas)</span>
                <span style={{ fontWeight: 600 }}>{fmtEUR(res.custoArco)}</span>
              </div>
            </div>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Motor validado: MIG 5h nivel 0 plana (8 pecas) = 30,91 EUR · TIG 4h nivel 0 sobrecabeca (10 pecas) = 18,99 EUR.</p>
        </div>
      </div>
    </div>
  );
}
