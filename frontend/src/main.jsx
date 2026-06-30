import React, {createContext, useContext, useEffect, useMemo, useRef, useState} from 'react'
import {createRoot} from 'react-dom/client'
import Plotly from 'plotly.js-dist-min'
import cytoscape from 'cytoscape'
import fcose from 'cytoscape-fcose'
import {
  Sun, Moon, Maximize2, Minimize2, Search, LayoutDashboard, Database, Network as NetIcon,
  BarChart3, FileText, FlaskConical, TrendingUp, ScatterChart, Box, Radar, GitBranch
} from 'lucide-react'
import './style.css'

cytoscape.use(fcose)

const API = import.meta.env.VITE_API_URL || ''
const get = (p) => fetch(API + p).then(r => r.json())

const CONFIG = {responsive: true, displaylogo: false}
const COLORS = ['#d4af37', '#69c18d', '#7aa8d8', '#d66a6a', '#c9a0dc', '#e08e45']

const num = (v) => (v == null || v === '' ? 0 : (Number(v) || 0))
const pick = (o, ...keys) => { for (const k of keys) { if (o?.[k] != null && o[k] !== '') return o[k] } return 0 }

const ThemeCtx = createContext('dark')
const useTheme = () => useContext(ThemeCtx)

function normCandidate(c, i) {
  const score = num(pick(c, 'score', 'best_score'))
  const ptm = num(pick(c, 'ptm', 'best_ptm'))
  let plddt = num(pick(c, 'plddt', 'best_plddt', 'plddt_global'))
  let chromo = num(pick(c, 'chromo', 'best_chromo', 'chromo_plddt'))
  plddt = plddt > 1 ? plddt / 100 : plddt
  chromo = chromo > 1 ? chromo / 100 : chromo
  return {label: c.label || c.source_round || c.seq_id || ('#' + (i + 1)), score, ptm, plddt, chromo}
}

function plotLayout(title, theme) {
  const dark = theme === 'dark'
  const ink = dark ? '#f4ecd8' : '#2b2a28'
  const grid = dark ? '#2b332f' : '#e3dfd2'
  const fcolor = dark ? '#d9d0bd' : '#4a463c'
  return {
    title: {text: title, font: {color: ink, size: 14}},
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: {color: fcolor, family: 'IBM Plex Mono, monospace'},
    xaxis: {gridcolor: grid, zerolinecolor: grid, color: fcolor},
    yaxis: {gridcolor: grid, zerolinecolor: grid, color: fcolor},
    margin: {l: 52, r: 18, t: 46, b: 44},
    legend: {font: {color: ink}, bgcolor: 'rgba(0,0,0,0)'}
  }
}

