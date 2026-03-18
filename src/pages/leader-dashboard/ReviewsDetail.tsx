import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmployeeStatsTable } from '@/components/EmployeeStatsTable';
import { NegativeReviewsAccordion } from '@/components/NegativeReviewsAccordion';
import { EmployeeReviewsChart } from '@/components/EmployeeReviewsChart';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ArrowLeft, Star, ThumbsUp, ThumbsDown, TrendingUp, TrendingDown, BarChart3, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// Data for different units
const unitReviewData = {
  club: {
    reviews: { good: 80, neutral: 10, bad: 10, total: 141, goodChange: '+2%', neutralChange: '-1%', badChange: '-1%' },
    weeklyData: {
      current: { good: 80, neutral: 10, bad: 10, total: 141 },
      week1: { good: 78, neutral: 11, bad: 11, total: 138 },
      week2: { good: 76, neutral: 13, bad: 11, total: 125 },
      week3: { good: 74, neutral: 14, bad: 12, total: 132 },
      week4: { good: 72, neutral: 16, bad: 12, total: 119 }
    }
  },
  employee1: {
    reviews: { good: 85, neutral: 8, bad: 7, total: 47, goodChange: '+5%', neutralChange: '-2%', badChange: '-3%' },
    weeklyData: {
      current: { good: 85, neutral: 8, bad: 7, total: 47 },
      week1: { good: 80, neutral: 12, bad: 8, total: 42 },
      week2: { good: 78, neutral: 14, bad: 8, total: 38 },
      week3: { good: 75, neutral: 15, bad: 10, total: 40 },
      week4: { good: 73, neutral: 17, bad: 10, total: 35 }
    }
  },
  employee2: {
    reviews: { good: 75, neutral: 15, bad: 10, total: 38, goodChange: '-1%', neutralChange: '+1%', badChange: '0%' },
    weeklyData: {
      current: { good: 75, neutral: 15, bad: 10, total: 38 },
      week1: { good: 76, neutral: 14, bad: 10, total: 35 },
      week2: { good: 78, neutral: 12, bad: 10, total: 32 },
      week3: { good: 79, neutral: 11, bad: 10, total: 30 },
      week4: { good: 80, neutral: 10, bad: 10, total: 28 }
    }
  },
  employee3: {
    reviews: { good: 90, neutral: 5, bad: 5, total: 56, goodChange: '+8%', neutralChange: '-3%', badChange: '-2%' },
    weeklyData: {
      current: { good: 90, neutral: 5, bad: 5, total: 56 },
      week1: { good: 82, neutral: 8, bad: 10, total: 52 },
      week2: { good: 80, neutral: 10, bad: 10, total: 48 },
      week3: { good: 78, neutral: 12, bad: 10, total: 45 },
      week4: { good: 75, neutral: 15, bad: 10, total: 42 }
    }
  }
};

