import { Layout } from '@/components/Layout';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Crown, RefreshCw, DollarSign, TrendingUp, Target, ThumbsUp, ThumbsDown } from 'lucide-react';
import { ProgressBar } from '@/components/ProgressBar';
import { FeedbackForm } from '@/components/FeedbackForm';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export default function Profile() {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'positive' | 'negative'>('positive');

  const openFeedback = (type: 'positive' | 'negative') => {
    setFeedbackType(type);
    setFeedbackOpen(true);
  };

  return (
    <Layout>
      <div className="px-4 py-6">
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-primary mb-2">Мой профиль</h1>
          <p className="text-base text-muted-foreground">Твои личные данные и настройки</p>
        </div>

        <div className="space-y-6">
          {/* User Profile Card */}
          <div className="bg-card rounded-2xl p-6 shadow-card border-0">
            <div className="text-center space-y-4">
              {/* Avatar */}
              <div className="inline-flex items-center justify-center w-16 h-16 bg-avatar-blue text-white rounded-full text-xl font-bold">
                ДФ
              </div>
              
              {/* User Info */}
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-foreground">Дмитрий Федулов</h2>
                <p className="text-primary font-semibold">Product manager</p>
                <p className="text-muted-foreground text-sm">@fedulovdm</p>
              </div>
            </div>
          </div>

          {/* Manager Section */}
          <div className="bg-card rounded-2xl p-4 shadow-card border-0">
            <div className="flex items-center gap-3 mb-4">
              <Crown className="w-5 h-5 text-warning" />
              <h3 className="font-semibold text-foreground">Руководитель</h3>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Manager Avatar */}
              <div className="w-10 h-10 bg-avatar-orange text-white rounded-full flex items-center justify-center font-bold text-sm">
                ИН
              </div>
              
              {/* Manager Info */}
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">Игорь Николаев</h4>
                <p className="text-muted-foreground text-sm">CTO</p>
                <p className="text-primary text-sm">@inickolayev</p>
              </div>
            </div>
          </div>

          {/* Salary Dashboard */}
          <div className="bg-card rounded-2xl p-4 shadow-card border-0">
            <div className="flex items-center gap-3 mb-4">
              <DollarSign className="w-5 h-5 text-success" />
              <h3 className="font-semibold text-foreground">Зарплата и KPI</h3>
            </div>
            
            <div className="space-y-4">
              {/* Current Plan Progress */}
              <div className="bg-success-light border-0 rounded-xl p-3 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-5 h-5 bg-success rounded-full flex items-center justify-center">
                    <TrendingUp className="w-3 h-3 text-success-foreground" />
                  </div>
                  <span className="font-semibold text-success text-sm">Выполнение плана</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-end justify-between">
                    <span className="text-lg font-bold text-success">87%</span>
                    <span className="text-success text-sm">260 000 из 300 000 ₽</span>
                  </div>
                  <ProgressBar value={260000} max={300000} color="success" />
                  <div className="text-xs text-success">До премии остается: 40 000 ₽</div>
                </div>
              </div>

              {/* Salary Forecast */}
              <div className="bg-primary-light border-0 rounded-xl p-3 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                    <DollarSign className="w-3 h-3 text-primary-foreground" />
                  </div>
                  <span className="font-semibold text-primary text-sm">Прогноз зарплаты</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Базовая:</span>
                    <span className="text-sm font-semibold">80 000 ₽</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">KPI бонус:</span>
                    <span className="text-sm font-semibold text-primary">+ 25 000 ₽</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-border">
                    <span className="text-sm font-bold">Итого:</span>
                    <span className="text-base font-bold text-primary">105 000 ₽</span>
                  </div>
                </div>
              </div>

              {/* KPI Bonuses */}
              <div className="space-y-2">
                <h4 className="font-semibold text-foreground text-sm">KPI показатели</h4>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-primary" />
                      <span className="text-sm">Выручка план</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-success">87%</div>
                      <div className="text-xs text-success">+15 000 ₽</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-primary" />
                      <span className="text-sm">Качество сделок</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-success">95%</div>
                      <div className="text-xs text-success">+10 000 ₽</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-warning" />
                      <span className="text-sm">Новые клиенты</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-warning">65%</div>
                      <div className="text-xs text-muted-foreground">+0 ₽</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feedback Actions */}
          <div className="bg-card rounded-2xl p-4 shadow-card border-0">
            <h3 className="font-semibold text-foreground mb-3">Обратная связь</h3>
            <div className="flex gap-3">
              <Button
                onClick={() => openFeedback('positive')}
                className="flex-1 bg-success hover:bg-success/90 text-success-foreground"
                size="sm"
              >
                <ThumbsUp className="w-4 h-4 mr-2" />
                Благодарность
              </Button>
              <Button
                onClick={() => openFeedback('negative')}
                variant="destructive"
                className="flex-1"
                size="sm"
              >
                <ThumbsDown className="w-4 h-4 mr-2" />
                Проблема
              </Button>
            </div>
          </div>

          {/* Account Actions */}
          <div className="bg-card rounded-2xl p-4 shadow-card border-0">
            <button className="w-full flex items-center justify-center gap-2 py-3 text-foreground font-medium hover:bg-muted rounded-xl transition-colors">
              <RefreshCw className="w-4 h-4" />
              <span>Перезагрузить аккаунт</span>
            </button>
          </div>

          {/* Version Info */}
          <div className="bg-card rounded-2xl p-4 shadow-card border-0">
            <div className="text-center text-muted-foreground text-sm">
              <p>Версия: unknown</p>
            </div>
          </div>
        </div>
      </div>
      
      <FeedbackForm 
        isOpen={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        feedbackType={feedbackType}
      />
      
      <BottomNavigation />
    </Layout>
  );
}