/* ---------- Theme CSS injection (light overrides via CSS variables) ---------- */
function useThemeCss() {
  useEffect(() => {
    const id = 'pda-theme-vars'
    let s = document.getElementById(id)
    if (!s) { s = document.createElement('style'); s.id = id; document.head.appendChild(s) }
    s.textContent = `
.main-col{display:flex;flex-direction:column;min-width:0;overflow:hidden}
.main-col>.main{flex:1;min-height:0}
.topbar{display:flex;align-items:center;justify-content:space-between;padding:12px 30px;border-bottom:1px solid var(--line);background:var(--panel)}
.topbar .tb-left{display:flex;align-items:center;gap:14px}
.topbar .tb-title{font-family:'EB Garamond',serif;font-size:22px}
.topbar .tb-round{color:var(--gold);font-size:12px;letter-spacing:.1em}
.topbar button{background:transparent;border:1px solid var(--line);border-radius:12px;padding:8px;color:var(--ink);cursor:pointer;display:flex;align-items:center}
.topbar button:hover{border-color:var(--gold);color:var(--gold)}
.chart-frame{background:var(--panel);border:1px solid var(--line);border-radius:18px;display:flex;flex-direction:column;padding:8px;min-height:420px}
.chart-frame.fs{position:fixed;inset:0;z-index:9999;border-radius:0;padding:12px;min-height:0}
.chart-head{display:flex;align-items:center;justify-content:space-between;padding:4px 8px 8px}
.chart-head .t{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--gold);letter-spacing:.12em;text-transform:uppercase}
.chart-head button{background:transparent;border:1px solid var(--line);border-radius:8px;padding:5px;color:var(--muted);cursor:pointer;display:flex;align-items:center}
.chart-head button:hover{color:var(--ink);border-color:var(--gold)}
.chart-body{flex:1;min-height:0;position:relative}
.plot{width:100%;height:100%}
[data-theme="light"]{--bg:#f4f1ea;--panel:#ffffff;--panel2:#efebe1;--ink:#2b2a26;--muted:#6c675c;--gold:#9a7b1f;--green:#3d8a5a;--blue:#3a6ea5;--line:#e2ddd0;--danger:#b54848}
[data-theme="light"] body{background:radial-gradient(circle at 20% 0%,#eee9dc,#f4f1ea 42%),#f4f1ea}
[data-theme="light"] .left,[data-theme="light"] .right{background:rgba(255,255,255,.9)}
[data-theme="light"] .hero{border-color:#d8cfb8;background:linear-gradient(135deg,rgba(154,123,31,.12),rgba(61,138,90,.05))}
[data-theme="light"] .search{background:#fff}
[data-theme="light"] td{background:#fff;color:#333}
[data-theme="light"] .right pre,[data-theme="light"] .api-box code,[data-theme="light"] .markdown pre{background:#f6f3ec;color:#3a3a36}
[data-theme="light"] .doc-list button{background:#fff;color:#6c675c}
[data-theme="light"] .best-card{background:linear-gradient(135deg,#f5efe0,#eaf3ee);border-color:#d8cfb8}
[data-theme="light"] nav button.active,[data-theme="light"] .round-picker button.selected{background:#ece6d6}`
  }, [])
}

/* ---------- Plotly chart wrapper ---------- */
const PlotlyChart = React.memo(function PlotlyChart({traces, layout, fsKey}) {
  const ref = useRef()
  useEffect(() => {
    if (ref.current) Plotly.react(ref.current, traces, layout, CONFIG)
  }, [traces, layout])
  useEffect(() => {
    if (ref.current) {
      const t = setTimeout(() => Plotly.Plots.resize(ref.current), 80)
      return () => clearTimeout(t)
    }
  }, [fsKey])
  return <div className="plot" ref={ref}/>
})

/* ---------- Fullscreen-capable chart frame ---------- */
function ChartFrame({title, chartKey, fsKey, setFsKey, icon: Icon, style, children}) {
  const isFs = fsKey === chartKey
  return (
    <div className={`chart-frame${isFs ? ' fs' : ''}`} style={(!isFs && style) ? style : undefined}>
      <div className="chart-head">
        <span className="t">{Icon && <Icon size={15}/>}{title}</span>
        <button onClick={() => setFsKey(isFs ? null : chartKey)} title={isFs ? 'Exit fullscreen' : 'Fullscreen'}>
          {isFs ? <Minimize2 size={16}/> : <Maximize2 size={16}/>}
        </button>
      </div>
      <div className="chart-body">{children}</div>
    </div>
  )
}

function Metric({label, value, tone = 'gold'}) {
  return <div className={`metric ${tone}`}><div>{label}</div><b>{value ?? '—'}</b></div>
}

/* ---------- Top bar with theme toggle ---------- */
function TopBar({theme, setTheme, page, roundKey}) {
  const titles = {dashboard: 'Dashboard', sequences: 'Sequences', network: 'Network', charts: 'Charts', docs: 'Docs'}
  return (
    <header className="topbar">
      <div className="tb-left">
        <b className="tb-title">{titles[page]}</b>
        {roundKey && <span className="tb-round">{roundKey}</span>}
      </div>
      <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title="Toggle theme">
        {theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}
      </button>
    </header>
  )
}

