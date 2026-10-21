import { useEffect, useMemo, useState } from 'react'
import { supabase, isOffline } from '../../lib/supabase'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export default function AIAnalytics() {
  const [model, setModel] = useState(null)
  const [modelOptions, setModelOptions] = useState([])
  const [forecastRows, setForecastRows] = useState([])
  const [historyRows, setHistoryRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOffline) { setLoading(false); return }
    let active = true
    const load = async () => {
      const { data: options, error: modelError } = await supabase.from('ai_model_metrics').select('*').order('trained_at', { ascending: false }).limit(20)
      if (modelError) { if (active) { setError(modelError.message); setLoading(false) }; return }
      if (!active) return
      setModelOptions(options || [])
      setModel(options?.[0] || null)
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (isOffline || !model?.id) return
    let active = true
    setLoading(true)
    setError('')
    const load = async () => {
      const lastTrainingDate = model.metrics?.training_end
      const historyStart = lastTrainingDate ? new Date(`${lastTrainingDate}T00:00:00`) : null
      if (historyStart) {
        if (model.metrics?.frequency === 'monthly') historyStart.setMonth(historyStart.getMonth() - 23)
        else historyStart.setDate(historyStart.getDate() - 89)
      }
      const [forecast, history] = await Promise.all([
        supabase.from('ai_forecasts').select('forecast_date, category, time_period, predicted_bookings').eq('model_metrics_id', model.id).order('forecast_date'),
        supabase.from('ai_daily_history').select('booking_date, category, actual_bookings').gte('booking_date', historyStart?.toISOString().slice(0, 10) || '1900-01-01').lte('booking_date', lastTrainingDate || '2999-12-31').order('booking_date', { ascending: false }).limit(3000),
      ])
      if (!active) return
      if (forecast.error || history.error) setError('Unable to load demand analysis.')
      setForecastRows(forecast.data || [])
      setHistoryRows(history.data || [])
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [model])

  const daily = useMemo(() => {
    const map = new Map()
    historyRows.forEach(row => {
      const item = map.get(row.booking_date) || { date: row.booking_date, actual: 0 }
      item.actual += row.actual_bookings
      map.set(row.booking_date, item)
    })
    forecastRows.forEach(row => {
      const item = map.get(row.forecast_date) || { date: row.forecast_date, predicted: 0 }
      item.predicted = (item.predicted || 0) + Number(row.predicted_bookings)
      map.set(row.forecast_date, item)
    })
    return [...map.values()].sort((a, b) => a.date.localeCompare(b.date))
  }, [forecastRows, historyRows])

  const byService = useMemo(() => {
    const map = new Map()
    forecastRows.forEach(row => map.set(row.category, (map.get(row.category) || 0) + Number(row.predicted_bookings)))
    return [...map].map(([service, bookings]) => ({ service, bookings: Number(bookings.toFixed(1)) })).sort((a, b) => b.bookings - a.bookings)
  }, [forecastRows])

  const byPeriod = useMemo(() => {
    const map = new Map()
    forecastRows.forEach(row => map.set(row.time_period, (map.get(row.time_period) || 0) + Number(row.predicted_bookings)))
    return [...map].map(([period, bookings]) => ({ period, bookings: Number(bookings.toFixed(1)) })).sort((a, b) => a.bookings - b.bookings)
  }, [forecastRows])

  const busyDays = useMemo(() => daily.filter(row => row.predicted != null).sort((a, b) => b.predicted - a.predicted).slice(0, 5), [daily])

  if (isOffline) return <div><h1>AI demand analysis</h1><p>Connect Supabase to view model evaluations and forecasts.</p></div>
  if (loading) return <div><h1>AI demand analysis</h1><p>Loading model results…</p></div>
  if (error) return <div><h1>AI demand analysis</h1><p role="alert">{error}</p></div>
  if (!model) return <div><h1>AI demand analysis</h1><p>No trained model has been published. Follow the pipeline instructions in <code>ai/README.md</code>.</p></div>

  const metrics = model.metrics || {}
  const comparison = metrics.model_comparison || []
  const selectedModel = metrics.selected_model || model.model_name
  const learningCurve = model.learning_curve || []
  const previousCurvePoint = learningCurve.length > 1 ? learningCurve[learningCurve.length - 2] : null
  const finalCurvePoint = learningCurve.length > 0 ? learningCurve[learningCurve.length - 1] : null
  const saturationStep = previousCurvePoint && finalCurvePoint
    ? ((previousCurvePoint.mae - finalCurvePoint.mae) / Math.max(previousCurvePoint.mae, 1)) * 100
    : null
  const saturationSummary = saturationStep == null
    ? 'Not enough learning-curve points to assess saturation.'
    : saturationStep <= 0
      ? `Possible saturation or instability: holdout MAE increased ${Math.abs(saturationStep).toFixed(1)}% at the largest training step.`
      : saturationStep < 2
        ? `Possible saturation: the final training increase improved holdout MAE by only ${saturationStep.toFixed(1)}%.`
        : `No saturation is evident: the final training increase improved holdout MAE by ${saturationStep.toFixed(1)}%.`
  const card = { background: '#fff', border: '1px solid #dce5e0', borderRadius: 10, padding: 18 }
  return <div style={{ color: '#233238' }}>
    <p style={{ color: '#247468', textTransform: 'uppercase', fontSize: 11, letterSpacing: '.12em', fontWeight: 700 }}>Artificial intelligence</p>
    <h1 style={{ fontSize: 34, margin: '8px 0' }}>Booking demand prediction</h1>
    <p style={{ color: '#526267' }}>Model {model.model_name} · {model.model_version} · Trained {new Date(model.trained_at).toLocaleString()}</p>
    {metrics.synthetic_dataset && <p style={{ padding: 12, background: '#fff3dc', borderRadius: 7 }}>This result uses synthetic demonstration data. It does not represent live booking accuracy.</p>}
    {modelOptions.length > 1 && <label style={{ display: 'block', margin: '14px 0', color: '#526267' }}>Dataset / model{' '}<select value={model.id} onChange={event => setModel(modelOptions.find(option => option.id === event.target.value) || null)} style={{ marginLeft: 8, padding: 8, borderRadius: 6, border: '1px solid #dce5e0' }}>{modelOptions.map(option => <option key={option.id} value={option.id}>{option.metrics?.dataset_source || option.model_name} · {option.metrics?.frequency || 'daily'} · {new Date(option.trained_at).toLocaleDateString()}</option>)}</select></label>}
    {String(metrics.dataset_kind || '').startsWith('external_real') && <p style={{ padding: 12, background: '#eaf2ee', borderRadius: 7 }}>External benchmark: {metrics.dataset_source}. It does not contain bookings from this platform; results describe only this source dataset.</p>}
    {metrics.target_label && <p style={{ color: '#526267', marginTop: 0 }}>Measure: {metrics.target_label} · {metrics.frequency || 'daily'} forecast</p>}
    {comparison.length === 0 && Number.isFinite(Number(metrics.baseline_improvement_percent)) && Number(metrics.baseline_improvement_percent) <= 0 && <p style={{ padding: 12, background: '#fff3dc', borderRadius: 7 }}>The trained model did not beat the lag-{metrics.seasonal_baseline_lag || 7} baseline on this holdout ({Math.abs(Number(metrics.baseline_improvement_percent)).toFixed(2)}% higher MAE). The baseline remains more accurate for this test period.</p>}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, margin: '20px 0' }}>
      {[['Predicted demand (3 ' + (metrics.frequency === 'monthly' ? 'months' : 'days') + ')', forecastRows.reduce((n, row) => n + Number(row.predicted_bookings), 0).toFixed(0)], ['Busiest category', byService[0]?.service || 'N/A'], ['Holdout MAE', metrics.mae ?? 'N/A'], ['Holdout RMSE', metrics.rmse ?? 'N/A'], ['Holdout sMAPE', `${metrics.smape_percent ?? 'N/A'}%`], [`Lag-${metrics.seasonal_baseline_lag || 7} baseline MAE`, metrics.baseline_mae ?? 'N/A'], ['Baseline MAE reduction', `${Number(metrics.baseline_improvement_percent || 0).toFixed(2)}%`], ['Dataset rows', model.dataset_rows], ['Normalized MAE score (not accuracy)', `${(Number(metrics.normalized_mae_accuracy || 0) * 100).toFixed(1)}%`]].map(([label, value]) => <div key={label} style={card}><div style={{ color: '#526267', fontSize: 12 }}>{label}</div><strong style={{ display: 'block', fontSize: 21, marginTop: 7 }}>{value}</strong></div>)}
    </div>
    <p style={{ color: '#526267', fontSize: 13 }}>Regression quality is measured with MAE and RMSE in target units and sMAPE as a percentage. Positive baseline MAE reduction means the selected model makes smaller errors; a negative value means the baseline is better. The normalized MAE score is a custom comparison with average holdout demand; it is not classification accuracy.</p>
    {comparison.length > 0 && <section style={{ ...card, marginBottom: 18 }}>
      <h2>Model comparison</h2>
      <p style={{ color: '#526267' }}>Selected {selectedModel} using validation data from {metrics.validation_start} through the day before {metrics.holdout_start}. That final chronological period is kept separate for evaluation.</p>
      <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead><tr><th style={{ padding: 8, borderBottom: '1px solid #dce5e0' }}>Model</th><th style={{ padding: 8, borderBottom: '1px solid #dce5e0' }}>Validation MAE</th><th style={{ padding: 8, borderBottom: '1px solid #dce5e0' }}>Selection</th></tr></thead>
        <tbody>{comparison.map(item => <tr key={item.model}><td style={{ padding: 8, borderBottom: '1px solid #edf1ef' }}>{item.model.replaceAll('_', ' ')}</td><td style={{ padding: 8, borderBottom: '1px solid #edf1ef' }}>{Number(item.validation_mae).toFixed(2)}</td><td style={{ padding: 8, borderBottom: '1px solid #edf1ef' }}>{item.model === selectedModel ? 'Selected ML model' : item.model.endsWith('_baseline') ? 'Benchmark' : 'Compared'}</td></tr>)}</tbody>
      </table></div>
      {Number(metrics.baseline_improvement_percent) <= 0 && <p style={{ padding: 10, background: '#fff3dc', borderRadius: 7, marginBottom: 0 }}>The selected ML model did not beat the lag-{metrics.seasonal_baseline_lag || 7} baseline on the final holdout ({Math.abs(Number(metrics.baseline_improvement_percent)).toFixed(2)}% higher MAE). The comparison is reported transparently; this benchmark does not establish that the model improves this platform.</p>}
    </section>}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
      <section style={card}><h2>Historical vs predicted demand</h2><div style={{ height: 300 }}><ResponsiveContainer width="100%" height="100%"><LineChart data={daily}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tick={{ fontSize: 10 }} minTickGap={22} /><YAxis /><Tooltip /><Line type="monotone" dataKey="actual" stroke="#203238" name="Observed demand" dot={false} /><Line type="monotone" dataKey="predicted" stroke="#247468" name="Predicted demand" dot={false} /></LineChart></ResponsiveContainer></div></section>
      <section style={card}><h2>Expected demand by service</h2><div style={{ height: 300 }}><ResponsiveContainer width="100%" height="100%"><BarChart data={byService} layout="vertical" margin={{ left: 20 }}><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis type="category" dataKey="service" width={130} tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="bookings" fill="#247468" /></BarChart></ResponsiveContainer></div></section>
      <section style={card}><h2>Expected busy and quiet periods</h2><div style={{ height: 280 }}><ResponsiveContainer width="100%" height="100%"><BarChart data={byPeriod}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="period" /><YAxis /><Tooltip /><Bar dataKey="bookings" fill="#6f9b8e" /></BarChart></ResponsiveContainer></div><p>Quietest period: {byPeriod[0]?.period || '—'}</p></section>
      <section style={card}><h2>Expected busiest {metrics.frequency === 'monthly' ? 'months' : 'days'}</h2>{busyDays.map(day => <p key={day.date} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e6ece9', paddingBottom: 8 }}><span>{day.date}</span><strong>{day.predicted.toFixed(1)} demand units</strong></p>)}</section>
      <section style={card}><h2>Model learning curve and saturation</h2><div style={{ height: 280 }}><ResponsiveContainer width="100%" height="100%"><AreaChart data={learningCurve}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="training_rows" name="Training rows" /><YAxis /><Tooltip /><Area type="monotone" dataKey="mae" stroke="#247468" fill="#c7e0d5" name="Holdout MAE" /></AreaChart></ResponsiveContainer></div><p style={{ color: '#526267', fontSize: 12 }}>{saturationSummary} This dashboard treats a final-step change below 2% as a possible plateau heuristic. A flattening curve means added data yields smaller error improvements.</p></section>
    </div>
  </div>
}
