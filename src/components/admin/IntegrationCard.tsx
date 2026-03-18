import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertTriangle, Minus, Eye, EyeOff } from 'lucide-react';

const categoryLabels: Record<string, { label: string; color: string }> = {
  core: { label: 'Core', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  external: { label: 'External', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  data_source: { label: 'Data Source', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
  logging: { label: 'Logging', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  dev: { label: 'Dev', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' },
};

interface IntegrationData {
  id: string;
  name: string;
  category: string;
  ok: boolean;
  message: string;
  latency: number | null;
  env: Record<string, string | null>;
}

function StatusIcon({ ok, message }: { ok: boolean; message: string }) {
  if (ok && message === 'OK') return <CheckCircle2 className="w-5 h-5 text-green-500" />;
  if (ok) return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
  if (message === 'Missing env vars') return <Minus className="w-5 h-5 text-gray-400" />;
  return <XCircle className="w-5 h-5 text-red-500" />;
}

export const IntegrationCard = React.memo(function IntegrationCard({ data }: { data: IntegrationData }) {
  const [showEnv, setShowEnv] = useState(false);
  const cat = categoryLabels[data.category] || categoryLabels.dev;

  return (
    <Card className="bg-card shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusIcon ok={data.ok} message={data.message} />
            <CardTitle className="text-base">{data.name}</CardTitle>
          </div>
          <Badge className={`text-xs font-medium ${cat.color}`} variant="secondary">
            {cat.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{data.message}</span>
          {data.latency != null && (
            <span className="text-xs text-muted-foreground">{data.latency}ms</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowEnv((v) => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showEnv ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            Env vars
          </button>
        </div>

        {showEnv && (
          <div className="text-xs space-y-0.5 font-mono bg-gray-50 dark:bg-gray-900 rounded p-2">
            {Object.entries(data.env).map(([key, val]) => (
              <div key={key} className="flex gap-1">
                <span className="text-muted-foreground">{key}=</span>
                <span className={val ? 'text-foreground' : 'text-red-400'}>{val ?? '(not set)'}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
