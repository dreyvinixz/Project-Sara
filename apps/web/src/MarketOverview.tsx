import { useState } from 'react';
import type { SceneDocument } from '@sara/contracts';
import {
  eventsInPeriod,
  isOutdated,
  PERIODS,
  pointsForPeriod,
  summarizePeriod,
} from './marketData.mjs';
import type {
  MarketEvent,
  MarketPeriod,
  MarketPoint,
} from './marketData.mjs';
import './market-overview.css';

type SceneComponent = SceneDocument['components'][number];
type ActionEvent = (
  actionId: string,
  componentId: string,
  value?: number | string | boolean,
) => void;

type Props = {
  scene: Pick<SceneDocument, 'title' | 'components' | 'actions' | 'references'>;
  onAction: ActionEvent;
  selectedEventId?: string;
};

const formatNumber = (value: number) =>
  value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value));
}

function Plot({
  points,
  selectedEventId,
  title,
}: {
  points: MarketPoint[];
  selectedEventId?: string;
  title: string;
}) {
  if (!points.length) {
    return (
      <p className="market-empty" role="status">
        Não existem observações válidas neste intervalo.
      </p>
    );
  }

  const values = points.map((point) => point.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const padding = Math.max((maxValue - minValue) * 0.16, 0.5);
  const min = minValue - padding;
  const max = maxValue + padding;
  const width = 760;
  const top = 32;
  const plotHeight = 190;
  const left = 42;
  const right = 20;
  const plotWidth = width - left - right;
  const dots = points.map((point, index) => ({
    ...point,
    x: left + (index * plotWidth) / Math.max(points.length - 1, 1),
    y: top + ((max - point.value) / (max - min)) * plotHeight,
  }));
  const path = dots.map((point, index) =>
    `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`,
  ).join(' ');
  const area = `${path} L ${dots.at(-1)?.x} ${top + plotHeight} L ${left} ${top + plotHeight} Z`;

  return (
    <div className="market-plot-container">
      <svg
        className="market-plot"
        viewBox="0 0 760 270"
        role="img"
        aria-label={`${title}. De ${formatNumber(minValue)} a ${formatNumber(maxValue)} pontos simulados.`}
      >
        <defs>
          <linearGradient id="market-area-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8bc8a2" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#8bc8a2" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((fraction) => (
          <g key={fraction}>
            <line
              className="market-grid"
              x1={left}
              x2={width - right}
              y1={top + fraction * plotHeight}
              y2={top + fraction * plotHeight}
            />
            <text
              className="market-tick"
              x={left - 8}
              y={top + fraction * plotHeight + 4}
              textAnchor="end"
            >
              {formatNumber(max - fraction * (max - min))}
            </text>
          </g>
        ))}
        <path d={area} fill="url(#market-area-gradient)" />
        <path d={path} className="market-trend" />
        {dots.filter((point) => point.eventId).map((point) => (
          <g key={point.eventId}>
            <circle
              className={point.eventId === selectedEventId
                ? 'market-event-dot selected'
                : 'market-event-dot'}
              cx={point.x}
              cy={point.y}
              r={point.eventId === selectedEventId ? 7 : 5}
            />
          </g>
        ))}
      </svg>
      <div className="market-chart-dates">
        <span>{formatDate(points[0].timestamp)}</span>
        <span>{formatDate(points.at(-1)?.timestamp ?? points[0].timestamp)}</span>
      </div>
    </div>
  );
}

