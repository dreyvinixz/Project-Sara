import { useEffect, useState } from 'react';
import './renderer.css';
import { MarketOverview } from './MarketOverview';

type JsonRecord = Record<string, unknown>;
type SceneComponent = JsonRecord & { id: string; type: string };
type SceneAction = JsonRecord & { id: string; type: string };
type Scene = { title?: string; components: SceneComponent[]; actions: SceneAction[]; references: Array<{ id: string; title: string; url: string }> };
type ActionEvent = (actionId: string, componentId: string, value?: number | string | boolean) => void;

function TextCard({ component }: { component: SceneComponent }) {
  const title = component.title as string | undefined;
  return <article className="scene-text-card" aria-labelledby={`title-${component.id}`}>
    {title && <h2 id={`title-${component.id}`}>{title}</h2>}
    <p>{component.content as string}</p>
  </article>;
}

function TimeSeries({ component, onAction, actions, selectedEventId }: { component: SceneComponent; onAction: ActionEvent; actions: SceneAction[]; selectedEventId?: string }) {
  const points = component.points as Array<{ timestamp: string; value: number; eventId?: string }>;
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const coords = points.map((point, index) => ({
    x: 24 + (index * 352) / Math.max(points.length - 1, 1),
    y: 132 - ((point.value - min) / range) * 96,
    ...point,
  }));
  const selectedAction = actions.find((action) => action.type === 'select' && action.targetComponentId === component.id);
  const path = coords.map(({ x, y }, index) => `${index ? 'L' : 'M'} ${x} ${y}`).join(' ');

  return <article className="scene-card chart-card">
    <div className="scene-card-heading"><div><span className="scene-eyebrow">SÉRIE TEMPORAL · {component.dataStatus === 'demo' ? 'DEMONSTRAÇÃO' : 'VERIFICADO'}</span><h2>{component.title as string}</h2></div><span className="chart-unit">{component.unit as string | undefined}</span></div>
    {typeof component.description === 'string' && <p className="scene-card-description">{component.description}</p>}
    <svg className="series-chart" viewBox="0 0 400 160" role="img" aria-label={`Gráfico ${component.title}`}>
      <path className="chart-gridline" d="M 20 36 H 380 M 20 84 H 380 M 20 132 H 380" />
      <path className="chart-line" d={path} />
      {coords.map((point) => <circle
        key={`${component.id}:${point.timestamp}:${point.value}:${point.eventId ?? ''}`}
        className={`chart-point${point.eventId === selectedEventId ? ' is-selected' : ''}`}
        cx={point.x}
        cy={point.y}
        r="5"
      />)}
    </svg>
    <div className="chart-axis-labels"><span>{new Date(points[0].timestamp).toLocaleDateString('pt-BR')}</span><span>{new Date(points[points.length - 1].timestamp).toLocaleDateString('pt-BR')}</span></div>
    {selectedAction && <fieldset className="chart-event-actions">
      <legend>Eventos selecionáveis</legend>
      {coords.filter((point) => point.eventId).map((point) => <button
        type="button"
        key={`${component.id}:event:${point.eventId}`}
        aria-pressed={point.eventId === selectedEventId}
        onClick={() => onAction(selectedAction.id, component.id, point.eventId)}
      >Selecionar evento de {new Date(point.timestamp).toLocaleDateString('pt-BR')}</button>)}
    </fieldset>}
  </article>;
}

function NewsPanel({ component, references, actions, onAction }: { component: SceneComponent; references: Scene['references']; actions: SceneAction[]; onAction: ActionEvent }) {
  const items = component.items as Array<Record<string, string>>;
  return <article className="scene-card news-card">
    <div className="scene-card-heading"><div><span className="scene-eyebrow">{component.dataStatus === 'demo' ? 'CONTEXTO DEMONSTRATIVO' : 'ATUALIZADO'}</span><h2>{component.title as string}</h2></div></div>
    <div className="news-list">{items.map((item) => {
      const reference = references.find(({ id }) => id === item.referenceId);
      const navigate = actions.find((action) => action.type === 'navigate' && action.referenceId === reference?.id);
      return <article className="news-item" key={item.id}>
        <span className="news-date">{new Date(item.publishedAt).toLocaleDateString('pt-BR')}</span>
        <h3>{item.title}</h3><p>{item.summary}</p>
        <div className="news-source">{item.source}{reference && <a href={reference.url} target="_blank" rel="noopener noreferrer" onClick={(event) => { if (navigate) { event.preventDefault(); onAction(navigate.id, component.id, reference.id); } }}>Abrir fonte ↗</a>}</div>
      </article>;
    })}</div>
  </article>;
}

