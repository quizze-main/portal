import * as React from 'react';
import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { BottomNavigation } from '@/components/BottomNavigation';
import { StatsCard } from '@/components/StatsCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LeaderModeToggle } from '@/components/LeaderModeToggle';
import { EmployeeStatsTable } from '@/components/EmployeeStatsTable';
import { NegativeReviewsAccordion } from '@/components/NegativeReviewsAccordion';
import { 
  Star, 
  MessageSquare,
  TrendingDown, 
  TrendingUp, 
  Calendar,
  User,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Flag
} from 'lucide-react';

interface Review {
  id: string;
  orderId: string;
  customerName: string;
  date: string;
  rating: number;
  comment: string;
  category: string;
  status: 'positive' | 'negative' | 'neutral';
  product: string;
}

const reviewsData: Review[] = [
  {
    id: '1',
    orderId: '#12345',
    customerName: 'Анна Петрова',
    date: '2024-01-15',
    rating: 5,
    comment: 'Отличные очки! Качество превосходное, сотрудники очень помогли с выбором.',
    category: 'Солнцезащитные очки',
    status: 'positive',
    product: 'Ray-Ban Aviator'
  },
  {
    id: '2',
    orderId: '#12346',
    customerName: 'Михаил Сидоров',
    date: '2024-01-14',
    rating: 2,
    comment: 'Очки пришлось долго ждать, качество не соответствует цене. Разочарован покупкой.',
    category: 'Оправы',
    status: 'negative',
    product: 'Designer Frame X1'
  },
  {
    id: '3',
    orderId: '#12347',
    customerName: 'Елена Козлова',
    date: '2024-01-13',
    rating: 4,
    comment: 'Хорошие очки, но хотелось бы больше вариантов цветов.',
    category: 'Компьютерные очки',
    status: 'positive',
    product: 'Blue Light Filter'
  },
  {
    id: '4',
    orderId: '#12348',
    customerName: 'Дмитрий Иванов',
    date: '2024-01-12',
    rating: 1,
    comment: 'Ужасное обслуживание! Консультант был грубым, очки не подошли по размеру.',
    category: 'Оправы',
    status: 'negative',
    product: 'Classic Frame'
  },
  {
    id: '5',
    orderId: '#12349',
    customerName: 'Мария Волкова',
    date: '2024-01-11',
    rating: 3,
    comment: 'Обычные очки, ничего особенного. Цена адекватная.',
    category: 'Солнцезащитные очки',
    status: 'neutral',
    product: 'Standard Sun'
  }
];

