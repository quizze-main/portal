import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  CheckCircle, 
  Clock, 
  Star, 
  Users, 
  MessageCircle,
  Glasses,
  Target,
  Play,
  ChevronRight,
  Palette,
  Ruler
} from 'lucide-react';

interface Lesson {
  id: string;
  title: string;
  duration: string;
  completed: boolean;
  type: 'video' | 'text' | 'quiz' | 'interactive';
}

const lessons: Lesson[] = [
  { id: '1', title: 'Анализ формы лица', duration: '20 мин', completed: false, type: 'video' },
  { id: '2', title: 'Подбор по стилю клиента', duration: '15 мин', completed: false, type: 'interactive' },
  { id: '3', title: 'Цветотип и оправы', duration: '12 мин', completed: false, type: 'video' },
  { id: '4', title: 'Измерения и посадка', duration: '18 мин', completed: false, type: 'text' },
  { id: '5', title: 'Работа с детьми', duration: '10 мин', completed: false, type: 'video' },
  { id: '6', title: 'Сложные случаи', duration: '15 мин', completed: false, type: 'text' },
  { id: '7', title: 'Итоговый экзамен', duration: '12 мин', completed: false, type: 'quiz' }
];

export default function FrameSelection() {
  const navigate = useNavigate();
  const [currentLesson, setCurrentLesson] = useState<string | null>(null);
  
  const completedLessons = lessons.filter(l => l.completed).length;
  const progress = Math.round((completedLessons / lessons.length) * 100);
  
  const getTypeIcon = (type: Lesson['type']) => {
    switch (type) {
      case 'video': return <Play className="w-3 h-3" />;
      case 'quiz': return <Target className="w-3 h-3" />;
      case 'text': return <MessageCircle className="w-3 h-3" />;
      case 'interactive': return <Palette className="w-3 h-3" />;
    }
  };
  
  const getTypeBadge = (type: Lesson['type']) => {
    switch (type) {
      case 'video': return 'Видео';
      case 'quiz': return 'Экзамен';
      case 'text': return 'Текст';
      case 'interactive': return 'Интерактив';
    }
  };

  return (
    <Layout>
      <div className="p-3 space-y-4 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/training')}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">Техники подбора оправ</h1>
            <p className="text-xs text-muted-foreground">Консультирование клиентов по выбору подходящих оправ</p>
          </div>
        </div>

        {/* Progress Card */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Прогресс модуля</span>
              <span className="text-sm font-bold text-primary">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2 mb-2" />
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                <span>{completedLessons}/{lessons.length} уроков</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>90 мин</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>43 участника</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Course Info */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Glasses className="w-4 h-4 text-purple-500" />
              О модуле
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              Продвинутый курс по консультированию клиентов. Изучите профессиональные техники 
              подбора оправ с учетом формы лица, стиля, цветотипа и индивидуальных особенностей клиента.
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[9px] px-2 py-1">
                Продвинутый уровень
              </Badge>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                <span>4.9 (23 отзыва)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Prerequisites */}
        <Card className="border-0 shadow-sm bg-yellow-50">
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              <div className="p-1.5 bg-yellow-200 rounded mt-0.5">
                <Star className="w-3 h-3 text-yellow-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-xs text-yellow-800 mb-1">Требования</h3>
                <p className="text-[10px] text-yellow-700 leading-tight">
                  Рекомендуется завершить модули "Основы работы с клиентами" и "Продуктовая линейка оптики"
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lessons */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold mb-2">Уроки</h2>
          
          {lessons.map((lesson, index) => (
            <Card 
              key={lesson.id}
              className={`border-0 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer ${
                currentLesson === lesson.id ? 'ring-1 ring-primary' : ''
              }`}
              onClick={() => setCurrentLesson(currentLesson === lesson.id ? null : lesson.id)}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    lesson.completed 
                      ? 'bg-green-100 text-green-600' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {lesson.completed ? <CheckCircle className="w-3 h-3" /> : index + 1}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-xs leading-tight">{lesson.title}</h3>
                      {lesson.completed && (
                        <CheckCircle className="w-3 h-3 text-green-600" />
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <div className="flex items-center gap-1">
                        {getTypeIcon(lesson.type)}
                        <span>{getTypeBadge(lesson.type)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        <span>{lesson.duration}</span>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    size="sm" 
                    variant={lesson.completed ? "outline" : "default"}
                    className="text-[10px] px-2 py-1 h-6"
                  >
                    {lesson.completed ? 'Повторить' : 'Начать'}
                    <ChevronRight className="w-2.5 h-2.5 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tools */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Ruler className="w-4 h-4 text-orange-500" />
              Инструменты
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            <div className="flex items-center justify-between p-2 bg-muted/50 rounded text-xs">
              <span>Таблица форм лица</span>
              <Button variant="ghost" size="sm" className="h-5 text-[10px] px-2">
                Открыть
              </Button>
            </div>
            <div className="flex items-center justify-between p-2 bg-muted/50 rounded text-xs">
              <span>Гид по цветотипам</span>
              <Button variant="ghost" size="sm" className="h-5 text-[10px] px-2">
                Открыть
              </Button>
            </div>
            <div className="flex items-center justify-between p-2 bg-muted/50 rounded text-xs">
              <span>Калькулятор размеров</span>
              <Button variant="ghost" size="sm" className="h-5 text-[10px] px-2">
                Открыть
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Certificate */}
        <Card className="border-0 shadow-sm bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/20 rounded">
                <Star className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-xs">Сертификат консультанта</h3>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  Завершите все уроки для получения сертификата
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-primary">{completedLessons}/7</div>
                <div className="text-[10px] text-muted-foreground">уроков</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}