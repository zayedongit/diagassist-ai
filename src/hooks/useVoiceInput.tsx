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
  const [audioLevel, setAudioLevel] = useState(0);
  const [isAboveThreshold, setIsAboveThreshold] = useState(false);
  const recognitionRef = useRef<any>(null);
  const continuousModeRef = useRef(continuousMode);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  const NOISE_THRESHOLD = 0.02; // Adjust this value (0-1) for noise sensitivity

  useEffect(() => {
    continuousModeRef.current = continuousMode;
  }, [continuousMode]);

  // Setup audio level monitoring
  const setupAudioMonitoring = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      
      micStreamRef.current = stream;
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      analyserRef.current.fftSize = 512;
      analyserRef.current.smoothingTimeConstant = 0.8;
      
      monitorAudioLevel();
    } catch (error) {
      console.error('Error setting up audio monitoring:', error);
    }
  };

  const monitorAudioLevel = () => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const checkLevel = () => {
      if (!analyserRef.current) return;

      analyserRef.current.getByteFrequencyData(dataArray);
      
      // Calculate average volume
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength / 255; // Normalize to 0-1
      
      setAudioLevel(average);
      
      // Detect if above noise threshold
      const aboveThreshold = average > NOISE_THRESHOLD;
      setIsAboveThreshold(aboveThreshold);
      
      animationFrameRef.current = requestAnimationFrame(checkLevel);
    };

    checkLevel();
  };

  const stopAudioMonitoring = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    analyserRef.current = null;
    setAudioLevel(0);
    setIsAboveThreshold(false);
  };

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

  const startListening = async () => {
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
      // Setup audio monitoring first
      await setupAudioMonitoring();
      
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
    stopAudioMonitoring();
  };

  return {
    isListening,
    isSupported,
    isSpeaking,
    audioLevel,
    isAboveThreshold,
    startListening,
    stopListening,
  };
};