import Link from 'next/link';
import ResumeGeneratorButton from '../components/ResumeGeneratorButton';

export default function Home() {
  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto' }}>
      <h1>Bridgealis — Job marketplace starter</h1>
      <p>Focused on returning citizens, youth, and older workers.</p>

      <section style={{ marginTop: 24 }}>
        <h2>Resume generator (gated)</h2>
        <p>Job-seekers can generate a downloadable PDF after applying to two jobs.</p>
        <ResumeGeneratorButton />
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Pricing</h2>
        <p>
          View <Link href="/pricing">pricing page</Link> — prices are computed as 10% below the baseline you set.
        </p>
      </section>
    </main>
  );
}