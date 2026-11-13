import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { validateSceneDocument, type SceneDocument } from '@sara/contracts';
import { SceneRenderer } from './SceneRenderer';
import { createRecognition, sceneNarration, type Recognition } from './voice';
import './voice.css';
import './style.css';
import './accessibility.css';

type SessionState =
  | 'idle'
  | 'connecting'
  | 'processing'
  | 'presenting'
  | 'error';
type Scene = SceneDocument;
type ApiResult = {
  error?: { message?: string };
  sessionId?: string;
  scene?: unknown;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';
const stateCopy: Record<SessionState, { label: string; detail: string }> = {
  idle: {
    label: 'Pronta para explorar',
    detail: 'Escolha um ponto de partida ou escreva uma ideia.',
  },
  connecting: {
    label: 'Conectando',
    detail: 'Abrindo seu espaço de trabalho.',
  },
  processing: {
    label: 'Organizando possibilidades',
    detail: 'A SARA está preparando um espaço para sua ideia.',
  },
  presenting: {
    label: 'Espaço atualizado',
    detail: 'Sua cena interativa está pronta.',
  },
  error: {
    label: 'Não foi possível concluir',
    detail: 'Confira se a API está disponível e tente novamente.',
  },
};

async function requestApi(
  path: string,
  init?: RequestInit,
): Promise<ApiResult> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const payload: ApiResult = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      payload.error?.message ?? 'A solicitação não pôde ser concluída.',
    );
  return payload;
}

