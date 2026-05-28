import { PrismaClient, OrganizationStatus, RoleStatus, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const PERMISSIONS = [
  { name: 'USER_VIEW', module: 'USER', action: 'VIEW', description: 'View users' },
  { name: 'USER_CREATE', module: 'USER', action: 'CREATE', description: 'Create users' },
  { name: 'USER_UPDATE', module: 'USER', action: 'UPDATE', description: 'Update users' },
  { name: 'USER_DELETE', module: 'USER', action: 'DELETE', description: 'Delete users' },
  { name: 'ORGANIZATION_VIEW', module: 'ORGANIZATION', action: 'VIEW', description: 'View organizations' },
  { name: 'ORGANIZATION_CREATE', module: 'ORGANIZATION', action: 'CREATE', description: 'Create organizations' },
  { name: 'ORGANIZATION_UPDATE', module: 'ORGANIZATION', action: 'UPDATE', description: 'Update organizations' },
  { name: 'ORGANIZATION_DELETE', module: 'ORGANIZATION', action: 'DELETE', description: 'Delete organizations' },
  { name: 'ROLE_VIEW', module: 'ROLE', action: 'VIEW', description: 'View roles' },
  { name: 'ROLE_CREATE', module: 'ROLE', action: 'CREATE', description: 'Create roles' },
  { name: 'ROLE_UPDATE', module: 'ROLE', action: 'UPDATE', description: 'Update roles' },
  { name: 'ROLE_DELETE', module: 'ROLE', action: 'DELETE', description: 'Delete roles' },
  { name: 'PERMISSION_VIEW', module: 'PERMISSION', action: 'VIEW', description: 'View permissions' },
  { name: 'PERMISSION_CREATE', module: 'PERMISSION', action: 'CREATE', description: 'Create permissions' },
  { name: 'AUDIT_VIEW', module: 'AUDIT', action: 'VIEW', description: 'View audit logs' },
];

async function main() {
  const adminName = process.env.ADMIN_NAME ?? 'Admin';
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'Admin@123';
  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 10);

  console.log('Seeding database...');

  const organization = await prisma.organization.upsert({
    where: { document: '00000000000000' },
    update: {},
    create: {
      name: 'Default Organization',
      document: '00000000000000',
      status: OrganizationStatus.ACTIVE,
    },
  });
  console.log(`Organization ready: ${organization.name}`);

  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { name: p.name },
      update: { description: p.description, module: p.module, action: p.action },
      create: p,
    });
  }
  console.log(`Permissions ready: ${PERMISSIONS.length}`);

  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: { status: RoleStatus.ACTIVE },
    create: {
      name: 'ADMIN',
      description: 'Full administrator',
      status: RoleStatus.ACTIVE,
    },
  });
  console.log(`Role ready: ${adminRole.name}`);

  const allPermissions = await prisma.permission.findMany();
  for (const perm of allPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: perm.id },
    });
  }
  console.log(`Role ${adminRole.name} linked to ${allPermissions.length} permissions`);

  const passwordHash = await bcrypt.hash(adminPassword, saltRounds);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: adminName,
      status: UserStatus.ACTIVE,
      organizationId: organization.id,
    },
    create: {
      name: adminName,
      email: adminEmail,
      passwordHash,
      status: UserStatus.ACTIVE,
      organizationId: organization.id,
    },
  });
  console.log(`Admin user ready: ${adminUser.email}`);

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
    update: {},
    create: { userId: adminUser.id, roleId: adminRole.id },
  });
  console.log('Admin assigned to ADMIN role');

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
