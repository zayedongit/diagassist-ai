import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle } from "lucide-react";
import { useEffect, useRef } from "react";

// Declare custom element type
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'elevenlabs-convai': {
        'agent-id': string;
        'dynamic-variables'?: string;
        'override-prompt'?: string;
        'override-first-message'?: string;
      };
    }
  }
}

export const MedicalAiAssistant = () => {
  return (
    <Card className="shadow-lg border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardContent className="p-6">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="p-3 bg-primary/20 rounded-xl shadow-md">
              <MessageCircle className="w-8 h-8 text-primary" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold mb-2 text-persian-blue flex items-center">
              🎤 Talk to AI Medical Assistant
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Have questions about your report? Our AI assistant is here to help explain your results in simple terms.
            </p>
            <div className="bg-white rounded-lg p-4 border border-border">
              <elevenlabs-convai agent-id="agent_7101k4sw7k0tfmpb2cxkrem0kna2"></elevenlabs-convai>
            </div>
            <p className="text-xs text-muted-foreground mt-3 italic">
              💡 This AI assistant is for educational purposes only. Always consult your doctor for medical decisions.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