// Mock data for different units
const unitReviewsData = {
  club: {
    stats: { total: 5, positive: 3, negative: 2, avgRating: 3.2 },
    reviews: [
      { id: '1', orderId: '#12345', customerName: 'Анна Петрова', date: '2024-01-15', rating: 5, comment: 'Отличные очки! Качество превосходное, сотрудники очень помогли с выбором.', category: 'Солнцезащитные очки', status: 'positive' as const, product: 'Ray-Ban Aviator' },
      { id: '2', orderId: '#12346', customerName: 'Михаил Сидоров', date: '2024-01-14', rating: 2, comment: 'Очки пришлось долго ждать, качество не соответствует цене. Разочарован покупкой.', category: 'Оправы', status: 'negative' as const, product: 'Designer Frame X1' },
      { id: '3', orderId: '#12347', customerName: 'Елена Козлова', date: '2024-01-13', rating: 4, comment: 'Хорошие очки, но хотелось бы больше вариантов цветов.', category: 'Компьютерные очки', status: 'positive' as const, product: 'Blue Light Filter' },
      { id: '4', orderId: '#12348', customerName: 'Дмитрий Иванов', date: '2024-01-12', rating: 1, comment: 'Ужасное обслуживание! Консультант был грубым, очки не подошли по размеру.', category: 'Оправы', status: 'negative' as const, product: 'Classic Frame' },
      { id: '5', orderId: '#12349', customerName: 'Мария Волкова', date: '2024-01-11', rating: 3, comment: 'Обычные очки, ничего особенного. Цена адекватная.', category: 'Солнцезащитные очки', status: 'neutral' as const, product: 'Standard Sun' }
    ]
  },
  employee1: {
    stats: { total: 3, positive: 2, negative: 1, avgRating: 4.0 },
    reviews: [
      { id: '1', orderId: '#E1001', customerName: 'Ольга Смирнова', date: '2024-01-15', rating: 5, comment: 'Анна очень профессионально подобрала мне очки! Отличный сервис.', category: 'Солнцезащитные очки', status: 'positive' as const, product: 'Prada Sunglasses' },
      { id: '2', orderId: '#E1002', customerName: 'Сергей Попов', date: '2024-01-14', rating: 4, comment: 'Хорошая консультация, быстрое обслуживание.', category: 'Компьютерные очки', status: 'positive' as const, product: 'Anti-glare Glasses' },
      { id: '3', orderId: '#E1003', customerName: 'Татьяна Белова', date: '2024-01-13', rating: 3, comment: 'Нормально, но могло бы быть лучше объяснение по уходу.', category: 'Оправы', status: 'neutral' as const, product: 'Titanium Frame' }
    ]
  },
  employee2: {
    stats: { total: 2, positive: 1, negative: 1, avgRating: 3.0 },
    reviews: [
      { id: '1', orderId: '#E2001', customerName: 'Игорь Федоров', date: '2024-01-15', rating: 4, comment: 'Михаил хорошо разбирается в продукции, помог с выбором.', category: 'Солнцезащитные очки', status: 'positive' as const, product: 'Oakley Sport' },
      { id: '2', orderId: '#E2002', customerName: 'Наталья Зайцева', date: '2024-01-14', rating: 2, comment: 'Долгое ожидание, не очень внимательный к деталям.', category: 'Оправы', status: 'negative' as const, product: 'Classic Design' }
    ]
  },
  employee3: {
    stats: { total: 4, positive: 4, negative: 0, avgRating: 4.8 },
    reviews: [
      { id: '1', orderId: '#E3001', customerName: 'Алексей Морозов', date: '2024-01-15', rating: 5, comment: 'Елена превосходный консультант! Очень довольны покупкой.', category: 'Солнцезащитные очки', status: 'positive' as const, product: 'Ray-Ban Classic' },
      { id: '2', orderId: '#E3002', customerName: 'Виктория Лебедева', date: '2024-01-14', rating: 5, comment: 'Отличный сервис, все объяснила, помогла с выбором.', category: 'Компьютерные очки', status: 'positive' as const, product: 'Blue Block Pro' },
      { id: '3', orderId: '#E3003', customerName: 'Павел Николаев', date: '2024-01-13', rating: 4, comment: 'Профессиональный подход, хорошие рекомендации.', category: 'Оправы', status: 'positive' as const, product: 'Premium Metal Frame' },
      { id: '4', orderId: '#E3004', customerName: 'Светлана Кузнецова', date: '2024-01-12', rating: 5, comment: 'Замечательное обслуживание! Елена - настоящий профессионал.', category: 'Солнцезащитные очки', status: 'positive' as const, product: 'Luxury Collection' }
    ]
  }
};

