import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';

interface UseVoiceInputProps {
  onTranscript: (text: string) => void;
  onError?: (error: string) => void;
  continuousMode?: boolean;
  onSpeechEnd?: () => void;
}

export const useVoiceInput = ({ onTranscript, onError, continuousMode = false, onSpeechEnd }: UseVoiceInputProps) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);
  const continuousModeRef = useRef(continuousMode);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    continuousModeRef.current = continuousMode;
  }, [continuousMode]);

  useEffect(() => {
    // Check if browser supports Web Speech API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);

    // Initialize speech recognition
    const recognition = new SpeechRecognition();
    recognition.continuous = true; // Keep listening continuously
    recognition.interimResults = true; // Get interim results for better UX
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log('Voice recognition started');
      setIsListening(true);
      setIsSpeaking(false);
    };

    recognition.onresult = (event: any) => {
      const last = event.results.length - 1;
      const transcript = event.results[last][0].transcript;
      const isFinal = event.results[last].isFinal;
      
      console.log('Voice transcript:', transcript, 'Final:', isFinal);
      
      // Detect speech activity
      if (transcript.trim().length > 0) {
        setIsSpeaking(true);
      }
      
      // Only send final transcripts
      if (isFinal) {
        onTranscript(transcript);
        setIsSpeaking(false);
        
        // In continuous mode, trigger speech end callback
        if (continuousModeRef.current && onSpeechEnd) {
          onSpeechEnd();
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Voice recognition error:', event.error);
      setIsListening(false);
      
      let errorMessage = 'Voice recognition error';
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected. Please try again.';
          break;
        case 'audio-capture':
          errorMessage = 'Microphone not accessible. Please check permissions.';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone access denied. Please allow microphone access.';
          break;
        case 'network':
          errorMessage = 'Network error. Please check your connection.';
          break;
        default:
          errorMessage = `Voice recognition error: ${event.error}`;
      }
      
      if (onError) {
        onError(errorMessage);
      } else {
        toast.error(errorMessage);
      }
    };

    recognition.onend = () => {
      console.log('Voice recognition ended');
      setIsListening(false);
      setIsSpeaking(false);
      
      // Auto-restart in continuous mode
      if (continuousModeRef.current) {
        console.log('Restarting in continuous mode...');
        restartTimeoutRef.current = setTimeout(() => {
          try {
            recognitionRef.current?.start();
          } catch (error) {
            console.log('Recognition already started or error:', error);
          }
        }, 300); // Small delay before restart
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onTranscript, onError, onSpeechEnd]);

  const startListening = () => {
    if (!isSupported) {
      const message = 'Voice input is not supported in your browser. Please use Chrome, Edge, or Safari.';
      if (onError) {
        onError(message);
      } else {
        toast.error(message);
      }
      return;
    }

    if (isListening) {
      return;
    }

    try {
      recognitionRef.current?.start();
      toast.success('Listening... Speak now');
    } catch (error) {
      console.error('Error starting voice recognition:', error);
      toast.error('Failed to start voice input');
    }
  };

  const stopListening = () => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
    }
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  return {
    isListening,
    isSupported,
    isSpeaking,
    startListening,
    stopListening,
  };
};