/* ---------- Left navigation ---------- */
function LeftNav({rounds, selectedRound, setSelectedRound, page, setPage}) {
  const items = [
    ['dashboard', 'Dashboard', LayoutDashboard],
    ['sequences', 'Sequences', Database],
    ['network', 'Network', NetIcon],
    ['charts', 'Charts', BarChart3],
    ['docs', 'Docs', FileText]
  ]
  return (
    <aside className="left">
      <div className="brand"><FlaskConical size={28}/><div><b>Protein Design Atlas</b><span>GFP evolution cockpit</span></div></div>
      <nav>{items.map(([id, label, Icon]) =>
        <button key={id} onClick={() => setPage(id)} className={page === id ? 'active' : ''}><Icon size={18}/>{label}</button>
      )}</nav>
      <div className="round-picker">
        <h3>Rounds</h3>
        <button className={!selectedRound ? 'selected' : ''} onClick={() => setSelectedRound('')}>All rounds</button>
        {rounds.map(r =>
          <button key={r.round_key} className={selectedRound === r.round_key ? 'selected' : ''} onClick={() => setSelectedRound(r.round_key)}>
            <span>{r.round_key}</span><em>{r.best_score ? Number(r.best_score).toFixed(4) : '—'}</em>
          </button>
        )}
      </div>
    </aside>
  )
}

/* ---------- Right inspector ---------- */
function RightPanel({selected, stats}) {
  return (
    <aside className="right">
      <div className="panel-title">Inspector</div>
      {selected
        ? <pre>{JSON.stringify(selected, null, 2)}</pre>
        : <div className="empty">Click a sequence, network node or document to inspect.</div>}
      <div className="api-box">
        <div>API examples</div>
        <code>GET /api/stats</code>
        <code>GET /api/sequences?min_score=0.94</code>
        <code>GET /api/metrics/top?limit=50</code>
        <code>GET /api/graph/lineage</code>
      </div>
      {stats?.best && (
        <div className="best-card">
          <b>Current Best</b>
          <span>{num(stats.best.best_score).toFixed(4)}</span>
          <small>{stats.best.source_round}</small>
        </div>
      )}
    </aside>
  )
}

/* ---------- Dashboard ---------- */
function Dashboard({stats, trend, scatter, fsKey, setFsKey}) {
  const theme = useTheme()

  const trendTraces = useMemo(() => trend.length ? [{
    x: trend.map(d => d.round_key), y: trend.map(d => num(d.best_score)),
    type: 'scatter', mode: 'lines+markers',
    line: {color: theme === 'dark' ? '#d4af37' : '#9a7b1f', width: 3}, marker: {size: 9}
  }] : [], [trend, theme])
  const trendLayout = useMemo(() => {
    const l = plotLayout('Best score by round', theme)
    return {...l, yaxis: {...l.yaxis, title: 'Score'}}
  }, [theme])

  const scatterTraces = useMemo(() => scatter.length ? [{
    x: scatter.map(d => num(d.ptm)), y: scatter.map(d => num(d.chromo)),
    text: scatter.map(d => `${d.source_round}<br>${num(d.score).toFixed(4)}`),
    mode: 'markers', type: 'scatter',
    marker: {
      size: scatter.map(d => Math.max(5, num(d.score) * 12)),
      color: scatter.map(d => num(d.score)), colorscale: 'Viridis', showscale: true
    }
  }] : [], [scatter])
  const scatterLayout = useMemo(() => {
    const l = plotLayout('pTM × Chromophore pLDDT', theme)
    return {...l, xaxis: {...l.xaxis, title: 'pTM', range: [0, 1]}, yaxis: {...l.yaxis, title: 'Chromo pLDDT', range: [0, 1]}}
  }, [theme])

  return (
    <main className="main">
      <section className="hero">
        <span className="eyebrow">GFP Design Lineage</span>
        <h1>Evolution Cockpit</h1>
        <p>Tracking every ProteinMPNN / ESMFold decision across rounds, sequences and metrics.</p>
      </section>
      <div className="metrics">
        <Metric label="Sequences" value={stats?.sequences?.toLocaleString?.()}/>
        <Metric label="Metrics" value={stats?.metrics?.toLocaleString?.()} tone="green"/>
        <Metric label="Artifacts" value={stats?.artifacts}/>
        <Metric label="Rounds" value={stats?.rounds} tone="blue"/>
      </div>
      <div className="grid2">
        <ChartFrame title="Score Trend" chartKey="trend" fsKey={fsKey} setFsKey={setFsKey} icon={TrendingUp}>
          <PlotlyChart traces={trendTraces} layout={trendLayout} fsKey={fsKey}/>
        </ChartFrame>
        <ChartFrame title="pTM × Chromo" chartKey="scatter" fsKey={fsKey} setFsKey={setFsKey} icon={ScatterChart}>
          <PlotlyChart traces={scatterTraces} layout={scatterLayout} fsKey={fsKey}/>
        </ChartFrame>
      </div>
    </main>
  )
}