export default function Reviews() {
  const [selectedUnit, setSelectedUnit] = useState<string>('club');
  const [isLeaderMode, setIsLeaderMode] = useState<boolean>(false);
  const currentUnitData = unitReviewsData[selectedUnit as keyof typeof unitReviewsData] || unitReviewsData.club;
  const [reviews, setReviews] = useState<Review[]>(currentUnitData.reviews);
  const [sortBy, setSortBy] = useState<string>('date');
  const [filterRating, setFilterRating] = useState<string>('all');

  // Update reviews when unit changes
  React.useEffect(() => {
    const currentUnitData = unitReviewsData[selectedUnit as keyof typeof unitReviewsData] || unitReviewsData.club;
    setReviews(currentUnitData.reviews);
  }, [selectedUnit]);

  const sortReviews = (criteria: string) => {
    const sorted = [...reviews].sort((a, b) => {
      switch (criteria) {
        case 'date':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'rating-desc':
          return b.rating - a.rating;
        case 'rating-asc':
          return a.rating - b.rating;
        case 'negative':
          return a.status === 'negative' ? -1 : 1;
        default:
          return 0;
      }
    });
    setReviews(sorted);
    setSortBy(criteria);
  };

  const filterByRating = (rating: string) => {
    const currentUnitData = unitReviewsData[selectedUnit as keyof typeof unitReviewsData] || unitReviewsData.club;
    let filtered = currentUnitData.reviews;
    if (rating !== 'all') {
      if (rating === 'negative') {
        filtered = currentUnitData.reviews.filter(r => r.rating <= 2);
      } else if (rating === 'positive') {
        filtered = currentUnitData.reviews.filter(r => r.rating >= 4);
      } else {
        const ratingNum = parseInt(rating);
        filtered = currentUnitData.reviews.filter(r => r.rating === ratingNum);
      }
    }
    setReviews(filtered);
    setFilterRating(rating);
  };

  const stats = {
    total: currentUnitData.stats.total,
    positive: currentUnitData.stats.positive,
    negative: currentUnitData.stats.negative,
    avgRating: currentUnitData.stats.avgRating.toFixed(1)
  };

  return (
    <Layout>
      <div className="px-3 py-4">
        {/* Page Header */}
        <div className="text-center mb-4">
          <h1 className="text-base font-bold text-primary mb-1">Отзывы клиентов</h1>
          <p className="text-xs text-muted-foreground">Анализ отзывов по заказам</p>
        </div>

        {/* Leader Mode Toggle and Unit Selector */}
        <div className="mb-3 space-y-3">
          <LeaderModeToggle 
            isLeaderMode={isLeaderMode} 
            onToggle={setIsLeaderMode} 
          />
          
          {!isLeaderMode && (
            <Select value={selectedUnit} onValueChange={setSelectedUnit}>
              <SelectTrigger className="w-40 h-8 bg-card border-input text-sm rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="club">Клуб</SelectItem>
                <SelectItem value="employee1">Анна Петрова</SelectItem>
                <SelectItem value="employee2">Михаил Сидоров</SelectItem>
                <SelectItem value="employee3">Елена Козлова</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="space-y-3">
          {isLeaderMode ? (
            /* Leader Mode Content */
            <>
              {/* Overall Stats for All Employees */}
              <StatsCard 
                icon={<MessageSquare className="w-5 h-5" />}
                title="Общая статистика команды"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center">
                    <div className="text-sm font-bold text-primary">141</div>
                    <div className="text-xs text-muted-foreground">Всего отзывов</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-bold text-warning">4.2</div>
                    <div className="text-xs text-muted-foreground">Средний рейтинг</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="bg-success-light rounded-lg p-2 text-center">
                    <div className="text-sm font-bold text-success">113</div>
                    <div className="text-xs text-success">Позитивных</div>
                  </div>
                  <div className="bg-warning-light rounded-lg p-2 text-center">
                    <div className="text-sm font-bold text-warning">18</div>
                    <div className="text-xs text-warning">Нейтральных</div>
                  </div>
                  <div className="bg-destructive-light rounded-lg p-2 text-center">
                    <div className="text-sm font-bold text-destructive">10</div>
                    <div className="text-xs text-destructive">Негативных</div>
                  </div>
                </div>
              </StatsCard>

              {/* Employee Performance Table */}
              <EmployeeStatsTable />

              {/* Negative Reviews by Employee */}
              <NegativeReviewsAccordion isLeaderMode={true} />
            </>
          ) : (
            /* Regular Mode Content */
            <>
              {/* Stats */}
              <StatsCard 
                icon={<MessageSquare className="w-5 h-5" />}
                title="Статистика отзывов"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center">
                    <div className="text-sm font-bold text-primary">{stats.total}</div>
                    <div className="text-xs text-muted-foreground">Всего отзывов</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-bold text-warning">{stats.avgRating}</div>
                    <div className="text-xs text-muted-foreground">Средний рейтинг</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div className="bg-success-light rounded-lg p-2 text-center">
                    <div className="text-sm font-bold text-success">{stats.positive}</div>
                    <div className="text-xs text-success">Позитивных</div>
                  </div>
                  <div className="bg-destructive-light rounded-lg p-2 text-center">
                    <div className="text-sm font-bold text-destructive">{stats.negative}</div>
                    <div className="text-xs text-destructive">Негативных</div>
                  </div>
                </div>
              </StatsCard>

              {/* Filters */}
              <StatsCard 
                icon={<TrendingUp className="w-5 h-5" />}
                title="Фильтрация"
              >
                <div className="grid grid-cols-2 gap-2">
                  <Select value={sortBy} onValueChange={sortReviews}>
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue placeholder="Сортировка" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">По дате</SelectItem>
                      <SelectItem value="rating-desc">Рейтинг ↓</SelectItem>
                      <SelectItem value="rating-asc">Рейтинг ↑</SelectItem>
                      <SelectItem value="negative">Негативные</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterRating} onValueChange={filterByRating}>
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue placeholder="Фильтр" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все отзывы</SelectItem>
                      <SelectItem value="positive">Позитивные</SelectItem>
                      <SelectItem value="negative">Негативные</SelectItem>
                      <SelectItem value="3">Нейтральные</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </StatsCard>

              {/* Reviews List */}
              <div className="space-y-3">
                {reviews.map((review) => (
                  <div 
                    key={review.id} 
                    className={`bg-card rounded-xl p-3 shadow-card border-0 ${
                      review.status === 'negative' ? 'bg-destructive-light border-l-4 border-l-destructive' : ''
                    }`}
                  >
                    <div className="space-y-2">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-primary">{review.orderId}</span>
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">
                              {review.category}
                            </Badge>
                            {review.status === 'negative' && (
                              <div className="flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-destructive" />
                                <span className="text-[9px] text-destructive font-medium">Негативный</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <User className="w-2.5 h-2.5" />
                              <span>{review.customerName}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-2.5 h-2.5" />
                              <span>{new Date(review.date).toLocaleDateString('ru-RU')}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star 
                              key={star} 
                              className={`w-3 h-3 ${
                                star <= review.rating 
                                  ? 'fill-warning text-warning' 
                                  : 'text-muted'
                              }`} 
                            />
                          ))}
                          <span className="text-xs font-medium ml-1">{review.rating}</span>
                        </div>
                      </div>

                      {/* Comment */}
                      <div className="bg-muted rounded-lg p-2">
                        <p className="text-xs text-foreground leading-relaxed">{review.comment}</p>
                      </div>

                      {/* Product info */}
                      <div className="text-[10px] text-muted-foreground">
                        Товар: {review.product}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Negative Reviews Alert */}
              {stats.negative > 0 && (
                <div className="bg-destructive-light border-0 rounded-xl p-3 shadow-card border-l-4 border-l-destructive">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-destructive rounded flex items-center justify-center">
                      <AlertTriangle className="w-2.5 h-2.5 text-destructive-foreground" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xs font-semibold text-destructive">Требует внимания</h3>
                      <p className="text-[10px] text-destructive">
                        Найдено {stats.negative} негативных отзыва
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Negative Reviews Section for Employees */}
              <NegativeReviewsAccordion 
                isLeaderMode={false} 
                employeeFilter={
                  selectedUnit === 'employee1' ? 'Анна Петрова' :
                  selectedUnit === 'employee2' ? 'Михаил Сидоров' :
                  selectedUnit === 'employee3' ? 'Елена Козлова' :
                  undefined
                } 
              />
            </>
          )}

          {/* Development Note */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground justify-center">
            <Flag className="w-3 h-3" />
            <span>Данные не реальные, модуль в разработке</span>
          </div>
        </div>
      </div>
      
      <BottomNavigation />
    </Layout>
  );
}