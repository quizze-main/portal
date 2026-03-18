import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Search, Wrench, Phone, AlertTriangle } from 'lucide-react';
import { repairsOrders, AttentionOrderItem } from '@/data/mockData';

export default function Repairs() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOrders = repairsOrders.filter(order =>
    order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalAmount = repairsOrders.reduce((sum, o) => sum + o.amount, 0);
  const overdueCount = repairsOrders.filter(o => o.daysOverdue).length;

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-main">
        {/* Header */}
        <div className="px-4 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-foreground">Ремонты и гарантии</h1>
              <p className="text-xs text-muted-foreground">{repairsOrders.length} заказов · {overdueCount} просрочено</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по клиенту или номеру"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="px-4 mb-4">
          <div className="grid grid-cols-3 gap-2">
            <Card className="p-3 text-center">
              <div className="text-lg font-bold text-foreground">{repairsOrders.length}</div>
              <div className="text-[10px] text-muted-foreground">Всего</div>
            </Card>
            <Card className="p-3 text-center">
              <div className="text-lg font-bold text-destructive">{overdueCount}</div>
              <div className="text-[10px] text-muted-foreground">Просрочено</div>
            </Card>
            <Card className="p-3 text-center">
              <div className="text-lg font-bold text-foreground">{(totalAmount / 1000).toFixed(0)}K</div>
              <div className="text-[10px] text-muted-foreground">Сумма ₽</div>
            </Card>
          </div>
        </div>

        {/* Orders List */}
        <div className="px-4 space-y-2 pb-24">
          {filteredOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      </div>

      <BottomNavigation />
    </Layout>
  );
}

function OrderCard({ order }: { order: AttentionOrderItem }) {
  return (
    <Card className="p-3">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-warning" />
            <span className="text-sm font-medium">{order.orderNumber}</span>
            {order.daysOverdue && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Просрочен
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">{order.customerName}</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold">{order.amount.toLocaleString()} ₽</div>
          <div className="text-[10px] text-muted-foreground">{new Date(order.date).toLocaleDateString('ru-RU')}</div>
        </div>
      </div>
      
      <div className="text-xs text-muted-foreground mb-2">{order.description}</div>
      
      <div className="flex items-center justify-between">
        <a href={`tel:${order.phone}`} className="flex items-center gap-1 text-xs text-primary">
          <Phone className="w-3 h-3" />
          {order.phone}
        </a>
      </div>
    </Card>
  );
}
