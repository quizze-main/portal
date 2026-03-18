import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Star, Camera, Upload, CheckCircle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
interface Question {
  id: number;
  type: 'rating' | 'yesno' | 'textarea' | 'photo' | 'radio';
  question: string;
  options?: string[];
  required: boolean;
}
const questions: Question[] = [{
  id: 1,
  type: 'rating',
  question: 'Оцените общую чистоту зала оптики',
  required: true
}, {
  id: 2,
  type: 'yesno',
  question: 'Работает ли освещение во всех зонах зала?',
  required: true
}, {
  id: 3,
  type: 'photo',
  question: 'Сфотографируйте главную витрину с оправами',
  required: true
}, {
  id: 4,
  type: 'radio',
  question: 'Состояние стеллажей и витрин с оправами',
  options: ['Отличное', 'Хорошее', 'Удовлетворительное', 'Требует внимания', 'Критическое'],
  required: true
}, {
  id: 5,
  type: 'yesno',
  question: 'Все ли зеркала в зале чистые и без повреждений?',
  required: true
}, {
  id: 6,
  type: 'rating',
  question: 'Оцените порядок на рабочих местах сотрудников',
  required: true
}, {
  id: 7,
  type: 'photo',
  question: 'Сфотографируйте зону примерки очков',
  required: false
}, {
  id: 8,
  type: 'textarea',
  question: 'Опишите найденные недостатки или замечания по залу',
  required: false
}, {
  id: 9,
  type: 'yesno',
  question: 'Соблюдается ли температурный режим в зале?',
  required: true
}, {
  id: 10,
  type: 'radio',
  question: 'Состояние информационных материалов и ценников',
  options: ['Все актуально', 'Большинство актуально', 'Частично устарело', 'Много устаревшего', 'Критично устарело'],
  required: true
}];
export default function Questionnaire() {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [ratings, setRatings] = useState<Record<number, number>>({});
  const [yesNoAnswers, setYesNoAnswers] = useState<Record<number, boolean>>({});
  const [uploadedFiles, setUploadedFiles] = useState<Record<number, File>>({});
  const handleRatingChange = (questionId: number, rating: number) => {
    setRatings(prev => ({
      ...prev,
      [questionId]: rating
    }));
  };
  const handleAnswerChange = (questionId: number, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };
  const handleYesNoChange = (questionId: number, value: boolean) => {
    setYesNoAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };
  const handleFileUpload = (questionId: number, file: File) => {
    setUploadedFiles(prev => ({
      ...prev,
      [questionId]: file
    }));
  };
  const removeFile = (questionId: number) => {
    setUploadedFiles(prev => {
      const newFiles = {
        ...prev
      };
      delete newFiles[questionId];
      return newFiles;
    });
  };
  const isAnswered = (question: Question) => {
    switch (question.type) {
      case 'rating':
        return ratings[question.id] !== undefined;
      case 'yesno':
        return yesNoAnswers[question.id] !== undefined;
      case 'textarea':
        return answers[question.id]?.trim() !== '' && answers[question.id] !== undefined;
      case 'photo':
        return uploadedFiles[question.id] !== undefined;
      case 'radio':
        return answers[question.id] !== undefined;
      default:
        return false;
    }
  };
  const getAnsweredCount = () => {
    return questions.filter(isAnswered).length;
  };
  const getRequiredAnsweredCount = () => {
    return questions.filter(q => q.required && isAnswered(q)).length;
  };
  const getRequiredCount = () => {
    return questions.filter(q => q.required).length;
  };
  const canSubmit = () => {
    return questions.filter(q => q.required).every(isAnswered);
  };
  const handleSubmit = () => {
    if (!canSubmit()) {
      toast({
        title: "Не все обязательные вопросы отвечены",
        description: "Пожалуйста, ответьте на все вопросы с *",
        variant: "destructive"
      });
      return;
    }
    toast({
      title: "Чек-лист завершен",
      description: "Проверка зала оптики завершена и сохранена."
    });
    navigate('/checklists');
  };
  const renderQuestion = (question: Question) => {
    const answered = isAnswered(question);
    switch (question.type) {
      case 'rating':
        return <div className="space-y-2">
            <div className="flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map(rating => <button key={rating} onClick={() => handleRatingChange(question.id, rating)} className={`p-1 rounded-lg transition-colors ${ratings[question.id] >= rating ? 'text-warning' : 'text-muted-foreground hover:text-warning/70'}`}>
                  <Star className={`w-5 h-5 ${ratings[question.id] >= rating ? 'fill-current' : ''}`} />
                </button>)}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground px-1">
              <span>Плохо</span>
              <span>Отлично</span>
            </div>
          </div>;
      case 'yesno':
        return <div className="flex gap-2 justify-center">
            <Button variant={yesNoAnswers[question.id] === true ? "default" : "outline"} onClick={() => handleYesNoChange(question.id, true)} className="flex-1 max-w-24 h-8 text-sm" size="sm">
              Да
            </Button>
            <Button variant={yesNoAnswers[question.id] === false ? "destructive" : "outline"} onClick={() => handleYesNoChange(question.id, false)} className="flex-1 max-w-24 h-8 text-sm" size="sm">
              Нет
            </Button>
          </div>;
      case 'radio':
        return <RadioGroup value={answers[question.id] || ''} onValueChange={value => handleAnswerChange(question.id, value)} className="space-y-2">
            {question.options?.map((option, index) => <div key={index} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`q${question.id}-option-${index}`} />
                <Label htmlFor={`q${question.id}-option-${index}`} className="flex-1 cursor-pointer text-sm leading-tight">
                  {option}
                </Label>
              </div>)}
          </RadioGroup>;
      case 'textarea':
        return <Textarea value={answers[question.id] || ''} onChange={e => handleAnswerChange(question.id, e.target.value)} placeholder="Ваш ответ..." className="min-h-[60px] resize-none text-sm" />;
      case 'photo':
        return <div className="space-y-2">
            {uploadedFiles[question.id] ? <div className="bg-muted rounded-lg p-2 border border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-primary" />
                    <div>
                      <p className="font-medium text-foreground text-sm">{uploadedFiles[question.id].name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(uploadedFiles[question.id].size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeFile(question.id)} className="text-destructive hover:text-destructive p-1 h-6 w-6">
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div> : <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                <Upload className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                <p className="text-muted-foreground mb-2 text-xs">Загрузите фото</p>
                <Input type="file" accept="image/*" onChange={e => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(question.id, file);
            }} className="max-w-xs mx-auto text-xs" />
              </div>}
          </div>;
      default:
        return null;
    }
  };
  return <Layout>
      <div className="px-4 py-4 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/checklists')} className="p-1.5">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-primary">Чек-лист проверки клуба Loov</h1>
            <p className="text-xs text-muted-foreground">
              Отвечено: {getAnsweredCount()}/{questions.length} 
              {getRequiredCount() > 0 && ` (обязательных: ${getRequiredAnsweredCount()}/${getRequiredCount()})`}
            </p>
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-3 mb-4">
          {questions.map((question, index) => {
          const answered = isAnswered(question);
          return <Card key={question.id} className={`shadow-sm border-0 transition-all ${answered ? 'ring-1 ring-success/20 bg-success/5' : ''}`}>
                <CardHeader className="pb-2 pt-3 px-3">
                  <CardTitle className="text-sm text-foreground flex items-start gap-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${answered ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'}`}>
                      {answered ? <CheckCircle className="w-3 h-3" /> : index + 1}
                    </div>
                    <span className="flex-1 leading-tight">
                      {question.question}
                      {question.required && <span className="text-destructive ml-1">*</span>}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  {renderQuestion(question)}
                </CardContent>
              </Card>;
        })}
        </div>

        {/* Submit Button */}
        <div className="sticky bottom-20 bg-background/80 backdrop-blur-sm p-3 -mx-4 border-t border-border">
          <Button onClick={handleSubmit} disabled={!canSubmit()} className="w-full">
            <CheckCircle className="w-4 h-4 mr-2" />
            Отправить ответы
          </Button>
          {!canSubmit() && <p className="text-center text-xs text-muted-foreground mt-1">
              Ответьте на все обязательные вопросы (*)
            </p>}
        </div>
      </div>
      
      <BottomNavigation />
    </Layout>;
}