/* ---------- Sequences ---------- */
function Sequences({roundKey, onSelect}) {
  const [rows, setRows] = useState([])
  const [q, setQ] = useState('')
  useEffect(() => {
    get(`/api/sequences?limit=500${roundKey ? '&round_key=' + roundKey : ''}${q ? '&min_score=' + q : ''}`).then(setRows)
  }, [roundKey, q])
  return (
    <main className="main">
      <div className="pagehead">
        <h2>Sequence Vault</h2>
        <div className="search"><Search size={16}/><input placeholder="min score, e.g. 0.94" value={q} onChange={e => setQ(e.target.value)}/></div>
      </div>
      <table>
        <thead><tr><th>Round</th><th>Score</th><th>pTM</th><th>pLDDT</th><th>Chromo</th><th>Length</th><th>Sequence</th></tr></thead>
        <tbody>{rows.map(r => (
          <tr key={r.id} onClick={() => { onSelect(r); get('/api/sequences/' + r.id).then(onSelect) }}>
            <td>{r.source_round}</td>
            <td className="score">{num(r.best_score).toFixed(4)}</td>
            <td>{num(r.best_ptm).toFixed(4)}</td>
            <td>{num(r.best_plddt).toFixed(3)}</td>
            <td>{num(r.best_chromo).toFixed(3)}</td>
            <td>{r.length}</td>
            <td className="seq">{r.sequence}</td>
          </tr>
        ))}</tbody>
      </table>
    </main>
  )
}

/* ---------- Network ---------- */
function NetworkPage({onSelect, fsKey, setFsKey}) {
  const ref = useRef()
  const cyRef = useRef(null)
  const theme = useTheme()
  const KEY = 'network'

  useEffect(() => {
    let cy
    get('/api/graph/lineage?min_score=0.94&limit=250').then(g => {
      if (!ref.current) return
      cy = cytoscape({
        container: ref.current,
        elements: [...(g.nodes || []), ...(g.edges || [])],
        layout: {name: 'fcose', animate: false},
        style: [
          {selector: 'node', style: {
            'background-color': `mapData(best_score,0.93,0.946,${theme === 'dark' ? '#315b7c' : '#7aa8d8'},${theme === 'dark' ? '#e0b84a' : '#9a7b1f'})`,
            'label': 'data(label)', 'color': theme === 'dark' ? '#eee' : '#333', 'font-size': 8,
            'width': 'mapData(best_score,0.93,0.946,18,52)', 'height': 'mapData(best_score,0.93,0.946,18,52)', 'text-wrap': 'wrap'
          }},
          {selector: 'edge', style: {
            'line-color': theme === 'dark' ? '#53645f' : '#c8c0ac',
            'target-arrow-color': theme === 'dark' ? '#53645f' : '#c8c0ac',
            'target-arrow-shape': 'triangle', 'curve-style': 'bezier', 'opacity': 0.45
          }}
        ]
      })
      cy.on('tap', 'node', e => onSelect(e.target.data()))
      cyRef.current = cy
    })
    return () => { if (cy) cy.destroy() }
  }, [theme])

  useEffect(() => {
    const cy = cyRef.current
    if (cy) { const t = setTimeout(() => { cy.resize(); cy.fit() }, 80); return () => clearTimeout(t) }
  }, [fsKey])

  return (
    <main className="main" style={{display: 'flex', flexDirection: 'column'}}>
      <div className="pagehead"><h2>Topology Network</h2><p className="muted">Lineage of parent tags, screening rounds and top candidates.</p></div>
      <ChartFrame title="Topology Network" chartKey={KEY} fsKey={fsKey} setFsKey={setFsKey} icon={GitBranch} style={{flex: 1, minHeight: 400}}>
        <div ref={ref} style={{width: '100%', height: '100%'}}/>
      </ChartFrame>
    </main>
  )
}

