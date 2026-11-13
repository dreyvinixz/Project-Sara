import React from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

function App() {
  return <main className="shell">
    <div className="orb" aria-hidden="true"><span /></div>
    <p className="eyebrow">SARA · SISTEMA ADAPTATIVO</p>
    <h1>Uma nova forma<br />de pensar com IA.</h1>
    <p className="intro">Uma interface multimodal para explorar ideias com áudio, visualizações interativas e agentes especializados.</p>
    <div className="status"><span className="pulse" /> Fundação da SARA está pronta para começar.</div>
    <footer>SPRINT 01 <span>·</span> EXPERIÊNCIA EM CONSTRUÇÃO</footer>
  </main>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
