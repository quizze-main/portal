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
  Heart,
  Target,
  Play,
  ChevronRight
} from 'lucide-react';

interface Lesson {
  id: string;
  title: string;
  duration: string;
  completed: boolean;
  type: 'video' | 'text' | 'quiz';
}

const lessons: Lesson[] = [
  { id: '1', title: 'Введение в клиентский сервис', duration: '8 мин', completed: true, type: 'video' },
  { id: '2', title: 'Первый контакт с клиентом', duration: '12 мин', completed: true, type: 'video' },
  { id: '3', title: 'Активное слушание', duration: '10 мин', completed: false, type: 'text' },
  { id: '4', title: 'Работа с возражениями', duration: '15 мин', completed: false, type: 'video' },
  { id: '5', title: 'Завершение продажи', duration: '8 мин', completed: false, type: 'text' },
  { id: '6', title: 'Тест по модулю', duration: '5 мин', completed: false, type: 'quiz' }
];

export default function CustomerBasics() {
  const navigate = useNavigate();
  const [currentLesson, setCurrentLesson] = useState<string | null>(null);
  
  const completedLessons = lessons.filter(l => l.completed).length;
  const progress = Math.round((completedLessons / lessons.length) * 100);
  
  const getTypeIcon = (type: Lesson['type']) => {
    switch (type) {
      case 'video': return <Play className="w-3 h-3" />;
      case 'quiz': return <Target className="w-3 h-3" />;
      case 'text': return <MessageCircle className="w-3 h-3" />;
    }
  };
  
  const getTypeBadge = (type: Lesson['type']) => {
    switch (type) {
      case 'video': return 'Видео';
      case 'quiz': return 'Тест';
      case 'text': return 'Текст';
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
            <h1 className="text-lg font-bold text-foreground">Основы работы с клиентами</h1>
            <p className="text-xs text-muted-foreground">Изучение принципов общения с покупателями</p>
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
                <span>45 мин</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>127 участников</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Course Info */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Heart className="w-4 h-4 text-red-500" />
              О модуле
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              В этом модуле вы изучите основные принципы работы с клиентами в оптике. 
              Научитесь правильно общаться с покупателями, работать с возражениями 
              и успешно завершать продажи.
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[9px] px-2 py-1">
                Начальный уровень
              </Badge>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                <span>4.8 (45 отзывов)</span>
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

        {/* Certificate */}
        <Card className="border-0 shadow-sm bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/20 rounded">
                <Star className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-xs">Сертификат</h3>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  Завершите все уроки для получения сертификата
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-primary">{completedLessons}/6</div>
                <div className="text-[10px] text-muted-foreground">уроков</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}