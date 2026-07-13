import React, { useEffect, useState, useRef, useCallback } from 'react';
import useAuthStore from '../store/authStore';
import { mensagens as msgApi, users as usersApi } from '../services/api';

const LAST_SEEN_KEY = 'highpro_chat_geral_last_seen';

const fmtHora = (d) => new Date(d).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
const iniciais = (nome) => (nome || '?').split(' ').map((w) => w[0]).join('').substring(0, 2).toUpperCase();

export default function ChatWidget() {
  const { user, profile } = useAuthStore();
  const [aberto, setAberto] = useState(false);
  const [view, setView] = useState('lista'); // 'lista' | 'geral' | { id, nome } (colega)
  const [colegas, setColegas] = useState([]);
  const [mensagensAtuais, setMensagensAtuais] = useState([]);
  const [privadasTodas, setPrivadasTodas] = useState([]);
  const [geralUltima, setGeralUltima] = useState(null);
  const [geralUltimaVista, setGeralUltimaVista] = useState(() => localStorage.getItem(LAST_SEEN_KEY) || '');
  const [texto, setTexto] = useState('');
  const [setupNecessario, setSetupNecessario] = useState(false);
  const scrollRef = useRef(null);

  const nomeDe = useCallback((id) => {
    if (id === user?.id) return profile?.nome || 'Eu';
    return colegas.find((c) => c.id === id)?.nome || 'Alguem';
  }, [colegas, user, profile]);

  const carregarColegas = useCallback(() => {
    usersApi.listar().then((us) => setColegas((us || []).filter((u) => u.id !== user?.id && u.ativo))).catch(() => {});
  }, [user]);

  const carregarPrivadas = useCallback(() => {
    if (!user) return;
    msgApi.listarMinhasPrivadas(user.id).then((ms) => { setPrivadasTodas(ms || []); setSetupNecessario(false); })
      .catch((err) => { if (/mensagens|schema cache|does not exist|relation/i.test(err.message || '')) setSetupNecessario(true); });
  }, [user]);

  const carregarGeralUltima = useCallback(() => {
    msgApi.listarGeral(100).then((ms) => setGeralUltima(ms[ms.length - 1] || null)).catch(() => {});
  }, []);

  useEffect(() => { if (user) { carregarColegas(); carregarPrivadas(); carregarGeralUltima(); } }, [user, carregarColegas, carregarPrivadas, carregarGeralUltima]);

  // Realtime: novas mensagens aparecem sem F5
  useEffect(() => {
    if (!user) return;
    const unsub = msgApi.subscribe((nova) => {
      const geralAberto = view === 'geral' && nova.destinatario_id === null;
      const privadaAberta = typeof view === 'object' && view && (
        (nova.remetente_id === view.id && nova.destinatario_id === user.id) ||
        (nova.remetente_id === user.id && nova.destinatario_id === view.id)
      );
      if (geralAberto || privadaAberta) setMensagensAtuais((prev) => [...prev, nova]);
      if (nova.destinatario_id === null) carregarGeralUltima();
      if (nova.destinatario_id === user.id || nova.remetente_id === user.id) carregarPrivadas();
    });
    return unsub;
  }, [user, view, carregarGeralUltima, carregarPrivadas]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [mensagensAtuais]);

  if (!user) return null;

  const abrirGeral = async () => {
    setView('geral');
    const ms = await msgApi.listarGeral(100).catch(() => []);
    setMensagensAtuais(ms);
    const agora = new Date().toISOString();
    localStorage.setItem(LAST_SEEN_KEY, agora);
    setGeralUltimaVista(agora);
  };

  const abrirPrivada = async (colega) => {
    setView(colega);
    const ms = await msgApi.listarPrivada(user.id, colega.id).catch(() => []);
    setMensagensAtuais(ms);
    await msgApi.marcarLidas(colega.id, user.id).catch(() => {});
    carregarPrivadas();
  };

  const enviar = async () => {
    const t = texto.trim();
    if (!t || view === 'lista') return;
    setTexto('');
    try {
      await msgApi.enviar({ remetenteId: user.id, destinatarioId: view === 'geral' ? null : view.id, texto: t });
    } catch (err) { alert(err.message || 'Erro ao enviar'); }
  };

  const naoLidasPorColega = (colegaId) => privadasTodas.filter((m) => m.destinatario_id === user.id && m.remetente_id === colegaId && !m.lida).length;
  const totalNaoLidasPrivadas = colegas.reduce((s, c) => s + naoLidasPorColega(c.id), 0);
  const geralNaoLida = geralUltima && geralUltima.remetente_id !== user.id && geralUltima.criado_em > geralUltimaVista;
  const totalBadge = totalNaoLidasPrivadas + (geralNaoLida ? 1 : 0);

  // ultima mensagem privada por colega (para preview na lista)
  const ultimaCom = (colegaId) => {
    const lista = privadasTodas.filter((m) => m.remetente_id === colegaId || m.destinatario_id === colegaId);
    return lista[0]; // privadasTodas ja vem ordenado desc
  };

  const corBadge = { background: 'var(--danger)', color: '#fff', borderRadius: 20, fontSize: 10, fontWeight: 700, minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' };
  const avatarStyle = (bg) => ({ width: 32, height: 32, borderRadius: '50%', background: bg || 'linear-gradient(135deg, var(--primary), var(--success))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 12, flexShrink: 0 });

  return (
    <div style={{ position: 'fixed', bottom: 0, right: 20, zIndex: 500, fontFamily: 'inherit' }}>
      {aberto && (
        <div style={{ width: 320, height: 420, background: 'var(--surface)', border: '1px solid var(--border)', borderTopLeftRadius: 10, borderTopRightRadius: 10, boxShadow: '0 -4px 20px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--primary)', color: '#fff' }}>
            {view !== 'lista' ? (
              <>
                <button onClick={() => setView('lista')} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 16, cursor: 'pointer', padding: 0, lineHeight: 1 }}>&lsaquo;</button>
                <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>{view === 'geral' ? 'Geral (equipa)' : view.nome}</span>
              </>
            ) : (
              <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>Mensagens</span>
            )}
            <button onClick={() => setAberto(false)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 16, cursor: 'pointer', padding: 0, lineHeight: 1 }}>&times;</button>
          </div>

          {setupNecessario && (
            <div style={{ padding: 10, fontSize: 11, background: '#FFF9E6', color: '#8A6D00', borderBottom: '1px solid var(--border)' }}>
              Falta criar a tabela no Supabase: rode <code>supabase/mensagens.sql</code>.
            </div>
          )}

          {/* Lista de conversas */}
          {view === 'lista' && (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <div onClick={abrirGeral} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}>
                <div style={avatarStyle('linear-gradient(135deg, #0073EA, #00C875)')}>#</div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>Geral (equipa)</div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{geralUltima ? `${nomeDe(geralUltima.remetente_id)}: ${geralUltima.texto}` : 'Sem mensagens ainda'}</div>
                </div>
                {geralNaoLida && <span style={corBadge}>•</span>}
              </div>
              {colegas.map((c) => {
                const ultima = ultimaCom(c.id);
                const naoLidas = naoLidasPorColega(c.id);
                return (
                  <div key={c.id} onClick={() => abrirPrivada(c)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}>
                    <div style={avatarStyle()}>{iniciais(c.nome)}</div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{c.nome}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ultima ? `${ultima.remetente_id === user.id ? 'Voce: ' : ''}${ultima.texto}` : 'Sem mensagens ainda'}</div>
                    </div>
                    {naoLidas > 0 && <span style={corBadge}>{naoLidas}</span>}
                  </div>
                );
              })}
              {colegas.length === 0 && <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: 'var(--text-tertiary)' }}>Nenhum outro colega ativo ainda.</div>}
            </div>
          )}

          {/* Thread (geral ou privada) */}
          {view !== 'lista' && (
            <>
              <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {mensagensAtuais.length ? mensagensAtuais.map((m) => {
                  const minha = m.remetente_id === user.id;
                  return (
                    <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: minha ? 'flex-end' : 'flex-start' }}>
                      {!minha && view === 'geral' && <span style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 2, marginLeft: 4 }}>{nomeDe(m.remetente_id)}</span>}
                      <div style={{ maxWidth: '78%', padding: '7px 11px', borderRadius: 12, fontSize: 13, background: minha ? 'var(--primary)' : 'var(--background)', color: minha ? '#fff' : 'var(--text-primary)', wordBreak: 'break-word' }}>
                        {m.texto}
                      </div>
                      <span style={{ fontSize: 9, color: 'var(--text-tertiary)', marginTop: 2 }}>{fmtHora(m.criado_em)}</span>
                    </div>
                  );
                }) : <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-tertiary)', marginTop: 20 }}>Ainda sem mensagens. Diga ola!</div>}
              </div>
              <div style={{ display: 'flex', gap: 6, padding: 10, borderTop: '1px solid var(--border)' }}>
                <input
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') enviar(); }}
                  placeholder="Escreva uma mensagem..."
                  style={{ flex: 1, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 20, fontFamily: 'inherit', fontSize: 13, outline: 'none' }}
                />
                <button onClick={enviar} disabled={!texto.trim()} style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: texto.trim() ? 'var(--primary)' : 'var(--border)', color: '#fff', cursor: texto.trim() ? 'pointer' : 'not-allowed', fontSize: 14, flexShrink: 0 }}>&#10148;</button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Pill recolhido */}
      <div
        onClick={() => setAberto(!aberto)}
        style={{ width: 220, padding: '10px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderBottom: aberto ? 'none' : '1px solid var(--border)', borderTopLeftRadius: 10, borderTopRightRadius: 10, boxShadow: '0 -2px 10px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
      >
        <span style={{ flex: 1 }}>Mensagens</span>
        {totalBadge > 0 && !aberto && <span style={corBadge}>{totalBadge}</span>}
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{aberto ? '▾' : '▴'}</span>
      </div>
    </div>
  );
}
