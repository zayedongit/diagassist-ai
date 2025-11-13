import { useState, useRef, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Bot, User, Send, Stethoscope, ArrowDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ClinicalReport } from '@/components/ClinicalReport';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';

interface Message {
  id: string;
  type: 'user' | 'agent' | 'question' | 'report';
  content: string;
  timestamp: Date;
  question?: TriageQuestion;
  report?: any;
}

interface TriageQuestion {
  id: string;
  text: string;
  options?: Array<{
    id: string;
    text: string;
    value: any;
  }>;
  allowMultiple?: boolean;
  type: 'radio' | 'checkbox' | 'text';
}

interface MedicalChatAgentProps {
  className?: string;
  analysisContext?: string;
  demographics?: { gender?: string; age?: number };
  abnormalPanels?: any[];
  mode?: 'voiceflow' | 'clinical-triage';
  onClinicalAssessmentComplete?: (reportData: any) => void;
}

export const MedicalChatAgent = ({ 
  className, 
  analysisContext,
  demographics,
  abnormalPanels,
  mode = 'clinical-triage',
  onClinicalAssessmentComplete 
}: MedicalChatAgentProps) => {
  const MAX_QUESTIONS = 6; // Production-level question limit
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [triageState, setTriageState] = useState<any>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<any>({});
  const [currentQuestion, setCurrentQuestion] = useState<TriageQuestion | null>(null);
  const [finalReport, setFinalReport] = useState<any>(null);
  const [askedQuestions, setAskedQuestions] = useState<Set<string>>(new Set());
  const [askedCount, setAskedCount] = useState<number>(0);
  const [textInput, setTextInput] = useState<string>('');
  const [showJumpButton, setShowJumpButton] = useState(false);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Generate session ID
  const generateSessionId = () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // CRITICAL: Reset session completely when new analysis starts
  const resetSession = () => {
    console.log('🔄 Resetting session for new analysis');
    setMessages([]);
    setInput('');
    setIsTyping(false);
    setTriageState(null);
    setSelectedAnswers({});
    setCurrentQuestion(null);
    setFinalReport(null);
    setAskedQuestions(new Set());
    setAskedCount(0);
    setTextInput('');
    setShowJumpButton(false);
    setIsAutoScrollEnabled(true);
    setSessionId(generateSessionId());
  };

  // Client-side relevance guard - prevent showing irrelevant questions
  const isQuestionRelevant = (questionText: string): boolean => {
    const text = questionText.toLowerCase();
    const isMale = demographics?.gender?.toLowerCase() === 'male';
    const isFemale = demographics?.gender?.toLowerCase() === 'female';
    
    // Check for CBC abnormalities
    const hasCBCAbnormal = abnormalPanels?.some(p => 
      /cbc|complete blood count|hemoglobin|hematology/i.test(p.panel) && 
      p.abnormal && p.abnormal.length > 0
    );
    
    // Block anemia/blood loss questions if no CBC abnormalities
    const mentionsAnemia = /anemia|blood loss|heavy period|menstru|fatigue.*blood|low.*hemoglobin/i.test(text);
    if (mentionsAnemia && !hasCBCAbnormal) {
      console.log('❌ Blocked irrelevant anemia question (no CBC abnormalities)');
      return false;
    }
    
    // Block female-specific questions for males
    const mentionsFemaleHealth = /menstru|period|pregnancy|pregnant|menopaus|ovarian|uterine/i.test(text);
    if (mentionsFemaleHealth && isMale) {
      console.log('❌ Blocked female-specific question for male patient');
      return false;
    }
    
    // Block male-specific questions for females
    const mentionsMaleHealth = /prostate|testic|erectile/i.test(text);
    if (mentionsMaleHealth && isFemale) {
      console.log('❌ Blocked male-specific question for female patient');
      return false;
    }
    
    return true;
  };

  // Initialize chat with analysis context - CRITICAL: Reset first!
  useEffect(() => {
    if (analysisContext) {
      resetSession(); // Always reset before new analysis
      setTimeout(() => initializeChat(), 100); // Small delay to ensure state cleared
    }
  }, [analysisContext]);

  const initializeChat = async () => {
    setIsTyping(true);
    try {
      if (mode === 'clinical-triage') {
        console.log('🔄 Initializing clinical triage chat...');
        const response = await supabase.functions.invoke('clinical-triage-chat', {
          body: {
            isInitialization: true,
            analysisContext: analysisContext,
            demographics: demographics,
            abnormalPanels: abnormalPanels,
            sessionId: sessionId || generateSessionId(),
            maxQuestions: MAX_QUESTIONS // Send max questions to backend
          }
        });

        console.log('📡 Clinical triage response:', response);

        if (response.error) {
          console.error('❌ Error initializing triage:', response.error);
          addMessage('agent', 'Sorry, there was an error starting the clinical assessment. Please try again.');
          toast.error('Failed to start clinical chat. Please refresh and try again.');
          setIsTyping(false);
          return;
        }

        const data = response.data;
        if (data.sessionId) {
          setSessionId(data.sessionId);
        }
        if (data.state) {
          setTriageState(data.state);
        }

        if (data.type === 'question') {
          // Add report summary before first question
          if (analysisContext && abnormalPanels && abnormalPanels.length > 0) {
            const summaryText = `Based on your medical report analysis, I found abnormalities in ${abnormalPanels.length} panel(s). Let me ask some targeted questions to provide you with a comprehensive clinical assessment.`;
            addMessage('agent', summaryText);
          }
          // CRITICAL: Only set currentQuestion, do NOT add to messages
          setCurrentQuestion(data.question);
          setAskedQuestions(new Set([data.question.id]));
          setAskedCount(1);
        } else if (data.type === 'report') {
          setFinalReport(data.report);
          addMessage('report', 'Clinical assessment complete. Here is your detailed report:', null, data.report);
          if (onClinicalAssessmentComplete) {
            onClinicalAssessmentComplete(data.report);
          }
        }
      } else {
        const response = await supabase.functions.invoke('voiceflow-chat', {
          body: {
            isInitialization: true,
            analysisContext: analysisContext,
            sessionId: sessionId || generateSessionId()
          }
        });

        if (response.error) {
          console.error('Error initializing chat:', response.error);
          addMessage('agent', 'Sorry, there was an error starting the chat. Please try again.');
          return;
        }

        const data = response.data;
        if (data.sessionId) {
          setSessionId(data.sessionId);
        }
        
        if (data.botResponse) {
          addMessage('agent', data.botResponse);
        }
      }
    } catch (error) {
      console.error('Error initializing chat:', error);
      addMessage('agent', 'Hello! I\'m your AI medical assistant. I\'m here to help answer questions about your health analysis. How can I assist you today?');
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    
    addMessage('user', userMessage);
    setIsTyping(true);

    try {
      if (mode === 'clinical-triage') {
        const response = await supabase.functions.invoke('clinical-triage-chat', {
          body: {
            message: userMessage,
            sessionId: sessionId,
            state: triageState
          }
        });

        if (response.error) {
          console.error('Error in triage chat:', response.error);
          addMessage('agent', 'Sorry, there was an error processing your message. Please try again.');
          return;
        }

        const data = response.data;
        await handleTriageResponse(data);
      } else {
        const response = await supabase.functions.invoke('voiceflow-chat', {
          body: {
            message: userMessage,
            sessionId: sessionId
          }
        });

        if (response.error) {
          console.error('Error in chat:', response.error);
          addMessage('agent', 'Sorry, there was an error. Please try again.');
          return;
        }

        const data = response.data;
        if (data.botResponse) {
          addMessage('agent', data.botResponse);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      addMessage('agent', 'Sorry, there was an error processing your message. Please try again.');
    } finally {
      setIsTyping(false);
    }
  };

  const handleTriageResponse = async (data: any) => {
    if (data.state) {
      setTriageState(data.state);
    }

    if (data.type === 'question') {
      const questionId = data.question.id;
      
      // Check if already asked
      if (askedQuestions.has(questionId)) {
        console.log('Question already asked, skipping:', questionId);
        return;
      }

      // Check question count limit
      if (askedCount >= MAX_QUESTIONS) {
        console.log('Max questions reached, forcing report');
        await handleForceReport();
        return;
      }

      // Client-side relevance check
      if (!isQuestionRelevant(data.question.text)) {
        console.log('Question not relevant, skipping...');
        await handleSkipQuestion();
        return;
      }

      setAskedQuestions(prev => new Set(prev).add(questionId));
      setAskedCount(c => c + 1);
      
      // CRITICAL: Only set currentQuestion, do NOT add to messages
      setCurrentQuestion(data.question);
      
      // Auto-scroll to new question after short delay
      setTimeout(() => scrollToLatest(), 100);
    } else if (data.type === 'message') {
      addMessage('agent', data.message);
    } else if (data.type === 'report') {
      setFinalReport(data.report);
      setCurrentQuestion(null);
      addMessage('report', 'Clinical assessment complete. Here is your detailed report:', null, data.report);
      
      if (onClinicalAssessmentComplete) {
        onClinicalAssessmentComplete(data.report);
      }
    }
  };

  const handleQuestionSubmit = async (questionId: string, answer: any, questionType: string) => {
    if (!answer) {
      console.error('handleQuestionSubmit called with empty answer');
      toast.error('Please select an answer before submitting');
      return;
    }

    // Validate answer based on type
    if (questionType === 'text' && (!answer || !answer.trim())) {
      console.error('Empty text answer');
      toast.error('Please enter an answer');
      return;
    }

    if (questionType === 'checkbox' && (!Array.isArray(answer) || answer.length === 0)) {
      console.error('No checkbox options selected');
      toast.error('Please select at least one option');
      return;
    }
    
    setIsTyping(true);
    
    try {
      // DO NOT SHOW USER ANSWER BUBBLE (Production-level requirement)
      // User answer echo removed per medical accuracy standards

      const response = await supabase.functions.invoke('clinical-triage-chat', {
        body: {
          questionId,
          selections: answer,
          sessionId: sessionId,
          state: triageState,
          analysisContext,
          demographics,
          abnormalPanels,
          maxQuestions: MAX_QUESTIONS
        }
      });

      if (response.error) {
        console.error('Error submitting answer:', response.error);
        toast.error('Error submitting answer. Please try again.');
        return;
      }

      const data = response.data;
      
      // Clear selections and current question before moving to next
      setCurrentQuestion(null);
      setSelectedAnswers({});
      setTextInput('');

      await handleTriageResponse(data);
      
      // Auto-scroll after short delay
      setTimeout(() => scrollToLatest(), 50);
    } catch (error) {
      console.error('Error submitting answer:', error);
      toast.error('Error submitting answer. Please try again.');
    } finally {
      setIsTyping(false);
    }
  };

  const handleForceReport = async () => {
    setIsTyping(true);
    
    try {
      const response = await supabase.functions.invoke('clinical-triage-chat', {
        body: {
          forceReport: true,
          sessionId: sessionId,
          state: triageState
        }
      });

      if (response.error) {
        console.error('Error forcing report:', response.error);
        toast.error('Error generating report. Please try again.');
        return;
      }

      const data = response.data;
      
      setCurrentQuestion(null);
      
      await handleTriageResponse(data);
    } catch (error) {
      console.error('Error forcing report:', error);
      toast.error('Error generating report. Please try again.');
    } finally {
      setIsTyping(false);
    }
  };

  const handleSkipQuestion = async () => {
    if (!currentQuestion) return;
    
    setIsTyping(true);
    
    try {
      const response = await supabase.functions.invoke('clinical-triage-chat', {
        body: {
          questionId: currentQuestion.id,
          skip: true,
          sessionId: sessionId,
          state: triageState
        }
      });

      if (response.error) {
        console.error('Error skipping question:', response.error);
        toast.error('Error skipping question. Please try again.');
        return;
      }

      const data = response.data;
      
      // DO NOT show skipped message (Production requirement)
      
      setCurrentQuestion(null);
      setSelectedAnswers({});
      setTextInput('');

      await handleTriageResponse(data);
    } catch (error) {
      console.error('Error skipping question:', error);
      toast.error('Error skipping question. Please try again.');
    } finally {
      setIsTyping(false);
    }
  };

  const addMessage = (type: 'user' | 'agent' | 'question' | 'report', content: string, question?: TriageQuestion, report?: any) => {
    const newMessage: Message = {
      id: `msg_${Date.now()}_${Math.random()}`,
      type,
      content,
      timestamp: new Date(),
      question,
      report
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (currentQuestion) {
        if (currentQuestion.type === 'text' && textInput.trim()) {
          handleQuestionSubmit(currentQuestion.id, textInput, 'text');
        }
      } else {
        handleSendMessage();
      }
    }
  };

  useEffect(() => {
    if (scrollAreaRef.current && isAutoScrollEnabled) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, isAutoScrollEnabled]);

  useEffect(() => {
    const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      
      setShowJumpButton(!isNearBottom);
      setIsAutoScrollEnabled(isNearBottom);
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToLatest = () => {
    const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (scrollContainer) {
      scrollContainer.scrollTo({
        top: scrollContainer.scrollHeight,
        behavior: 'smooth'
      });
      setIsAutoScrollEnabled(true);
      setShowJumpButton(false);
    }
  };

  return (
    <div className={className}>
      <Card className="h-full flex flex-col">
        <CardHeader className="border-b bg-primary/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Stethoscope className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">
                  Clinical Assessment
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {mode === 'clinical-triage' ? 'Interactive Health Evaluation' : 'AI Medical Assistant'}
                </p>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 p-0 flex flex-col relative">
          <ScrollArea 
            ref={scrollAreaRef} 
            className="flex-1 p-4"
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <div className={`space-y-4 py-4 ${isMobile ? 'pb-32' : ''}`}>
              {/* Render only non-question messages (agent messages and reports) */}
              {messages.filter(m => m.type !== 'question').map((message) => (
                <div 
                  key={message.id}
                  className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.type !== 'user' && (
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="w-5 h-5 text-primary" />
                      </div>
                    </div>
                  )}
                  
                  <div className={`flex-1 max-w-[80%] ${message.type === 'user' ? 'ml-auto' : ''}`}>
                    {message.type === 'report' ? (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground mb-2">{message.content}</p>
                        <ClinicalReport reportData={message.report} />
                      </div>
                    ) : (
                      <div className={`rounded-lg p-3 ${
                        message.type === 'user' 
                          ? 'bg-primary text-primary-foreground ml-auto' 
                          : 'bg-muted'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    )}
                  </div>

                  {message.type === 'user' && (
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                        <User className="w-5 h-5 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Render active question card separately */}
              {currentQuestion && (
                <div className="flex gap-3 justify-start">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1 max-w-[80%]">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">
                          Question {askedCount} of {MAX_QUESTIONS}
                        </Badge>
                      </div>
                      <div className="bg-cyan-50 rounded-lg p-3 border border-cyan-200">
                        <p className={`font-medium text-cyan-900 mb-3 ${isMobile ? 'text-[13px] leading-tight' : 'text-sm'}`}>
                          {currentQuestion.text}
                        </p>
                        
                        {currentQuestion.type === 'radio' && currentQuestion.options && (
                          <RadioGroup
                            value={selectedAnswers[currentQuestion.id] || ''}
                            onValueChange={(value) => {
                              setSelectedAnswers((prev: any) => ({
                                ...prev,
                                [currentQuestion.id]: value
                              }));
                            }}
                            className="space-y-1.5"
                          >
                            {currentQuestion.options.map((option) => (
                              <div key={option.id} className={`flex items-center space-x-2 bg-white rounded-md border border-cyan-100 hover:border-cyan-300 transition-colors ${isMobile ? 'p-0.5' : 'p-1'}`}>
                                <RadioGroupItem 
                                  value={option.value} 
                                  id={`${currentQuestion.id}-${option.id}`}
                                  className={isMobile ? 'w-3 h-3' : 'w-4 h-4'}
                                />
                                <Label 
                                  htmlFor={`${currentQuestion.id}-${option.id}`}
                                  className={`cursor-pointer flex-1 ${isMobile ? 'text-[13px] leading-tight py-0.5' : 'text-sm py-1'}`}
                                >
                                  {option.text}
                                </Label>
                              </div>
                            ))}
                          </RadioGroup>
                        )}
                        
                        {currentQuestion.type === 'checkbox' && currentQuestion.options && (
                          <div className="space-y-1.5">
                            {currentQuestion.options.map((option) => (
                              <div key={option.id} className={`flex items-center space-x-2 bg-white rounded-md border border-cyan-100 hover:border-cyan-300 transition-colors ${isMobile ? 'p-0.5' : 'p-1'}`}>
                                <Checkbox
                                  id={`${currentQuestion.id}-${option.id}`}
                                  checked={selectedAnswers[currentQuestion.id]?.includes(option.value) || false}
                                  onCheckedChange={(checked) => {
                                    setSelectedAnswers((prev: any) => {
                                      const currentAnswers = prev[currentQuestion.id] || [];
                                      if (checked) {
                                        return {
                                          ...prev,
                                          [currentQuestion.id]: [...currentAnswers, option.value]
                                        };
                                      } else {
                                        return {
                                          ...prev,
                                          [currentQuestion.id]: currentAnswers.filter((v: any) => v !== option.value)
                                        };
                                      }
                                    });
                                  }}
                                  className={isMobile ? 'w-3 h-3' : 'w-4 h-4'}
                                />
                                <Label 
                                  htmlFor={`${currentQuestion.id}-${option.id}`}
                                  className={`cursor-pointer flex-1 ${isMobile ? 'text-[13px] leading-tight py-0.5' : 'text-sm py-1'}`}
                                >
                                  {option.text}
                                </Label>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {currentQuestion.type === 'text' && (
                          <Textarea
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                            placeholder="Type your answer..."
                            className="min-h-[80px] text-sm"
                          />
                        )}
                        
                        <div className={`flex gap-2 mt-3 ${isMobile ? 'mb-8' : ''}`}>
                          <Button
                            size="sm"
                            onClick={() => {
                              const answer = currentQuestion.type === 'text' 
                                ? textInput 
                                : selectedAnswers[currentQuestion.id];
                              
                              if (answer && (
                                (typeof answer === 'string' && answer.trim()) ||
                                (Array.isArray(answer) && answer.length > 0) ||
                                (!Array.isArray(answer) && typeof answer !== 'string')
                              )) {
                                handleQuestionSubmit(currentQuestion.id, answer, currentQuestion.type);
                              } else {
                                toast.error('Please select an answer before submitting');
                              }
                            }}
                            disabled={
                              !selectedAnswers[currentQuestion.id] && 
                              (currentQuestion.type !== 'text' || !textInput.trim())
                            }
                            className="flex-1"
                          >
                            Submit Answer
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {isTyping && (
                <div className="flex gap-3 justify-start">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {showJumpButton && (
            <Button
              size="sm"
              variant="outline"
              className="absolute bottom-20 right-4 z-10 shadow-lg"
              onClick={scrollToLatest}
            >
              <ArrowDown className="w-4 h-4 mr-1" />
              Jump to Latest
            </Button>
          )}

          {/* Hide text input during clinical triage mode */}
          {mode !== 'clinical-triage' && !currentQuestion && !finalReport && (
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }} 
              className="border-t p-4"
            >
              <div className="relative">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  className="min-h-[80px] resize-none pr-12"
                  disabled={isTyping}
                />
                
                <div className="absolute top-2 right-2">
                  <Button 
                    type="submit" 
                    size="icon"
                    disabled={!input.trim() || isTyping}
                    className="h-8 w-8"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </form>
          )}

          {currentQuestion && messages.length > 3 && (
            <div className="border-t p-4 bg-muted/30">
              <Button
                variant="outline"
                size="sm"
                onClick={handleForceReport}
                className="w-full"
              >
                Generate Report Now
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Skip remaining questions and generate your clinical assessment
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
