import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Utilizadores
  const senhaHash = await bcrypt.hash('admin', 10);
  const senhaAtd = await bcrypt.hash('atd2025', 10);
  const senhaProf = await bcrypt.hash('prof2025', 10);

  await prisma.user.createMany({
    data: [
      { nome: 'Administrador', email: 'admin@highpro.pt', senha: senhaHash, perfil: 'GESTOR' },
      { nome: 'Maria Atendimento', email: 'atendimento@highpro.pt', senha: senhaAtd, perfil: 'ATENDIMENTO' },
      { nome: 'Joao Professor', email: 'professor@highpro.pt', senha: senhaProf, perfil: 'PROFESSOR' }
    ],
    skipDuplicates: true
  });

  // Cursos
  await prisma.curso.createMany({
    data: [
      { nome: 'Eletrodo Revestido Basico', processo: 'SMAW (111) - Eletrodo Revestido', carga: 160, valor: 750, nivel: 'Iniciante', descricao: 'Formacao completa em soldagem por eletrodo revestido.', ativo: true },
      { nome: 'MIG/MAG Industrial', processo: 'GMAW (135/136) - MIG/MAG', carga: 200, valor: 1250, nivel: 'Intermediario', descricao: 'Soldagem MIG/MAG para industria metalurgica.', ativo: true },
      { nome: 'TIG Avancado', processo: 'GTAW (141) - TIG', carga: 240, valor: 1500, nivel: 'Avancado', descricao: 'Soldagem TIG para aco inoxidavel e aluminio.', ativo: true },
      { nome: 'Arco Submerso', processo: 'SAW (121) - Arco Submerso', carga: 180, valor: 1800, nivel: 'Profissional', descricao: 'Soldagem por arco submerso para grandes estruturas.', ativo: true },
      { nome: 'Fluxo Tubular', processo: 'FCAW (136/138) - Arame Tubular', carga: 160, valor: 1300, nivel: 'Intermediario', descricao: 'Soldagem com arame tubular.', ativo: true }
    ],
    skipDuplicates: true
  });

  // Alunos demo
  const cursos = await prisma.curso.findMany();
  await prisma.aluno.createMany({
    data: [
      { nome: 'Carlos Oliveira', email: 'carlos@email.com', telefone: '+351 912 345 678', cursoId: cursos[0]?.id, status: 'MATRICULADO', origem: 'Instagram' },
      { nome: 'Ana Santos', email: 'ana@email.com', telefone: '+351 923 456 789', cursoId: cursos[1]?.id, status: 'LEAD', origem: 'Indicacao' },
      { nome: 'Pedro Costa', email: 'pedro@email.com', telefone: '+351 934 567 890', cursoId: cursos[2]?.id, status: 'AGENDOU_VISITA', origem: 'Google' },
      { nome: 'Mariana Lima', email: 'mariana@email.com', telefone: '+351 915 678 901', cursoId: cursos[0]?.id, status: 'CONCLUIDO', origem: 'Facebook' }
    ],
    skipDuplicates: true
  });

  // Config
  await prisma.config.upsert({
    where: { chave: 'sistemaNome' },
    update: {},
    create: { chave: 'sistemaNome', valor: 'High Pro' }
  });

  console.log('Seed concluido!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
