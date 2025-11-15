import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import prisma from '../../../../lib/prisma';
import { getSignedUrl } from '../../../../lib/gcs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const session = await getSession({ req });
  if (!session?.user?.email) return res.status(401).json({ error: 'Not authenticated' });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const resume = await prisma.resume.findUnique({ where: { id: id as string } });
  if (!resume) return res.status(404).json({ error: 'Resume not found' });
  if (resume.userId !== user.id) return res.status(403).json({ error: 'Forbidden' });
  if (resume.status !== 'READY') return res.status(409).json({ error: 'Resume not ready' });

  const signed = await getSignedUrl(resume.url, 60 * 60);
  res.status(200).json({ downloadUrl: signed });
}
