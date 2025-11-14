// Simple seed script to create test data for local dev
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');
  const employer = await prisma.user.upsert({
    where: { email: 'employer@example.com' },
    update: {},
    create: {
      email: 'employer@example.com',
      name: 'Employer Example',
      role: 'EMPLOYER',
    },
  });

  const company = await prisma.company.upsert({
    where: { ownerId: employer.id },
    update: { name: 'Acme Co' },
    create: {
      ownerId: employer.id,
      name: 'Acme Co',
      verified: true,
    },
  });

  const job1 = await prisma.job.create({
    data: {
      companyId: company.id,
      title: 'General Labor',
      description: 'Entry level general labor role.',
      tags: ['entry-level'],
      entryLevel: true,
      secondChanceFriendly: true,
    },
  });
  const job2 = await prisma.job.create({
    data: {
      companyId: company.id,
      title: 'Warehouse Associate',
      description: 'Warehouse associate with light lifting.',
      tags: ['warehouse'],
      entryLevel: true,
    },
  });

  const candidate = await prisma.user.upsert({
    where: { email: 'candidate@example.com' },
    update: {},
    create: {
      email: 'candidate@example.com',
      name: 'Candidate Example',
      role: 'CANDIDATE',
    },
  });

  await prisma.profile.upsert({
    where: { userId: candidate.id },
    update: {},
    create: {
      userId: candidate.id,
      headline: 'Reliable, hardworking candidate',
      cohortType: 'RETURNING',
      skills: ['teamwork', 'lifting'],
      experience: [
        { role: 'Cashier', company: 'ShopMart', years: 2 },
      ],
    },
  });

  await prisma.application.create({
    data: { jobId: job1.id, candidateId: candidate.id, coverLetter: 'I am interested in this role.' },
  });
  await prisma.application.create({
    data: { jobId: job2.id, candidateId: candidate.id, coverLetter: 'Please consider me.' },
  });

  console.log('Seeding complete. Candidate email: candidate@example.com');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });