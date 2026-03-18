import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  CheckCircle, 
  Clock, 
  Star, 
  Trophy, 
  Play, 
  Users, 
  Target,
  TrendingUp,
  Award
} from 'lucide-react';

interface Module {
  id: string;
  title: string;
  description: string;
  duration: string;
  progress: number;
  completed: boolean;
  difficulty: 'Начальный' | 'Средний' | 'Продвинутый';
  category: string;
}

const trainingModules: Module[] = [
  {
    id: '1',
    title: 'Основы работы с клиентами',
    description: 'Изучение принципов общения с покупателями и техник продаж',
    duration: '45 мин',
    progress: 100,
    completed: true,
    difficulty: 'Начальный',
    category: 'Клиентский сервис'
  },
  {
    id: '2',
    title: 'Продуктовая линейка оптики',
    description: 'Детальное изучение ассортимента оправ и линз',
    duration: '60 мин',
    progress: 75,
    completed: false,
    difficulty: 'Средний',
    category: 'Продукты'
  },
  {
    id: '3',
    title: 'Работа с POS-системой',
    description: 'Обучение использованию кассового оборудования',
    duration: '30 мин',
    progress: 40,
    completed: false,
    difficulty: 'Начальный',
    category: 'Техническое'
  },
  {
    id: '4',
    title: 'Техники подбора оправ',
    description: 'Консультирование клиентов по выбору подходящих оправ',
    duration: '90 мин',
    progress: 0,
    completed: false,
    difficulty: 'Продвинутый',
    category: 'Консультации'
  }
];

export default function Training() {
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  
  const totalProgress = Math.round(
    trainingModules.reduce((sum, module) => sum + module.progress, 0) / trainingModules.length
  );
  
  const completedModules = trainingModules.filter(m => m.completed).length;
  const totalModules = trainingModules.length;

  const getDifficultyColor = (difficulty: Module['difficulty']) => {
    switch (difficulty) {
      case 'Начальный': return 'bg-green-500';
      case 'Средний': return 'bg-yellow-500';
      case 'Продвинутый': return 'bg-red-500';
    }
  };

  const stats = [
    {
      icon: Target,
      label: 'Общий прогресс',
      value: `${totalProgress}%`,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      icon: CheckCircle,
      label: 'Завершено модулей',
      value: `${completedModules}/${totalModules}`,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      icon: Clock,
      label: 'Время обучения',
      value: '3.5 часа',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      icon: Trophy,
      label: 'Рейтинг',
      value: '8.5/10',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    }
  ];

  return (
    <Layout>
      <div className="p-3 space-y-4 max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-lg font-bold text-foreground">Модуль обучения</h1>
          <p className="text-xs text-muted-foreground">Онбординг и адаптация сотрудников</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {stats.map((stat, index) => (
            <Card key={index} className="border-0 shadow-sm">
              <CardContent className="p-2.5">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded ${stat.bgColor}`}>
                    <stat.icon className={`w-3 h-3 ${stat.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground font-medium leading-tight">{stat.label}</p>
                    <p className={`text-sm font-bold ${stat.color} leading-tight`}>{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Overall Progress */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-3 h-3 text-primary" />
              Общий прогресс обучения
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Завершено</span>
              <span className="font-semibold text-primary">{totalProgress}%</span>
            </div>
            <Progress value={totalProgress} className="h-1.5" />
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="w-2.5 h-2.5" />
                <span>Участников: 127</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-2.5 h-2.5" />
                <span>Средняя оценка: 4.8</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Training Modules */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Модули обучения</h2>
          </div>
          
          {trainingModules.map((module) => (
            <Card 
              key={module.id} 
              className={`border-0 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer ${
                selectedModule === module.id ? 'ring-1 ring-primary' : ''
              }`}
              onClick={() => setSelectedModule(selectedModule === module.id ? null : module.id)}
            >
              <CardContent className="p-3">
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground text-xs leading-tight">{module.title}</h3>
                        {module.completed && (
                          <CheckCircle className="w-3 h-3 text-green-600" />
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mb-1.5 leading-tight">{module.description}</p>
                      
                      <div className="flex items-center gap-2 text-[10px]">
                        <div className="flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{module.duration}</span>
                        </div>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">
                          {module.category}
                        </Badge>
                        <div className={`w-1.5 h-1.5 rounded-full ${getDifficultyColor(module.difficulty)}`} />
                        <span className="text-muted-foreground">{module.difficulty}</span>
                      </div>
                    </div>
                    
                    <Button 
                      size="sm" 
                      variant={module.completed ? "outline" : "default"}
                      className="flex items-center gap-1 text-[10px] px-2 py-1 h-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        const routeMap: Record<string, string> = {
                          '1': '/training/customer-basics',
                          '2': '/training/product-line', 
                          '3': '/training/pos-system',
                          '4': '/training/frame-selection'
                        };
                        const route = routeMap[module.id];
                        if (route) {
                          window.location.href = route;
                        }
                      }}
                    >
                      {module.completed ? (
                        <>
                          <Award className="w-2.5 h-2.5" />
                          Пройдено
                        </>
                      ) : (
                        <>
                          <Play className="w-2.5 h-2.5" />
                          {module.progress > 0 ? 'Продолжить' : 'Начать'}
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {/* Progress bar for each module */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-muted-foreground">Прогресс</span>
                      <span className={`font-medium ${module.completed ? 'text-green-600' : 'text-primary'}`}>
                        {module.progress}%
                      </span>
                    </div>
                    <Progress 
                      value={module.progress} 
                      className="h-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Achievement Section */}
        <Card className="border-0 shadow-sm bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-primary/20 rounded">
                <Trophy className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground text-xs">Достижения</h3>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  Завершите все модули для получения сертификата
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-primary">{completedModules}/4</div>
                <div className="text-[10px] text-muted-foreground">модуля</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <BottomNavigation />
    </Layout>
  );
}