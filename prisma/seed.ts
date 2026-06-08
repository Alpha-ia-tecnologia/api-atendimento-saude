import { PrismaClient, TipoPerfilCrm } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { ESPECIALIDADES } from '../src/modules/seed/seed.data';

const prisma = new PrismaClient();

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