export function MarketOverview({
  scene,
  onAction,
  selectedEventId,
}: Props) {
  const [period, setPeriod] = useState<MarketPeriod>('week');
  const series = scene.components.find((item) =>
    item.type === 'time_series',
  ) as SceneComponent | undefined;
  const news = scene.components.find((item) =>
    item.type === 'news_panel',
  ) as SceneComponent | undefined;

  if (!series || !news) {
    return (
      <p className="market-empty" role="alert">
        O cenário de mercado está indisponível. Tente novamente.
      </p>
    );
  }

  const allPoints = series.points as MarketPoint[];
  const allEvents = news.items as MarketEvent[];
  const points = pointsForPeriod(allPoints, period);
  const visibleEvents = eventsInPeriod(allEvents, points);
  const summary = summarizePeriod(points);
  const source = typeof series.source === 'string'
    ? series.source
    : 'Fixture local SARA — valores inventados';
  const asOf = typeof series.asOf === 'string' ? series.asOf : undefined;
  const demo = series.dataStatus === 'demo';
  const stale = !demo && isOutdated(asOf);
  const selection = visibleEvents.find((item) => item.id === selectedEventId);
  const selectAction = scene.actions.find((action) =>
    action.type === 'select' &&
    action.targetComponentId === series.id,
  );

  const seriesId = series.id;
  function selectEvent(item: MarketEvent) {
    if (selectAction) onAction(selectAction.id, seriesId, item.id);
  }

  const narrative = summary.change === null
    ? 'Não há dados suficientes para calcular a variação do intervalo.'
    : `No período selecionado, o índice sintético registrou ${summary.direction} de ${Math.abs(summary.change).toFixed(2).replace('.', ',')}% entre a primeira e a última observação. Este é um cálculo ilustrativo, sem relação com preços reais.`;

  return (
    <section className="market-dashboard" aria-label="Panorama financeiro demonstrativo">
      <header className="market-header">
        <span className="scene-eyebrow">SARA · FINANÇAS · DADOS OFFLINE</span>
        <h1>{scene.title ?? 'Panorama de mercado'}</h1>
        <p>
          {demo
            ? 'Simulação histórica de maio de 2024: números e eventos inventados. Não são preços, notícias ou recomendações.'
            : 'Dados de fonte externa, com rastreabilidade. Verifique o horário de atualização antes de interpretá-los.'}
        </p>
        <strong className={demo ? 'market-source-tag demo' : 'market-source-tag'}>
          {demo ? 'DEMONSTRAÇÃO · NÃO É DADO REAL' : 'DADOS DECLARADOS COMO VERIFICADOS'}
        </strong>
        {stale && (
          <p className="market-warning" role="status">
            Atenção: os dados estão desatualizados ou sem data de atualização.
          </p>
        )}
      </header>

      <div className="market-layout">
        <article className="market-panel market-chart-panel">
          <div className="market-panel-heading">
            <div>
              <span className="scene-eyebrow">EVOLUÇÃO NO INTERVALO</span>
              <h2>{series.title as string}</h2>
            </div>
            <nav className="market-periods" aria-label="Intervalo do gráfico">
              {(Object.keys(PERIODS) as MarketPeriod[]).map((item) => (
                <button
                  type="button"
                  key={item}
                  className={period === item ? 'active' : ''}
                  aria-pressed={period === item}
                  onClick={() => setPeriod(item)}
                >
                  {PERIODS[item].label}
                </button>
              ))}
            </nav>
          </div>
          <div className="market-kpis" aria-live="polite">
            <div>
              <span>Último valor sintético</span>
              <strong>{points.length
                ? formatNumber(points.at(-1)?.value ?? 0)
                : 'Indisponível'}</strong>
            </div>
            <div>
              <span>Variação no intervalo</span>
              <strong>{summary.change === null
                ? 'N/D'
                : `${summary.change >= 0 ? '+' : ''}${summary.change.toFixed(2).replace('.', ',')}%`}</strong>
            </div>
            <div>
              <span>Observações</span>
              <strong>{points.length}</strong>
            </div>
          </div>
          <Plot
            points={points}
            selectedEventId={selectedEventId}
            title={series.title as string}
          />
          <p className="market-plot-note">
            {source}. {asOf ? `Data de referência: ${formatDate(asOf)}.` : 'Data não informada.'}
            {' '}Observações sintéticas incluem fins de semana.
          </p>
        </article>

        <article className="market-panel market-story-panel">
          <span className="scene-eyebrow">EXPLICAÇÃO CONTEXTUAL</span>
          <h2>O que mostra o gráfico?</h2>
          <p role="status" aria-live="polite">{narrative}</p>
          {selection ? (
            <div className="market-selection" aria-live="polite">
              <small>EVENTO SELECIONADO · {formatDate(selection.publishedAt)}</small>
              <h3>{selection.title}</h3>
              <p>{selection.summary}</p>
            </div>
          ) : (
            <p className="market-muted">
              Selecione um evento na linha do tempo para ver seu contexto aqui.
            </p>
          )}
          <p className="market-speech-note">
            Texto preparado para futura narração por voz. Associação temporal não implica causalidade.
          </p>
        </article>

        <article className="market-panel market-timeline-panel">
          <span className="scene-eyebrow">LINHA DO TEMPO · {demo ? 'EVENTOS SIMULADOS' : 'EVENTOS'}</span>
          <h2>{news.title as string}</h2>
          <div className="market-timeline">
            {visibleEvents.length ? visibleEvents.map((item) => (
              <button
                type="button"
                className={item.id === selectedEventId
                  ? 'market-timeline-event active'
                  : 'market-timeline-event'}
                key={item.id}
                aria-pressed={item.id === selectedEventId}
                onClick={() => selectEvent(item)}
                disabled={!selectAction}
              >
                <span>{formatDate(item.publishedAt)}</span>
                <strong>{item.title}</strong>
                <small>{item.source}</small>
              </button>
            )) : (
              <p className="market-muted" role="status">
                Não há eventos neste intervalo. Selecione outro período.
              </p>
            )}
          </div>
        </article>

        <aside className="market-panel market-references-panel">
          <span className="scene-eyebrow">FONTES E PROVENIÊNCIA</span>
          <h2>De onde vêm esses dados?</h2>
          <p>
            {demo
              ? 'A série e os eventos foram criados para o protótipo. Os links abaixo são apenas contexto externo, não comprovação dos dados fictícios.'
              : `Fonte informada: ${source}. Confira se as referências respaldam os dados apresentados.`}
          </p>
          {scene.references.length ? (
            <ul>
              {scene.references.map((reference) => (
                <li key={reference.id}>
                  <a
                    href={reference.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {reference.title}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="market-warning" role="status">
              Nenhuma fonte externa disponível.
            </p>
          )}
          <p className="market-muted">
            Sem API em tempo real, credenciais ou chamadas a serviços financeiros.
          </p>
        </aside>
      </div>
    </section>
  );
}
