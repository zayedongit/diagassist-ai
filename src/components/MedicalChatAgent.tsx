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
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Generate session ID
  const generateSessionId = () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Initialize chat with analysis context
  useEffect(() => {
    if (analysisContext) {
      initializeChat();
    }
  }, [analysisContext]);

  const initializeChat = async () => {
    setIsTyping(true);
    try {
      if (mode === 'clinical-triage') {
        const response = await supabase.functions.invoke('clinical-triage-chat', {
          body: {
            isInitialization: true,
            analysisContext: analysisContext,
            demographics: demographics,
            abnormalPanels: abnormalPanels,
            sessionId: sessionId || generateSessionId()
          }
        });

        if (response.error) {
          console.error('Error initializing triage:', response.error);
          addMessage('agent', 'Sorry, there was an error starting the clinical assessment. Please try again.');
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
          setCurrentQuestion(data.question);
          addMessage('question', `${data.question.text}`, data.question);
        } else if (data.type === 'report') {
          setFinalReport(data.report);
          addMessage('report', 'Clinical assessment complete. Here is your detailed report:', null, data.report);
          // Call the callback to pass clinical assessment data back to parent
          if (onClinicalAssessmentComplete) {
            onClinicalAssessmentComplete(data.report);
          }
        }
      } else {
        // Original voiceflow mode
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
    
    // Add user message
    addMessage('user', userMessage);
    setIsTyping(true);

    try {
      if (mode === 'clinical-triage') {
        // For triage mode, send as text input (not common, mostly used for follow-up questions)
        const response = await supabase.functions.invoke('clinical-triage-chat', {
          body: {
            message: userMessage,
            sessionId: sessionId,
            state: triageState
          }
        });

        if (response.error) {
          console.error('Error sending triage message:', response.error);
          console.error('Full response:', response);
          addMessage('agent', `Sorry, I encountered an error: ${response.error.message || 'Unknown error'}. Please try again.`);
          return;
        }

        // Check if the response data contains an error
        if (response.data?.type === 'error') {
          console.error('Edge function error:', response.data);
          addMessage('agent', `Sorry, I encountered an error: ${response.data.error || 'Edge Function returned a non-2xx status code'}. Please try again.`);
          return;
        }

        const data = response.data;
        handleTriageResponse(data);
      } else {
        // Original voiceflow mode
        const response = await supabase.functions.invoke('voiceflow-chat', {
          body: {
            message: userMessage,
            sessionId: sessionId
          }
        });

        if (response.error) {
          console.error('Error sending message:', response.error);
          addMessage('agent', 'Sorry, I encountered an error. Please try again.');
          return;
        }

        const data = response.data;
        if (data.botResponse) {
          addMessage('agent', data.botResponse);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      addMessage('agent', 'Sorry, I encountered an error. Please try again.');
    } finally {
      setIsTyping(false);
    }
  };

  const handleTriageResponse = (data: any) => {
    if (data.state) {
      setTriageState(data.state);
    }

    if (data.type === 'question') {
      // Check if this question has already been asked
      if (!askedQuestions.has(data.question.id)) {
        setCurrentQuestion(data.question);
        setSelectedAnswers({});
        setTextInput('');
        setAskedQuestions(prev => new Set(prev).add(data.question.id));
        addMessage('question', `${data.question.text}`, data.question);
      }
    } else if (data.type === 'report') {
      setFinalReport(data.report);
      setCurrentQuestion(null);
      addMessage('report', 'Clinical assessment complete. Here is your detailed report:', null, data.report);
      // Call the callback to pass clinical assessment data back to parent
      if (onClinicalAssessmentComplete) {
        onClinicalAssessmentComplete(data.report);
      }
    }
  };

  const handleQuestionSubmit = async () => {
    if (!currentQuestion) return;
    
    let submissionData;
    let displayText;
    
    if (currentQuestion.type === 'text') {
      if (!textInput.trim()) return;
      submissionData = { [currentQuestion.id]: textInput.trim() };
      displayText = textInput.trim();
    } else {
      if (Object.keys(selectedAnswers).length === 0) return;
      submissionData = selectedAnswers;
      displayText = currentQuestion.type === 'checkbox' 
        ? Object.values(selectedAnswers).filter(Boolean).join(', ')
        : selectedAnswers[Object.keys(selectedAnswers)[0]];
    }

    setIsTyping(true);
    
    // Add user's selection as a message
    addMessage('user', displayText);

    try {
      const response = await supabase.functions.invoke('clinical-triage-chat', {
        body: {
          selections: submissionData,
          sessionId: sessionId,
          state: triageState
        }
      });

      if (response.error) {
        console.error('Error submitting question response:', response.error);
        console.error('Full error details:', JSON.stringify(response.error, null, 2));
        addMessage('agent', `Sorry, I encountered an error: ${response.error.message || 'Unknown error'}. Please try again.`);
        return;
      }

      // Check if the response data contains an error
      if (response.data?.type === 'error') {
        console.error('Edge function error:', response.data);
        addMessage('agent', `Sorry, I encountered an error: ${response.data.error || 'Edge Function returned a non-2xx status code'}. Please try again.`);
        return;
      }

      const data = response.data;
      handleTriageResponse(data);
    } catch (error) {
      console.error('Error submitting question response:', error);
      addMessage('agent', 'Sorry, I encountered an error. Please try again.');
    } finally {
      setIsTyping(false);
    }
  };

  const handleForceReport = async () => {
    if (!sessionId || !triageState) return;

    setIsTyping(true);
    addMessage('user', 'Generate my clinical report now');

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
        addMessage('agent', 'Sorry, I encountered an error generating the report. Please try again.');
        return;
      }

      // Check if the response data contains an error
      if (response.data?.type === 'error') {
        console.error('Edge function error:', response.data);
        addMessage('agent', `Sorry, I encountered an error: ${response.data.error || 'Edge Function returned a non-2xx status code'}. Please try again.`);
        return;
      }

      const data = response.data;
      handleTriageResponse(data);
    } catch (error) {
      console.error('Error forcing report:', error);
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
      const response = await supabase.functions.invoke('clinical-triage-chat', {
        body: {
          selections: { [currentQuestion.id]: 'skipped' },
          sessionId: sessionId,
          state: triageState
        }
      });

      if (response.error) {
        console.error('Error skipping question:', response.error);
        addMessage('agent', 'Sorry, I encountered an error. Please try again.');
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

  // Auto-scroll to bottom when new messages arrive (only if enabled)
  useEffect(() => {
    if (isAutoScrollEnabled && scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages, isTyping, isAutoScrollEnabled]);

  // Handle scroll to detect if user is at bottom
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isAtBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 50;
    setShowJumpButton(!isAtBottom);
    setIsAutoScrollEnabled(isAtBottom);
  };

  // Jump to latest message
  const jumpToLatest = () => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
      setShowJumpButton(false);
      setIsAutoScrollEnabled(true);
    }
  };

  return (
    <Card className={`border-primary/20 bg-gradient-to-r from-primary/5 to-blue-50 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg text-primary">
              Clinical Assessment Chat Bot
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800 border-yellow-200">
                AI-Powered
              </Badge>
              <p className="text-xs text-muted-foreground">Get personalized health insights</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 relative">
        <ScrollArea 
          className={`${isMobile ? 'h-[60vh]' : 'h-96'} px-6`} 
          ref={scrollAreaRef}
          onScrollCapture={handleScroll}
        >
          <div className="space-y-4 py-4">
            {messages.map((message) => (
              <div key={message.id} className="space-y-4">
                <div className={`flex items-start gap-3 ${message.type === 'user' ? 'justify-end' : ''}`}>
                  {message.type !== 'user' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-lg p-3 ${
                    message.type === 'user' 
                      ? 'bg-primary text-primary-foreground ml-auto' 
                      : 'bg-muted'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                  {message.type === 'user' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-secondary-foreground" />
                    </div>
                  )}
                </div>

                {/* Render question options */}
                {message.type === 'question' && message.question && message.id === messages[messages.length - 1]?.id && (
                  <div className="ml-11 space-y-3">
                    {message.question.type === 'text' && (
                      <div className="space-y-3">
                        <Textarea
                          value={textInput}
                          onChange={(e) => setTextInput(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleQuestionSubmit();
                            }
                          }}
                          placeholder="Please provide your detailed response..."
                          className="min-h-[80px] resize-none"
                        />
                        <div className="flex gap-2">
                          <Button 
                            onClick={handleQuestionSubmit}
                            disabled={!textInput.trim() || isTyping}
                            size="sm"
                          >
                            Submit Answer
                          </Button>
                          <Button 
                            onClick={handleSkipQuestion}
                            variant="outline"
                            size="sm"
                            disabled={isTyping}
                          >
                            Skip Question
                          </Button>
                        </div>
                      </div>
                    )}

                    {message.question.type === 'radio' && (
                      <RadioGroup
                        value={selectedAnswers[message.question.id] || ''}
                        onValueChange={(value) => {
                          if (value === "none_of_the_above") {
                            setSelectedAnswers({ [message.question!.id]: "None of the above" });
                          } else {
                            const option = message.question!.options?.find(opt => opt.value === value);
                            setSelectedAnswers({ [message.question!.id]: option?.text || value });
                          }
                        }}
                      >
                        {message.question.options?.map((option) => (
                          <div key={option.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="relative">
                              <RadioGroupItem 
                                value={option.value} 
                                id={option.id}
                                className="border-2 border-muted-foreground data-[state=checked]:border-blue-500 data-[state=checked]:bg-blue-500 w-4 h-4"
                              />
                              {selectedAnswers[message.question.id] === (option?.text || option.value) && (
                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full" />
                              )}
                            </div>
                            <Label htmlFor={option.id} className="text-sm cursor-pointer flex-1">
                              {option.text}
                            </Label>
                          </div>
                        ))}
                        {/* Always add "None of the above" option */}
                        <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="relative">
                            <RadioGroupItem 
                              value="none_of_the_above" 
                              id="none_of_the_above"
                              className="border-2 border-muted-foreground data-[state=checked]:border-blue-500 data-[state=checked]:bg-blue-500 w-4 h-4"
                            />
                            {selectedAnswers[message.question.id] === "None of the above" && (
                              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full" />
                            )}
                          </div>
                          <Label htmlFor="none_of_the_above" className="text-sm cursor-pointer flex-1">
                            None of the above
                          </Label>
                        </div>
                      </RadioGroup>
                    )}

                    {message.question.type === 'checkbox' && (
                      <div className="space-y-2">
                        {message.question.options?.map((option) => (
                          <div key={option.id} className="flex items-center space-x-2">
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
                            <Label htmlFor={option.id} className="text-sm cursor-pointer">
                              {option.text}
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2 mt-4">
                      <Button 
                        onClick={handleQuestionSubmit}
                        disabled={
                          message.question.type === 'text' ? !textInput.trim() : 
                          Object.keys(selectedAnswers).length === 0
                        }
                        size="sm"
                        className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                      >
                        Submit Answer
                      </Button>
                      
                      <Button 
                        onClick={handleSkipQuestion}
                        variant="outline"
                        size="sm"
                        className="px-4 py-2"
                      >
                        Skip
                      </Button>
                      
                      {triageState?.questionCount >= 3 && (
                        <Button 
                          onClick={handleForceReport}
                          variant="secondary"
                          size="sm"
                          className="px-4 py-2"
                        >
                          Generate Report Now
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Clinical report is now displayed in dedicated sections below the chat */}
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary" />
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

        {/* Jump to Latest Button */}
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

        {/* Sticky Input Area - Only show if not in question mode or if final report is not shown */}
        {(!currentQuestion && !finalReport) && (
          <div className={`p-4 border-t bg-background/95 backdrop-blur-sm ${isMobile ? 'sticky bottom-0' : ''}`}>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={mode === 'clinical-triage' ? "Ask any follow-up questions..." : "Ask a question about your health analysis..."}
                  className="w-full p-3 text-sm border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary min-h-[44px] max-h-32"
                  rows={1}
                  disabled={isTyping}
                />
              </div>
              <Button 
                onClick={handleSendMessage}
                disabled={!input.trim() || isTyping}
                size="sm"
                className="h-11 px-4"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Disclaimer */}
            <p className="text-xs text-muted-foreground mt-3 text-center">
              This AI assistant provides general health information only. Always consult healthcare professionals for medical advice.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};