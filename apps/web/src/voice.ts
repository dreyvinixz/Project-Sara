type SpeechResult = { isFinal: boolean; 0: { transcript: string } };
type SpeechEvent = Event & {
  resultIndex: number;
  results: ArrayLike<SpeechResult>;
};
export type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechEvent) => void) | null;
  onerror: ((event: Event & { error?: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};
type RecognitionConstructor = new () => Recognition;
type SpeechWindow = Window & {
  SpeechRecognition?: RecognitionConstructor;
  webkitSpeechRecognition?: RecognitionConstructor;
};

export function createRecognition(): Recognition | null {
  const browser = window as SpeechWindow;
  const Constructor =
    browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
  if (!Constructor) return null;
  const recognition = new Constructor();
  recognition.lang = 'pt-BR';
  recognition.interimResults = true;
  recognition.continuous = false;
  return recognition;
}

export function sceneNarration(scene: {
  title?: string;
  components: Array<Record<string, unknown>>;
}): string {
  const parts = [scene.title];
  for (const component of scene.components) {
    for (const key of [
      'text',
      'content',
      'title',
      'description',
      'summary',
      'label',
    ]) {
      const value = component[key];
      if (typeof value === 'string' && value.trim()) parts.push(value.trim());
    }
    const items = component.items;
    if (Array.isArray(items)) {
      for (const item of items) {
        if (!item || typeof item !== 'object') continue;
        const entry = item as Record<string, unknown>;
        for (const key of ['title', 'summary']) {
          const value = entry[key];
          if (typeof value === 'string' && value.trim())
            parts.push(value.trim());
        }
      }
    }
  }
  return [...new Set(parts.filter((part): part is string => Boolean(part)))]
    .join('. ')
    .slice(0, 3000);
}
