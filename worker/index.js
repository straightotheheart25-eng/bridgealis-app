const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const puppeteer = require('puppeteer');
const { uploadBuffer } = require('../lib/gcs');

async function renderResumeHtml(user, profile, recentApps) {
  const exp = Array.isArray(profile?.experience) ? profile.experience : [];
  const experienceHtml = exp.map(e => `<div><strong>${e.role}</strong> - ${e.company}</div>`).join('');
  const recentHtml = (recentApps || []).map(a => `<div><strong>${a.job.title}</strong> (${new Date(a.createdAt).toLocaleDateString()})</div>`).join('');
  return `
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; }
        h1 { margin-bottom: 0 }
        .section { margin-top: 16px }
      </style>
    </head>
    <body>
      <h1>${user.name || 'Unnamed'}</h1>
      <p>${user.email}</p>
      <div class="section">
        <h2>Headline</h2>
        <div>${profile?.headline || ''}</div>
      </div>
      <div class="section">
        <h2>Experience</h2>
        ${experienceHtml}
      </div>
      <div class="section">
        <h2>Recent applications</h2>
        ${recentHtml}
      </div>
    </body>
  </html>`;
}

async function processJob(job) {
  console.log('Processing job', job.id);
  try {
    await prisma.resumeJob.update({ where: { id: job.id }, data: { status: 'PROCESSING' } });

    const user = await prisma.user.findUnique({ where: { id: job.userId }, include: { profile: true } });
    if (!user) throw new Error('User not found for resume job ' + job.id);
    const recentApps = await prisma.application.findMany({ where: { candidateId: job.userId }, orderBy: { createdAt: 'desc' }, take: 3, include: { job: true } });

    const html = await renderResumeHtml(user, user.profile, recentApps);

    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    const destination = `resumes/${job.userId}/${Date.now()}.pdf`;
    await uploadBuffer(pdfBuffer, destination, 'application/pdf');

    // Update existing resume placeholder if resumeId exists, otherwise create a new resume record.
    let resume;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // expire in 7 days
    if (job.resumeId) {
      resume = await prisma.resume.update({
        where: { id: job.resumeId },
        data: {
          url: destination,
          template: job.template || 'default',
          status: 'READY',
          generatedAt: new Date(),
          expiresAt,
        },
      });
    } else {
      resume = await prisma.resume.create({
        data: {
          userId: job.userId,
          url: destination,
          template: job.template || 'default',
          status: 'READY',
          generatedAt: new Date(),
          expiresAt,
        },
      });
    }

    await prisma.resumeJob.update({ where: { id: job.id }, data: { status: 'DONE', resumeId: resume.id, processedAt: new Date() } });
    console.log('Job completed', job.id);
  } catch (err) {
    console.error('Job failed', job.id, err);
    try {
      await prisma.resumeJob.update({ where: { id: job.id }, data: { status: 'FAILED' } });
    } catch (e) {
      console.error('Failed to mark job failed', job.id, e);
    }
  }
}

async function poll() {
  console.log('Worker started - polling for resume jobs');
  while (true) {
    try {
      const job = await prisma.resumeJob.findFirst({ where: { status: 'QUEUED' }, orderBy: { createdAt: 'asc' } });
      if (job) {
        await processJob(job);
      } else {
        await new Promise(r => setTimeout(r, 3000));
      }
    } catch (err) {
      console.error('Worker error', err);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

poll().catch(err => {
  console.error('Fatal worker error', err);
  process.exit(1);
});