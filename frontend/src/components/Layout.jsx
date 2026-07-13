import React, { useState } from 'react';
import useAuthStore from '../store/authStore';
import Sidebar from './Sidebar';
import Dashboard from '../pages/Dashboard';
import AlunosPage from '../pages/AlunosPage';
import AgendaPage from '../pages/AgendaPage';
import ConfigPage from '../pages/ConfigPage';
import FinanceiroPage from '../pages/FinanceiroPage';
import CalculadoraPage from '../pages/CalculadoraPage';
import VisitasPage from '../pages/VisitasPage';
import EstudoPage from '../pages/EstudoPage';
import ConsumoPage from '../pages/ConsumoPage';
import PropostasPage from '../pages/PropostasPage';
import PlanosPage from '../pages/PlanosPage';
import ChatWidget from './ChatWidget';

const PAGES = {
  dashboard: { title: 'Dashboard', component: Dashboard, action: '+ Novo Aluno' },
  alunos: { title: 'Alunos', component: AlunosPage, action: '+ Novo Aluno' },
  agenda: { title: 'Agenda', component: AgendaPage, action: '+ Agendar' },
  estudo: { title: 'Progresso de Estudo', component: EstudoPage, action: null },
  visitas: { title: 'Visitas', component: VisitasPage, action: null },
  financeiro: { title: 'Financeiro', component: FinanceiroPage, action: null },
  consumo: { title: 'Projecao de Consumo', component: ConsumoPage, action: null },
  planos: { title: 'Planos de Custo', component: PlanosPage, action: null },
  calculadora: { title: 'Calculadora de Pacotes', component: CalculadoraPage, action: null },
  propostas: { title: 'Propostas Guardadas', component: PropostasPage, action: null },
  configuracoes: { title: 'Configuracoes', component: ConfigPage, action: null },
};

export default function Layout() {
  const [activePage, setActivePage] = useState('agenda');
  const [actionTrigger, setActionTrigger] = useState(0);
  const user = useAuthStore((s) => s.user);

  const page = PAGES[activePage] || PAGES.dashboard;
  const PageComponent = page.component;

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%' }}>
      <Sidebar activePage={activePage} onNavigate={setActivePage} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        {/* Topbar */}
        <div style={{ height: 48, minHeight: 48, background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16, zIndex: 50 }}>
          <span style={{ fontWeight: 600, fontSize: 16, flex: 1 }}>{page.title}</span>
          {page.action && (
            <button
              onClick={() => setActionTrigger((n) => n + 1)}
              style={{ padding: '6px 14px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 4, fontSize: 13, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer' }}
            >
              {page.action}
            </button>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'hidden', background: 'var(--background)' }}>
          <PageComponent actionTrigger={actionTrigger} onNavigate={setActivePage} />
        </div>
      </div>
      <ChatWidget />
    </div>
  );
}
