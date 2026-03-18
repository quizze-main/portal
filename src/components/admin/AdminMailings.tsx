import React from 'react';
import { Spinner } from '@/components/Spinner';
import { Button } from '@/components/ui/button';
import { RefreshCw, Bot, MessageSquare, Radio } from 'lucide-react';
import { useAdminMailings } from '@/hooks/useAdminMailings';

function maskUrl(url?: string): string {
  if (!url) return '—';
  try {
    const u = new URL(url);
    const host = u.hostname;
    const path = u.pathname.length > 20 ? u.pathname.slice(0, 20) + '...' : u.pathname;
    return `${u.protocol}//${host}${path}`;
  } catch {
    return url.length > 40 ? url.slice(0, 40) + '...' : url;
  }
}

export const AdminMailings: React.FC = () => {
  const { webhookInfo, integrations } = useAdminMailings();

  const webhook = webhookInfo.data?.result;
  const tgConnected = !!webhook?.url;

  const smsIntegration = React.useMemo(() => {
    if (!integrations.data?.integrations) return null;
    return integrations.data.integrations.find(
      (i: any) => i.id === 'sms-gateway' || i.name?.toLowerCase().includes('sms')
    );
  }, [integrations.data]);

  const smsConnected = smsIntegration?.ok === true;

  const isLoading = webhookInfo.isLoading || integrations.isLoading;

  return (
    <div className="space-y-4">
      {isLoading && (
        <div className="flex justify-center py-8">
          <Spinner size="md" />
        </div>
      )}

      {!isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Telegram Bot */}
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-muted-foreground" />
                <h3 className="font-medium text-sm">Telegram Bot</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => webhookInfo.refetch()}
                disabled={webhookInfo.isFetching}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${webhookInfo.isFetching ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            <div className="grid gap-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Статус:</span>
                {tgConnected ? (
                  <span className="text-green-600 font-medium">Подключён</span>
                ) : (
                  <span className="text-red-500 font-medium">Не настроен</span>
                )}
              </div>
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground shrink-0">Webhook:</span>
                <span className="text-xs break-all">{maskUrl(webhook?.url)}</span>
              </div>
              {typeof webhook?.pending_update_count === 'number' && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Ожидающих обновлений:</span>
                  <span className="font-medium">{webhook.pending_update_count}</span>
                </div>
              )}
              {webhook?.last_error_message && (
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground shrink-0">Последняя ошибка:</span>
                  <span className="text-xs text-red-500">{webhook.last_error_message}</span>
                </div>
              )}
            </div>

            {webhookInfo.isError && (
              <p className="text-xs text-red-500">Ошибка получения данных webhook</p>
            )}
          </div>

          {/* SMS Gateway */}
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-medium text-sm">SMS-шлюз</h3>
            </div>
            <div className="grid gap-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Статус:</span>
                {smsConnected ? (
                  <span className="text-green-600 font-medium">Настроен</span>
                ) : (
                  <span className="text-red-500 font-medium">Не настроен</span>
                )}
              </div>
              {smsIntegration?.env && Object.keys(smsIntegration.env).length > 0 && (
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground shrink-0">URL:</span>
                  <span className="text-xs">
                    {String(Object.values(smsIntegration.env).find((v: any) => typeof v === 'string' && v.includes('...')) || '—')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Channels info */}
          <div className="rounded-lg border bg-card p-4 space-y-3 lg:col-span-2">
            <div className="flex items-center gap-2">
              <Radio className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-medium text-sm">Каналы рассылки</h3>
            </div>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                <span className="font-medium text-foreground">Telegram</span> — уведомления через бота. Поддержка глубоких ссылок на задачи и документы.
              </p>
              <p>
                <span className="font-medium text-foreground">SMS</span> — отправка через SMS-шлюз. Требует настройки внешнего сервиса.
              </p>
              <p>
                <span className="font-medium text-foreground">SSE</span> — push-уведомления в реальном времени через Server-Sent Events. Работает автоматически.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
