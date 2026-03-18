import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { BottomNavigation } from '@/components/BottomNavigation';
import { StatsCard } from '@/components/StatsCard';
import { ProgressBar } from '@/components/ProgressBar';
import { Trophy, Medal, Crown, Target, TrendingUp, Star, Award, Zap, ChevronRight } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getManagerAvatar } from '@/lib/utils';

export default function Competition() {
  const navigate = useNavigate();
  const managers = [{
    id: 'elena_novikova',
    name: 'Елена Новикова',
    initials: 'ЕН',
    position: 'Менеджер заботы',
    plan: 300000,
    current: 260000,
    percentage: 87,
    points: 850,
    badges: ['🔥', '⭐', '🎯']
  }, {
    id: 'ivan_sidorov',
    name: 'Иван Сидоров',
    initials: 'ИС',
    position: 'Менеджер заботы',
    plan: 280000,
    current: 245000,
    percentage: 88,
    points: 880,
    badges: ['👑', '💎', '🏆']
  }, {
    id: 'maria_petrova',
    name: 'Мария Петрова',
    initials: 'МП',
    position: 'Менеджер заботы',
    plan: 320000,
    current: 272000,
    percentage: 85,
    points: 820,
    badges: ['🎯', '⚡']
  }, {
    id: 'alexei_kozlov',
    name: 'Алексей Козлов',
    initials: 'АК',
    position: 'Менеджер заботы',
    plan: 250000,
    current: 200000,
    percentage: 80,
    points: 750,
    badges: ['🌟']
  }];
  const sortedManagers = [...managers].sort((a, b) => b.points - a.points);
  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Crown className="w-3 h-3 text-primary" />;
      case 1:
        return <Medal className="w-3 h-3 text-success" />;
      case 2:
        return <Award className="w-3 h-3 text-warning" />;
      default:
        return <span className="text-xs font-bold text-muted-foreground">#{index + 1}</span>;
    }
  };
  const getRankBg = (index: number) => {
    switch (index) {
      case 0:
        return 'bg-primary-light border-primary/20';
      case 1:
        return 'bg-success-light border-success/20';
      case 2:
        return 'bg-warning-light border-warning/20';
      default:
        return 'bg-muted border-border';
    }
  };
  return <Layout>
      <div className="px-3 py-4">
        {/* Page Header */}
        <div className="text-center mb-4">
          <h1 className="text-base font-bold text-primary mb-1">Геймификация</h1>
          <p className="text-xs text-muted-foreground">Рейтинг менеджеров по выполнению планов</p>
        </div>

        <div className="space-y-3">
          {/* Competition Stats */}
          <StatsCard icon={<Trophy className="w-4 h-4" />} title="Текущий сезон">
            <div className="space-y-2">
              <div className="bg-primary-light border-0 rounded-lg p-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-primary font-medium">Менеджер месяца</span>
                  <div className="flex items-center gap-1">
                    <Crown className="w-3 h-3 text-primary" />
                    <span className="text-xs font-bold">Анна С.</span>
                  </div>
                </div>
                <div className="mt-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Прогресс:</span>
                    <span className="font-semibold">88%</span>
                  </div>
                  <ProgressBar value={88} max={100} color="primary" className="mt-0.5" />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-1 text-center">
                <div className="bg-muted rounded p-1">
                  <div className="text-xs text-muted-foreground">Участников</div>
                  <div className="text-sm font-bold">4</div>
                </div>
                <div className="bg-muted rounded p-1">
                  <div className="text-xs text-muted-foreground">Дней до конца</div>
                  <div className="text-sm font-bold">12</div>
                </div>
                <div className="bg-muted rounded p-1">
                  <div className="text-xs text-muted-foreground">Призовой фонд</div>
                  <div className="text-sm font-bold">50к ₽</div>
                </div>
              </div>
            </div>
          </StatsCard>

          {/* Leaderboard */}
          <StatsCard icon={<Medal className="w-4 h-4" />} title="Рейтинг">
            <div className="space-y-1">
              {sortedManagers.map((manager, index) => (
                <button
                  key={manager.id}
                  onClick={() => navigate(`/dashboard/manager/${manager.id}`)}
                  className={`w-full p-2 rounded-lg border ${getRankBg(index)} ${manager.name === 'Дмитрий Федулов' ? 'ring-1 ring-primary/30' : ''} hover:bg-muted/50 transition-colors cursor-pointer group text-left`}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-6 h-6">
                      {getRankIcon(index)}
                    </div>
                    
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={getManagerAvatar(manager.id)} alt={manager.name} />
                      <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                        {manager.initials}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-semibold truncate">{manager.name}</div>
                          <div className="text-xs text-muted-foreground">{manager.position}</div>
                        </div>
                        <div className="text-right flex items-center gap-1">
                          <div>
                            <div className="flex items-center gap-1">
                              <Zap className="w-3 h-3 text-warning" />
                              <span className="text-xs font-bold">{manager.points}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">{manager.percentage}%</div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                      
                      <div className="mt-1">
                        <ProgressBar value={manager.current} max={manager.plan} color={index === 0 ? "primary" : "primary"} className="h-1" />
                      </div>
                      
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center gap-0.5">
                          {manager.badges.map((badge, i) => <span key={i} className="text-xs">{badge}</span>)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {manager.current.toLocaleString()} / {manager.plan.toLocaleString()} ₽
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </StatsCard>

          {/* Achievements */}
          <StatsCard icon={<Star className="w-4 h-4" />} title="Достижения">
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-success-light rounded-lg p-2 text-center border border-success/20">
                  <div className="text-lg">🎯</div>
                  <div className="text-xs font-semibold text-success">Снайпер</div>
                  <div className="text-xs text-success">Точность 95%</div>
                </div>
                
                <div className="bg-warning-light rounded-lg p-2 text-center border border-warning/20">
                  <div className="text-lg">🔥</div>
                  <div className="text-xs font-semibold text-warning">Горячая серия</div>
                  <div className="text-xs text-warning">5 дней подряд</div>
                </div>
              </div>
              
              <div className="bg-muted rounded-lg p-2 opacity-50">
                <div className="flex items-center gap-2">
                  <div className="text-lg opacity-50">👑</div>
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground">Король месяца</div>
                    <div className="text-xs text-muted-foreground">Закройте план на 100%</div>
                    <ProgressBar value={87} max={100} className="mt-1 h-1" />
                  </div>
                </div>
              </div>
            </div>
          </StatsCard>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-card rounded-xl p-3 shadow-card border-0">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-3 h-3 text-primary" />
                <span className="text-xs font-semibold">Моя позиция</span>
              </div>
              <div className="text-sm font-bold text-primary">1 место</div>
              <div className="text-xs text-muted-foreground">из 4 участников</div>
            </div>
            
            <div className="bg-card rounded-xl p-3 shadow-card border-0">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-3 h-3 text-success" />
                <span className="text-xs font-semibold">До лидера</span>
              </div>
              <div className="text-sm font-bold text-success">+30 баллов</div>
              <div className="text-xs text-muted-foreground">до 1 места</div>
            </div>
          </div>
        </div>
      </div>
      
      <BottomNavigation />
    </Layout>;
}