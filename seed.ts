import { PrismaClient, UserRole } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({
    where: { email: 'admin@flupflap.com' },
    update: {},
    create: { email: 'admin@flupflap.com', role: UserRole.ADMIN, firstName: 'Admin', lastName: 'User' }
  });
}
main().finally(() => prisma.$disconnect());
