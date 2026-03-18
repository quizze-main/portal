import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';

interface EmployeeStats {
  name: string;
  totalReviews: number;
  totalOrders: number;
  goodPercent: number;
  neutralPercent: number;
  badPercent: number;
  weeklyTrend: 'up' | 'down' | 'stable';
  performanceScore: number; // 0-100
  weeklyStats: number[]; // последние 4 недели
}

const employeeStats: EmployeeStats[] = [
  {
    name: 'Елена Козлова',
    totalReviews: 56,
    totalOrders: 287,
    goodPercent: 90,
    neutralPercent: 5,
    badPercent: 5,
    weeklyTrend: 'up' as const,
    performanceScore: 92,
    weeklyStats: [18, 15, 12, 11] // отзывы по неделям
  },
  {
    name: 'Анна Петрова',
    totalReviews: 47,
    totalOrders: 235,
    goodPercent: 85,
    neutralPercent: 8,
    badPercent: 7,
    weeklyTrend: 'stable' as const,
    performanceScore: 85,
    weeklyStats: [14, 13, 11, 9]
  },
  {
    name: 'Михаил Сидоров',
    totalReviews: 38,
    totalOrders: 189,
    goodPercent: 75,
    neutralPercent: 15,
    badPercent: 10,
    weeklyTrend: 'down' as const,
    performanceScore: 72,
    weeklyStats: [12, 10, 9, 7]
  }
].sort((a, b) => b.performanceScore - a.performanceScore); // сортировка по производительности

const weekOptions = [
  { value: 'all', label: 'Все время' },
  { value: '0', label: 'Эта неделя' },
  { value: '1', label: 'Прошлая неделя' },
  { value: '2', label: '2 недели назад' },
  { value: '3', label: '3 недели назад' }
];

export function EmployeeStatsTable() {
  const [selectedWeek, setSelectedWeek] = useState<string>('all');
  
  // Пересчитываем статистику для выбранной недели
  const getStatsForWeek = (employee: EmployeeStats) => {
    if (selectedWeek === 'all') {
      return {
        reviews: employee.totalReviews,
        orders: employee.totalOrders,
        goodPercent: employee.goodPercent,
        neutralPercent: employee.neutralPercent,
        badPercent: employee.badPercent,
        performanceScore: employee.performanceScore
      };
    }
    
    const weekIndex = parseInt(selectedWeek);
    const weekReviews = employee.weeklyStats[weekIndex] || 0;
    const weekOrders = Math.round(employee.totalOrders * (weekReviews / employee.totalReviews));
    
    return {
      reviews: weekReviews,
      orders: weekOrders,
      goodPercent: employee.goodPercent, // Упрощенно, в реальности нужны данные по неделям
      neutralPercent: employee.neutralPercent,
      badPercent: employee.badPercent,
      performanceScore: employee.performanceScore
    };
  };

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground text-sm">Рейтинг отзывов команды</h3>
        
        <Select value={selectedWeek} onValueChange={setSelectedWeek}>
          <SelectTrigger className="w-[140px] h-7 text-[11px] border-0 bg-muted/50 hover:bg-muted focus:ring-1 focus:ring-muted-foreground/20 text-muted-foreground">
            <SelectValue placeholder="Период" />
          </SelectTrigger>
          <SelectContent className="min-w-[140px]">
            {weekOptions.map((option) => (
              <SelectItem key={option.value} value={option.value} className="text-[11px] py-1">
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="overflow-x-auto">
        <div className="min-w-[420px]">
          {/* Header with employees */}
          <div className="grid grid-cols-4 gap-2 text-[10px] bg-muted rounded-lg p-2 font-medium mb-1">
            <span className="text-muted-foreground">Метрика</span>
            {employeeStats.map((employee) => (
              <span key={employee.name} className="text-muted-foreground text-center">
                {employee.name}
              </span>
            ))}
          </div>
          
          {/* Data rows */}
          <div className="space-y-0.5">
            {/* Total orders */}
            <div className="grid grid-cols-4 gap-2 text-xs py-1 hover:bg-muted/50 rounded px-2">
              <span className="text-foreground font-medium">Заказы</span>
              {employeeStats.map((employee) => {
                const stats = getStatsForWeek(employee);
                return (
                  <span key={employee.name} className="text-foreground font-semibold text-center">
                    {stats.orders}
                  </span>
                );
              })}
            </div>
            
            {/* Total reviews */}
            <div className="grid grid-cols-4 gap-2 text-xs py-1 hover:bg-muted/50 rounded px-2">
              <span className="text-foreground font-medium">Отзывы</span>
              {employeeStats.map((employee) => {
                const stats = getStatsForWeek(employee);
                return (
                  <span key={employee.name} className="text-foreground font-semibold text-center">
                    {stats.reviews}
                  </span>
                );
              })}
            </div>
            
            {/* Good combined */}
            <div className="grid grid-cols-4 gap-2 text-xs py-1 hover:bg-muted/50 rounded px-2">
              <span className="text-foreground font-medium">Хорошо</span>
              {employeeStats.map((employee) => {
                const stats = getStatsForWeek(employee);
                return (
                  <span key={employee.name} className="text-success font-medium text-center">
                    {stats.goodPercent}% ({Math.round(stats.reviews * stats.goodPercent / 100)})
                  </span>
                );
              })}
            </div>
            
            {/* Neutral combined */}
            <div className="grid grid-cols-4 gap-2 text-xs py-1 hover:bg-muted/50 rounded px-2">
              <span className="text-foreground font-medium">Норм</span>
              {employeeStats.map((employee) => {
                const stats = getStatsForWeek(employee);
                return (
                  <span key={employee.name} className="text-muted-foreground font-medium text-center">
                    {stats.neutralPercent}% ({Math.round(stats.reviews * stats.neutralPercent / 100)})
                  </span>
                );
              })}
            </div>
            
            {/* Bad combined */}
            <div className="grid grid-cols-4 gap-2 text-xs py-1 hover:bg-muted/50 rounded px-2">
              <span className="text-foreground font-medium">Плохо</span>
              {employeeStats.map((employee) => {
                const stats = getStatsForWeek(employee);
                return (
                  <span key={employee.name} className="text-destructive font-medium text-center">
                    {stats.badPercent}% ({Math.round(stats.reviews * stats.badPercent / 100)})
                  </span>
                );
              })}
            </div>

            {/* Performance score */}
            <div className="grid grid-cols-4 gap-2 text-xs py-1 hover:bg-muted/50 rounded px-2">
              <span className="text-foreground font-medium">Общий балл</span>
              {employeeStats.map((employee) => {
                const stats = getStatsForWeek(employee);
                return (
                  <span key={employee.name} className="text-primary font-semibold text-center">
                    {stats.performanceScore}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