function NetworkScene({ component }: { component: SceneComponent }) {
  const layers = component.layers as number[];
  const weights = component.weights as number[][][];
  const description = component.description as string;
  const title = component.title as string | undefined;
  const preset = component.preset as string;
  const activation = component.activation as string;
  const width = 520;
  const height = 260;
  const nodeX = (layerIndex: number) => 48 + (layerIndex * (width - 96)) / Math.max(layers.length - 1, 1);
  const nodeY = (nodeIndex: number, count: number) => 36 + ((nodeIndex + 1) * (height - 72)) / (count + 1);
  const edges = layers.slice(0, -1).flatMap((sourceCount, step) =>
    Array.from({ length: sourceCount }, (_, source) =>
      Array.from({ length: layers[step + 1] }, (_, target) => {
        const weight = weights[step]?.[target]?.[source] ?? 0;
        return <line key={stableNodeKey(component.id, 'edge', step, source, target)} x1={nodeX(step)} y1={nodeY(source, sourceCount)} x2={nodeX(step + 1)} y2={nodeY(target, layers[step + 1])} className={weight >= 0 ? 'network-edge positive' : 'network-edge negative'} strokeWidth={Math.min(4, 0.8 + Math.abs(weight) * 2)} />;
      }),
    ),
  );
  const nodes = layers.flatMap((count, layer) => Array.from({ length: count }, (_, node) => <circle key={stableNodeKey(component.id, 'node', layer, node)} cx={nodeX(layer)} cy={nodeY(node, count)} r="12" className="network-node" />));
  const layerLabels = layers.map((_, layer) => <text key={stableNodeKey(component.id, 'layer', layer)} x={nodeX(layer)} y={height - 8} className="network-layer-label" textAnchor="middle">{layer === 0 ? 'ENTRADA' : layer === layers.length - 1 ? 'SAÍDA' : `CAMADA ${layer}`}</text>);
  return <article className="scene-card network-card">
    <div className="scene-card-heading"><div><span className="scene-eyebrow">CENA 3D PARAMETRIZADA · PREVIEW 2D</span><h2>{title ?? 'Rede neural feedforward'}</h2></div><span className="network-preset">{preset.replaceAll('_', ' ')}</span></div>
    <p className="scene-card-description">{description}</p>
    <svg className="network-diagram" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Diagrama de rede neural com camadas ${layers.join(', ')}`}>
      {edges}
      {nodes}
      {layerLabels}
    </svg>
    <p className="network-activation">Ativação: {activation}</p>
  </article>;
}

function Control({ component, actions, onAction }: { component: SceneComponent; actions: SceneAction[]; onAction: ActionEvent }) {
  const action = actions.find(({ id }) => id === component.actionId);
  const controlValue = component.value as number | undefined;
  const min = component.min as number | undefined;
  const max = component.max as number | undefined;
  const step = component.step as number | undefined;
  const label = component.label as string;
  const controlType = component.controlType as string;
  const [draft, setDraft] = useState(String(controlValue ?? min ?? 0));
  useEffect(() => setDraft(String(controlValue ?? min ?? 0)), [controlValue, min]);
  if (!action) return <p className="renderer-fallback" role="status">Controle indisponível: ação não encontrada.</p>;
  if (controlType === 'slider') return <div className="control-card">
    <label htmlFor={`control-${component.id}`}>{label}<output htmlFor={`control-${component.id}`}>{draft}</output></label>
    <input id={`control-${component.id}`} type="range" min={min} max={max} step={step} value={draft} onChange={(event) => setDraft(event.target.value)} onPointerUp={() => onAction(action.id, action.targetComponentId as string, Number(draft))} onKeyUp={() => onAction(action.id, action.targetComponentId as string, Number(draft))} />
  </div>;
  return <button type="button" className="scene-action-button" onClick={() => onAction(action.id, action.targetComponentId as string)}>{label}<span aria-hidden="true">↗</span></button>;
}

function stableNodeKey(componentId: string, kind: string, ...positions: number[]): string {
  return `${componentId}:${kind}:${positions.join(':')}`;
}

export function SceneRenderer({ scene, onAction, selectedEventId }: { scene: Scene; onAction: ActionEvent; selectedEventId?: string }) {
  const isMarketScene = scene.components.some((component) => component.type === 'time_series') && scene.components.some((component) => component.type === 'news_panel');
  if (isMarketScene) return <MarketOverview scene={scene} onAction={onAction} selectedEventId={selectedEventId} />;
  return <section className="scene-renderer" aria-label={scene.title ?? 'Cena interativa'}>
    {scene.title && <header className="rendered-scene-title"><span className="scene-eyebrow">SCENEDOCUMENT V0 · REVISÃO ATUAL</span><h1>{scene.title}</h1></header>}
    {scene.components.map((component) => {
      switch (component.type) {
        case 'text': return <TextCard key={component.id} component={component} />;
        case 'time_series': return <TimeSeries key={component.id} component={component} actions={scene.actions} onAction={onAction} selectedEventId={selectedEventId} />;
        case 'news_panel': return <NewsPanel key={component.id} component={component} references={scene.references} actions={scene.actions} onAction={onAction} />;
        case 'scene_3d': return component.preset === 'feedforward_network' ? <NetworkScene key={component.id} component={component} /> : <p key={component.id} className="renderer-fallback" role="status">Esta cena usa um preset que ainda não está disponível.</p>;
        case 'control': return <Control key={component.id} component={component} actions={scene.actions} onAction={onAction} />;
        default: return <article key={component.id} className="renderer-fallback" role="status"><strong>Componente não suportado</strong><p>O restante da cena continua disponível.</p></article>;
      }
    })}
  </section>;
}
