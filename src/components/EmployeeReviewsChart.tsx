import { BarChart3 } from 'lucide-react';
import { useState } from 'react';

const performanceData = {
  week4: { 'Елена Козлова': 89, 'Анна Петрова': 86, 'Михаил Сидоров': 75 },
  week3: { 'Елена Козлова': 93, 'Анна Петрова': 85, 'Михаил Сидоров': 70 },
  week2: { 'Елена Козлова': 92, 'Анна Петрова': 82, 'Михаил Сидоров': 78 },
  current: { 'Елена Козлова': 90, 'Анна Петрова': 85, 'Михаил Сидоров': 75 }
};

export function EmployeeReviewsChart() {
  const [tooltip, setTooltip] = useState<{ visible: boolean; x: number; y: number; values: Array<{ employee: string; week: string; value: number }> } | null>(null);

  const handleMouseEnter = (e: React.MouseEvent, employee: string, week: string, value: number) => {
    const rect = (e.currentTarget.closest('.relative') as HTMLElement)?.getBoundingClientRect();
    const targetRect = e.currentTarget.getBoundingClientRect();
    if (rect) {
      // Найти все значения с таким же процентом и неделей
      const allValues = [];
      const weekData = week === '4 нед' ? performanceData.week4 :
                      week === '3 нед' ? performanceData.week3 :
                      week === '2 нед' ? performanceData.week2 :
                      performanceData.current;
      
      Object.entries(weekData).forEach(([emp, val]) => {
        if (val === value) {
          allValues.push({ employee: emp, week, value: val });
        }
      });

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
    <div className="bg-white/95 backdrop-blur-sm rounded-xl p-3 shadow-md border border-gray-100">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
          <BarChart3 className="w-4 h-4 text-blue-600" />
        </div>
        <h3 className="font-semibold text-gray-900 text-sm">Динамика рейтинга команды</h3>
      </div>
      
      {/* Chart showing percentage trends */}
      <div className="h-40 bg-gray-50 rounded-lg p-3 mb-3">
        <div className="relative w-full h-full">
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-[10px] text-gray-500 pr-2">
            <span>100</span>
            <span>90</span>
            <span>80</span>
            <span>70</span>
            <span>60</span>
          </div>
          
          {/* Chart area */}
          <div className="ml-8 mr-4 h-full relative">
            <svg className="w-full h-full" viewBox="0 0 300 120" preserveAspectRatio="none">
              {/* Grid lines */}
              <defs>
                <pattern id="grid-pattern-employees" width="60" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 60 0 L 0 0 0 30" fill="none" stroke="#f3f4f6" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid-pattern-employees)" />
              
              {/* Horizontal grid lines for percentages */}
              <line x1="0" y1="0" x2="300" y2="0" stroke="#e5e7eb" strokeWidth="0.5" />
              <line x1="0" y1="30" x2="300" y2="30" stroke="#e5e7eb" strokeWidth="0.5" />
              <line x1="0" y1="60" x2="300" y2="60" stroke="#e5e7eb" strokeWidth="0.5" />
              <line x1="0" y1="90" x2="300" y2="90" stroke="#e5e7eb" strokeWidth="0.5" />
              <line x1="0" y1="120" x2="300" y2="120" stroke="#e5e7eb" strokeWidth="0.5" />
              
              {/* Data lines - Елена Козлова (green) */}
              <polyline fill="none" stroke="#16a34a" strokeWidth="2.5" 
                points={`30,${120 - (performanceData.week4['Елена Козлова'] - 60) * 3} 90,${120 - (performanceData.week3['Елена Козлова'] - 60) * 3} 150,${120 - (performanceData.week2['Елена Козлова'] - 60) * 3} 270,${120 - (performanceData.current['Елена Козлова'] - 60) * 3}`} />
              
              {/* Data lines - Анна Петрова (blue) */}
              <polyline fill="none" stroke="#3b82f6" strokeWidth="2" 
                points={`30,${120 - (performanceData.week4['Анна Петрова'] - 60) * 3} 90,${120 - (performanceData.week3['Анна Петрова'] - 60) * 3} 150,${120 - (performanceData.week2['Анна Петрова'] - 60) * 3} 270,${120 - (performanceData.current['Анна Петрова'] - 60) * 3}`} />
              
              {/* Data lines - Михаил Сидоров (orange) */}
              <polyline fill="none" stroke="#f59e0b" strokeWidth="2" 
                points={`30,${120 - (performanceData.week4['Михаил Сидоров'] - 60) * 3} 90,${120 - (performanceData.week3['Михаил Сидоров'] - 60) * 3} 150,${120 - (performanceData.week2['Михаил Сидоров'] - 60) * 3} 270,${120 - (performanceData.current['Михаил Сидоров'] - 60) * 3}`} />
              
              {/* Data points with values - Елена Козлова */}
              <g>
                <circle 
                  cx="30" 
                  cy={120 - (performanceData.week4['Елена Козлова'] - 60) * 3} 
                  r="5" 
                  fill="#16a34a" 
                  className="hover:r-6 cursor-pointer transition-all duration-200"
                  onMouseEnter={(e) => handleMouseEnter(e, 'Елена Козлова', '4 нед', performanceData.week4['Елена Козлова'])}
                  onMouseLeave={handleMouseLeave}
                />
                
                <circle 
                  cx="90" 
                  cy={120 - (performanceData.week3['Елена Козлова'] - 60) * 3} 
                  r="5" 
                  fill="#16a34a" 
                  className="hover:r-6 cursor-pointer transition-all duration-200"
                  onMouseEnter={(e) => handleMouseEnter(e, 'Елена Козлова', '3 нед', performanceData.week3['Елена Козлова'])}
                  onMouseLeave={handleMouseLeave}
                />
                
                <circle 
                  cx="150" 
                  cy={120 - (performanceData.week2['Елена Козлова'] - 60) * 3} 
                  r="5" 
                  fill="#16a34a" 
                  className="hover:r-6 cursor-pointer transition-all duration-200"
                  onMouseEnter={(e) => handleMouseEnter(e, 'Елена Козлова', '2 нед', performanceData.week2['Елена Козлова'])}
                  onMouseLeave={handleMouseLeave}
                />
                
                <circle 
                  cx="270" 
                  cy={120 - (performanceData.current['Елена Козлова'] - 60) * 3} 
                  r="5" 
                  fill="#16a34a" 
                  className="hover:r-6 cursor-pointer transition-all duration-200"
                  onMouseEnter={(e) => handleMouseEnter(e, 'Елена Козлова', 'Сейчас', performanceData.current['Елена Козлова'])}
                  onMouseLeave={handleMouseLeave}
                />
              </g>
              
              {/* Data points - Анна Петрова */}
              <g>
                <circle 
                  cx="30" 
                  cy={120 - (performanceData.week4['Анна Петрова'] - 60) * 3} 
                  r="4" 
                  fill="#3b82f6" 
                  className="hover:r-5 cursor-pointer transition-all duration-200"
                  onMouseEnter={(e) => handleMouseEnter(e, 'Анна Петрова', '4 нед', performanceData.week4['Анна Петрова'])}
                  onMouseLeave={handleMouseLeave}
                />
                <circle 
                  cx="90" 
                  cy={120 - (performanceData.week3['Анна Петрова'] - 60) * 3} 
                  r="4" 
                  fill="#3b82f6" 
                  className="hover:r-5 cursor-pointer transition-all duration-200"
                  onMouseEnter={(e) => handleMouseEnter(e, 'Анна Петрова', '3 нед', performanceData.week3['Анна Петрова'])}
                  onMouseLeave={handleMouseLeave}
                />
                <circle 
                  cx="150" 
                  cy={120 - (performanceData.week2['Анна Петрова'] - 60) * 3} 
                  r="4" 
                  fill="#3b82f6" 
                  className="hover:r-5 cursor-pointer transition-all duration-200"
                  onMouseEnter={(e) => handleMouseEnter(e, 'Анна Петрова', '2 нед', performanceData.week2['Анна Петрова'])}
                  onMouseLeave={handleMouseLeave}
                />
                <circle 
                  cx="270" 
                  cy={120 - (performanceData.current['Анна Петрова'] - 60) * 3} 
                  r="4" 
                  fill="#3b82f6" 
                  className="hover:r-5 cursor-pointer transition-all duration-200"
                  onMouseEnter={(e) => handleMouseEnter(e, 'Анна Петрова', 'Сейчас', performanceData.current['Анна Петрова'])}
                  onMouseLeave={handleMouseLeave}
                />
              </g>
              
              {/* Data points - Михаил Сидоров */}
              <g>
                <circle 
                  cx="30" 
                  cy={120 - (performanceData.week4['Михаил Сидоров'] - 60) * 3} 
                  r="4" 
                  fill="#f59e0b" 
                  className="hover:r-5 cursor-pointer transition-all duration-200"
                  onMouseEnter={(e) => handleMouseEnter(e, 'Михаил Сидоров', '4 нед', performanceData.week4['Михаил Сидоров'])}
                  onMouseLeave={handleMouseLeave}
                />
                <circle 
                  cx="90" 
                  cy={120 - (performanceData.week3['Михаил Сидоров'] - 60) * 3} 
                  r="4" 
                  fill="#f59e0b" 
                  className="hover:r-5 cursor-pointer transition-all duration-200"
                  onMouseEnter={(e) => handleMouseEnter(e, 'Михаил Сидоров', '3 нед', performanceData.week3['Михаил Сидоров'])}
                  onMouseLeave={handleMouseLeave}
                />
                <circle 
                  cx="150" 
                  cy={120 - (performanceData.week2['Михаил Сидоров'] - 60) * 3} 
                  r="4" 
                  fill="#f59e0b" 
                  className="hover:r-5 cursor-pointer transition-all duration-200"
                  onMouseEnter={(e) => handleMouseEnter(e, 'Михаил Сидоров', '2 нед', performanceData.week2['Михаил Сидоров'])}
                  onMouseLeave={handleMouseLeave}
                />
                <circle 
                  cx="270" 
                  cy={120 - (performanceData.current['Михаил Сидоров'] - 60) * 3} 
                  r="4" 
                  fill="#f59e0b" 
                  className="hover:r-5 cursor-pointer transition-all duration-200"
                  onMouseEnter={(e) => handleMouseEnter(e, 'Михаил Сидоров', 'Сейчас', performanceData.current['Михаил Сидоров'])}
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
                   <div key={index}>{item.employee}: {item.value}</div>
                 ))}
              </div>
            )}
          </div>
          
          {/* X-axis labels */}
          <div className="flex justify-between text-[10px] text-gray-500 mt-1 ml-8 mr-4">
            <span>4 нед</span>
            <span>3 нед</span> 
            <span>2 нед</span>
            <span>Сейчас</span>
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-3 mt-2 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-1 bg-green-500 rounded-full"></div>
          <span className="text-gray-600">Елена Козлова</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-1 bg-blue-500 rounded-full"></div>
          <span className="text-gray-600">Анна Петрова</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-1 bg-yellow-500 rounded-full"></div>
          <span className="text-gray-600">Михаил Сидоров</span>
        </div>
      </div>
    </div>
  );
}