import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Search, AlertTriangle, Clock, Calendar, MessageSquare, Camera, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Comment {
  id: string;
  text: string;
  createdAt: string;
  author: string;
}

interface AttentionOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  status: 'ready_for_pickup' | 'storage_exceeded' | 'soon_deadline' | 'overdue';
  amount: number;
  date: string;
  manager: string;
  description: string;
  comments: Comment[];
}

// Mock data
const attentionStats: Record<string, { count: number; amount: number; label: string; sublabel?: string; color: string }> = {
  ready_for_pickup: { count: 12, amount: 156800, label: 'Готовы к выдаче', color: 'bg-emerald-500' },
  storage_exceeded: { count: 20, amount: 252200, label: 'Срок хранения превышен', color: 'bg-amber-500' },
  soon_deadline: { count: 5, amount: 51370, label: 'Скоро дедлайн', sublabel: '<2 дней', color: 'bg-orange-500' },
  overdue: { count: 6, amount: 65319, label: 'Просрочен', color: 'bg-rose-500' },
};

const attentionOrders: AttentionOrder[] = [
  {
    id: '1',
    orderNumber: '1000086645',
    customerName: 'Мария Данилюк Максимовна',
    phone: '+7 (999) 123-45-67',
    status: 'overdue',
    amount: 28739,
    date: '2024-12-01',
    manager: 'Елена Новикова',
    description: 'Изготовление прогрессивных линз',
    comments: []
  },
  {
    id: '2',
    orderNumber: '1000086520',
    customerName: 'Иванов Петр Сергеевич',
    phone: '+7 (999) 234-56-78',
    status: 'storage_exceeded',
    amount: 15400,
    date: '2024-11-28',
    manager: 'Анна Петрова',
    description: 'Замена линз в оправе',
    comments: []
  },
  {
    id: '3',
    orderNumber: '1000086489',
    customerName: 'Козлова Елена Викторовна',
    phone: '+7 (999) 345-67-89',
    status: 'soon_deadline',
    amount: 23500,
    date: '2024-12-03',
    manager: 'Елена Новикова',
    description: 'Сборка очков',
    comments: []
  },
  {
    id: '4',
    orderNumber: '1000086401',
    customerName: 'Сидоров Алексей Николаевич',
    phone: '+7 (999) 456-78-90',
    status: 'storage_exceeded',
    amount: 18900,
    date: '2024-11-25',
    manager: 'Мария Иванова',
    description: 'Ремонт оправы',
    comments: []
  },
  {
    id: '5',
    orderNumber: '1000086378',
    customerName: 'Петрова Анна Владимировна',
    phone: '+7 (999) 567-89-01',
    status: 'overdue',
    amount: 31200,
    date: '2024-11-30',
    manager: 'Елена Новикова',
    description: 'Изготовление сложных линз',
    comments: []
  },
  {
    id: '6',
    orderNumber: '1000086290',
    customerName: 'Волкова Светлана Игоревна',
    phone: '+7 (999) 678-90-12',
    status: 'storage_exceeded',
    amount: 12800,
    date: '2024-11-20',
    manager: 'Анна Петрова',
    description: 'Регулировка оправы',
    comments: []
  },
];

const statusConfig = {
  ready_for_pickup: { label: 'Готов', icon: Package, bgColor: 'bg-emerald-500/10', textColor: 'text-emerald-600', dotColor: 'bg-emerald-500' },
  storage_exceeded: { label: 'Хранение', icon: Clock, bgColor: 'bg-amber-500/10', textColor: 'text-amber-600', dotColor: 'bg-amber-500' },
  soon_deadline: { label: 'Скоро', icon: AlertTriangle, bgColor: 'bg-orange-500/10', textColor: 'text-orange-600', dotColor: 'bg-orange-500' },
  overdue: { label: 'Просрочен', icon: AlertTriangle, bgColor: 'bg-rose-500/10', textColor: 'text-rose-600', dotColor: 'bg-rose-500' },
};

