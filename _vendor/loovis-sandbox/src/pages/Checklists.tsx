import { Layout } from '@/components/Layout';
import { BottomNavigation } from '@/components/BottomNavigation';
import { CheckSquare, FileText, Clock, User, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Checklists() {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="px-4 py-6">
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-primary mb-2">Чеклисты</h1>
          <p className="text-base text-muted-foreground">Опросники и анкеты для менеджеров заботы</p>
        </div>

        <div className="space-y-6">
          {/* Integrated Questionnaires Section */}
          <div className="bg-card rounded-2xl p-4 shadow-card border-0">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Интегрированные анкеты</h3>
            </div>
            
            <div className="space-y-3">
              {/* Sample Questionnaire */}
              <button 
                onClick={() => navigate('/questionnaire')}
                className="w-full bg-muted hover:bg-muted/80 rounded-xl p-3 border border-border transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                      <CheckSquare className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <div className="text-left">
                      <h4 className="font-semibold text-foreground">Чек-лист проверки зала оптики</h4>
                      <p className="text-sm text-muted-foreground">Ежедневная проверка состояния торгового зала</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-success text-xs">
                        <Clock className="w-3 h-3" />
                        <span>10 мин</span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </button>

              <div className="bg-muted rounded-xl p-3 border border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-warning rounded-full flex items-center justify-center">
                      <CheckSquare className="w-4 h-4 text-warning-foreground" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">Самооценка менеджера заботы</h4>
                      <p className="text-sm text-muted-foreground">Ежемесячная анкета для самоанализа</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-warning text-xs">
                      <Clock className="w-3 h-3" />
                      <span>10 мин</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-muted rounded-xl p-3 border border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-success rounded-full flex items-center justify-center">
                      <CheckSquare className="w-4 h-4 text-success-foreground" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">Обратная связь от команды</h4>
                      <p className="text-sm text-muted-foreground">360° оценка от коллег и руководства</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-primary text-xs">
                      <User className="w-3 h-3" />
                      <span>Команда</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Coming Soon Section */}
          <div className="bg-card rounded-2xl p-6 shadow-card border-0">
            <div className="text-center space-y-4">
              <CheckSquare className="w-16 h-16 text-muted-foreground mx-auto" />
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Больше анкет скоро</h3>
                <p className="text-muted-foreground">Мы работаем над добавлением новых опросников и чеклистов</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <BottomNavigation />
    </Layout>
  );
}