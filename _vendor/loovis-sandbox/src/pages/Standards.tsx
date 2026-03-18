import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Heart, TrendingUp, Users, Palette, Calculator, Hammer, Eye, Search, ExternalLink, Target, FileText, ChevronDown, ChevronRight, BookOpen, Award } from 'lucide-react';

interface Metric {
  name: string;
  target: number;
  current: number;
  unit: 'percent' | 'count' | 'time' | 'money';
  operator: 'gte' | 'lte' | 'eq'; // greater than equal, less than equal, equal
}

interface Standard {
  id: string;
  title: string;
  description: string;
  metrics: Metric[];
  articles: string[];
  status: 'success' | 'warning' | 'critical';
}

interface Zone {
  id: string;
  name: string;
  subtitle: string;
  icon: any;
  color: string;
  bgColor: string;
  standards: Standard[];
}

const zones: Zone[] = [{
  id: 'service',
  name: 'Сервис',
  subtitle: 'Дарим вау-опыт',
  icon: Heart,
  color: 'text-red-600',
  bgColor: 'bg-red-100',
  standards: [{
    id: 'ideal-service',
    title: 'Создаем идеальный сервис',
    description: 'Приветствуем клиентов с улыбкой, общаемся с заботой, оказываем качественное внимание, делаем самое актуальное предложение, демонстрируем качество нашей работы в деталях и дарим эмоцию, чтобы каждый гость хотел поделиться с близкими, опытом посещения нашего клуба.',
    metrics: [
      { name: 'Чек-лист ТП', target: 80, current: 85, unit: 'percent', operator: 'gte' },
      { name: 'NPS', target: 85, current: 82, unit: 'percent', operator: 'gte' },
      { name: 'Отрицательный отзыв', target: 2, current: 1, unit: 'count', operator: 'lte' },
      { name: 'Конверсия Входящий>Оформленные заказы', target: 70, current: 75, unit: 'percent', operator: 'gte' }
    ],
    articles: ['Базовый подход заботы в LOOV', 'О компании LOOV', 'Работа с CJM'],
    status: 'success' as const
  }, {
    id: 'consultation',
    title: 'Консультируем с заботой',
    description: 'Выясняем, что нужно клиенту (для работы, стиля или зрения), и предлагаем идеальные решения на понятном доступном языке.',
    metrics: [
      { name: 'Конверсия Входящий>Продажи', target: 70, current: 65, unit: 'percent', operator: 'gte' }
    ],
    articles: ['Работа с CJM', 'Структура будильников в Клубах и Клиниках'],
    status: 'warning' as const
  }]
}, {
  id: 'sales',
  name: 'Продажи',
  subtitle: 'Помогаем выбрать лучшее',
  icon: TrendingUp,
  color: 'text-green-600',
  bgColor: 'bg-green-100',
  standards: [{
    id: 'sales-plan',
    title: 'Достигаем плана продаж',
    description: 'Выполняем цели по продажам, вдохновляя на дополнительные покупки (футляры, покрытия).',
    metrics: [
      { name: 'План продаж', target: 100, current: 95, unit: 'percent', operator: 'gte' },
      { name: 'Средний чек', target: 15000, current: 14200, unit: 'money', operator: 'gte' }
    ],
    articles: [],
    status: 'warning' as const
  }]
}, {
  id: 'crm',
  name: 'CRM',
  subtitle: 'Строим отношения',
  icon: Users,
  color: 'text-blue-600',
  bgColor: 'bg-blue-100',
  standards: [{
    id: 'crm-data',
    title: 'Ведем данные в CRM',
    description: 'Фиксируем заказы и данные клиентов в Itigris для персонализации предложений.',
    metrics: [
      { name: '% заказов и клиентов заведены без ошибок', target: 100, current: 98, unit: 'percent', operator: 'eq' },
      { name: 'Время ввода данных при оформлении заказа', target: 5, current: 6, unit: 'time', operator: 'lte' }
    ],
    articles: ['Заказы. Общая информация', 'Основные принципы выкладки оправ', 'Мерчендайзинг с учетом приоритета LOOV'],
    status: 'warning' as const
  }, {
    id: 'order-display',
    title: 'Поддерживаем порядок и выкладку',
    description: 'Делаем витрины идеальными, следим за чистотой и ценниками по стандартам LOOV.',
    metrics: [
      { name: 'Замечания по выкладке при еженедельных проверках ТП', target: 0, current: 2, unit: 'count', operator: 'eq' }
    ],
    articles: ['Стандарт внешнего вида в клубах и клиниках LOOV – привычка быть стильными', 'Музыка в LOOV', 'Микроклимат в LOOV'],
    status: 'critical' as const
  }]
}, {
  id: 'hall',
  name: 'Зал',
  subtitle: 'Создаем стильное пространство',
  icon: Palette,
  color: 'text-purple-600',
  bgColor: 'bg-purple-100',
  standards: [{
    id: 'atmosphere',
    title: 'Создаем атмосферу LOOV',
    description: 'Выглядим стильно по дресс-коду и включаем правильную музыку для вдохновения.',
    metrics: [
      { name: 'Замечания по форме и музыке при еженедельных проверках ТП', target: 0, current: 0, unit: 'count', operator: 'eq' }
    ],
    articles: ['Стандарт внешнего вида в клубах и клиниках LOOV – привычка быть стильными', 'Музыка в LOOV', 'Микроклимат в LOOV'],
    status: 'success' as const
  }]
}, {
  id: 'cashier',
  name: 'Касса',
  subtitle: 'Делаем расчеты безупречно',
  icon: Calculator,
  color: 'text-orange-600',
  bgColor: 'bg-orange-100',
  standards: [{
    id: 'cash-discipline',
    title: 'Соблюдаем кассовую дисциплину',
    description: 'Проводим платежи и ведем документацию без ошибок.',
    metrics: [
      { name: 'Ошибки в кассовых операциях', target: 0, current: 1, unit: 'count', operator: 'eq' },
      { name: 'Время на кассе', target: 3, current: 4, unit: 'time', operator: 'lte' }
    ],
    articles: ['Кассовые операции', 'Как принимать и отдавать заказы на ремонт и изготовление🔧🔥'],
    status: 'critical' as const
  }]
}, {
  id: 'craftsmen',
  name: 'Работа с крафтерами и оптик-мастерами',
  subtitle: 'Доводим заказы до идеала',
  icon: Hammer,
  color: 'text-indigo-600',
  bgColor: 'bg-indigo-100',
  standards: [{
    id: 'order-transfer',
    title: 'Передаем заказы крафтерам и оптик-мастерам',
    description: 'Точно отправляем данные для ремонта и изготовления очков.',
    metrics: [
      { name: '% заказов переданы с корректными параметрами', target: 100, current: 99.5, unit: 'percent', operator: 'eq' },
      { name: 'Ошибки при передаче', target: 1, current: 0.5, unit: 'percent', operator: 'lte' }
    ],
    articles: [],
    status: 'success' as const
  }, {
    id: 'deadline-control',
    title: 'Контролируем сроки заказов',
    description: 'Следим, чтобы очки были готовы вовремя, и сообщаем клиентам.',
    metrics: [
      { name: '% заказов выполнены в срок', target: 95, current: 97, unit: 'percent', operator: 'gte' },
      { name: '% клиентов уведомлены', target: 100, current: 100, unit: 'percent', operator: 'eq' }
    ],
    articles: [],
    status: 'success' as const
  }]
}, {
  id: 'optometrists',
  name: 'Работа с оптометристами/офтальмологами',
  subtitle: 'Заботимся о зрении',
  icon: Eye,
  color: 'text-teal-600',
  bgColor: 'bg-teal-100',
  standards: [{
    id: 'vision-check',
    title: 'Организуем проверку зрения',
    description: 'Направляем клиентов к оптометристу, делая процесс быстрым, заботливым и удобным.',
    metrics: [
      { name: 'Конверсия Входящий>Проверка зрения', target: 80, current: 75, unit: 'percent', operator: 'gte' },
      { name: 'Время ожидания', target: 10, current: 12, unit: 'time', operator: 'lte' }
    ],
    articles: [],
    status: 'warning' as const
  }]
}];

