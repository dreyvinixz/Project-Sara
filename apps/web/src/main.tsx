import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
import './accessibility.css';

type SessionState = 'idle' | 'listening' | 'processing' | 'presenting' | 'error';

const stateCopy: Record<SessionState, { label: string; detail: string }> = {
  idle: { label: 'Pronta para explorar', detail: 'Escolha um ponto de partida ou escreva uma ideia.' },
  listening: { label: 'Ouvindo você', detail: 'A captura de áudio ainda é uma prévia de interface.' },
  processing: { label: 'Organizando possibilidades', detail: 'A SARA está preparando um espaço para sua ideia.' },
  presenting: { label: 'Espaço preparado', detail: 'Seu workspace está pronto para receber conteúdo.' },
  error: { label: 'Não foi possível concluir', detail: 'Tente novamente para voltar ao workspace.' },
};

function App() {
  const [session, setSession] = useState<SessionState>('idle');
  const [prompt, setPrompt] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const copy = stateCopy[session];

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

  function startSession() {
    if (!prompt.trim()) return;
    setSession('processing');
    window.setTimeout(() => setSession('presenting'), 650);
  }

  return <main className="app-shell">
    <header className="topbar">
      <a className="brand" href="#workspace" aria-label="SARA, início"><span className="brand-mark">s</span><span>SARA</span></a>
      <nav className="top-nav" aria-label="Navegação principal"><a className="nav-active" href="#workspace">Workspace</a><a href="#about">Sobre</a></nav>
      <div className="session-indicator" aria-live="polite"><span className={`state-dot state-${session}`} />{copy.label}</div>
    </header>

    <div className="workspace-layout" id="workspace">
      <section className="canvas" aria-labelledby="canvas-title">
        <div className="canvas-meta"><span>ESPAÇO DE TRABALHO</span><span className="canvas-index">01 <i /> NOVO ESPAÇO</span></div>
        <div className={`canvas-content canvas-${session}`}>
          <div className="canvas-orbit" aria-hidden="true"><span className="orbit-core" /><span className="orbit-ring ring-one" /><span className="orbit-ring ring-two" /><span className="orbit-point" /></div>
          <p className="canvas-kicker">UM ESPAÇO PARA SUAS IDEIAS</p>
          <h1 id="canvas-title">O que vamos<br /><em>explorar</em> hoje?</h1>
          <p className="canvas-description" aria-live="polite">{copy.detail}</p>
          {session === 'presenting' && <div className="idea-card"><span className="card-symbol">✳</span><div><strong>{prompt}</strong><small>IDEIA ADICIONADA AO WORKSPACE</small></div></div>}
          {session === 'error' && <button type="button" className="retry-button" onClick={() => setSession('idle')}>Tentar novamente</button>}
          <fieldset className="suggestions">
            <legend className="sr-only">Ideias para começar</legend>
            {['Organizar uma ideia', 'Explorar um tema', 'Criar algo novo'].map((idea) => <button type="button" key={idea} onClick={() => { setPrompt(idea); setSession('idle'); }}>{idea}<span aria-hidden="true">↗</span></button>)}
          </fieldset>
        </div>
        <div className="canvas-footer"><span><i className="tiny-dot" /> ESPAÇO PESSOAL</span><span>SESSÃO LOCAL</span></div>
      </section>

      <aside className="context-panel" aria-label="Painel de contexto">
        <div className="panel-heading"><span className="panel-icon">✳</span><div><p>SEU CONTEXTO</p><small>Um começo, no seu ritmo.</small></div></div>
        <div className="context-rule" />
        <p className="context-copy">A SARA pode ajudar a transformar uma ideia em caminhos visuais, áudio e descobertas conectadas.</p>
        <div className="context-block"><span className="field-label">SESSÃO</span><div className="session-row"><span className={`state-dot state-${session}`} />{copy.label}</div></div>
        <div className="context-block"><span className="field-label">ATALHO</span><div className="shortcut"><span>/</span><small>para começar a escrever</small></div></div>
        <div className="panel-note"><span>✧</span><p>Seu workspace se adapta àquilo que você quer descobrir.</p></div>
      </aside>
    </div>

    <form className="composer" onSubmit={(event) => { event.preventDefault(); startSession(); }}>
      <span className="composer-spark" aria-hidden="true">✳</span>
      <label className="sr-only" htmlFor="idea-input">Escreva uma ideia para explorar</label>
      <input ref={inputRef} id="idea-input" value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Uma ideia, pergunta ou algo que quer explorar..." />
      <span className="enter-hint">↵</span>
      <button type="submit" aria-label="Adicionar ideia ao workspace" disabled={!prompt.trim()}>Explorar <span aria-hidden="true">↗</span></button>
    </form>
    <footer className="page-footer"><span>SARA <i>·</i> ESPAÇO DE EXPLORAÇÃO</span><span>FEITO PARA PENSAR DIFERENTE</span></footer>
  </main>;
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element was not found');
createRoot(rootElement).render(<App />);
