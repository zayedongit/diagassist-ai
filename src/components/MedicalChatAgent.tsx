import { useState, useRef, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Bot, User, Send, Activity, ArrowDown, ArrowRight, HelpCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { invokeWithRetry } from '@/utils/retryWithBackoff';

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
  onNavigateNext?: () => void;
  analysisId?: string;
  analysisTimestamp?: string;
}

export const MedicalChatAgent = ({ 
  className, 
  analysisContext,
  demographics,
  abnormalPanels,
  mode = 'clinical-triage',
  onClinicalAssessmentComplete,
  onNavigateNext,
  analysisId,
  analysisTimestamp
}: MedicalChatAgentProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [triageState, setTriageState] = useState<any>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<any>({});
  const [currentQuestion, setCurrentQuestion] = useState<TriageQuestion | null>(null);
  const [finalReport, setFinalReport] = useState<any>(null);
  const [askedQuestions, setAskedQuestions] = useState<Set<string>>(new Set());
  const [textInput, setTextInput] = useState<string>('');
  const [showJumpButton, setShowJumpButton] = useState(false);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const [showHelpSection, setShowHelpSection] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    // Only initialize with fresh, verified analysis data
    if (mode === 'clinical-triage' && !sessionId && analysisContext) {
      // Validate data freshness
      if (analysisTimestamp) {
        const analysisAge = Date.now() - new Date(analysisTimestamp).getTime();
        const MAX_AGE = 10 * 60 * 1000; // 10 minutes
        
        if (analysisAge > MAX_AGE) {
          console.warn('[AUDIT] Analysis data is stale, age:', analysisAge);
          toast.warning('Analysis data may be outdated. Please refresh.');
        }
      }
      
      console.log('[AUDIT] Initializing clinical chat with analysis:', analysisId || 'no-id');
      initializeChat();
    } else if (mode === 'voiceflow' && !sessionId) {
      initializeChat();
    }
  }, [analysisContext, mode, analysisId]);

  const initializeChat = async () => {
    setIsTyping(true);
    const newSessionId = Math.random().toString(36).substring(7);
    setSessionId(newSessionId);

    try {
      if (mode === 'clinical-triage') {
        // Add initial greeting immediately to prevent blank state
        addMessage('agent', "Hello! I'm here to help you understand your results. Let's begin.");
        
        console.log('[AUDIT] Sending analysis context to clinical triage:', {
          analysisId,
          analysisTimestamp,
          sessionId: newSessionId
        });
        
        const response = await invokeWithRetry(supabase, 'clinical-triage-chat', {
          body: {
            isInitialization: true,
            analysisContext,
            demographics,
            abnormalPanels,
            sessionId: newSessionId,
            analysisId,  // Add analysis ID for verification
            analysisTimestamp  // Add timestamp for freshness check
          },
          retryOptions: {
            maxRetries: 3,
            onRetry: (attempt) => {
              toast.info(`Reconnecting... (attempt ${attempt}/3)`, {
                duration: 2000
              });
            }
          }
        });

        if (response.error) {
          console.error('Error initializing clinical triage:', response.error);
          
          // Provide specific error messages based on error type
          if (response.error.status === 429) {
            toast.error('Service is experiencing high traffic. Please try again in a moment.', {
              duration: 5000
            });
            addMessage('agent', "I'm experiencing high traffic right now. Please try again in a moment.");
          } else if (response.error.status === 402) {
            toast.error('Service credits exhausted. Please contact support.', {
              duration: 5000
            });
            addMessage('agent', "I'm unable to connect right now. Please contact support for assistance.");
          } else {
            addMessage('agent', "I'm having trouble connecting right now. Please try again in a moment.");
          }
          return;
        }

        const data = response.data;
        handleTriageResponse(data);
      } else {
        const analysisSnippet = analysisContext?.slice(0, 300) || 'general health report';
        
        const response = await supabase.functions.invoke('voiceflow-chat', {
          body: {
            message: '',
            sessionId: newSessionId,
            analysisContext: analysisSnippet,
            isInitialization: true
          }
        });

        if (response.error) {
          console.error('Error initializing Voiceflow:', response.error);
          addMessage('agent', 'Hello! I\'ve reviewed your health analysis and I\'m here to answer any questions you might have.');
          return;
        }

        const botResponse = response.data?.response || 'Hello! How can I help you understand your health report?';
        addMessage('agent', botResponse);
      }
    } catch (error) {
      console.error('Error initializing chat:', error);
      addMessage('agent', 'Hello! I\'m here to help you understand your health results. What would you like to know?');
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setInput('');
    addMessage('user', userMessage);
    setIsTyping(true);

    try {
      if (mode === 'clinical-triage') {
        const response = await invokeWithRetry(supabase, 'clinical-triage-chat', {
          body: {
            message: userMessage,
            sessionId: sessionId,
            state: triageState
          },
          retryOptions: {
            maxRetries: 2,
            onRetry: (attempt) => {
              toast.info(`Retrying... (${attempt}/2)`, { duration: 1500 });
            }
          }
        });

        if (response.error) {
          console.error('Error sending message:', response.error);
          
          if (response.error.status === 429) {
            toast.error('Too many requests. Please wait a moment before trying again.');
            addMessage('agent', 'Please wait a moment before sending another message.');
          } else if (response.error.status === 402) {
            toast.error('Service unavailable. Please contact support.');
            addMessage('agent', 'Sorry, I cannot process your message right now.');
          } else {
            addMessage('agent', 'I apologize, but I encountered an error. Please try asking your question again.');
          }
          return;
        }

        const data = response.data;
        if (data.response) {
          addMessage('agent', data.response);
        }
        
        handleTriageResponse(data);
      } else {
        const response = await supabase.functions.invoke('voiceflow-chat', {
          body: {
            message: userMessage,
            sessionId: sessionId
          }
        });

        if (response.error) {
          console.error('Error sending message:', response.error);
          addMessage('agent', 'I apologize, but I encountered an error. Please try again.');
          return;
        }

        const botResponse = response.data?.response || 'I understand your question. Could you provide more details?';
        addMessage('agent', botResponse);
      }
    } catch (error) {
      console.error('Error in chat:', error);
      addMessage('agent', 'I\'m having trouble processing your request. Please try again.');
    } finally {
      setIsTyping(false);
    }
  };

  const handleTriageResponse = (data: any) => {
    if (data.state) {
      setTriageState(data.state);
    }

    // Report handling
    if (data.type === 'report' || data.finalReport) {
      const report = data.report || data.finalReport;
      setFinalReport(report);
      addMessage('report', 'Your clinical assessment is complete! Here\'s your personalized health report.', undefined, report);
      
      if (onClinicalAssessmentComplete) {
        onClinicalAssessmentComplete(report);
      }
      
      setCurrentQuestion(null);
      return;
    }

    // Question handling: support both data.question and legacy data.nextQuestion
    const q = data.question || data.nextQuestion;
    if (q?.id && q?.text) {
      const questionId = q.id;
      
      if (!askedQuestions.has(questionId)) {
        setAskedQuestions(prev => new Set([...prev, questionId]));
        
        const triageQuestion: TriageQuestion = {
          id: q.id,
          text: q.text,
          type: q.type || 'text',
          options: q.options,
          allowMultiple: q.allowMultiple
        };
        
        setCurrentQuestion(triageQuestion);
        addMessage('question', q.text, triageQuestion);
        setSelectedAnswers({});
        setTextInput('');
      }
      return;
    }

    // Fallback to avoid blank state
    if (messages.length === 0) {
      addMessage('agent', "Hello! I'm here to help you understand your results. How are you feeling today?");
    }
  };

  const handleQuestionSubmit = async () => {
    if (!currentQuestion || isSubmitting) return;

    // Only MCQ answers are allowed
    const selectedValues = Object.values(selectedAnswers).filter(Boolean) as string[];
    if (selectedValues.length === 0) return;
    
    // Prevent duplicate submissions
    setIsSubmitting(true);
    
    const answer = currentQuestion.allowMultiple ? selectedValues : selectedValues[0];
    const answerText = Array.isArray(answer) ? answer.join(', ') : answer;
    
    setIsTyping(true);

    try {
      const response = await invokeWithRetry(supabase, 'clinical-triage-chat', {
        body: {
          selections: { [currentQuestion.id]: answer },
          sessionId: sessionId,
          state: triageState
        },
        retryOptions: {
          maxRetries: 2,
          onRetry: (attempt) => {
            toast.info(`Processing answer... (${attempt}/2)`, { duration: 1500 });
          }
        }
      });

      if (response.error) {
        console.error('Error submitting answer:', response.error);
        
        if (response.error.status === 429) {
          toast.error('Please slow down. Wait a moment before answering.');
        } else if (response.error.status === 402) {
          toast.error('Service unavailable. Please contact support.');
        } else {
          toast.error('Error processing your answer. Please try again.');
          addMessage('agent', 'Sorry, I encountered an error processing your answer. Please try again.');
        }
        return;
      }

      const data = response.data;
      
      // Clear current question immediately to prevent re-submission
      setCurrentQuestion(null);
      setSelectedAnswers({});
      
      handleTriageResponse(data);
      
      // Auto-scroll to next question after DOM updates (mobile optimization)
      setTimeout(() => {
        scrollToLatest();
      }, isMobile ? 200 : 300);
    } catch (error) {
      console.error('Error submitting answer:', error);
      toast.error('Error submitting answer. Please try again.');
      addMessage('agent', 'Sorry, I encountered an error. Please try again.');
    } finally {
      setIsTyping(false);
      setIsSubmitting(false);
    }
  };

  const handleForceReport = async () => {
    if (!triageState || triageState.questionCount < 3) {
      toast.error('Please answer at least 3 questions before generating the report.');
      return;
    }

    setIsTyping(true);
    addMessage('user', 'Generate my report now');

    try {
      const response = await invokeWithRetry(supabase, 'clinical-triage-chat', {
        body: {
          forceReport: true,
          sessionId: sessionId,
          state: triageState
        },
        retryOptions: {
          maxRetries: 3,
          onRetry: (attempt) => {
            toast.info(`Generating report... (${attempt}/3)`, { duration: 2000 });
          }
        }
      });

      if (response.error) {
        console.error('Error generating report:', response.error);
        
        if (response.error.status === 429) {
          toast.error('Service is busy. Please wait a moment and try again.');
        } else if (response.error.status === 402) {
          toast.error('Service unavailable. Please contact support.');
        } else {
          addMessage('agent', 'Sorry, I encountered an error generating your report. Please try again.');
        }
        return;
      }

      const data = response.data;
      handleTriageResponse(data);
    } catch (error) {
      console.error('Error generating report:', error);
      addMessage('agent', 'Sorry, I encountered an error. Please try again.');
    } finally {
      setIsTyping(false);
    }
  };

  const handleSkipQuestion = async () => {
    if (!currentQuestion) return;
    
    setIsTyping(true);
    addMessage('user', 'Skipped this question');

    try {
      const response = await invokeWithRetry(supabase, 'clinical-triage-chat', {
        body: {
          selections: { [currentQuestion.id]: 'skipped' },
          sessionId: sessionId,
          state: triageState
        },
        retryOptions: {
          maxRetries: 2,
          onRetry: (attempt) => {
            toast.info(`Skipping question... (${attempt}/2)`, { duration: 1500 });
          }
        }
      });

      if (response.error) {
        console.error('Error skipping question:', response.error);
        
        if (response.error.status === 429) {
          toast.error('Please wait a moment before skipping.');
        } else if (response.error.status === 402) {
          toast.error('Service unavailable. Please contact support.');
        } else {
          addMessage('agent', 'Sorry, I encountered an error. Please try again.');
        }
        return;
      }

      const data = response.data;
      handleTriageResponse(data);
    } catch (error) {
      console.error('Error skipping question:', error);
      addMessage('agent', 'Sorry, I encountered an error. Please try again.');
    } finally {
      setIsTyping(false);
    }
  };

  const addMessage = (type: 'user' | 'agent' | 'question' | 'report', content: string, question?: TriageQuestion, report?: any) => {
    const newMessage: Message = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      content,
      timestamp: new Date(),
      question,
      report,
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (mode === 'clinical-triage' && currentQuestion) {
        handleQuestionSubmit();
      } else {
        handleSendMessage();
      }
    }
  };

  useEffect(() => {
    if (isAutoScrollEnabled && scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages, isTyping, isAutoScrollEnabled]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isAtBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 50;
    setShowJumpButton(!isAtBottom);
    setIsAutoScrollEnabled(isAtBottom);
  };

  const scrollToLatest = () => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTo({
          top: scrollElement.scrollHeight,
          behavior: isMobile ? 'auto' : 'smooth'
        });
      } else {
        scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
      }
      setIsAutoScrollEnabled(true);
      setShowJumpButton(false);
    }
  };

  const jumpToLatest = () => {
    scrollToLatest();
  };

  return (
    <Card className={`border-primary/20 bg-gradient-to-r from-primary/5 to-blue-50 ${className}`}>
      <CardHeader className="px-3 py-4 sm:px-6 sm:py-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg text-primary">
                Clinical Assessment
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                AI Medical Assistant
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHelpSection(!showHelpSection)}
            className="h-8 w-8 p-0"
          >
            <HelpCircle className="w-5 h-5 text-primary" />
          </Button>
        </div>

        {showHelpSection && (
          <Collapsible open={showHelpSection} onOpenChange={setShowHelpSection}>
            <CollapsibleContent>
              <Alert className="bg-blue-50 border-blue-200">
                <AlertDescription className="text-xs sm:text-sm space-y-2">
                  <p className="font-medium text-blue-900">How to use:</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-800">
                    <li>Answer questions about your health and symptoms</li>
                    <li>Be as detailed as possible for better assessment</li>
                    <li>You can skip questions if not applicable</li>
                    <li>Request your report after answering at least 3 questions</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardHeader>

      <CardContent className="relative p-0">
        <ScrollArea 
          className={isMobile ? "h-[55vh] px-3" : "h-[500px] px-4"}
          onScrollCapture={handleScroll}
          ref={scrollAreaRef}
        >
          <div className="space-y-4 py-4">
            {messages.map((message) => (
              <div key={message.id}>
                {message.type === 'user' && (
                  <div className="flex items-start gap-2 sm:gap-3 justify-end">
                    <div className="bg-primary text-primary-foreground rounded-lg p-2 sm:p-3 max-w-[85%] sm:max-w-[80%]">
                      <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">{message.content}</p>
                    </div>
                    <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                    </div>
                  </div>
                )}

                {(message.type === 'agent' || message.type === 'question') && (
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                    </div>
                    <div className="bg-muted rounded-lg p-2 sm:p-3 max-w-[85%] sm:max-w-[80%]">
                      <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">{message.content}</p>
                    </div>
                  </div>
                )}

                {message.type === 'report' && (
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <Bot className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-2 sm:p-3 border-2 border-green-200 max-w-[85%] sm:max-w-[80%]">
                      <p className="text-xs sm:text-sm font-medium text-green-800">{message.content}</p>
                    </div>
                  </div>
                )}

                {message.type === 'question' && message.question && currentQuestion?.id === message.question.id && (
                  <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-white rounded-lg border-2 border-primary/20">
                    {message.question.type === 'radio' && message.question.options && (
                      <RadioGroup
                        value={Object.keys(selectedAnswers)[0] || ''}
                        onValueChange={(value) => {
                          const option = message.question.options?.find(opt => opt.id === value);
                          setSelectedAnswers({ [value]: option?.text });
                        }}
                        className="space-y-2 mb-3"
                      >
                        {message.question.options.map((option) => (
                          <div key={option.id} className="flex items-center space-x-2 min-h-[44px]">
                            <RadioGroupItem value={option.id} id={option.id} />
                            <Label htmlFor={option.id} className="text-xs sm:text-sm cursor-pointer flex-1">
                              {option.text}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    )}

                    {message.question.type === 'checkbox' && message.question.options && (
                      <div className="space-y-2 mb-3">
                        {message.question.options.map((option) => (
                          <div key={option.id} className="flex items-center space-x-2 min-h-[44px]">
                            <Checkbox
                              id={option.id}
                              checked={selectedAnswers[option.id] || false}
                              onCheckedChange={(checked) => {
                                setSelectedAnswers(prev => ({
                                  ...prev,
                                  [option.id]: checked ? option.text : undefined
                                }));
                              }}
                            />
                            <Label htmlFor={option.id} className="text-xs sm:text-sm cursor-pointer flex-1">
                              {option.text}
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      <Button 
                        onClick={handleQuestionSubmit}
                        disabled={isSubmitting || Object.values(selectedAnswers).filter(Boolean).length === 0}
                        size="sm"
                        className="w-full sm:w-auto min-h-[48px] bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors text-base sm:text-sm"
                      >
                        {isSubmitting ? 'Submitting...' : 'Submit Answer'}
                      </Button>
                      
                      <Button 
                        onClick={handleSkipQuestion}
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto min-h-[48px] px-4 py-2"
                      >
                        Skip
                      </Button>
                      
                      {triageState?.questionCount >= 3 && (
                        <Button 
                          onClick={handleForceReport}
                          variant="secondary"
                          size="sm"
                          className="w-full sm:w-auto min-h-[48px] px-4 py-2"
                        >
                          Generate Report Now
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {showJumpButton && (
          <div className="absolute bottom-20 right-4 z-10">
            <Button
              size="sm"
              variant="secondary"
              onClick={jumpToLatest}
              className="rounded-full shadow-lg border-2 border-primary/20"
            >
              <ArrowDown className="w-4 h-4" />
            </Button>
          </div>
        )}

        {finalReport && (
          <div className="p-4 border-t bg-gradient-to-r from-green-50 to-blue-50">
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center gap-2">
                <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-green-800">Assessment Complete!</p>
              </div>
              <p className="text-xs text-muted-foreground">Your detailed health analysis is ready.</p>
              
              {/* Mobile - Show "Tap Next" guidance */}
              {isMobile && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-medium text-blue-900">👇 Tap Next Below to View Your Results</p>
                  <div className="flex flex-wrap gap-1.5 justify-center text-[10px] text-blue-700">
                    <span className="bg-white px-2 py-1 rounded">📊 Health Score</span>
                    <span className="bg-white px-2 py-1 rounded">📅 30-Day Plan</span>
                    <span className="bg-white px-2 py-1 rounded">⚠️ Risks</span>
                    <span className="bg-white px-2 py-1 rounded">📋 Numbers</span>
                    <span className="bg-white px-2 py-1 rounded">💚 Tips</span>
                  </div>
                </div>
              )}
              
              {/* Desktop - Show continue button */}
              {!isMobile && (
                <Button 
                  onClick={() => {
                    onClinicalAssessmentComplete?.(finalReport);
                    onNavigateNext?.();
                  }}
                  size="lg"
                  className="w-full sm:w-auto min-h-[52px] bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 text-base font-semibold rounded-lg shadow-lg"
                >
                  Continue to Your Results
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              )}
            </div>
          </div>
        )}

        {(!currentQuestion && !finalReport) && (
          <div className="p-3 sm:p-4 border-t bg-background/95 backdrop-blur-sm">
            <div className="flex flex-col sm:flex-row gap-2 items-end">
              <div className="flex-1 w-full">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={mode === 'clinical-triage' ? "Ask any follow-up questions..." : "Ask a question about your health analysis..."}
                  className="w-full p-3 text-sm border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary min-h-[48px] max-h-32"
                  rows={1}
                  disabled={isTyping}
                />
              </div>
              
              <Button 
                onClick={handleSendMessage}
                disabled={!input.trim() || isTyping}
                size="sm"
                className="w-full sm:w-auto min-h-[48px] px-6 text-base sm:text-sm"
              >
                <Send className="w-4 h-4 sm:mr-2" />
                <span className="sm:inline hidden">Send</span>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};