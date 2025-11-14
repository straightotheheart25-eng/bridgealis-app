import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import prisma from '../../../lib/prisma';

// NOTE: This uses pdf-lib to build a server-side PDF. For full-fidelity HTML->PDF, use Puppeteer in a worker.

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = await getSession({ req });
  if (!session?.user?.email) return res.status(401).json({ error: 'Not authenticated' });

  const user = await prisma.user.findUnique({ where: { email: session.user.email }, include: { profile: true } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const applicationCount = await prisma.application.count({ where: { candidateId: user.id } });
  if (applicationCount < 2) {
    return res.status(403).json({ error: 'Apply to at least two jobs to generate a resume.' });
  }

  const profile = user.profile;

  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const { width, height } = page.getSize();

    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const fontSizeTitle = 20;
    const fontSizeNormal = 12;

    page.drawText(user.name ?? 'Unnamed', { x: 50, y: height - 60, size: fontSizeTitle, font: timesRomanFont, color: rgb(0, 0, 0) });
    page.drawText(user.email, { x: 50, y: height - 85, size: fontSizeNormal, font: timesRomanFont });

    if (profile?.headline) {
      page.drawText(profile.headline, { x: 50, y: height - 110, size: fontSizeNormal, font: timesRomanFont });
    }

    if (profile?.skills && profile.skills.length) {
      page.drawText('Skills: ' + profile.skills.join(', '), { x: 50, y: height - 140, size: fontSizeNormal, font: timesRomanFont });
    }

    if (profile?.experience) {
      page.drawText('Experience:', { x: 50, y: height - 170, size: fontSizeNormal, font: timesRomanFont });
      const expText = JSON.stringify(profile.experience, null, 2).slice(0, 800);
      page.drawText(expText, { x: 50, y: height - 190, size: 10, font: timesRomanFont, maxWidth: 480 });
    }

    const pdfBytes = await pdfDoc.save();

    // For scaffold simplicity store base64 data URL in Resume record; in production upload to S3/Supabase.
    const base64 = Buffer.from(pdfBytes).toString('base64');
    const dataUrl = 'data:application/pdf;base64,' + base64;

    const resume = await prisma.resume.create({ data: { userId: user.id, url: dataUrl, template: 'default' } });

    res.status(200).json({ resumeId: resume.id, downloadUrl: dataUrl });
  } catch (err) {
    console.error('Resume generation error', err);
    res.status(500).json({ error: 'Failed to generate resume' });
  }
}