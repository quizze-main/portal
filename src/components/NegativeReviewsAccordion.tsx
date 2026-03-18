import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, User, AlertTriangle, MessageCircle, Send, Lock, ThumbsUp, ThumbsDown, Hand } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

type RatingType = 'good' | 'normal' | 'bad';

interface Review {
  id: string;
  orderId: string;
  customerName: string;
  date: string;
  rating: RatingType;
  comment: string;
  category: string;
  product: string;
}

interface EmployeeNegativeReviews {
  employeeName: string;
  count: number;
  reviews: Review[];
}

const negativeReviewsData: EmployeeNegativeReviews[] = [
  {
    employeeName: 'Михаил Сидоров',
    count: 4,
    reviews: [
      {
        id: '1',
        orderId: '#E2002',
        customerName: 'Наталья Зайцева',
        date: '2024-01-14',
        rating: 'normal',
        comment: 'Долгое ожидание, не очень внимательный к деталям.',
        category: 'Оправы',
        product: 'Classic Design'
      },
      {
        id: '2',
        orderId: '#E2004',
        customerName: 'Владимир Петров',
        date: '2024-01-12',
        rating: 'bad',
        comment: 'Грубое обслуживание, не помог с выбором подходящей оправы.',
        category: 'Солнцезащитные очки',
        product: 'Sport Collection'
      }
    ]
  },
  {
    employeeName: 'Анна Петрова',
    count: 3,
    reviews: [
      {
        id: '3',
        orderId: '#E1005',
        customerName: 'Роман Киселев',
        date: '2024-01-13',
        rating: 'normal',
        comment: 'Не все варианты были показаны, торопилась с обслуживанием.',
        category: 'Компьютерные очки',
        product: 'Blue Light Pro'
      }
    ]
  },
  {
    employeeName: 'Елена Козлова',
    count: 3,
    reviews: [
      {
        id: '4',
        orderId: '#E3006',
        customerName: 'Андрей Соколов',
        date: '2024-01-11',
        rating: 'normal',
        comment: 'Немного долго ждал консультацию, но в итоге все хорошо.',
        category: 'Оправы',
        product: 'Designer Frame'
      }
    ]
  }
];

interface NegativeReviewsAccordionProps {
  isLeaderMode: boolean;
  employeeFilter?: string;
}

