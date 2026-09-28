declare namespace JSX {
  interface IntrinsicElements {
    'elevenlabs-convai': {
      'agent-id': string;
      'dynamic-variables'?: string;
      placement?: 'top-left' | 'top' | 'top-right' | 'bottom-left' | 'bottom' | 'bottom-right';
      'override-prompt'?: string;
      'override-first-message'?: string;
    };
  }
}
