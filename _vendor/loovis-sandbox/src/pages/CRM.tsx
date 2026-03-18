import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Search, Eye, Settings, Clock, CheckCircle2, Package, Truck, Filter, MessageSquare, Calendar } from 'lucide-react';

interface Comment {
  id: string;
  text: string;
  createdAt: string;
  author: string;
}

interface Order {
  id: string;
  itigrisNumber: string;
  customerName: string;
  phone: string;
  description: string;
  status: 'received' | 'in_progress' | 'ready' | 'delivered';
  price: number;
  createdDate: string;
  dueDate: string;
  photos: string[];
  priority: 'low' | 'medium' | 'high';
  craftsman?: string;
  comments: Comment[];
}

const ordersData: Order[] = [
  {
    id: '1',
    itigrisNumber: 'ITG-2024-0001',
    customerName: 'Анна Петрова',
    phone: '+7 (999) 123-45-67',
    description: 'Замена линз в оправе Rayban',
    status: 'in_progress',
    price: 15400,
    createdDate: '2024-01-15',
    dueDate: '2024-01-20',
    photos: ['https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=64&h=64&fit=crop'],
    priority: 'medium',
    craftsman: 'Иванов И.И.',
    comments: [
      { id: '1', text: 'Получен заказ, начинаем работу', createdAt: '2024-01-15T10:00:00', author: 'Иванов И.И.' }
    ]
  },
  {
    id: '2',
    itigrisNumber: 'ITG-2024-0002',
    customerName: 'Михаил Сидоров',
    phone: '+7 (999) 987-65-43',
    description: 'Ремонт оправы, замена носоупоров',
    status: 'received',
    price: 8900,
    createdDate: '2024-01-16',
    dueDate: '2024-01-22',
    photos: ['https://images.unsplash.com/photo-1582562124811-c09040d0a901?w=64&h=64&fit=crop'],
    priority: 'high',
    comments: []
  },
  {
    id: '3',
    itigrisNumber: 'ITG-2024-0003',
    customerName: 'Елена Козлова',
    phone: '+7 (999) 555-44-33',
    description: 'Изготовление прогрессивных линз',
    status: 'ready',
    price: 23500,
    createdDate: '2024-01-10',
    dueDate: '2024-01-18',
    photos: ['https://images.unsplash.com/photo-1535268647677-300dbf3d78d1?w=64&h=64&fit=crop'],
    priority: 'medium',
    comments: [
      { id: '2', text: 'Линзы готовы, ожидаем клиента', createdAt: '2024-01-17T14:30:00', author: 'Петров П.П.' }
    ]
  },
  {
    id: '4',
    itigrisNumber: 'ITG-2024-0004',
    customerName: 'Дмитрий Иванов',
    phone: '+7 (999) 777-88-99',
    description: 'Регулировка оправы, замена винтов',
    status: 'delivered',
    price: 3200,
    createdDate: '2024-01-12',
    dueDate: '2024-01-16',
    photos: ['https://images.unsplash.com/photo-1501286353178-1ec881214838?w=64&h=64&fit=crop'],
    priority: 'low',
    comments: [
      { id: '3', text: 'Работа выполнена, заказ выдан клиенту', createdAt: '2024-01-16T16:00:00', author: 'Сидоров С.С.' }
    ]
  },
  {
    id: '5',
    itigrisNumber: 'ITG-2024-0005',
    customerName: 'Ольга Смирнова',
    phone: '+7 (999) 111-22-33',
    description: 'Изготовление мультифокальных линз',
    status: 'in_progress',
    price: 28000,
    createdDate: '2024-01-17',
    dueDate: '2024-01-25',
    photos: ['https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=64&h=64&fit=crop'],
    priority: 'high',
    craftsman: 'Петров П.П.',
    comments: []
  },
  {
    id: '6',
    itigrisNumber: 'ITG-2024-0006',
    customerName: 'Андрей Васильев',
    phone: '+7 (999) 444-55-66',
    description: 'Ремонт дужки очков',
    status: 'received',
    price: 4500,
    createdDate: '2024-01-18',
    dueDate: '2024-01-20',
    photos: [],
    priority: 'medium',
    comments: []
  },
  {
    id: '7',
    itigrisNumber: 'ITG-2024-0007',
    customerName: 'Мария Кузнецова',
    phone: '+7 (999) 888-99-00',
    description: 'Замена покрытия на линзах',
    status: 'ready',
    price: 12300,
    createdDate: '2024-01-14',
    dueDate: '2024-01-19',
    photos: ['https://images.unsplash.com/photo-1535268647677-300dbf3d78d1?w=64&h=64&fit=crop'],
    priority: 'low',
    craftsman: 'Иванов И.И.',
    comments: [
      { id: '4', text: 'Покрытие нанесено, готово к выдаче', createdAt: '2024-01-18T12:00:00', author: 'Иванов И.И.' }
    ]
  },
  {
    id: '8',
    itigrisNumber: 'ITG-2024-0008',
    customerName: 'Владимир Федоров',
    phone: '+7 (999) 333-44-55',
    description: 'Изготовление защитных линз',
    status: 'in_progress',
    price: 18700,
    createdDate: '2024-01-16',
    dueDate: '2024-01-23',
    photos: [],
    priority: 'medium',
    craftsman: 'Сидоров С.С.',
    comments: [
      { id: '5', text: 'Начата обработка линз', createdAt: '2024-01-17T09:15:00', author: 'Сидоров С.С.' }
    ]
  }
];

