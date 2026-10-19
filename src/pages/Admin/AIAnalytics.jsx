import { useEffect, useMemo, useState } from 'react'
import { supabase, isOffline } from '../../lib/supabase'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export default function AIAnalytics() {
  const [model, setModel] = useState(null)
  const [forecastRows, setForecastRows] = useState([])
  const [historyRows, setHistoryRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOffline) { setLoading(false); return }
    let active = true
    const load = async () => {
      const { data: latest, error: modelError } = await supabase.from('ai_model_metrics').select('*').order('trained_at', { ascending: false }).limit(1).maybeSingle()
      if (modelError) { if (active) { setError(modelError.message); setLoading(false) }; return }
      if (!latest) { if (active) setLoading(false); return }
      const lastTrainingDate = latest.metrics?.training_end
      const historyStart = lastTrainingDate ? new Date(`${lastTrainingDate}T00:00:00`) : null
      if (historyStart) historyStart.setDate(historyStart.getDate() - 89)
      const [forecast, history] = await Promise.all([
        supabase.from('ai_forecasts').select('forecast_date, category, time_period, predicted_bookings').eq('model_metrics_id', latest.id).order('forecast_date'),
        supabase.from('ai_daily_history').select('booking_date, category, actual_bookings').gte('booking_date', historyStart?.toISOString().slice(0, 10) || '1900-01-01').lte('booking_date', lastTrainingDate || '2999-12-31').order('booking_date', { ascending: false }).limit(3000),
      ])
      if (!active) return
      if (forecast.error || history.error) setError('Unable to load demand analysis.')
      setModel(latest)
      setForecastRows(forecast.data || [])
      setHistoryRows(history.data || [])
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [])

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
  const card = { background: '#fff', border: '1px solid #dce5e0', borderRadius: 10, padding: 18 }
  return <div style={{ color: '#233238' }}>
    <p style={{ color: '#247468', textTransform: 'uppercase', fontSize: 11, letterSpacing: '.12em', fontWeight: 700 }}>Artificial intelligence</p>
    <h1 style={{ fontSize: 34, margin: '8px 0' }}>Booking demand prediction</h1>
    <p style={{ color: '#526267' }}>Model {model.model_name} · {model.model_version} · Trained {new Date(model.trained_at).toLocaleString()}</p>
    {metrics.synthetic_dataset && <p style={{ padding: 12, background: '#fff3dc', borderRadius: 7 }}>This result uses synthetic demonstration data. It does not represent live booking accuracy.</p>}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, margin: '20px 0' }}>
      {[["Predicted bookings · 3 days", forecastRows.reduce((n, row) => n + Number(row.predicted_bookings), 0).toFixed(0)], ['Busy service', byService[0]?.service || '—'], ['MAE', metrics.mae ?? '—'], ['Baseline MAE', metrics.baseline_mae ?? '—'], ['Dataset rows', model.dataset_rows], ['Normalized score', `${(Number(metrics.normalized_mae_accuracy || 0) * 100).toFixed(1)}%`]].map(([label, value]) => <div key={label} style={card}><div style={{ color: '#526267', fontSize: 12 }}>{label}</div><strong style={{ display: 'block', fontSize: 21, marginTop: 7 }}>{value}</strong></div>)}
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
      <section style={card}><h2>Historical vs predicted demand</h2><div style={{ height: 300 }}><ResponsiveContainer width="100%" height="100%"><LineChart data={daily}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tick={{ fontSize: 10 }} minTickGap={22} /><YAxis /><Tooltip /><Line type="monotone" dataKey="actual" stroke="#203238" name="Historical bookings" dot={false} /><Line type="monotone" dataKey="predicted" stroke="#247468" name="Predicted bookings" dot={false} /></LineChart></ResponsiveContainer></div></section>
      <section style={card}><h2>Expected demand by service</h2><div style={{ height: 300 }}><ResponsiveContainer width="100%" height="100%"><BarChart data={byService} layout="vertical" margin={{ left: 20 }}><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis type="category" dataKey="service" width={130} tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="bookings" fill="#247468" /></BarChart></ResponsiveContainer></div></section>
      <section style={card}><h2>Expected busy and quiet periods</h2><div style={{ height: 280 }}><ResponsiveContainer width="100%" height="100%"><BarChart data={byPeriod}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="period" /><YAxis /><Tooltip /><Bar dataKey="bookings" fill="#6f9b8e" /></BarChart></ResponsiveContainer></div><p>Quietest period: {byPeriod[0]?.period || '—'}</p></section>
      <section style={card}><h2>Expected busiest days</h2>{busyDays.map(day => <p key={day.date} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e6ece9', paddingBottom: 8 }}><span>{day.date}</span><strong>{day.predicted.toFixed(1)} bookings</strong></p>)}</section>
      <section style={card}><h2>Model learning curve</h2><div style={{ height: 280 }}><ResponsiveContainer width="100%" height="100%"><AreaChart data={model.learning_curve || []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="training_rows" name="Training rows" /><YAxis /><Tooltip /><Area type="monotone" dataKey="mae" stroke="#247468" fill="#c7e0d5" name="Holdout MAE" /></AreaChart></ResponsiveContainer></div><p style={{ color: '#526267', fontSize: 12 }}>A flattening curve suggests added data yields smaller error improvements. MAE is measured on a chronological holdout; normalized score is not classification accuracy.</p></section>
    </div>
  </div>
}