/* ---------- Charts (box / radar / bar) ---------- */
function ChartsPage({roundKey, fsKey, setFsKey}) {
  const theme = useTheme()
  const [scatter, setScatter] = useState([])
  const [top, setTop] = useState([])
  const [graph, setGraph] = useState({nodes: [], edges: []})

  useEffect(() => { get('/api/plots/score-scatter?limit=3000').then(setScatter) }, [])
  useEffect(() => { get(`/api/metrics/top?limit=50${roundKey ? '&round_key=' + roundKey : ''}`).then(setTop) }, [roundKey])
  useEffect(() => { get('/api/graph/lineage?min_score=0.94&limit=250').then(setGraph) }, [])

  const boxTraces = useMemo(() => scatter.length ? [{
    x: scatter.map(d => d.source_round), y: scatter.map(d => num(d.score)),
    type: 'box', boxpoints: 'outliers',
    marker: {color: theme === 'dark' ? '#d4af37' : '#9a7b1f'},
    line: {color: theme === 'dark' ? '#69c18d' : '#3d8a5a'}
  }] : [], [scatter, theme])
  const boxLayout = useMemo(() => plotLayout('Score distribution by round', theme), [theme])

  const cand = useMemo(() => (top || []).slice(0, 6).map(normCandidate), [top])
  const radarTraces = useMemo(() => cand.map((c, idx) => ({
    type: 'scatterpolar',
    r: [num(c.ptm), c.plddt, c.chromo, num(c.score)],
    theta: ['pTM', 'pLDDT', 'Chromo', 'Score'],
    name: c.label, fill: 'toself', line: {color: COLORS[idx % COLORS.length]}
  })), [cand])
  const radarLayout = useMemo(() => {
    const l = plotLayout('Top 6 candidates', theme)
    const g = theme === 'dark' ? '#2b332f' : '#e3dfd2'
    const ax = theme === 'dark' ? '#d9d0bd' : '#4a463c'
    return {...l, polar: {radialaxis: {range: [0, 1], gridcolor: g, color: ax}, angularaxis: {gridcolor: g, color: ax}}}
  }, [theme])

  const bars = useMemo(() => {
    const counts = {}
    ;(graph.edges || []).forEach(e => { const s = e.data?.source; if (s) counts[s] = (counts[s] || 0) + 1 })
    const map = Object.fromEntries((graph.nodes || []).map(n => [n.data.id, n.data]))
    return Object.entries(counts)
      .map(([id, c]) => ({label: map[id]?.label || id, count: c}))
      .sort((a, b) => b.count - a.count).slice(0, 12)
  }, [graph])
  const barTraces = useMemo(() => bars.length ? [{
    x: bars.map(b => b.label), y: bars.map(b => b.count), type: 'bar',
    marker: {color: bars.map((_, i) => COLORS[i % COLORS.length])}
  }] : [], [bars])
  const barLayout = useMemo(() => plotLayout('Parent contribution (children count)', theme), [theme])

  return (
    <main className="main">
      <div className="pagehead"><h2>Charts</h2></div>
      <div className="grid2" style={{marginBottom: 18}}>
        <ChartFrame title="Score distribution by round" chartKey="box" fsKey={fsKey} setFsKey={setFsKey} icon={Box}>
          <PlotlyChart traces={boxTraces} layout={boxLayout} fsKey={fsKey}/>
        </ChartFrame>
        <ChartFrame title="Top 6 candidates" chartKey="radar" fsKey={fsKey} setFsKey={setFsKey} icon={Radar}>
          <PlotlyChart traces={radarTraces} layout={radarLayout} fsKey={fsKey}/>
        </ChartFrame>
      </div>
      <ChartFrame title="Parent contribution" chartKey="bar" fsKey={fsKey} setFsKey={setFsKey} icon={BarChart3}>
        <PlotlyChart traces={barTraces} layout={barLayout} fsKey={fsKey}/>
      </ChartFrame>
    </main>
  )
}