const statusConfig = {
  received: { label: 'Получен', color: 'bg-muted', icon: Package },
  in_progress: { label: 'В работе', color: 'bg-warning', icon: Settings },
  ready: { label: 'Готов', color: 'bg-success', icon: CheckCircle2 },
  delivered: { label: 'Выдан', color: 'bg-primary', icon: Truck }
};

const priorityConfig = {
  low: { label: 'Низкий', color: 'bg-muted' },
  medium: { label: 'Средний', color: 'bg-warning' },
  high: { label: 'Высокий', color: 'bg-destructive' }
};

export default function CRM() {
  const [orders, setOrders] = useState<Order[]>(ordersData);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [newComment, setNewComment] = useState('');

  const updateOrderStatus = (orderId: string, newStatus: Order['status']) => {
    setOrders(prev => 
      prev.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    );
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
    }
  };

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

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.itigrisNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: orders.length,
    received: orders.filter(o => o.status === 'received').length,
    inProgress: orders.filter(o => o.status === 'in_progress').length,
    ready: orders.filter(o => o.status === 'ready').length,
    delivered: orders.filter(o => o.status === 'delivered').length
  };

  return (
    <Layout>
      <div className="px-3 py-4 space-y-4">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-base font-bold text-primary mb-1">Крафтерная</h1>
          <p className="text-xs text-muted-foreground">Управление заказами и процессами ремонта</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-2 text-xs">
          <Card className="p-2">
            <div className="text-center">
              <div className="text-sm font-bold text-foreground">{stats.total}</div>
              <div className="text-[10px] text-muted-foreground">Всего</div>
            </div>
          </Card>
          <Card className="p-2">
            <div className="text-center">
              <div className="text-sm font-bold text-muted-foreground">{stats.received}</div>
              <div className="text-[10px] text-muted-foreground">Получено</div>
            </div>
          </Card>
          <Card className="p-2">
            <div className="text-center">
              <div className="text-sm font-bold text-warning">{stats.inProgress}</div>
              <div className="text-[10px] text-muted-foreground">В работе</div>
            </div>
          </Card>
          <Card className="p-2">
            <div className="text-center">
              <div className="text-sm font-bold text-success">{stats.ready}</div>
              <div className="text-[10px] text-muted-foreground">Готово</div>
            </div>
          </Card>
          <Card className="p-2">
            <div className="text-center">
              <div className="text-sm font-bold text-primary">{stats.delivered}</div>
              <div className="text-[10px] text-muted-foreground">Выдано</div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <Input 
              placeholder="Поиск по клиенту или номеру"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-7 h-7 text-xs"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-28 h-7 text-xs">
              <Filter className="w-3 h-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все</SelectItem>
              <SelectItem value="received">Получен</SelectItem>
              <SelectItem value="in_progress">В работе</SelectItem>
              <SelectItem value="ready">Готов</SelectItem>
              <SelectItem value="delivered">Выдан</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Orders Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow className="border-b">
                <TableHead className="text-[9px] h-4 px-1 w-6"></TableHead>
                <TableHead className="text-[9px] h-4 px-1">№ Заказа</TableHead>
                <TableHead className="text-[9px] h-4 px-1">Статус</TableHead>
                <TableHead className="text-[9px] h-4 px-1">Срок</TableHead>
                <TableHead className="text-[9px] h-4 px-1">Сумма</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map(order => {
                const StatusIcon = statusConfig[order.status].icon;
                const isOverdue = new Date(order.dueDate) < new Date() && order.status !== 'delivered';
                
                return (
                  <TableRow 
                    key={order.id} 
                    className="hover:bg-muted/30 cursor-pointer"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <TableCell className="px-1 py-0.5">
                      <div className="w-5 h-5 rounded border overflow-hidden bg-muted flex-shrink-0">
                        {order.photos[0] ? (
                          <img 
                            src={order.photos[0]} 
                            alt="Заказ" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <Camera className="w-2.5 h-2.5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-[9px] px-1 py-0.5 font-medium">
                      <div className="flex items-center gap-1">
                        <div className={`w-1 h-1 rounded-full ${priorityConfig[order.priority].color}`}></div>
                        <span className="whitespace-nowrap">{order.itigrisNumber}</span>
                      </div>
                      {order.craftsman && (
                        <div className="text-muted-foreground text-[8px] whitespace-nowrap">{order.craftsman.split(' ')[0]}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-[9px] px-1 py-0.5">
                      <div onClick={(e) => e.stopPropagation()}>
                        <Select 
                          value={order.status} 
                          onValueChange={(value) => updateOrderStatus(order.id, value as Order['status'])}
                        >
                          <SelectTrigger className="w-16 h-4 text-[8px] p-0.5 border-0 bg-transparent">
                            <div className="flex items-center gap-0.5">
                              <StatusIcon className="w-2 h-2" />
                              <span className="truncate">{statusConfig[order.status].label}</span>
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(statusConfig).map(([status, config]) => {
                              const Icon = config.icon;
                              return (
                                <SelectItem key={status} value={status}>
                                  <div className="flex items-center gap-1">
                                    <Icon className="w-3 h-3" />
                                    {config.label}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                    <TableCell className="text-[9px] px-1 py-0.5">
                      <div className={`flex items-center gap-0.5 ${isOverdue ? 'text-destructive' : ''}`}>
                        {isOverdue && <Clock className="w-2 h-2" />}
                        <span className="whitespace-nowrap">
                          {new Date(order.dueDate).toLocaleDateString('ru-RU', {
                            day: '2-digit',
                            month: '2-digit'
                          })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-[9px] px-1 py-0.5 font-medium">
                      <span className="whitespace-nowrap">{(order.price / 1000).toFixed(0)}к ₽</span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>

        {/* Order Details Dialog */}
        {selectedOrder && (
          <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-sm flex items-center gap-2">
                  Заказ {selectedOrder.itigrisNumber}
                  <Badge variant="outline" className="text-[10px]">
                    {priorityConfig[selectedOrder.priority].label} приоритет
                  </Badge>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-xs">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs">Информация о клиенте</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-1">
                    <div><strong>Имя:</strong> {selectedOrder.customerName}</div>
                    <div><strong>Телефон:</strong> {selectedOrder.phone}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs">Детали заказа</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    <div><strong>Описание:</strong> {selectedOrder.description}</div>
                    <div><strong>Сумма:</strong> {selectedOrder.price.toLocaleString()} ₽</div>
                    {selectedOrder.craftsman && (
                      <div><strong>Мастер:</strong> {selectedOrder.craftsman}</div>
                    )}
                    <div>
                      <strong>Статус:</strong>
                      <Select 
                        value={selectedOrder.status} 
                        onValueChange={(value) => updateOrderStatus(selectedOrder.id, value as Order['status'])}
                      >
                        <SelectTrigger className="w-full mt-1 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover z-50">
                          {Object.entries(statusConfig).map(([status, config]) => {
                            const Icon = config.icon;
                            return (
                              <SelectItem key={status} value={status}>
                                <div className="flex items-center gap-2">
                                  <Icon className="w-3 h-3" />
                                  {config.label}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Сроки
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-1">
                    <div><strong>Создан:</strong> {new Date(selectedOrder.createdDate).toLocaleDateString('ru-RU')}</div>
                    <div><strong>Срок выполнения:</strong> {new Date(selectedOrder.dueDate).toLocaleDateString('ru-RU')}</div>
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
            </DialogContent>
          </Dialog>
        )}
      </div>
      
      <BottomNavigation />
    </Layout>
  );
}