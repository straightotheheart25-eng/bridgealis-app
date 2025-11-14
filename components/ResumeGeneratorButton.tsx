import React, { useState, useEffect } from 'react';

export default function ResumeGeneratorButton() {
  const [eligible, setEligible] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/resume/available')
      .then((r) => r.json())
      .then((data) => {
        setEligible(data.eligible);
        if (data.existingResume) setDownloadUrl(data.existingResume.url);
      })
      .catch(() => setEligible(false));
  }, []);

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await fetch('/api/resume/generate', { method: 'POST' });
      const json = await res.json();
      if (res.ok) {
        setDownloadUrl(json.downloadUrl);
      } else {
        alert(json.error || 'Failed');
      }
    } finally {
      setLoading(false);
    }
  }

  if (eligible === null) return <div>Checking eligibility…</div>;
  if (!eligible) return <div>Apply to at least two jobs to unlock resume generation.</div>;

  return (
    <div>
      <button onClick={handleGenerate} disabled={loading} style={{ padding: '8px 12px' }}>
        {loading ? 'Generating…' : 'Generate resume (PDF)'}
      </button>
      {downloadUrl && (
        <div style={{ marginTop: 8 }}>
          <a href={downloadUrl} target="_blank" rel="noreferrer">Download resume (temporary)</a>
        </div>
      )}
    </div>
  );
}