/* ---------- Docs ---------- */
function DocsPage({roundKey, onSelect}) {
  const [docs, setDocs] = useState([])
  const [body, setBody] = useState('')
  const [cur, setCur] = useState(null)
  useEffect(() => { get(`/api/documents${roundKey ? '?round_key=' + roundKey : ''}`).then(setDocs) }, [roundKey])
  return (
    <main className="main docs">
      <div className="doc-list">
        {docs.map(d => (
          <button key={d.id} style={cur?.id === d.id ? {borderColor: 'var(--gold)', color: 'var(--ink)'} : undefined}
            onClick={() => { setCur(d); onSelect(d); get('/api/documents/' + d.id).then(x => setBody(x.body || x.content || '')) }}>
            {d.round_key}<b>{d.title}</b><small>{d.path}</small>
          </button>
        ))}
      </div>
      <article className="markdown"><pre>{body || 'Select a document to view its content.'}</pre></article>
    </main>
  )
}

/* ---------- App ---------- */
function App() {
  const [theme, setTheme] = useState('dark')
  const [rounds, setRounds] = useState([])
  const [stats, setStats] = useState(null)
  const [trend, setTrend] = useState([])
  const [scatter, setScatter] = useState([])
  const [page, setPage] = useState('dashboard')
  const [roundKey, setRoundKey] = useState('')
  const [selected, setSelected] = useState(null)
  const [fsKey, setFsKey] = useState(null)

  useThemeCss()
  useEffect(() => { document.documentElement.dataset.theme = theme }, [theme])
  useEffect(() => {
    get('/api/stats').then(setStats)
    get('/api/rounds').then(setRounds)
    get('/api/plots/round-trend').then(setTrend)
    get('/api/plots/score-scatter?limit=3000').then(setScatter)
  }, [])
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') setFsKey(null) }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  return (
    <ThemeCtx.Provider value={theme}>
      <div className="app">
        <LeftNav rounds={rounds} selectedRound={roundKey} setSelectedRound={setRoundKey} page={page} setPage={setPage}/>
        <div className="main-col">
          <TopBar theme={theme} setTheme={setTheme} page={page} roundKey={roundKey}/>
          <div className="main" style={{overflow: 'auto'}}>
            {page === 'dashboard' && <Dashboard stats={stats} trend={trend} scatter={scatter} fsKey={fsKey} setFsKey={setFsKey}/>}
            {page === 'sequences' && <Sequences roundKey={roundKey} onSelect={setSelected}/>}
            {page === 'network' && <NetworkPage onSelect={setSelected} fsKey={fsKey} setFsKey={setFsKey}/>}
            {page === 'charts' && <ChartsPage roundKey={roundKey} fsKey={fsKey} setFsKey={setFsKey}/>}
            {page === 'docs' && <DocsPage roundKey={roundKey} onSelect={setSelected}/>}
          </div>
        </div>
        <RightPanel selected={selected} stats={stats}/>
      </div>
    </ThemeCtx.Provider>
  )
}

createRoot(document.getElementById('root')).render(<App/>)
