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

// 国际化翻译字典
const I18N = {
  en: {
    // 导航
    navDashboard: 'Dashboard', navSequences: 'Sequences', navNetwork: 'Network', navCharts: 'Charts', navDocs: 'Docs',
    // 品牌
    brand: 'Protein Design Atlas', brandSub: 'GFP evolution cockpit',
    // 轮次
    rounds: 'Rounds', allRounds: 'All rounds',
    // 顶栏
    toggleTheme: 'Toggle theme', toggleLang: '中', switchLang: 'Switch language',
    // 右栏
    inspector: 'Inspector', inspectorEmpty: 'Click a sequence, network node or document to inspect.',
    apiExamples: 'API examples', currentBest: 'Current Best',
    parent: 'Parent', docTitle: 'Title', path: 'Path', labelField: 'Label',
    // 仪表盘
    gfpLineage: 'GFP Design Lineage', evolutionCockpit: 'Evolution Cockpit',
    dashboardDesc: 'Tracking every ProteinMPNN / ESMFold decision across rounds, sequences and metrics.',
    metricSequences: 'Sequences', metricMetrics: 'Metrics', metricArtifacts: 'Artifacts', metricRounds: 'Rounds',
    scoreTrend: 'Score Trend', ptmChromo: 'pTM × Chromo',
    bestByRound: 'Best score by round', ptmVsChromo: 'pTM × Chromophore pLDDT',
    // 序列页
    sequenceVault: 'Sequence Vault', minScore: 'min score, e.g. 0.94',
    thRound: 'Round', thScore: 'Score', thPtm: 'pTM', thPlddt: 'pLDDT', thChromo: 'Chromo', thLength: 'Length', thSequence: 'Sequence',
    // 网络页
    topologyNetwork: 'Topology Network', networkDesc: 'Lineage of parent tags, screening rounds and top candidates.',
    // 图表页
    chartsTitle: 'Charts', scoreDist: 'Score distribution by round', top6Candidates: 'Top 6 candidates',
    parentContrib: 'Parent contribution', parentContribFull: 'Parent contribution (children count)',
    // 文档页
    selectDoc: 'Select a document to view its content.',
    // 全屏
    exitFullscreen: 'Exit fullscreen', fullscreen: 'Fullscreen',
    // 轴标题
    axisScore: 'Score', axisPtm: 'pTM', axisChromoPlddt: 'Chromo pLDDT',
  },
  zh: {
    // 导航
    navDashboard: '总览', navSequences: '序列库', navNetwork: '谱系网络', navCharts: '图表', navDocs: '文档',
    // 品牌
    brand: '蛋白设计图鉴', brandSub: 'GFP 进化驾驶舱',
    // 轮次
    rounds: '轮次', allRounds: '全部轮次',
    // 顶栏
    toggleTheme: '切换主题', toggleLang: 'EN', switchLang: '切换语言',
    // 右栏
    inspector: '检查器', inspectorEmpty: '点击序列、网络节点或文档以查看详情。',
    apiExamples: 'API 示例', currentBest: '当前最佳',
    parent: '亲本', docTitle: '标题', path: '路径', labelField: '标签',
    // 仪表盘
    gfpLineage: 'GFP 设计谱系', evolutionCockpit: '进化驾驶舱',
    dashboardDesc: '追踪每一轮 ProteinMPNN / ESMFold 决策，覆盖轮次、序列与指标。',
    metricSequences: '序列数', metricMetrics: '指标数', metricArtifacts: '产物数', metricRounds: '轮次数',
    scoreTrend: '分数趋势', ptmChromo: 'pTM × 生色团',
    bestByRound: '各轮次最佳分数', ptmVsChromo: 'pTM × 生色团 pLDDT',
    // 序列页
    sequenceVault: '序列库', minScore: '最低分数，如 0.94',
    thRound: '轮次', thScore: '分数', thPtm: 'pTM', thPlddt: 'pLDDT', thChromo: '生色团', thLength: '长度', thSequence: '序列',
    // 网络页
    topologyNetwork: '谱系网络', networkDesc: '亲本标签、筛选轮次与顶级候选的谱系关系。',
    // 图表页
    chartsTitle: '图表', scoreDist: '各轮次分数分布', top6Candidates: '前 6 候选',
    parentContrib: '亲本贡献', parentContribFull: '亲本贡献（子代数量）',
    // 文档页
    selectDoc: '选择文档查看内容。',
    // 全屏
    exitFullscreen: '退出全屏', fullscreen: '全屏',
    // 轴标题
    axisScore: '分数', axisPtm: 'pTM', axisChromoPlddt: '生色团 pLDDT',
  }
}

