import { Layout } from '@/components/Layout';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Calendar, ShoppingBag, User, Glasses, Activity, TrendingUp } from 'lucide-react';

export default function HealthPassport() {
  return (
    <Layout>
      <div className="px-3 py-4 space-y-4">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-lg font-bold text-primary mb-1">Паспорт здоровья клиента</h1>
          <p className="text-sm text-muted-foreground">Профиль клиента LOOV для менеджера</p>
        </div>

        {/* Client Overview */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="w-4 h-4" />
              Анна Иванова
            </CardTitle>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>39 лет (15.03.1985)</span>
              <span>+7 (999) 123-45-67</span>
            </div>
          </CardHeader>
        </Card>

        {/* Current Vision Status */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Текущие показатели зрения
            </CardTitle>
            <div className="flex items-center gap-2">
              <Calendar className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">05.12.2024 • Посещение Клуба</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Eyes comparison */}
            <div className="grid grid-cols-2 gap-4">
              {/* Left Eye */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-sm">Левый глаз (OS)</h4>
                  <div className="w-8 h-8">
                    <div className="w-full h-full rounded-full bg-gradient-to-r from-blue-300 via-blue-100 to-amber-200 border border-amber-400 flex items-center justify-center">
                      <div className="w-3 h-3 bg-black rounded-full"></div>
                    </div>
                  </div>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">SPH:</span>
                    <span className="font-semibold">-7.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CYL:</span>
                    <span className="font-semibold">-0.5</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">AXIS:</span>
                    <span className="font-semibold">180°</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Острота</span>
                    <span className="text-primary font-medium">90%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1">
                    <div className="bg-primary h-1 rounded-full" style={{ width: '90%' }}></div>
                  </div>
                </div>
              </div>

              {/* Right Eye */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-sm">Правый глаз (OD)</h4>
                  <div className="w-8 h-8">
                    <div className="w-full h-full rounded-full bg-gradient-to-r from-blue-300 via-blue-100 to-amber-200 border border-amber-400 flex items-center justify-center">
                      <div className="w-3 h-3 bg-black rounded-full"></div>
                    </div>
                  </div>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">SPH:</span>
                    <span className="font-semibold">-5.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CYL:</span>
                    <span className="font-semibold">-0.75</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">AXIS:</span>
                    <span className="font-semibold">175°</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Острота</span>
                    <span className="text-primary font-medium">85%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1">
                    <div className="bg-primary h-1 rounded-full" style={{ width: '85%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional vital metrics */}
            <div className="border-t pt-3 grid grid-cols-3 gap-3 text-xs">
              <div className="text-center p-2 bg-muted rounded">
                <div className="font-semibold">8.6</div>
                <div className="text-muted-foreground text-xs">BC</div>
              </div>
              <div className="text-center p-2 bg-muted rounded">
                <div className="font-semibold">14.2</div>
                <div className="text-muted-foreground text-xs">DIA</div>
              </div>
              <div className="text-center p-2 bg-muted rounded">
                <div className="font-semibold">16</div>
                <div className="text-muted-foreground text-xs">IOP</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Glasses & Recommendations */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Glasses className="w-4 h-4" />
              Очки и рекомендации
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current prescription recommendation */}
            <div className="bg-success-light p-3 rounded-lg border border-success/20">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-success" />
                <span className="text-sm font-medium text-success">Рекомендуемый рецепт</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="font-medium text-sm">OS: -6.75 / -0.5 / 180°</div>
                  <div className="text-muted-foreground mt-1">Zeiss BlueGuard</div>
                </div>
                <div>
                  <div className="font-medium text-sm">OD: -4.75 / -0.75 / 175°</div>
                  <div className="text-muted-foreground mt-1">Фильтр синего света</div>
                </div>
              </div>
            </div>

            {/* Current glasses collection */}
            <div className="space-y-2">
              <h5 className="text-sm font-medium">Текущие очки</h5>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="w-10 h-6 bg-gradient-to-r from-amber-200 to-amber-300 rounded border flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">Ray-Ban Aviator Classic</div>
                    <div className="text-xs text-muted-foreground">-1.25 / -1.50 • 15.03.2024</div>
                  </div>
                  <Badge variant="destructive" className="text-xs">Устарел</Badge>
                </div>

                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="w-10 h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded border flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">LOOV Urban Style</div>
                    <div className="text-xs text-muted-foreground">-1.00 / -1.25 • 12.08.2023</div>
                  </div>
                  <Badge variant="destructive" className="text-xs flex-shrink-0">Устарел</Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button className="w-full" size="sm">
                <ShoppingBag className="w-4 h-4 mr-2" />
                Заказать линзы
              </Button>
              <Button variant="outline" className="w-full" size="sm">
                + Добавить очки
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Health Monitoring */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Мониторинг здоровья
            </CardTitle>
            <div className="text-xs text-muted-foreground">
              Последнее обновление: 23.02.2025
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-2 bg-muted rounded-lg">
                <div className="text-sm font-medium mb-1">Контрастность</div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">OS: 82% • OD: 75%</div>
                  <div className="w-full bg-background rounded-full h-1">
                    <div className="bg-foreground h-1 rounded-full" style={{ width: '78%' }}></div>
                  </div>
                </div>
              </div>
              <div className="text-center p-2 bg-muted rounded-lg">
                <div className="text-sm font-medium mb-1">Общий индекс</div>
                <div className="text-lg font-bold text-primary">81.5%</div>
                <div className="text-xs text-muted-foreground">Хорошо</div>
              </div>
            </div>

            <Button variant="outline" className="w-full" size="sm">
              Посмотреть полную историю
            </Button>
          </CardContent>
        </Card>
      </div>
      
      <BottomNavigation />
    </Layout>
  );
}