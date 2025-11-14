import React from 'react';

export default function Pricing() {
  const baseline = Number(process.env.NEXT_PUBLIC_BASELINE_POST_PRICE || '100');
  const ourPrice = Math.round((baseline * 0.9) * 100) / 100;

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto' }}>
      <h1>Pricing</h1>
      <p>We price at 10% less than the baseline you configure.</p>
      <div style={{ marginTop: 16 }}>
        <h2>Standard job post</h2>
        <p>Baseline price: ${baseline.toFixed(2)}</p>
        <p>Our price (10% off): ${ourPrice.toFixed(2)}</p>
      </div>
    </main>
  );
}