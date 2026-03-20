import { useEffect, useState } from 'react';

interface DeployVersionInfo {
  version: string;
  showVersion: boolean;
}

export function DeployVersionBadge() {
  const [info, setInfo] = useState<DeployVersionInfo | null>(null);

  useEffect(() => {
    fetch('/api/deploy-version')
      .then(res => res.json())
      .then(data => setInfo(data))
      .catch(() => setInfo(null));
  }, []);

  if (!info?.showVersion || !info.version || info.version === 'unknown') {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 70,
        right: 8,
        fontSize: 10,
        color: '#9ca3af',
        opacity: 0.7,
        fontFamily: 'monospace',
        pointerEvents: 'none',
        zIndex: 40,
        userSelect: 'none',
      }}
    >
      {info.version}
    </div>
  );
}