export function NegativeReviewsAccordion({ isLeaderMode, employeeFilter }: NegativeReviewsAccordionProps) {
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>('');
  const [showAll, setShowAll] = useState<boolean>(false);
  const { toast } = useToast();

  // Фильтруем данные в зависимости от режима
  const displayedData = isLeaderMode 
    ? negativeReviewsData 
    : employeeFilter 
      ? negativeReviewsData.filter(emp => emp.employeeName === employeeFilter)
      : [];

  const handleReply = (reviewId: string) => {
    setReplyingTo(reviewId);
    setReplyText('');
  };

  const handleSendReply = (reviewId: string, customerName: string) => {
    if (!replyText.trim()) return;
    
    // Имитируем отправку ответа
    toast({
      title: "Ответ отправлен",
      description: `Ваш ответ клиенту ${customerName} успешно отправлен`,
    });
    
    setReplyingTo(null);
    setReplyText('');
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
    setReplyText('');
  };
  const title = isLeaderMode 
    ? "Негативные отзывы по сотрудникам" 
    : "Мои отзывы по оценкам";

  // Если у сотрудника нет негативных отзывов
  if (!isLeaderMode && displayedData.length === 0) {
    return (
      <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-md border border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center">
            <ThumbsUp className="w-4 h-4 text-green-600" />
          </div>
          <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
        </div>
        <div className="text-center py-6">
          <ThumbsUp className="w-10 h-10 mx-auto mb-2 text-green-600" />
          <p className="text-sm text-gray-600 font-medium">У вас нет негативных отзывов!</p>
          <p className="text-xs text-gray-500 mt-1">Отличная работа! 🎉</p>
        </div>
      </div>
    );
  }

  // Для сотрудников показываем без аккордеона
  if (!isLeaderMode) {
    const allReviews = displayedData.flatMap(emp => emp.reviews);
    const displayedReviews = showAll ? allReviews : allReviews.slice(0, 3);
    const hasMore = allReviews.length > 3;

    return (
      <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-md border border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 bg-orange-100 rounded-lg flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
          </div>
          <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
          <Badge variant="secondary" className="text-xs">
            {allReviews.length}
          </Badge>
        </div>
        
        <div className="space-y-3">
          {displayedReviews.map((review) => (
            <div key={review.id} className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-gray-100/50 shadow-sm hover:shadow-md transition-all duration-200">
              {/* Header with rating */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  {review.rating === 'good' && (
                    <>
                      <ThumbsUp className="w-4 h-4 text-green-600" />
                      <span className="text-xs text-gray-700 font-medium">Хорошо</span>
                    </>
                  )}
                  {review.rating === 'normal' && (
                    <>
                      <Hand className="w-4 h-4 text-amber-600" />
                      <span className="text-xs text-gray-700 font-medium">Норм</span>
                    </>
                  )}
                  {review.rating === 'bad' && (
                    <>
                      <ThumbsDown className="w-4 h-4 text-red-600" />
                      <span className="text-xs text-gray-700 font-medium">Плохо</span>
                    </>
                  )}
                </div>
              </div>

              {/* Customer and date */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-700 font-medium">{review.customerName}</span>
                <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-md">{new Date(review.date).toLocaleDateString('ru-RU')}</span>
              </div>

              {/* Comment */}
              <p className="text-sm text-gray-700 leading-relaxed mb-3">{review.comment}</p>

              {/* Lock message */}
              <div className="text-xs text-gray-500 italic flex items-center gap-1.5 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                <Lock className="w-3 h-3" />
                <span>Только лидер может отвечать на отзывы</span>
              </div>
            </div>
          ))}
        </div>

        {hasMore && !showAll && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowAll(true)}
            className="w-full mt-3 text-primary hover:bg-primary/10"
          >
            Показать больше
          </Button>
        )}
      </div>
    );
  }

  // Для лидеров оставляем аккордеон
  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-xl p-3 shadow-md border border-gray-100">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 bg-orange-100 rounded-lg flex items-center justify-center">
          <AlertTriangle className="w-4 h-4 text-orange-600" />
        </div>
        <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
      </div>
      
      <Accordion type="single" collapsible className="w-full">
        {displayedData.map((employee, index) => (
          <AccordionItem key={employee.employeeName} value={`item-${index}`} className="border-gray-100">
            <AccordionTrigger className="text-sm hover:no-underline py-2">
              <div className="flex items-center justify-between w-full mr-4">
                <span className="font-medium text-gray-800">{employee.employeeName}</span>
                <div className="bg-orange-50 text-orange-700 text-xs px-2 py-1 rounded-md font-medium">
                  {employee.count}
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 pt-1">
                {employee.reviews.map((review) => (
                  <div key={review.id} className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-gray-100/50 shadow-sm hover:shadow-md transition-all duration-200">
                    {/* Header with order and rating */}
                    <div className="flex items-center justify-between mb-3">
                      {isLeaderMode && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">{review.orderId}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        {review.rating === 'good' && (
                          <>
                            <ThumbsUp className="w-4 h-4 text-green-600" />
                            <span className="text-xs text-gray-700 font-medium">Хорошо</span>
                          </>
                        )}
                        {review.rating === 'normal' && (
                          <>
                            <Hand className="w-4 h-4 text-amber-600" />
                            <span className="text-xs text-gray-700 font-medium">Норм</span>
                          </>
                        )}
                        {review.rating === 'bad' && (
                          <>
                            <ThumbsDown className="w-4 h-4 text-red-600" />
                            <span className="text-xs text-gray-700 font-medium">Плохо</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Customer and date */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-gray-700 font-medium">{review.customerName}</span>
                      <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-md">{new Date(review.date).toLocaleDateString('ru-RU')}</span>
                    </div>

                    {/* Comment */}
                    <p className="text-sm text-gray-700 leading-relaxed mb-3">{review.comment}</p>

                    {/* Reply button or info text */}
                    {isLeaderMode ? (
                      replyingTo !== review.id ? (
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          onClick={() => handleReply(review.id)}
                          className="h-7 text-xs gap-1.5 bg-primary/10 text-primary hover:bg-primary/20 border-primary/20"
                        >
                          <MessageCircle className="w-3 h-3" />
                          Ответить
                        </Button>
                      ) : (
                      <div className="space-y-3">
                        <Textarea
                          placeholder="Введите ваш ответ клиенту..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          className="min-h-[80px] text-sm resize-none focus:ring-primary/50"
                        />
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => handleSendReply(review.id, review.customerName)}
                            disabled={!replyText.trim()}
                            className="h-7 text-xs gap-1.5 bg-primary hover:bg-primary-dark"
                          >
                            <Send className="w-3 h-3" />
                            Отправить
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleCancelReply}
                            className="h-7 text-xs border-gray-300 text-gray-600 hover:bg-gray-50"
                          >
                            Отмена
                          </Button>
                        </div>
                      </div>
                      )
                    ) : (
                      <div className="text-xs text-gray-500 italic flex items-center gap-1.5 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                        <Lock className="w-3 h-3" />
                        <span>Только лидер может отвечать на отзывы</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}