const I18nCtx = createContext(I18N.zh)
const useI18n = () => useContext(I18nCtx)

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
.chart-frame{background:var(--panel);border:1px solid var(--line);border-radius:18px;display:flex;flex-direction:column;padding:8px;min-height:520px}
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
  return <div className="plot" ref={ref} style={{width: '100%', height: '100%', minHeight: 300}}/>
})

/* ---------- Fullscreen-capable chart frame ---------- */
function ChartFrame({title, chartKey, fsKey, setFsKey, icon: Icon, style, children}) {
  const t = useI18n()
  const isFs = fsKey === chartKey
  return (
    <div className={`chart-frame${isFs ? ' fs' : ''}`} style={(!isFs && style) ? style : undefined}>
      <div className="chart-head">
        <span className="t">{Icon && <Icon size={15}/>}{title}</span>
        <button onClick={() => setFsKey(isFs ? null : chartKey)} title={isFs ? t.exitFullscreen : t.fullscreen}>
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
function TopBar({theme, setTheme, lang, setLang, page, roundKey}) {
  const t = useI18n()
  const titles = {dashboard: t.navDashboard, sequences: t.navSequences, network: t.navNetwork, charts: t.navCharts, docs: t.navDocs}
  return (
    <header className="topbar">
      <div className="tb-left">
        <b className="tb-title">{titles[page]}</b>
        {roundKey && <span className="tb-round">{roundKey}</span>}
      </div>
      <div style={{display: 'flex', gap: 8}}>
        <button onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')} title={t.switchLang}>{t.toggleLang}</button>
        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title={t.toggleTheme}>
          {theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}
        </button>
      </div>
    </header>
  )
}

/* ---------- Left navigation ---------- */
function LeftNav({rounds, selectedRound, setSelectedRound, page, setPage}) {
  const t = useI18n()
  const items = [
    ['dashboard', t.navDashboard, LayoutDashboard],
    ['sequences', t.navSequences, Database],
    ['network', t.navNetwork, NetIcon],
    ['charts', t.navCharts, BarChart3],
    ['docs', t.navDocs, FileText]
  ]
  return (
    <aside className="left">
      <div className="brand"><FlaskConical size={28}/><div><b>{t.brand}</b><span>{t.brandSub}</span></div></div>
      <nav>{items.map(([id, label, Icon]) =>
        <button key={id} onClick={() => setPage(id)} className={page === id ? 'active' : ''}><Icon size={18}/>{label}</button>
      )}</nav>
      <div className="round-picker">
        <h3>{t.rounds}</h3>
        <button className={!selectedRound ? 'selected' : ''} onClick={() => setSelectedRound('')}>{t.allRounds}</button>
        {rounds.map(r =>
          <button key={r.round_key} className={selectedRound === r.round_key ? 'selected' : ''} onClick={() => setSelectedRound(r.round_key)}>
            <span>{r.round_key}</span><em>{r.best_score ? Number(r.best_score).toFixed(4) : '—'}</em>
          </button>
        )}
      </div>
    </aside>
  )
}

/* ---------- 右侧检查器键值对组件 ---------- */
function Kv({k, v}) {
  return <div className="kv"><span className="k">{k}</span><span className="v">{v == null || v === '' ? '—' : v}</span></div>
}

/* ---------- Right inspector ---------- */
function RightPanel({selected, stats}) {
  const t = useI18n()
  let detail = null
  if (selected) {
    if (selected.sequence != null) {
      // 序列类型
      const seq = String(selected.sequence)
      detail = <div className="inspector-detail">
        <Kv k={t.thRound} v={selected.source_round || selected.round_key}/>
        <Kv k={t.thScore} v={num(pick(selected, 'score', 'best_score')).toFixed(4)}/>
        <Kv k={t.thPtm} v={num(pick(selected, 'ptm', 'best_ptm')).toFixed(4)}/>
        <Kv k={t.thPlddt} v={num(pick(selected, 'plddt', 'best_plddt')).toFixed(3)}/>
        <Kv k={t.thChromo} v={num(pick(selected, 'chromo', 'best_chromo')).toFixed(3)}/>
        <Kv k={t.thLength} v={selected.length}/>
        <Kv k={t.parent} v={selected.parent || selected.parent_tag}/>
        <Kv k={t.thSequence} v={seq.length > 50 ? seq.slice(0, 50) + '...' : seq}/>
      </div>
    } else if (selected.title != null) {
      // 文档类型
      detail = <div className="inspector-detail">
        <Kv k={t.docTitle} v={selected.title}/>
        <Kv k={t.thRound} v={selected.round_key}/>
        <Kv k={t.path} v={selected.path}/>
      </div>
    } else if (selected.label != null) {
      // 网络节点类型
      detail = <div className="inspector-detail">
        <Kv k={t.labelField} v={selected.label}/>
        <Kv k={t.thScore} v={num(pick(selected, 'score', 'best_score')).toFixed(4)}/>
        <Kv k={t.thRound} v={selected.source_round || selected.round_key}/>
        <Kv k={t.parent} v={selected.parent}/>
      </div>
    } else {
      // 其他：键值对列表
      detail = <div className="inspector-detail">
        {Object.entries(selected).map(([k, v]) => <Kv key={k} k={k} v={String(v)}/>)}
      </div>
    }
  }
  return (
    <aside className="right">
      <div className="panel-title">{t.inspector}</div>
      {detail || <div className="empty">{t.inspectorEmpty}</div>}
      <div className="api-box">
        <div>{t.apiExamples}</div>
        <code>GET /api/stats</code>
        <code>GET /api/sequences?min_score=0.94</code>
        <code>GET /api/metrics/top?limit=50</code>
        <code>GET /api/graph/lineage</code>
      </div>
      {stats?.best && (
        <div className="best-card">
          <b>{t.currentBest}</b>
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
  const t = useI18n()

  const trendTraces = useMemo(() => {
    // 排除 R6 异常值（best_score=1.2944，尺度错误）
    const filtered = trend.filter(d => d.round_key !== 'R6')
    return filtered.length ? [{
      x: filtered.map(d => d.round_key), y: filtered.map(d => num(d.best_score)),
      type: 'scatter', mode: 'lines+markers',
      line: {color: theme === 'dark' ? '#d4af37' : '#9a7b1f', width: 3}, marker: {size: 9}
    }] : []
  }, [trend, theme])
  const trendLayout = useMemo(() => {
    const l = plotLayout(t.bestByRound, theme)
    return {...l, yaxis: {...l.yaxis, title: t.axisScore}}
  }, [theme, t])

  const scatterTraces = useMemo(() => {
    // 排除 R6 异常值（pLDDT 尺度异常）
    const filtered = scatter.filter(d => d.source_round !== 'R6' && num(d.ptm) > 0 && num(d.chromo) > 0)
    return filtered.length ? [{
      x: filtered.map(d => num(d.ptm)), y: filtered.map(d => num(d.chromo)),
      text: filtered.map(d => `${d.source_round}<br>${num(d.score).toFixed(4)}`),
      mode: 'markers', type: 'scatter',
      marker: {
        size: filtered.map(d => Math.max(5, num(d.score) * 12)),
        color: filtered.map(d => num(d.score)), colorscale: 'Viridis', showscale: true
      }
    }] : []
  }, [scatter])
  const scatterLayout = useMemo(() => {
    const l = plotLayout(t.ptmVsChromo, theme)
    // 自适应范围，不硬编码 [0,1]
    const pts = scatter.filter(d => d.source_round !== 'R6' && num(d.ptm) > 0 && num(d.chromo) > 0)
    if (!pts.length) return l
    const xs = pts.map(d => num(d.ptm)), ys = pts.map(d => num(d.chromo))
    const xmin = Math.min(...xs) - 0.02, xmax = Math.max(...xs) + 0.02
    const ymin = Math.min(...ys) - 0.02, ymax = Math.max(...ys) + 0.02
    return {...l, xaxis: {...l.xaxis, title: t.axisPtm, range: [xmin, xmax]}, yaxis: {...l.yaxis, title: t.axisChromoPlddt, range: [ymin, ymax]}}
  }, [theme, t, scatter])

  return (
    <main className="main">
      <section className="hero">
        <span className="eyebrow">{t.gfpLineage}</span>
        <h1>{t.evolutionCockpit}</h1>
        <p>{t.dashboardDesc}</p>
      </section>
      <div className="metrics">
        <Metric label={t.metricSequences} value={stats?.sequences?.toLocaleString?.()}/>
        <Metric label={t.metricMetrics} value={stats?.metrics?.toLocaleString?.()} tone="green"/>
        <Metric label={t.metricArtifacts} value={stats?.artifacts}/>
        <Metric label={t.metricRounds} value={stats?.rounds} tone="blue"/>
      </div>
      <div className="grid2">
        <ChartFrame title={t.scoreTrend} chartKey="trend" fsKey={fsKey} setFsKey={setFsKey} icon={TrendingUp}>
          <PlotlyChart traces={trendTraces} layout={trendLayout} fsKey={fsKey}/>
        </ChartFrame>
        <ChartFrame title={t.ptmChromo} chartKey="scatter" fsKey={fsKey} setFsKey={setFsKey} icon={ScatterChart}>
          <PlotlyChart traces={scatterTraces} layout={scatterLayout} fsKey={fsKey}/>
        </ChartFrame>
      </div>
    </main>
  )
}

/* ---------- Sequences ---------- */
function Sequences({roundKey, onSelect}) {
  const t = useI18n()
  const [rows, setRows] = useState([])
  const [q, setQ] = useState('')
  useEffect(() => {
    get(`/api/sequences?limit=500${roundKey ? '&round_key=' + roundKey : ''}${q ? '&min_score=' + q : ''}`).then(setRows)
  }, [roundKey, q])
  return (
    <main className="main">
      <div className="pagehead">
        <h2>{t.sequenceVault}</h2>
        <div className="search"><Search size={16}/><input placeholder={t.minScore} value={q} onChange={e => setQ(e.target.value)}/></div>
      </div>
      <table>
        <thead><tr><th>{t.thRound}</th><th>{t.thScore}</th><th>{t.thPtm}</th><th>{t.thPlddt}</th><th>{t.thChromo}</th><th>{t.thLength}</th><th>{t.thSequence}</th></tr></thead>
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
  const t = useI18n()
  const KEY = 'network'

  useEffect(() => {
    let cy
    let ro
    get('/api/graph/lineage?min_score=0.85&limit=1000').then(g => {
      if (!ref.current) return
      // 每轮均匀采样节点，避免 R25 占满
      const nodesByRound = {}
      ;(g.nodes || []).forEach(n => {
        const r = n.data.source_round || n.data.label || 'other'
        ;(nodesByRound[r] = nodesByRound[r] || []).push(n)
      })
      const sampledNodes = []
      Object.keys(nodesByRound).forEach(r => {
        const arr = nodesByRound[r]
        // 每轮最多 40 个节点
        const step = Math.max(1, Math.ceil(arr.length / 40))
        for (let i = 0; i < arr.length; i += step) sampledNodes.push(arr[i])
      })
      const nodeIds = new Set(sampledNodes.map(n => n.data.id))
      // 去重边 + 只保留两端节点都在的边
      const seenEdges = new Set()
      const edges = (g.edges || []).filter(e => {
        const s = e.data.source, t = e.data.target
        if (!nodeIds.has(s) || !nodeIds.has(t)) return false
        const key = s + '->' + t
        if (seenEdges.has(key)) return false
        seenEdges.add(key)
        return true
      })
      // 节点标签优化：序列 hash 节点显示 轮次+分数
      const nodes = sampledNodes.map(n => ({
        ...n,
        data: {
          ...n.data,
          label: n.data.label && n.data.label.length === 16 && /^[0-9a-f]+$/.test(n.data.label)
            ? `${n.data.source_round || ''} ${n.data.best_score ? Number(n.data.best_score).toFixed(4) : ''}`
            : n.data.label
        }
      }))
      cy = cytoscape({
        container: ref.current,
        elements: [...nodes, ...edges],
        layout: {name: 'fcose', animate: false, nodeSeparation: 80, idealEdgeLength: 120},
        style: [
          {selector: 'node', style: {
            'background-color': `mapData(best_score,0.93,0.948,${theme === 'dark' ? '#315b7c' : '#7aa8d8'},${theme === 'dark' ? '#e0b84a' : '#9a7b1f'})`,
            'label': 'data(label)', 'color': theme === 'dark' ? '#eee' : '#333', 'font-size': 8,
            'width': 'mapData(best_score,0.93,0.948,20,48)', 'height': 'mapData(best_score,0.93,0.948,20,48)', 'text-wrap': 'wrap', 'text-valign': 'bottom', 'text-margin-y': 4
          }},
          {selector: 'edge', style: {
            'line-color': theme === 'dark' ? '#53645f' : '#c8c0ac',
            'target-arrow-color': theme === 'dark' ? '#8aa39b' : '#999',
            'target-arrow-shape': 'triangle', 'curve-style': 'bezier', 'opacity': 0.5,
            'arrow-scale': 1.2, 'width': 1.5
          }}
        ]
      })
      cy.on('tap', 'node', e => onSelect(e.target.data()))
      cyRef.current = cy
      // 用 ResizeObserver 监听容器尺寸变化，首次有尺寸时 fit
      if (ref.current) {
        let fitted = false
        ro = new ResizeObserver(() => {
          if (cyRef.current && !fitted) { cyRef.current.resize(); cyRef.current.fit(null, 15); fitted = true }
        })
        ro.observe(ref.current)
      }
      // 多次延迟 fit 确保渲染
      setTimeout(() => { if (cyRef.current) { cyRef.current.resize(); cyRef.current.fit(null, 15) } }, 100)
      setTimeout(() => { if (cyRef.current) { cyRef.current.resize(); cyRef.current.fit(null, 15) } }, 300)
      setTimeout(() => { if (cyRef.current) { cyRef.current.resize(); cyRef.current.fit(null, 15) } }, 800)
    })
    return () => { if (cy) cy.destroy(); if (ro) ro.disconnect() }
  }, [theme])

  useEffect(() => {
    const cy = cyRef.current
    if (cy) { const t = setTimeout(() => { cy.resize(); cy.fit() }, 80); return () => clearTimeout(t) }
  }, [fsKey])

  return (
    <main className="main" style={{display: 'flex', flexDirection: 'column'}}>
      <div className="pagehead"><h2>{t.topologyNetwork}</h2><p className="muted">{t.networkDesc}</p></div>
      <ChartFrame title={t.topologyNetwork} chartKey={KEY} fsKey={fsKey} setFsKey={setFsKey} icon={GitBranch} style={{flex: 1, minHeight: 400}}>
        <div ref={ref} style={{width: '100%', height: '100%', position: 'absolute', inset: 0}}/>
      </ChartFrame>
    </main>
  )
}

/* ---------- Charts (box / radar / bar) ---------- */
function ChartsPage({roundKey, fsKey, setFsKey}) {
  const theme = useTheme()
  const t = useI18n()
  const [scatter, setScatter] = useState([])
  const [top, setTop] = useState([])
  const [graph, setGraph] = useState({nodes: [], edges: []})

  useEffect(() => {
    get('/api/plots/score-scatter?limit=10000').then(data => {
      const byRound = {}
      data.forEach(d => { (byRound[d.source_round] = byRound[d.source_round] || []).push(d) })
      const sampled = []
      Object.keys(byRound).sort().forEach(r => {
        const arr = byRound[r]
        const step = Math.max(1, Math.ceil(arr.length / 200))
        for (let i = 0; i < arr.length; i += step) sampled.push(arr[i])
      })
      setScatter(sampled)
    })
  }, [])
  useEffect(() => { get(`/api/metrics/top?limit=50${roundKey ? '&round_key=' + roundKey : ''}`).then(setTop) }, [roundKey])
  useEffect(() => { get('/api/graph/lineage?min_score=0.85&limit=1000').then(setGraph) }, [])

  const boxTraces = useMemo(() => scatter.length ? [{
    x: scatter.map(d => d.source_round), y: scatter.map(d => num(d.score)),
    type: 'box', boxpoints: 'outliers',
    marker: {color: theme === 'dark' ? '#d4af37' : '#9a7b1f'},
    line: {color: theme === 'dark' ? '#69c18d' : '#3d8a5a'}
  }] : [], [scatter, theme])
  const boxLayout = useMemo(() => plotLayout(t.scoreDist, theme), [theme, t])

  const cand = useMemo(() => (top || []).slice(0, 6).map(normCandidate), [top])
  const radarTraces = useMemo(() => cand.map((c, idx) => ({
    type: 'scatterpolar',
    r: [num(c.ptm), c.plddt, c.chromo, num(c.score)],
    theta: ['pTM', 'pLDDT', 'Chromo', 'Score'],
    name: c.label, fill: 'toself', line: {color: COLORS[idx % COLORS.length]}
  })), [cand])
  const radarLayout = useMemo(() => {
    const l = plotLayout(t.top6Candidates, theme)
    const g = theme === 'dark' ? '#2b332f' : '#e3dfd2'
    const ax = theme === 'dark' ? '#d9d0bd' : '#4a463c'
    return {...l, polar: {radialaxis: {range: [0, 1], gridcolor: g, color: ax}, angularaxis: {gridcolor: g, color: ax}}}
  }, [theme, t])

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
  const barLayout = useMemo(() => plotLayout(t.parentContribFull, theme), [theme, t])

  return (
    <main className="main">
      <div className="pagehead"><h2>{t.chartsTitle}</h2></div>
      <div className="grid2" style={{marginBottom: 18}}>
        <ChartFrame title={t.scoreDist} chartKey="box" fsKey={fsKey} setFsKey={setFsKey} icon={Box}>
          <PlotlyChart traces={boxTraces} layout={boxLayout} fsKey={fsKey}/>
        </ChartFrame>
        <ChartFrame title={t.top6Candidates} chartKey="radar" fsKey={fsKey} setFsKey={setFsKey} icon={Radar}>
          <PlotlyChart traces={radarTraces} layout={radarLayout} fsKey={fsKey}/>
        </ChartFrame>
      </div>
      <ChartFrame title={t.parentContrib} chartKey="bar" fsKey={fsKey} setFsKey={setFsKey} icon={BarChart3}>
        <PlotlyChart traces={barTraces} layout={barLayout} fsKey={fsKey}/>
      </ChartFrame>
    </main>
  )
}

/* ---------- 简易 Markdown 渲染器 ---------- */
// 支持：标题/粗体/斜体/行内代码/代码块/列表/表格/引用/分隔线/链接，含 XSS 转义
function renderMarkdown(text) {
  if (!text) return ''
  // 先转义 HTML 特殊字符，防止 XSS
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  let src = esc(text)
  // 代码块 ```...```，先抽出避免被行级解析破坏
  const blocks = []
  src = src.replace(/```([\s\S]*?)```/g, (m, code) => {
    blocks.push('<pre><code>' + code.replace(/^\n/, '').replace(/\n$/, '') + '</code></pre>')
    return '\u0000B' + (blocks.length - 1) + '\u0000'
  })
  // 行内格式：代码/粗体/斜体/链接
  const inline = (s) => s
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
  const lines = src.split('\n')
  const out = []
  let inUl = false, inOl = false, inQuote = false, para = [], tableRows = []
  const flushPara = () => { if (para.length) { out.push('<p>' + inline(para.join(' ')) + '</p>'); para = [] } }
  const flushLists = () => { if (inUl) { out.push('</ul>'); inUl = false } if (inOl) { out.push('</ol>'); inOl = false } }
  const flushTable = () => {
    if (!tableRows.length) return
    const rows = tableRows.map(r => r.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim()))
    let t = '<table>'
    rows.forEach((cells, i) => { const tag = i === 0 ? 'th' : 'td'; t += '<tr>' + cells.map(c => '<' + tag + '>' + inline(c) + '</' + tag + '>').join('') + '</tr>' })
    t += '</table>'; out.push(t); tableRows = []
  }
  const flushAll = () => { flushPara(); flushLists(); if (inQuote) { out.push('</blockquote>'); inQuote = false } flushTable() }
  for (const line of lines) {
    // 代码块占位还原
    if (/^\u0000B\d+\u0000$/.test(line.trim())) { flushAll(); out.push(line.trim()); continue }
    // 分隔线
    if (/^---+\s*$/.test(line)) { flushAll(); out.push('<hr/>'); continue }
    let m
    // 标题
    if ((m = line.match(/^###\s+(.*)$/))) { flushAll(); out.push('<h3>' + inline(m[1]) + '</h3>'); continue }
    if ((m = line.match(/^##\s+(.*)$/))) { flushAll(); out.push('<h2>' + inline(m[1]) + '</h2>'); continue }
    if ((m = line.match(/^#\s+(.*)$/))) { flushAll(); out.push('<h1>' + inline(m[1]) + '</h1>'); continue }
    // 引用（转义后 > 变为 &gt;）
    if ((m = line.match(/^&gt;\s?(.*)$/))) { flushLists(); flushTable(); flushPara(); if (!inQuote) { inQuote = true; out.push('<blockquote>') } out.push('<p>' + inline(m[1]) + '</p>'); continue }
    // 表格
    if (line.includes('|') && line.trim().startsWith('|')) { flushLists(); flushPara(); if (inQuote) { out.push('</blockquote>'); inQuote = false } if (/^\|[\s:|-]+\|\s*$/.test(line.trim())) continue; tableRows.push(line.trim()); continue }
    flushTable()
    if (inQuote) { out.push('</blockquote>'); inQuote = false }
    // 无序列表
    if ((m = line.match(/^[-*]\s+(.*)$/))) { flushPara(); if (inOl) { out.push('</ol>'); inOl = false } if (!inUl) { out.push('<ul>'); inUl = true } out.push('<li>' + inline(m[1]) + '</li>'); continue }
    // 有序列表
    if ((m = line.match(/^\d+\.\s+(.*)$/))) { flushPara(); if (inUl) { out.push('</ul>'); inUl = false } if (!inOl) { out.push('<ol>'); inOl = true } out.push('<li>' + inline(m[1]) + '</li>'); continue }
    // 空行分段
    if (line.trim() === '') { flushAll(); continue }
    // 普通段落行，累积到段落
    flushLists()
    para.push(line)
  }
  flushAll()
  let result = out.join('\n')
  // 还原代码块
  result = result.replace(/\u0000B(\d+)\u0000/g, (m, i) => blocks[Number(i)])
  return result
}

/* ---------- Docs ---------- */
function DocsPage({roundKey, onSelect}) {
  const t = useI18n()
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
      <article className="markdown" dangerouslySetInnerHTML={{__html: body ? renderMarkdown(body) : '<p class="muted">' + t.selectDoc + '</p>'}}/>
    </main>
  )
}

/* ---------- App ---------- */
function App() {
  const [theme, setTheme] = useState('dark')
  const [lang, setLang] = useState('zh')
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
    get('/api/plots/score-scatter?limit=10000').then(data => {
      // 每轮均匀采样，避免 R25 等大轮次占满配额
      const byRound = {}
      data.forEach(d => { (byRound[d.source_round] = byRound[d.source_round] || []).push(d) })
      const sampled = []
      Object.keys(byRound).sort().forEach(r => {
        const arr = byRound[r]
        // 每轮最多 200 条，均匀采样
        const step = Math.max(1, Math.ceil(arr.length / 200))
        for (let i = 0; i < arr.length; i += step) sampled.push(arr[i])
      })
      setScatter(sampled)
    })
  }, [])
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') setFsKey(null) }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  return (
    <ThemeCtx.Provider value={theme}>
      <I18nCtx.Provider value={I18N[lang]}>
        <div className="app">
          <LeftNav rounds={rounds} selectedRound={roundKey} setSelectedRound={setRoundKey} page={page} setPage={setPage}/>
          <div className="main-col">
            <TopBar theme={theme} setTheme={setTheme} lang={lang} setLang={setLang} page={page} roundKey={roundKey}/>
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
      </I18nCtx.Provider>
    </ThemeCtx.Provider>
  )
}

createRoot(document.getElementById('root')).render(<App/>)