export default function ReviewsDetail() {
  const [selectedUnit, setSelectedUnit] = useState<string>('club');
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [tooltip, setTooltip] = useState<{ visible: boolean; x: number; y: number; values: Array<{ category: string; week: string; value: number }> } | null>(null);
  
  const currentData = unitReviewData[selectedUnit as keyof typeof unitReviewData] || unitReviewData.club;
  const isLeaderMode = selectedUnit === 'club'; // Режим лидера активен когда выбран клуб

  const handleMouseEnter = (e: React.MouseEvent, category: string, week: string, value: number) => {
    const rect = (e.currentTarget.closest('.relative') as HTMLElement)?.getBoundingClientRect();
    const targetRect = e.currentTarget.getBoundingClientRect();
    if (rect) {
      // Найти все значения с таким же процентом и неделей
      const allValues = [];
      const weekData = week === '4 нед' ? currentData.weeklyData.week4 :
                      week === '3 нед' ? currentData.weeklyData.week3 :
                      week === '2 нед' ? currentData.weeklyData.week2 :
                      week === '1 нед' ? currentData.weeklyData.week1 :
                      currentData.weeklyData.current;
      
      if (weekData.good === value) allValues.push({ category: 'Хорошо', week, value });
      if (weekData.neutral === value) allValues.push({ category: 'Норм', week, value });
      if (weekData.bad === value) allValues.push({ category: 'Плохо', week, value });

      setTooltip({
        visible: true,
        x: targetRect.left - rect.left + 10,
        y: targetRect.top - rect.top - 10,
        values: allValues
      });
    }
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  return (
      <div className="leader-dashboard-theme min-h-screen bg-gradient-to-b from-blue-100 via-purple-50 to-white">
        {/* Header */}
        <div className="px-4 pt-6 pb-3">
          <div className="flex items-center gap-3 mb-2">
            <Link to="/" className="p-2 hover:bg-white/50 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <h1 className="text-xl font-bold text-blue-600">Отзывы клиентов</h1>
          </div>
          <p className="text-gray-600 text-sm pl-11">Подробная статистика по отзывам</p>
        </div>

        {/* Unit Selector and Date Picker */}
        <div className="px-4 mb-3 flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-sm border border-gray-200">
            <Calendar className="w-3.5 h-3.5 text-gray-600" />
            <span className="font-medium text-gray-800 text-sm">
              {date ? format(date, "dd.MM") : "21.08"}
            </span>
          </div>
          
          <Popover>
            <PopoverTrigger asChild>
              <button className="p-1.5 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm border border-gray-200 hover:bg-white/95 transition-colors">
                <Calendar className="w-3.5 h-3.5 text-gray-600" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          <Select value={selectedUnit} onValueChange={setSelectedUnit}>
            <SelectTrigger className="w-32 h-8 bg-white/90 backdrop-blur-sm border-gray-200 text-sm rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="club">Клуб</SelectItem>
              <SelectItem value="employee1">Анна Петрова</SelectItem>
              <SelectItem value="employee2">Михаил Сидоров</SelectItem>
              <SelectItem value="employee3">Елена Козлова</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="px-4 space-y-4 pb-20">
          {isLeaderMode ? (
            /* Leader Mode Content */
            <>
              {/* Overall Team Statistics */}
              <div className="bg-white/95 backdrop-blur-sm rounded-xl p-3 shadow-md border border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Star className="w-4 h-4 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm">Общая статистика команды</h3>
                </div>
                
                {/* KPI Row for entire team */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-gray-50/80 border border-gray-200/50 rounded-lg p-2 min-h-[52px]">
                    <div className="flex items-center gap-1.5 mb-1">
                      <ThumbsUp className="w-3 h-3 text-gray-600" />
                      <span className="text-xs font-medium text-gray-700">Хорошо</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-gray-900">80%</span>
                      <span className="text-xs font-medium text-green-600">+3%</span>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50/80 border border-gray-200/50 rounded-lg p-2 min-h-[52px]">
                    <div className="flex items-center gap-1.5 mb-1">
                      <img src="/lovable-uploads/7f052edf-96c7-4159-be82-ac85057dbc8d.png" alt="OK" className="w-4 h-4" />
                      <span className="text-xs font-medium text-gray-700">Норм</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-gray-900">13%</span>
                      <span className="text-xs font-medium text-red-600">-1%</span>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50/80 border border-gray-200/50 rounded-lg p-2 min-h-[52px]">
                    <div className="flex items-center gap-1.5 mb-1">
                      <ThumbsDown className="w-3 h-3 text-gray-600" />
                      <span className="text-xs font-medium text-gray-700">Плохо</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-gray-900">7%</span>
                      <span className="text-xs font-medium text-green-600">-2%</span>
                    </div>
                  </div>
                </div>
                
                {/* Summary */}
                <div className="text-center">
                  <span className="text-xs text-gray-600">141 отзыв за неделю по всей команде</span>
                </div>
              </div>

              {/* Employee Reviews Chart */}
              <EmployeeReviewsChart />

              {/* Employee Performance Table */}
              <div className="bg-white/95 backdrop-blur-sm rounded-xl p-3 shadow-md border border-gray-100">
                <EmployeeStatsTable />
              </div>

              {/* Negative Reviews by Employee */}
              <div className="bg-white/95 backdrop-blur-sm rounded-xl p-3 shadow-md border border-gray-100">
                <NegativeReviewsAccordion isLeaderMode={true} />
              </div>
            </>
          ) : (
            /* Regular Mode Content */
            <>
              {/* Customer Reviews Dashboard - same as main page */}
              <div className="bg-white/95 backdrop-blur-sm rounded-xl p-3 shadow-md border border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Star className="w-4 h-4 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm">Отзывы клиентов</h3>
                </div>
                
                {/* KPI Row with neutral colors - same as Dashboard */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-gray-50/80 border border-gray-200/50 rounded-lg p-2 min-h-[52px]">
                    <div className="flex items-center gap-1.5 mb-1">
                      <ThumbsUp className="w-3 h-3 text-gray-600" />
                      <span className="text-xs font-medium text-gray-700">Хорошо</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-gray-900">{currentData.reviews.good}%</span>
                      <span className={`text-xs font-medium ${currentData.reviews.goodChange.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                        {currentData.reviews.goodChange}
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50/80 border border-gray-200/50 rounded-lg p-2 min-h-[52px]">
                    <div className="flex items-center gap-1.5 mb-1">
                      <img src="/lovable-uploads/7f052edf-96c7-4159-be82-ac85057dbc8d.png" alt="OK" className="w-4 h-4" />
                      <span className="text-xs font-medium text-gray-700">Норм</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-gray-900">{currentData.reviews.neutral}%</span>
                      <span className={`text-xs font-medium ${currentData.reviews.neutralChange.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                        {currentData.reviews.neutralChange}
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50/80 border border-gray-200/50 rounded-lg p-2 min-h-[52px]">
                    <div className="flex items-center gap-1.5 mb-1">
                      <ThumbsDown className="w-3 h-3 text-gray-600" />
                      <span className="text-xs font-medium text-gray-700">Плохо</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-gray-900">{currentData.reviews.bad}%</span>
                      <span className={`text-xs font-medium ${currentData.reviews.badChange.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                        {currentData.reviews.badChange}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Summary */}
                <div className="text-center">
                  <span className="text-xs text-gray-600">{currentData.reviews.total} отзыв за неделю</span>
                </div>
              </div>

              {/* Rating Trend Chart */}
              <div className="bg-white/95 backdrop-blur-sm rounded-xl p-3 shadow-md border border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm">Тренды оценок по неделям</h3>
                </div>
                
                {/* Chart showing percentage trends */}
                <div className="h-40 bg-gray-50 rounded-lg p-3 mb-3">
                  <div className="relative w-full h-full">
                    {/* Y-axis labels */}
                    <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-[10px] text-gray-500 pr-2">
                      <span>100%</span>
                      <span>75%</span>
                      <span>50%</span>
                      <span>25%</span>
                      <span>0%</span>
                    </div>
                    
                    {/* Chart area */}
                    <div className="ml-8 mr-4 h-full relative">
                      <svg className="w-full h-full" viewBox="0 0 300 120" preserveAspectRatio="none">
                        {/* Grid lines */}
                        <defs>
                          <pattern id="grid-pattern" width="60" height="30" patternUnits="userSpaceOnUse">
                            <path d="M 60 0 L 0 0 0 30" fill="none" stroke="#f3f4f6" strokeWidth="0.5" />
                          </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#grid-pattern)" />
                        
                        {/* Horizontal grid lines for percentages */}
                        <line x1="0" y1="0" x2="300" y2="0" stroke="#e5e7eb" strokeWidth="0.5" />
                        <line x1="0" y1="30" x2="300" y2="30" stroke="#e5e7eb" strokeWidth="0.5" />
                        <line x1="0" y1="60" x2="300" y2="60" stroke="#e5e7eb" strokeWidth="0.5" />
                        <line x1="0" y1="90" x2="300" y2="90" stroke="#e5e7eb" strokeWidth="0.5" />
                        <line x1="0" y1="120" x2="300" y2="120" stroke="#e5e7eb" strokeWidth="0.5" />
                        
                        {/* Data lines - Good ratings (inverted Y because SVG starts from top) */}
                        <polyline fill="none" stroke="#16a34a" strokeWidth="2.5" 
                          points={`30,${120 - currentData.weeklyData.week4.good * 1.2} 90,${120 - currentData.weeklyData.week3.good * 1.2} 150,${120 - currentData.weeklyData.week2.good * 1.2} 210,${120 - currentData.weeklyData.week1.good * 1.2} 270,${120 - currentData.weeklyData.current.good * 1.2}`} />
                        
                        {/* Data lines - Neutral ratings */}
                        <polyline fill="none" stroke="#6b7280" strokeWidth="2" 
                          points={`30,${120 - currentData.weeklyData.week4.neutral * 1.2} 90,${120 - currentData.weeklyData.week3.neutral * 1.2} 150,${120 - currentData.weeklyData.week2.neutral * 1.2} 210,${120 - currentData.weeklyData.week1.neutral * 1.2} 270,${120 - currentData.weeklyData.current.neutral * 1.2}`} />
                        
                        {/* Data lines - Bad ratings */}
                        <polyline fill="none" stroke="#dc2626" strokeWidth="2" 
                          points={`30,${120 - currentData.weeklyData.week4.bad * 1.2} 90,${120 - currentData.weeklyData.week3.bad * 1.2} 150,${120 - currentData.weeklyData.week2.bad * 1.2} 210,${120 - currentData.weeklyData.week1.bad * 1.2} 270,${120 - currentData.weeklyData.current.bad * 1.2}`} />
                        
                         {/* Data points with values - Good */}
                         <g>
                           <circle 
                             cx="30" 
                             cy={120 - currentData.weeklyData.week4.good * 1.2} 
                             r="5" 
                             fill="#16a34a" 
                             className="hover:r-6 cursor-pointer transition-all duration-200"
                             onMouseEnter={(e) => handleMouseEnter(e, 'Хорошо', '4 нед', currentData.weeklyData.week4.good)}
                             onMouseLeave={handleMouseLeave}
                           />
                           
                           <circle 
                             cx="90" 
                             cy={120 - currentData.weeklyData.week3.good * 1.2} 
                             r="5" 
                             fill="#16a34a" 
                             className="hover:r-6 cursor-pointer transition-all duration-200"
                             onMouseEnter={(e) => handleMouseEnter(e, 'Хорошо', '3 нед', currentData.weeklyData.week3.good)}
                             onMouseLeave={handleMouseLeave}
                           />
                           
                           <circle 
                             cx="150" 
                             cy={120 - currentData.weeklyData.week2.good * 1.2} 
                             r="5" 
                             fill="#16a34a" 
                             className="hover:r-6 cursor-pointer transition-all duration-200"
                             onMouseEnter={(e) => handleMouseEnter(e, 'Хорошо', '2 нед', currentData.weeklyData.week2.good)}
                             onMouseLeave={handleMouseLeave}
                           />
                           
                           <circle 
                             cx="210" 
                             cy={120 - currentData.weeklyData.week1.good * 1.2} 
                             r="5" 
                             fill="#16a34a" 
                             className="hover:r-6 cursor-pointer transition-all duration-200"
                             onMouseEnter={(e) => handleMouseEnter(e, 'Хорошо', '1 нед', currentData.weeklyData.week1.good)}
                             onMouseLeave={handleMouseLeave}
                           />
                           
                           <circle 
                             cx="270" 
                             cy={120 - currentData.weeklyData.current.good * 1.2} 
                             r="5" 
                             fill="#16a34a" 
                             className="hover:r-6 cursor-pointer transition-all duration-200"
                             onMouseEnter={(e) => handleMouseEnter(e, 'Хорошо', 'Сейчас', currentData.weeklyData.current.good)}
                             onMouseLeave={handleMouseLeave}
                           />
                         </g>
                         
                         {/* Data points - Neutral */}
                         <g>
                           <circle 
                             cx="30" 
                             cy={120 - currentData.weeklyData.week4.neutral * 1.2} 
                             r="4" 
                             fill="#6b7280" 
                             className="hover:r-5 cursor-pointer transition-all duration-200"
                             onMouseEnter={(e) => handleMouseEnter(e, 'Норм', '4 нед', currentData.weeklyData.week4.neutral)}
                             onMouseLeave={handleMouseLeave}
                           />
                           <circle 
                             cx="90" 
                             cy={120 - currentData.weeklyData.week3.neutral * 1.2} 
                             r="4" 
                             fill="#6b7280" 
                             className="hover:r-5 cursor-pointer transition-all duration-200"
                             onMouseEnter={(e) => handleMouseEnter(e, 'Норм', '3 нед', currentData.weeklyData.week3.neutral)}
                             onMouseLeave={handleMouseLeave}
                           />
                           <circle 
                             cx="150" 
                             cy={120 - currentData.weeklyData.week2.neutral * 1.2} 
                             r="4" 
                             fill="#6b7280" 
                             className="hover:r-5 cursor-pointer transition-all duration-200"
                             onMouseEnter={(e) => handleMouseEnter(e, 'Норм', '2 нед', currentData.weeklyData.week2.neutral)}
                             onMouseLeave={handleMouseLeave}
                           />
                           <circle 
                             cx="210" 
                             cy={120 - currentData.weeklyData.week1.neutral * 1.2} 
                             r="4" 
                             fill="#6b7280" 
                             className="hover:r-5 cursor-pointer transition-all duration-200"
                             onMouseEnter={(e) => handleMouseEnter(e, 'Норм', '1 нед', currentData.weeklyData.week1.neutral)}
                             onMouseLeave={handleMouseLeave}
                           />
                           <circle 
                             cx="270" 
                             cy={120 - currentData.weeklyData.current.neutral * 1.2} 
                             r="4" 
                             fill="#6b7280" 
                             className="hover:r-5 cursor-pointer transition-all duration-200"
                             onMouseEnter={(e) => handleMouseEnter(e, 'Норм', 'Сейчас', currentData.weeklyData.current.neutral)}
                             onMouseLeave={handleMouseLeave}
                           />
                         </g>
                         
                         {/* Data points - Bad */}
                         <g>
                           <circle 
                             cx="30" 
                             cy={120 - currentData.weeklyData.week4.bad * 1.2} 
                             r="4" 
                             fill="#dc2626" 
                             className="hover:r-5 cursor-pointer transition-all duration-200"
                             onMouseEnter={(e) => handleMouseEnter(e, 'Плохо', '4 нед', currentData.weeklyData.week4.bad)}
                             onMouseLeave={handleMouseLeave}
                           />
                           <circle 
                             cx="90" 
                             cy={120 - currentData.weeklyData.week3.bad * 1.2} 
                             r="4" 
                             fill="#dc2626" 
                             className="hover:r-5 cursor-pointer transition-all duration-200"
                             onMouseEnter={(e) => handleMouseEnter(e, 'Плохо', '3 нед', currentData.weeklyData.week3.bad)}
                             onMouseLeave={handleMouseLeave}
                           />
                           <circle 
                             cx="150" 
                             cy={120 - currentData.weeklyData.week2.bad * 1.2} 
                             r="4" 
                             fill="#dc2626" 
                             className="hover:r-5 cursor-pointer transition-all duration-200"
                             onMouseEnter={(e) => handleMouseEnter(e, 'Плохо', '2 нед', currentData.weeklyData.week2.bad)}
                             onMouseLeave={handleMouseLeave}
                           />
                           <circle 
                             cx="210" 
                             cy={120 - currentData.weeklyData.week1.bad * 1.2} 
                             r="4" 
                             fill="#dc2626" 
                             className="hover:r-5 cursor-pointer transition-all duration-200"
                             onMouseEnter={(e) => handleMouseEnter(e, 'Плохо', '1 нед', currentData.weeklyData.week1.bad)}
                             onMouseLeave={handleMouseLeave}
                           />
                           <circle 
                             cx="270" 
                             cy={120 - currentData.weeklyData.current.bad * 1.2} 
                             r="4" 
                             fill="#dc2626" 
                             className="hover:r-5 cursor-pointer transition-all duration-200"
                             onMouseEnter={(e) => handleMouseEnter(e, 'Плохо', 'Сейчас', currentData.weeklyData.current.bad)}
                             onMouseLeave={handleMouseLeave}
                           />
                         </g>
                       </svg>

                       {/* Tooltip */}
                       {tooltip && (
                         <div 
                           className="absolute bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none z-10"
                           style={{
                             left: tooltip.x,
                             top: tooltip.y,
                           }}
                         >
                           <div className="font-semibold">{tooltip.values[0].week}</div>
                           {tooltip.values.map((item, index) => (
                             <div key={index}>{item.category}: {item.value}%</div>
                           ))}
                         </div>
                       )}
                    </div>
                    
                    {/* X-axis labels */}
                    <div className="absolute bottom-0 left-8 right-4 flex justify-between text-[9px] text-gray-500 mt-1">
                      <span>-4н</span>
                      <span>-3н</span>
                      <span>-2н</span>
                      <span>-1н</span>
                      <span>Тек</span>
                    </div>
                  </div>
                </div>
                
                {/* Legend */}
                <div className="flex items-center justify-center gap-4">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-0.5 bg-green-600 rounded"></div>
                    <span className="text-xs text-gray-600">Хорошо</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-0.5 bg-gray-500 rounded"></div>
                    <span className="text-xs text-gray-600">Норм</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-0.5 bg-red-600 rounded"></div>
                    <span className="text-xs text-gray-600">Плохо</span>
                  </div>
                </div>
              </div>

              {/* Detailed Weekly Breakdown */}
              <div className="bg-white/95 backdrop-blur-sm rounded-xl p-3 shadow-md border border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm">Детальная разбивка по неделям</h3>
                </div>
                
                <div className="overflow-x-auto">
                  <div className="min-w-[420px]">
                    {/* Header with weeks */}
                    <div className="grid grid-cols-6 gap-2 text-[10px] bg-muted rounded-lg p-2 font-medium mb-1">
                      <span className="text-muted-foreground">Метрика</span>
                      <span className="text-muted-foreground text-center">Текущая</span>
                      <span className="text-muted-foreground text-center">-1 нед</span>
                      <span className="text-muted-foreground text-center">-2 нед</span>
                      <span className="text-muted-foreground text-center">-3 нед</span>
                      <span className="text-muted-foreground text-center">-4 нед</span>
                    </div>
                    
                    {/* Data rows */}
                    <div className="space-y-0.5">
                      {/* Closed orders */}
                      <div className="grid grid-cols-6 gap-2 text-xs py-1 hover:bg-muted/50 rounded px-2">
                        <span className="text-foreground font-medium">Закрытые заказы</span>
                        <span className="font-semibold text-center text-foreground">287</span>
                        <span className="text-foreground text-center">275</span>
                        <span className="text-foreground text-center">263</span>
                        <span className="text-foreground text-center">251</span>
                        <span className="text-foreground text-center">239</span>
                      </div>
                      
                      {/* Total reviews */}
                      <div className="grid grid-cols-6 gap-2 text-xs py-1 hover:bg-muted/50 rounded px-2">
                        <span className="text-foreground font-medium">Всего отзывов</span>
                        <span className="text-foreground font-semibold text-center">{currentData.weeklyData.current.total}</span>
                        <span className="text-foreground text-center">{currentData.weeklyData.week1.total}</span>
                        <span className="text-foreground text-center">{currentData.weeklyData.week2.total}</span>
                        <span className="text-foreground text-center">{currentData.weeklyData.week3.total}</span>
                        <span className="text-foreground text-center">{currentData.weeklyData.week4.total}</span>
                      </div>
                      
                      {/* Good combined */}
                      <div className="grid grid-cols-6 gap-2 text-xs py-1 hover:bg-muted/50 rounded px-2">
                        <span className="text-foreground font-medium">Хорошо</span>
                        <span className="text-success font-medium text-center">{currentData.weeklyData.current.good}% ({Math.round(currentData.weeklyData.current.total * currentData.weeklyData.current.good / 100)})</span>
                        <span className="text-foreground text-center">{currentData.weeklyData.week1.good}% ({Math.round(currentData.weeklyData.week1.total * currentData.weeklyData.week1.good / 100)})</span>
                        <span className="text-foreground text-center">{currentData.weeklyData.week2.good}% ({Math.round(currentData.weeklyData.week2.total * currentData.weeklyData.week2.good / 100)})</span>
                        <span className="text-foreground text-center">{currentData.weeklyData.week3.good}% ({Math.round(currentData.weeklyData.week3.total * currentData.weeklyData.week3.good / 100)})</span>
                        <span className="text-foreground text-center">{currentData.weeklyData.week4.good}% ({Math.round(currentData.weeklyData.week4.total * currentData.weeklyData.week4.good / 100)})</span>
                      </div>
                      
                      {/* Neutral combined */}
                      <div className="grid grid-cols-6 gap-2 text-xs py-1 hover:bg-muted/50 rounded px-2">
                        <span className="text-foreground font-medium">Норм</span>
                        <span className="text-muted-foreground font-medium text-center">{currentData.weeklyData.current.neutral}% ({Math.round(currentData.weeklyData.current.total * currentData.weeklyData.current.neutral / 100)})</span>
                        <span className="text-foreground text-center">{currentData.weeklyData.week1.neutral}% ({Math.round(currentData.weeklyData.week1.total * currentData.weeklyData.week1.neutral / 100)})</span>
                        <span className="text-foreground text-center">{currentData.weeklyData.week2.neutral}% ({Math.round(currentData.weeklyData.week2.total * currentData.weeklyData.week2.neutral / 100)})</span>
                        <span className="text-foreground text-center">{currentData.weeklyData.week3.neutral}% ({Math.round(currentData.weeklyData.week3.total * currentData.weeklyData.week3.neutral / 100)})</span>
                        <span className="text-foreground text-center">{currentData.weeklyData.week4.neutral}% ({Math.round(currentData.weeklyData.week4.total * currentData.weeklyData.week4.neutral / 100)})</span>
                      </div>

                      {/* Bad combined */}
                      <div className="grid grid-cols-6 gap-2 text-xs py-1 hover:bg-muted/50 rounded px-2">
                        <span className="text-foreground font-medium">Плохо</span>
                        <span className="text-destructive font-medium text-center">{currentData.weeklyData.current.bad}% ({Math.round(currentData.weeklyData.current.total * currentData.weeklyData.current.bad / 100)})</span>
                        <span className="text-foreground text-center">{currentData.weeklyData.week1.bad}% ({Math.round(currentData.weeklyData.week1.total * currentData.weeklyData.week1.bad / 100)})</span>
                        <span className="text-foreground text-center">{currentData.weeklyData.week2.bad}% ({Math.round(currentData.weeklyData.week2.total * currentData.weeklyData.week2.bad / 100)})</span>
                        <span className="text-foreground text-center">{currentData.weeklyData.week3.bad}% ({Math.round(currentData.weeklyData.week3.total * currentData.weeklyData.week3.bad / 100)})</span>
                        <span className="text-foreground text-center">{currentData.weeklyData.week4.bad}% ({Math.round(currentData.weeklyData.week4.total * currentData.weeklyData.week4.bad / 100)})</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

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
        </div>
      </div>
  );
}