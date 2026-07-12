import React, { useEffect, useState, useCallback } from 'react';
import { planosCusto as planosCustoApi, config as configApi } from '../services/api';
import { gerarRelatorio, PROC_LABEL } from './ConsumoPage';

const fmtEUR = (v) => `EUR ${Number(v || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtData = (d) => (d ? new Date(d).toLocaleDateString('pt-PT') : '--');

export default function PlanosPage() {
  const [lista, setLista] = useState([]);
  const [empresa, setEmpresa] = useState('High Pro');
  const [loading, setLoading] = useState(true);
  const [setupNecessario, setSetupNecessario] = useState(false);
  const [busca, setBusca] = useState('');

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      configApi.carregar().then((c) => c?.sistemaNome && setEmpresa(c.sistemaNome)).catch(() => {});
      try {
        const p = await planosCustoApi.listar();
        setLista(p || []);
        setSetupNecessario(false);
      } catch (err) {
        if (/planos_custo|schema cache|does not exist|relation/i.test(err.message || '')) setSetupNecessario(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const exportar = (p) => {
    const linhas = Array.isArray(p.linhas) ? p.linhas : [];
    const resultadosPlano = linhas.map((l) => ({ descricao: l.descricao, proc: l.proc, posicao: l.posicao, horas: l.horas, res: { pecas: l.pecas, total: l.total } }));
    gerarRelatorio({
      empresa,
      nomePlano: p.nome_plano,
      alunoNome: p.aluno_nome,
      resultadosPlano,
      totais: { totalHoras: p.total_horas, totalPecas: p.total_pecas, totalCusto: p.total_custo, mediaHora: p.media_hora },
    });
  };

  const excluir = async (p) => {
    if (!window.confirm('Remover este plano?')) return;
    try { await planosCustoApi.excluir(p.id); carregar(); }
    catch (err) { alert(err.message || 'Erro'); }
  };

  const filtrados = lista.filter((p) => !busca
    || (p.nome_plano || '').toLowerCase().includes(busca.toLowerCase())
    || (p.aluno_nome || '').toLowerCase().includes(busca.toLowerCase()));

  const thStyle = { textAlign: 'left', padding: '12px 16px', fontWeight: 500, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.3, color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border)', background: 'var(--background)' };
  const tdStyle = { padding: '10px 16px', borderBottom: '1px solid var(--border)' };

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      {setupNecessario && (
        <div style={{ background: '#FFF9E6', border: '1px solid #FFCB00', borderRadius: 8, padding: '14px 18px', marginBottom: 16, fontSize: 13 }}>
          <strong>Falta criar a tabela no Supabase.</strong> Rode o conteudo de <code>supabase/planos_custo.sql</code> no SQL Editor para guardar planos.
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <input placeholder="Buscar plano ou aluno..." value={busca} onChange={(e) => setBusca(e.target.value)} style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 4, fontFamily: 'inherit', fontSize: 14, outline: 'none', minWidth: 260 }} />
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 500 }}>Planos de Custo Guardados</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr>{['Plano', 'Aluno', 'Linhas', 'Horas', 'Total', 'Data', ''].map((h) => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: 'var(--text-tertiary)' }}>A carregar...</td></tr>
              ) : filtrados.length ? filtrados.map((p) => (
                <tr key={p.id}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{p.nome_plano || 'Plano de Custo Personalizado'}</td>
                  <td style={tdStyle}>{p.aluno_nome || '--'}</td>
                  <td style={tdStyle}>{Array.isArray(p.linhas) ? p.linhas.length : 0}</td>
                  <td style={tdStyle}>{p.total_horas}h</td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{fmtEUR(p.total_custo)}</td>
                  <td style={tdStyle}>{fmtData(p.criado_em)}</td>
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                    <button onClick={() => exportar(p)} style={{ padding: '5px 12px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', marginRight: 6 }}>Exportar PDF</button>
                    <button onClick={() => excluir(p)} style={{ padding: '5px 8px', background: 'transparent', border: 'none', color: 'var(--danger)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Excluir</button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: 'var(--text-tertiary)' }}>Nenhum plano guardado. Monte um plano no Consumo e clique em "Guardar plano".</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
