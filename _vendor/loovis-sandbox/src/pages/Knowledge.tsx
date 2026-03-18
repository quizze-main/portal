import { Layout } from '@/components/Layout';
import { BottomNavigation } from '@/components/BottomNavigation';
import { BookOpen, Search } from 'lucide-react';

export default function Knowledge() {
  return (
    <Layout>
      <div className="px-4 py-6">
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">База знаний</h1>
          <p className="text-lg text-muted-foreground">Корпоративная база знаний и FAQ</p>
        </div>

        <div className="space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Поиск в базе знаний..."
              className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Knowledge Base Placeholder */}
          <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
            <div className="text-center space-y-4">
              <BookOpen className="w-16 h-16 text-muted-foreground mx-auto" />
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">База знаний загружается</h3>
                <p className="text-muted-foreground">Раздел находится в разработке</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <BottomNavigation />
    </Layout>
  );
}