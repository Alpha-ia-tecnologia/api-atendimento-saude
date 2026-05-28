import { PrismaClient, TipoEspecialidade, TipoPerfilCrm } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const ESPECIALIDADES = [
  { nome: 'Ginecologia', tipo: TipoEspecialidade.CONSULTA, ordem: 1 },
  { nome: 'Endocrinologia Adulto', tipo: TipoEspecialidade.CONSULTA, ordem: 2 },
  { nome: 'Dermatologista Adulto', tipo: TipoEspecialidade.CONSULTA, ordem: 3 },
  { nome: 'Dermatologista Infantil', tipo: TipoEspecialidade.CONSULTA, ordem: 4 },
  { nome: 'Neurologista Adulto', tipo: TipoEspecialidade.CONSULTA, ordem: 5 },
  { nome: 'Neurologista Infantil', tipo: TipoEspecialidade.CONSULTA, ordem: 6 },
  { nome: 'Psiquiatra Adulto', tipo: TipoEspecialidade.CONSULTA, ordem: 7 },
  { nome: 'Psiquiatra Infantil', tipo: TipoEspecialidade.CONSULTA, ordem: 8 },
  { nome: 'Cardiologista Adulto', tipo: TipoEspecialidade.CONSULTA, ordem: 9 },
  { nome: 'Cardiologista Infantil', tipo: TipoEspecialidade.CONSULTA, ordem: 10 },
  { nome: 'Ortopedista Adulto', tipo: TipoEspecialidade.CONSULTA, ordem: 11 },
  { nome: 'Ortopedista Infantil', tipo: TipoEspecialidade.CONSULTA, ordem: 12 },
  { nome: 'Cirurgião Geral Adulto', tipo: TipoEspecialidade.CONSULTA, ordem: 13 },
  { nome: 'Cirurgião Vascular', tipo: TipoEspecialidade.CONSULTA, ordem: 14 },
  { nome: 'Gastroenterologista Adulto', tipo: TipoEspecialidade.CONSULTA, ordem: 15 },
  { nome: 'Gastroenterologista Infantil', tipo: TipoEspecialidade.CONSULTA, ordem: 16 },
  { nome: 'Oftalmologista Adulto', tipo: TipoEspecialidade.CONSULTA, ordem: 17 },
  { nome: 'Oftalmologista Infantil', tipo: TipoEspecialidade.CONSULTA, ordem: 18 },
  { nome: 'Otorrinolaringologista Adulto', tipo: TipoEspecialidade.CONSULTA, ordem: 19 },
  { nome: 'Otorrinolaringologista Infantil', tipo: TipoEspecialidade.CONSULTA, ordem: 20 },
  { nome: 'Urologista Adulto', tipo: TipoEspecialidade.CONSULTA, ordem: 21 },
  { nome: 'Urologista Infantil', tipo: TipoEspecialidade.CONSULTA, ordem: 22 },
  { nome: 'Pediatria', tipo: TipoEspecialidade.CONSULTA, ordem: 23 },
  { nome: 'Eletroencefalograma', tipo: TipoEspecialidade.EXAME, ordem: 1 },
  { nome: 'Raio X', tipo: TipoEspecialidade.EXAME, ordem: 2 },
  { nome: 'Ultrassonografia', tipo: TipoEspecialidade.EXAME, ordem: 3 },
  { nome: 'Endoscopia Digestiva', tipo: TipoEspecialidade.EXAME, ordem: 4 },
];

async function main() {
  const adminNome = process.env.ADMIN_NAME ?? 'Administrador';
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'Admin@123';
  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 10);

  console.log('Seeding database...');

  for (const especialidade of ESPECIALIDADES) {
    await prisma.especialidade.upsert({
      where: { nome: especialidade.nome },
      update: { tipo: especialidade.tipo, ordem: especialidade.ordem, disponivel: true },
      create: { ...especialidade, disponivel: true },
    });
  }
  console.log(`Especialidades prontas: ${ESPECIALIDADES.length}`);

  const senhaHash = await bcrypt.hash(adminPassword, saltRounds);

  const admin = await prisma.usuarioCrm.upsert({
    where: { email: adminEmail },
    update: {
      nomeCompleto: adminNome,
      ativo: true,
      tipoPerfil: TipoPerfilCrm.ADMIN,
    },
    create: {
      nomeCompleto: adminNome,
      email: adminEmail,
      senhaHash,
      tipoPerfil: TipoPerfilCrm.ADMIN,
      ativo: true,
    },
  });
  console.log(`Usuário CRM admin pronto: ${admin.email}`);

  console.log('Seed completo.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
