import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = await getSession({ req });
  if (!session?.user?.email) return res.status(401).json({ error: 'Not authenticated' });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const applicationCount = await prisma.application.count({ where: { candidateId: user.id } });
  if (applicationCount < 2) {
    return res.status(403).json({ error: 'Apply to at least two jobs to generate a resume.' });
  }

  // create a Resume placeholder and a queued ResumeJob
  const resume = await prisma.resume.create({ data: { userId: user.id, url: '', template: 'default', status: 'PENDING' } });
  const job = await prisma.resumeJob.create({ data: { userId: user.id, template: 'default', resumeId: resume.id } });

  res.status(202).json({ jobId: job.id, resumeId: resume.id });
}
