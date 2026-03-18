import { useState, useRef, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, User, Search, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  type?: 'request' | 'response';
}

const mockManagerRequests = [
  "Нужна помощь с настройкой системы лояльности для постоянных клиентов",
  "Как правильно оформить возврат товара без чека?",
  "Требуется обучение персонала работе с новым оборудованием",
  "Проблемы с интеграцией POS-системы и складского учета",
  "Нужна консультация по мерчандайзингу витрины"
];

export default function AIChat() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Привет! Я AI-помощник для поиска запросов менеджеров. Опишите, что вас интересует, и я найду подходящие запросы.',
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const simulateAIResponse = async (userMessage: string): Promise<string> => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const keywords = userMessage.toLowerCase();
    const relevantRequests = mockManagerRequests.filter(request => 
      keywords.includes('лояльность') && request.includes('лояльность') ||
      keywords.includes('возврат') && request.includes('возврат') ||
      keywords.includes('обучение') && request.includes('обучение') ||
      keywords.includes('pos') && request.includes('POS') ||
      keywords.includes('витрина') && request.includes('витрина') ||
      keywords.includes('система') && request.includes('система')
    );

    if (relevantRequests.length > 0) {
      return `Найдено ${relevantRequests.length} подходящих запроса от менеджеров:\n\n${relevantRequests.map((req, i) => `${i + 1}. ${req}`).join('\n\n')}`;
    } else {
      return `По вашему запросу "${userMessage}" найдено несколько общих запросов:\n\n${mockManagerRequests.slice(0, 2).map((req, i) => `${i + 1}. ${req}`).join('\n\n')}\n\nМожете уточнить запрос для более точного поиска.`;
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const aiResponse = await simulateAIResponse(inputMessage);
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResponse,
        sender: 'ai',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось получить ответ от AI",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickSearches = [
    "Показать все запросы по обучению",
    "Найти проблемы с POS-системой", 
    "Запросы по работе с клиентами",
    "Технические проблемы"
  ];

  return (
    <Layout>
      <div className="h-[calc(100vh-140px)] flex flex-col bg-background">
        {/* Header */}
        <div className="p-4 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-semibold text-foreground">AI Помощник</h1>
              <p className="text-xs text-muted-foreground">Поиск запросов менеджеров</p>
            </div>
          </div>
        </div>

        {/* Quick Search Buttons */}
        <div className="p-3 border-b border-border">
          <div className="flex gap-2 overflow-x-auto">
            {quickSearches.map((search, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="text-xs whitespace-nowrap"
                onClick={() => setInputMessage(search)}
              >
                <Search className="w-3 h-3 mr-1" />
                {search}
              </Button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.sender === 'ai' && (
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="w-3 h-3 text-primary-foreground" />
                  </div>
                )}
                
                <div
                  className={`max-w-[80%] p-3 rounded-lg text-sm leading-relaxed ${
                    message.sender === 'user'
                      ? 'bg-primary text-primary-foreground ml-12'
                      : 'bg-muted text-foreground mr-12'
                  }`}
                >
                  <pre className="whitespace-pre-wrap font-sans">{message.content}</pre>
                  <div className="text-xs opacity-70 mt-2">
                    {message.timestamp.toLocaleTimeString('ru-RU', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>

                {message.sender === 'user' && (
                  <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="w-3 h-3 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-3 h-3 text-primary-foreground" />
                </div>
                <div className="bg-muted p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">AI печатает...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t border-border bg-card">
          <div className="flex gap-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Задайте вопрос или опишите запрос..."
              className="flex-1 text-sm"
              disabled={isLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              size="sm"
              className="px-3"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
      
      <BottomNavigation />
    </Layout>
  );
}