export default function Standards() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStandard, setSelectedStandard] = useState<string | null>(null);

  const filteredZones = zones.filter(zone => 
    zone.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    zone.standards.some(standard => 
      standard.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      standard.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <Layout>
      <div className="p-6 space-y-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-bold text-foreground">
            Стандарты менеджера заботы
          </h1>
          <p className="text-muted-foreground">
            Зоны ответственности и критерии качества
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-md mx-auto">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input 
            placeholder="Поиск по стандартам..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="pl-10 bg-background/60 border-border/40 focus:bg-background focus:border-border transition-all"
          />
        </div>

        {/* Standards List */}
        <div className="space-y-6">
          {filteredZones.map((zone) => (
            <Card key={zone.id} className="overflow-hidden border-0 shadow-md bg-card">
              {/* Zone Header */}
              <div className="relative p-6 bg-gradient-to-r from-primary/5 to-accent/5 border-b border-border/20">
                <div className="flex items-center gap-4 pr-32">
                  <div className={`p-3 rounded-xl ${zone.bgColor} shadow-sm flex-shrink-0`}>
                    <zone.icon className={`w-5 h-5 ${zone.color}`} />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-bold text-foreground">{zone.name}</h2>
                    <p className="text-muted-foreground text-sm mt-1 whitespace-nowrap">{zone.subtitle}</p>
                  </div>
                </div>
                <Badge variant="secondary" className="absolute top-4 right-4 px-3 py-1 text-xs">
                  {zone.standards.length} стандарт{zone.standards.length === 1 ? '' : zone.standards.length < 5 ? 'а' : 'ов'}
                </Badge>
              </div>

              {/* Standards in Zone */}
              <div className="p-6 space-y-4">
                {zone.standards.map((standard, index) => (
                  <div key={standard.id} className={`${index !== 0 ? 'pt-4 border-t border-border/10' : ''}`}>
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-foreground leading-tight mb-2">
                          {standard.title}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {standard.description}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedStandard(selectedStandard === standard.id ? null : standard.id)}
                        className="flex-shrink-0 h-8 w-8 p-0"
                      >
                        {selectedStandard === standard.id ? 
                          <ChevronDown className="w-4 h-4" /> : 
                          <ChevronRight className="w-4 h-4" />
                        }
                      </Button>
                    </div>

                    {/* Expanded Content */}
                    {selectedStandard === standard.id && (
                      <div className="space-y-4 animate-fade-in bg-muted/20 rounded-lg p-4">

                        {/* Articles */}
                        {standard.articles && standard.articles.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                              <FileText className="w-4 h-4 text-primary" />
                              Материалы базы знаний
                              <Badge variant="secondary" className="text-xs px-2 py-0.5">
                                {standard.articles.length}
                              </Badge>
                            </h4>
                            <div className="space-y-2">
                              {standard.articles.map((article, articleIndex) => (
                                <div 
                                  key={articleIndex} 
                                  className="group flex items-center gap-3 p-3 rounded-lg bg-background/50 hover:bg-background transition-all cursor-pointer"
                                >
                                  <div className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0" />
                                  <span className="text-sm text-foreground flex-1 leading-relaxed">
                                    {article}
                                  </span>
                                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Bottom Actions */}
                    <div className="flex justify-between items-center pt-3 mt-3">
                      {standard.articles && standard.articles.length > 0 ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedStandard(selectedStandard === standard.id ? null : standard.id)}
                          className="text-sm text-muted-foreground hover:text-foreground"
                        >
                          {selectedStandard === standard.id ? 'Скрыть детали' : 'Показать детали'}
                        </Button>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">
                          Материалы в работе. Скоро все будет!
                        </span>
                      )}
                      
                      {standard.articles && standard.articles.length > 0 && (
                        <Badge 
                          variant="secondary" 
                          className="text-xs px-2 py-1"
                        >
                          {standard.articles.length} материалов
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>

        {/* Summary Stats */}
        <Card className="border-0 shadow-sm bg-gradient-to-r from-primary/5 via-accent/5 to-primary/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <h3 className="font-bold text-lg text-foreground">Общая статистика</h3>
                <p className="text-sm text-muted-foreground">
                  {zones.length} зон ответственности • {zones.reduce((sum, zone) => sum + zone.standards.length, 0)} стандартов
                </p>
              </div>
              <div className="p-3 bg-primary/15 rounded-xl shadow-sm">
                <Target className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <BottomNavigation />
    </Layout>
  );
}
