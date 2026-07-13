// Lista de abas que podem ser restringidas por credencial (ver ConfigPage e Sidebar).
// "configuracoes" fica de fora de proposito: continua exclusivo do perfil GESTOR,
// nunca e liberado por aqui (evita conceder gestao de credenciais sem querer).
export const MODULOS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'alunos', label: 'Alunos' },
  { key: 'agenda', label: 'Agenda' },
  { key: 'estudo', label: 'Estudo' },
  { key: 'visitas', label: 'Visitas' },
  { key: 'financeiro', label: 'Financeiro' },
  { key: 'consumo', label: 'Consumo' },
  { key: 'planos', label: 'Planos de Custo' },
  { key: 'calculadora', label: 'Calculadora' },
  { key: 'propostas', label: 'Propostas' },
];
