import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ModalWrapper } from '@/components/ui/ModalWrapper';
import { Loader2, CheckCircle2, Copy, X } from 'lucide-react';
import { internalApiClient, Employee } from '@/lib/internalApiClient';
import { useEmployee } from '@/contexts/EmployeeProvider';

interface GreenFeedbackModalProps {
  open: boolean;
  onClose: () => void;
}

export const GreenFeedbackModal: React.FC<GreenFeedbackModalProps> = ({ open, onClose }) => {
  const { employee } = useEmployee();
  const [anonymous, setAnonymous] = useState<'yes' | 'no' | ''>('');
  const [feedback, setFeedback] = useState('');
  const [department, setDepartment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [issueKey, setIssueKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => feedback.trim().length > 3, [feedback]);

  const reset = () => {
    setAnonymous('no');
    setFeedback('');
    setDepartment('');
    setSubmitting(false);
    setIssueKey(null);
    setError(null);
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    setIssueKey(null);
    const isAnonymous = anonymous === 'yes' ? true : anonymous === 'no' ? false : true;
    const result = await internalApiClient.submitYandexFeedback({
      anonymous: isAnonymous,
      feedbackText: feedback.trim(),
      departmentText: department.trim() || undefined,
      companyEmail: employee?.company_email,
    });
    setSubmitting(false);
    if (!result || !result.key) {
      setError('Не удалось отправить. Попробуй ещё раз позже.');
      return;
    }
    setIssueKey(result.key);
  };

  if (!open) return null;

  return (
    <ModalWrapper isOpen={open} onClose={handleClose}>
      <Card className="w-full max-w-sm bg-white/90 dark:bg-gray-800/90 border-0">
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Зелёная кнопка</CardTitle>
            <button
              onClick={handleClose}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded dark:text-gray-300"
              aria-label="Закрыть"
            >
              <X size={16} />
            </button>
          </div>
          {issueKey ? (
            <div className="flex flex-col items-center text-center gap-3 py-6">
              <CheckCircle2 className="text-green-500" size={40} />
              <div className="text-sm text-gray-700 dark:text-gray-300">Спасибо за твою обратную связь 💚</div>
              {anonymous === 'no' ? (
                <div className="flex items-center gap-2">
                  <a
                    href={`https://tracker.yandex.ru/${issueKey}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold underline-offset-4 hover:underline"
                  >
                    Номер твоего обращения: {issueKey}
                  </a>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Скопировать ссылку"
                    onClick={() => navigator.clipboard.writeText(`https://tracker.yandex.ru/${issueKey}`)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="font-semibold">Номер твоего обращения: {issueKey}</div>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <div className="text-sm font-medium">Отправить анонимно?</div>
                <RadioGroup
                  value={anonymous}
                  onValueChange={(v) => setAnonymous((v as 'yes' | 'no' | '') || '')}
                  className="grid grid-cols-2 gap-3"
                >
                  <label className="flex items-center gap-2 p-2 border rounded-md cursor-pointer">
                    <RadioGroupItem value="yes" />
                    <span>Да</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 border rounded-md cursor-pointer">
                    <RadioGroupItem value="no" />
                    <span>Нет</span>
                  </label>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Твоя обратная связь <span className="text-red-600">*</span></div>
                <Textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Пожалуйста, подробно опиши, что хочешь предложить или что беспокоит"
                  rows={5}
                  required
                  aria-required="true"
                />
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">К какому направлению/филиалу относится твой вопрос</div>
                <Input
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Например: Филиал Новосибирск, Отдел продаж"
                />
              </div>

              {error && (
                <div className="text-sm text-red-600">{error}</div>
              )}

              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
                className="w-full bg-gradient-to-r from-emerald-500 via-green-500 to-lime-500 text-white shadow-lg hover:shadow-xl"
              >
                {submitting && <Loader2 className="animate-spin" />}
                Отправить
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </ModalWrapper>
  );
};

export default GreenFeedbackModal;