export default function RequireAttention() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<AttentionOrder[]>(attentionOrders);
  const [searchTerm, setSearchTerm] = useState('');
  const [managerFilter, setManagerFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<AttentionOrder | null>(null);
  const [newComment, setNewComment] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ru-RU').format(amount) + ' ₽';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.orderNumber.includes(searchTerm) ||
                         order.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesManager = managerFilter === 'all' || order.manager === managerFilter;
    const matchesStatus = !statusFilter || order.status === statusFilter;
    return matchesSearch && matchesManager && matchesStatus;
  });

  const managers = [...new Set(orders.map(o => o.manager))];

  const addComment = () => {
    if (!newComment.trim() || !selectedOrder) return;
    
    const comment: Comment = {
      id: Date.now().toString(),
      text: newComment.trim(),
      createdAt: new Date().toISOString(),
      author: 'Текущий пользователь'
    };

    setOrders(prev => 
      prev.map(order => 
        order.id === selectedOrder.id 
          ? { ...order, comments: [...order.comments, comment] }
          : order
      )
    );
    
    setSelectedOrder(prev => 
      prev ? { ...prev, comments: [...prev.comments, comment] } : null
    );
    
    setNewComment('');
  };

  const totalCount = Object.values(attentionStats).reduce((sum, s) => sum + s.count, 0);
  const totalAmount = Object.values(attentionStats).reduce((sum, s) => sum + s.amount, 0);

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-main">
        {/* Header */}
        <div className="px-4 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate(-1)}
              className="h-9 w-9"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-primary">Требуют внимания</h1>
              <p className="text-sm text-muted-foreground">Заказы, требующие срочного внимания</p>
            </div>
          </div>
        </div>

        <div className="px-4 space-y-4 pb-24">
          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-2">
            {Object.entries(attentionStats).map(([key, stat]) => (
              <Card 
                key={key} 
                onClick={() => setStatusFilter(statusFilter === key ? null : key)}
                className={cn(
                  "p-3 border-0 shadow-sm cursor-pointer transition-all",
                  key === 'ready_for_pickup' && "bg-emerald-50 dark:bg-emerald-950/20",
                  key === 'overdue' && "bg-rose-50 dark:bg-rose-950/20",
                  key === 'soon_deadline' && "bg-orange-50 dark:bg-orange-950/20",
                  key === 'storage_exceeded' && "bg-amber-50 dark:bg-amber-950/20",
                  statusFilter === key && key === 'ready_for_pickup' && "ring-2 ring-emerald-500",
                  statusFilter === key && key === 'storage_exceeded' && "ring-2 ring-amber-500",
                  statusFilter === key && key === 'soon_deadline' && "ring-2 ring-orange-500",
                  statusFilter === key && key === 'overdue' && "ring-2 ring-rose-500",
                  statusFilter && statusFilter !== key && "opacity-50"
                )}
              >
                <div className="flex flex-col items-center text-center">
                  <div className={cn(
                    "text-xl font-bold",
                    key === 'ready_for_pickup' && "text-emerald-600",
                    key === 'overdue' && "text-rose-600",
                    key === 'soon_deadline' && "text-orange-600",
                    key === 'storage_exceeded' && "text-amber-600"
                  )}>
                    {stat.count}
                  </div>
                  <div className="text-[10px] text-muted-foreground leading-tight mt-1">
                    {stat.label}
                    {stat.sublabel && <span className="block">{stat.sublabel}</span>}
                  </div>
                  <div className="text-xs font-medium text-foreground mt-1">
                    {formatAmount(stat.amount)}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Summary row */}
          <div className="flex items-center justify-between px-2 py-2 bg-muted/50 rounded-lg">
            <span className="text-sm text-muted-foreground">Всего заказов:</span>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-foreground">{totalCount}</span>
              <span className="text-sm font-medium text-muted-foreground">{formatAmount(totalAmount)}</span>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <Select value={managerFilter} onValueChange={setManagerFilter}>
              <SelectTrigger className="w-36 h-9 text-xs bg-card">
                <SelectValue placeholder="Менеджер" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Клуб</SelectItem>
                {managers.map(manager => (
                  <SelectItem key={manager} value={manager}>{manager}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Поиск по номеру заказа"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs bg-card"
              />
            </div>
          </div>

          {/* Orders List */}
          <div className="space-y-2">
            {filteredOrders.map(order => {
              const config = statusConfig[order.status];
              return (
                <Card 
                  key={order.id}
                  className="p-3 cursor-pointer hover:shadow-md transition-shadow border-0 shadow-sm"
                  onClick={() => setSelectedOrder(order)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", config.bgColor)}>
                        <AlertTriangle className={cn("w-4 h-4", config.textColor)} />
                      </div>
                      <span className="font-mono font-semibold text-sm text-foreground">
                        {order.orderNumber}
                      </span>
                    </div>
                    <span className="font-bold text-sm text-foreground">
                      {formatAmount(order.amount)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <div className={cn("w-2 h-2 rounded-full", config.dotColor)} />
                    <span className={cn("text-xs font-medium", config.textColor)}>
                      {config.label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground truncate max-w-[60%]">
                      {order.customerName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(order.date)}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Order Details Dialog */}
        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-sm flex items-center gap-2">
                Заказ {selectedOrder?.orderNumber}
              </DialogTitle>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-4 text-xs">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs">Информация о клиенте</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-1">
                    <div><strong>Имя:</strong> {selectedOrder.customerName}</div>
                    <div><strong>Телефон:</strong> {selectedOrder.phone}</div>
                    <div><strong>Менеджер:</strong> {selectedOrder.manager}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs">Детали заказа</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    <div><strong>Описание:</strong> {selectedOrder.description}</div>
                    <div><strong>Сумма:</strong> {formatAmount(selectedOrder.amount)}</div>
                    <div><strong>Статус:</strong> {statusConfig[selectedOrder.status].label}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Даты
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-1">
                    <div><strong>Создан:</strong> {new Date(selectedOrder.date).toLocaleDateString('ru-RU')}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      Комментарии ({selectedOrder.comments.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    {selectedOrder.comments.length > 0 ? (
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {selectedOrder.comments.map(comment => (
                          <div key={comment.id} className="bg-muted p-2 rounded text-[10px]">
                            <div className="flex justify-between items-start mb-1">
                              <span className="font-medium text-primary">{comment.author}</span>
                              <span className="text-muted-foreground">
                                {new Date(comment.createdAt).toLocaleDateString('ru-RU', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                            <div>{comment.text}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-muted-foreground text-[10px]">Комментариев пока нет</div>
                    )}
                    
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Добавить комментарий..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="text-xs h-16"
                      />
                      <Button 
                        onClick={addComment}
                        disabled={!newComment.trim()}
                        size="sm" 
                        className="w-full h-7 text-xs"
                      >
                        Добавить комментарий
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 h-7 text-xs">
                    <Camera className="w-3 h-3 mr-1" />
                    Фото
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 h-7 text-xs">
                    Печать
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
      
      <BottomNavigation />
    </Layout>
  );
}