function App() {
  const [sessionState, setSessionState] = useState<SessionState>('connecting');
  const [sessionId, setSessionId] = useState('');
  const [scene, setScene] = useState<Scene | null>(null);
  const [prompt, setPrompt] = useState('');
  const [apiError, setApiError] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [listening, setListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('');
  const [voiceError, setVoiceError] = useState('');
  const [narrating, setNarrating] = useState(false);
  const recognitionRef = useRef<Recognition | null>(null);
  const voiceTextRef = useRef('');
  const submitVoiceRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const sessionRef = useRef('');
  const sceneRef = useRef<Scene | null>(null);
  const actionQueue = useRef<Promise<void>>(Promise.resolve());
  const copy = stateCopy[sessionState];

  useEffect(() => {
    const stopAudio = () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
      window.speechSynthesis?.cancel();
    };
    window.addEventListener('pagehide', stopAudio);
    return () => {
      window.removeEventListener('pagehide', stopAudio);
      stopAudio();
    };
  }, []);

  function installScene(candidate: unknown) {
    const validation = validateSceneDocument(candidate);
    if (!validation.valid)
      throw new Error(
        'A API retornou uma cena incompatível com SceneDocument v0.',
      );
    const nextScene = candidate as Scene;
    sceneRef.current = nextScene;
    setScene(nextScene);
  }

  useEffect(() => {
    let active = true;
    requestApi('/sessions', { method: 'POST' })
      .then((result) => {
        if (!active) return;
        if (!result.sessionId)
          throw new Error('A API não retornou uma sessão válida.');
        sessionRef.current = result.sessionId;
        setSessionId(result.sessionId);
        setSessionState('idle');
      })
      .catch((error: unknown) => {
        if (!active) return;
        setApiError(
          error instanceof Error ? error.message : stateCopy.error.detail,
        );
        setSessionState('error');
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === '/' && !(event.target instanceof HTMLInputElement)) {
        event.preventDefault();
        inputRef.current?.focus();
      }
      if (event.key === 'Escape') inputRef.current?.blur();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  async function startIntent(intent = prompt) {
    submitVoiceRef.current = false;
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setListening(false);
    window.speechSynthesis?.cancel();
    setNarrating(false);
    const activeSession = sessionRef.current;
    if (!activeSession || !intent.trim()) return;
    setApiError('');
    setSessionState('processing');
    try {
      const result = await requestApi(`/sessions/${activeSession}/intents`, {
        method: 'POST',
        body: JSON.stringify({ intent: intent.trim() }),
      });
      setSelectedEventId('');
      installScene(result.scene);
      setSessionState('presenting');
    } catch (error) {
      setApiError(
        error instanceof Error ? error.message : stateCopy.error.detail,
      );
      setSessionState('error');
    }
  }

  function startListening() {
    window.speechSynthesis?.cancel();
    setNarrating(false);
    const recognition = createRecognition();
    if (!recognition) {
      setVoiceError(
        'Ditado por voz não está disponível neste navegador. Você ainda pode escrever sua ideia.',
      );
      return;
    }
    setVoiceError('');
    setVoiceStatus(
      'O navegador pode solicitar permissão para usar o microfone.',
    );
    voiceTextRef.current = '';
    submitVoiceRef.current = true;
    recognition.onresult = (event) => {
      let interim = '';
      let finalText = '';
      for (
        let index = event.resultIndex;
        index < event.results.length;
        index += 1
      ) {
        const result = event.results[index];
        if (result.isFinal) finalText += result[0].transcript;
        else interim += result[0].transcript;
      }
      if (finalText)
        voiceTextRef.current = `${voiceTextRef.current} ${finalText}`.trim();
      const caption = `${voiceTextRef.current} ${interim}`.trim();
      setPrompt(caption);
      setVoiceStatus(
        caption ? `Transcrição: ${caption}` : 'Estou ouvindo. Fale sua ideia.',
      );
    };
    recognition.onerror = (event) => {
      submitVoiceRef.current = false;
      setListening(false);
      const reason =
        event.error === 'not-allowed' || event.error === 'service-not-allowed'
          ? 'Permissão de microfone negada. Você pode escrever sua ideia.'
          : event.error === 'audio-capture'
            ? 'Não foi possível acessar um microfone. Você pode escrever sua ideia.'
            : 'O ditado foi interrompido. Você pode tentar novamente ou escrever sua ideia.';
      setVoiceError(reason);
      setVoiceStatus('');
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
      const phrase = voiceTextRef.current.trim();
      if (submitVoiceRef.current && phrase) {
        setPrompt(phrase);
        setVoiceStatus('Enviando a transcrição para a SARA.');
        void startIntent(phrase);
      } else if (submitVoiceRef.current) {
        setVoiceStatus(
          'Nenhuma fala reconhecida. Você pode escrever sua ideia.',
        );
      }
      submitVoiceRef.current = false;
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
      setVoiceStatus('Estou ouvindo. Fale sua ideia.');
    } catch {
      recognitionRef.current = null;
      submitVoiceRef.current = false;
      setVoiceError(
        'Não foi possível iniciar o microfone. Você pode escrever sua ideia.',
      );
      setVoiceStatus('');
    }
  }

  function stopListening() {
    submitVoiceRef.current = true;
    recognitionRef.current?.stop();
  }

  function narrateScene() {
    if (!scene) return;
    if (!('speechSynthesis' in window)) {
      setVoiceError('Leitura em voz alta não está disponível neste navegador.');
      return;
    }
    const text = sceneNarration(scene);
    if (!text) {
      setVoiceError('Esta cena ainda não tem texto para narrar.');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.onstart = () => setNarrating(true);
    utterance.onend = () => setNarrating(false);
    utterance.onerror = () => {
      setNarrating(false);
      setVoiceError('Não foi possível reproduzir a narração.');
    };
    setVoiceError('');
    window.speechSynthesis.speak(utterance);
  }

  function cancelNarration() {
    window.speechSynthesis?.cancel();
    setNarrating(false);
  }

  function sendAction(
    actionId: string,
    componentId: string,
    value?: number | string | boolean,
  ) {
    if (typeof value === 'string') setSelectedEventId(value);
    const displayedScene = sceneRef.current;
    const displayedAction = displayedScene?.actions.find(
      (action) => action.id === actionId,
    );
    if (displayedScene && displayedAction?.type === 'navigate') {
      const reference = displayedScene.references.find(
        (item) => item.id === displayedAction.referenceId,
      );
      if (reference)
        window.open(reference.url, '_blank', 'noopener,noreferrer');
    }
    actionQueue.current = actionQueue.current
      .then(async () => {
        const activeSession = sessionRef.current;
        const currentScene = sceneRef.current;
        if (!activeSession || !currentScene) return;
        setApiError('');
        try {
          const result = await requestApi(
            `/sessions/${activeSession}/actions`,
            {
              method: 'POST',
              body: JSON.stringify({
                schemaVersion: '0.0',
                type: 'user_action',
                sessionId: activeSession,
                sceneRevision: currentScene.revision,
                actionId,
                componentId,
                ...(value === undefined ? {} : { value }),
              }),
            },
          );
          installScene(result.scene);
          setSessionState('presenting');
        } catch (error) {
          setApiError(
            error instanceof Error
              ? error.message
              : 'Não foi possível enviar a interação.',
          );
          setSessionState('error');
        }
      })
      .catch(() => {
        setApiError('Não foi possível enviar a interação.');
      });
  }

  const isBusy = sessionState === 'connecting' || sessionState === 'processing';
  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#workspace" aria-label="SARA, início">
          <span className="brand-mark">s</span>
          <span>SARA</span>
        </a>
        <nav className="top-nav" aria-label="Navegação principal">
          <a className="nav-active" href="#workspace">
            Workspace
          </a>
          <a href="#about">Sobre</a>
        </nav>
        <div className="session-indicator" aria-live="polite">
          <span className={`state-dot state-${sessionState}`} />
          {copy.label}
        </div>
      </header>

      <div className="workspace-layout" id="workspace">
        <section className="canvas" aria-label="Workspace de cenas">
          <div className="canvas-meta">
            <span>ESPAÇO DE TRABALHO</span>
            <span className="canvas-index">
              {scene ? `REVISÃO ${scene.revision}` : 'NOVO ESPAÇO'}
            </span>
          </div>
          <div className={`canvas-content canvas-${sessionState}`}>
            {scene && (
              <div className="voice-tools">
                <button
                  type="button"
                  onClick={narrateScene}
                  disabled={narrating}
                >
                  Ouvir explicação
                </button>
                {narrating && (
                  <button type="button" onClick={cancelNarration}>
                    Interromper áudio
                  </button>
                )}
              </div>
            )}
            {scene ? (
              <>
                <SceneRenderer
                  scene={scene}
                  onAction={sendAction}
                  selectedEventId={selectedEventId}
                />
                {apiError && (
                  <p className="api-error scene-error" role="alert">
                    {apiError}
                  </p>
                )}
              </>
            ) : (
              <>
                <div className="canvas-orbit" aria-hidden="true">
                  <span className="orbit-core" />
                  <span className="orbit-ring ring-one" />
                  <span className="orbit-ring ring-two" />
                  <span className="orbit-point" />
                </div>
                <p className="canvas-kicker">UM ESPAÇO PARA SUAS IDEIAS</p>
                <h1>
                  O que vamos
                  <br />
                  <em>explorar</em> hoje?
                </h1>
                <p className="canvas-description" aria-live="polite">
                  {apiError || copy.detail}
                </p>
                {sessionState === 'error' && (
                  <button
                    type="button"
                    className="retry-button"
                    onClick={() =>
                      sessionId ? startIntent() : window.location.reload()
                    }
                  >
                    Tentar novamente
                  </button>
                )}
                <fieldset className="suggestions">
                  <legend className="sr-only">Ideias para começar</legend>
                  {[
                    'Organizar uma ideia',
                    'Explorar o mercado',
                    'Aprender rede neural',
                  ].map((idea) => (
                    <button
                      type="button"
                      key={idea}
                      disabled={!sessionId || isBusy}
                      onClick={() => {
                        setPrompt(idea);
                        void startIntent(idea);
                      }}
                    >
                      {idea}
                      <span aria-hidden="true">↗</span>
                    </button>
                  ))}
                </fieldset>
              </>
            )}
          </div>
          <div className="canvas-footer">
            <span>
              <i className="tiny-dot" />
              {sessionId ? `SESSÃO ${sessionId.slice(0, 8)}` : 'SESSÃO LOCAL'}
            </span>
            <span>SEM EXECUÇÃO DE CÓDIGO EXTERNO</span>
          </div>
        </section>

        <aside className="context-panel" aria-label="Painel de contexto">
          <div className="panel-heading">
            <span className="panel-icon">✳</span>
            <div>
              <p>SEU CONTEXTO</p>
              <small>
                {scene
                  ? 'Cena interativa da sessão atual.'
                  : 'Um começo, no seu ritmo.'}
              </small>
            </div>
          </div>
          <div className="context-rule" />
          <p className="context-copy">
            {scene
              ? 'Selecione pontos, ajuste controles e abra referências. Cada interação é enviada como evento estruturado.'
              : 'A SARA transforma uma intenção em caminhos visuais, áudio e descobertas conectadas.'}
          </p>
          <div className="context-block">
            <span className="field-label">SESSÃO</span>
            <div className="session-row">
              <span className={`state-dot state-${sessionState}`} />
              {copy.label}
            </div>
          </div>
          <div className="context-block">
            <span className="field-label">ATALHO</span>
            <div className="shortcut">
              <span>/</span>
              <small>para começar a escrever</small>
            </div>
          </div>
          {apiError && (
            <p className="api-error" role="alert">
              {apiError}
            </p>
          )}
          <div className="panel-note">
            <span>✧</span>
            <p>
              O conteúdo da cena é dado estruturado validado, nunca código
              executável.
            </p>
          </div>
        </aside>
      </div>

      <form
        className="composer"
        onSubmit={(event) => {
          event.preventDefault();
          void startIntent();
        }}
      >
        <span className="composer-spark" aria-hidden="true">
          ✳
        </span>
        <label className="sr-only" htmlFor="idea-input">
          Escreva uma ideia para explorar
        </label>
        <input
          ref={inputRef}
          id="idea-input"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Uma ideia, pergunta ou algo que quer explorar..."
          disabled={!sessionId || isBusy}
        />
        <button
          className="voice-button"
          type="button"
          onClick={listening ? stopListening : startListening}
          disabled={!sessionId || isBusy}
          aria-pressed={listening}
        >
          {listening ? 'Parar microfone' : 'Falar'}
        </button>
        <span className="enter-hint">↵</span>
        <button
          type="submit"
          aria-label="Adicionar ideia ao workspace"
          disabled={!sessionId || isBusy || !prompt.trim()}
        >
          Explorar <span aria-hidden="true">↗</span>
        </button>
      </form>
      <p className="voice-feedback" aria-live="polite">
        {voiceError || voiceStatus}
      </p>
      <footer className="page-footer">
        <span>
          SARA <i>·</i> ESPAÇO DE EXPLORAÇÃO
        </span>
        <span>FEITO PARA PENSAR DIFERENTE</span>
      </footer>
    </main>
  );
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element was not found');
createRoot(rootElement).render(<App />);
