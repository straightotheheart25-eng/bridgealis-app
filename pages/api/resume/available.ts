import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });
  if (!session?.user?.email) return res.status(401).json({ error: 'Not authenticated' });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const applicationCount = await prisma.application.count({ where: { candidateId: user.id } });
  const existingResume = await prisma.resume.findFirst({ where: { userId: user.id }, orderBy: { generatedAt: 'desc' } });

  res.json({ eligible: applicationCount >= 2, applicationCount, existingResume });
}