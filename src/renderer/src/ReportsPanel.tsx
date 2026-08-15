import { useEffect, useState } from 'react'
import type { ReportRow } from '../../shared/types'
import EntriesList from './EntriesList'

type Mode = 'month' | 'range'

function monthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
}

function formatHours(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return `${h}h ${m.toString().padStart(2, '0')}m`
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function firstDayOfMonthISO(): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

export default function ReportsPanel(): React.JSX.Element {
  const now = new Date()
  const [mode, setMode] = useState<Mode>('month')
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [from, setFrom] = useState(firstDayOfMonthISO())
  const [to, setTo] = useState(todayISO())
  const [rows, setRows] = useState<ReportRow[]>([])

  const rangeFromISO =
    mode === 'month'
      ? new Date(year, month - 1, 1).toISOString()
      : new Date(`${from}T00:00:00`).toISOString()
  const rangeToISO =
    mode === 'month' ? new Date(year, month, 1).toISOString() : new Date(`${to}T23:59:59.999`).toISOString()

  useEffect(() => {
    void load()
  }, [mode, year, month, from, to])

  async function load(): Promise<void> {
    const data =
      mode === 'month' ? await window.api.report.monthly(year, month) : await window.api.report.range(rangeFromISO, rangeToISO)
    setRows(data)
  }

  function shiftMonth(delta: number): void {
    let m = month + delta
    let y = year
    if (m < 1) {
      m = 12
      y -= 1
    } else if (m > 12) {
      m = 1
      y += 1
    }
    setMonth(m)
    setYear(y)
  }

  function exportCsv(): void {
    const header = ['Proyecto', 'Cliente', 'Horas', 'Tarifa (€/h)', 'Importe (€)']
    const lines = rows.map((r) => [
      r.projectName,
      r.clientName,
      r.totalHours.toFixed(2),
      r.hourlyRate != null ? r.hourlyRate.toFixed(2) : '',
      r.amount != null ? r.amount.toFixed(2) : ''
    ])
    const csv = [header, ...lines].map((row) => row.map((v) => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const suffix = mode === 'month' ? `${year}-${month.toString().padStart(2, '0')}` : `${from}_${to}`
    a.download = `informe-${suffix}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalHours = rows.reduce((sum, r) => sum + r.totalHours, 0)
  const totalAmount = rows.reduce((sum, r) => sum + (r.amount ?? 0), 0)

  return (
    <div className="card">
      <div className="tabs" style={{ marginLeft: 0, marginBottom: 14 }}>
        <button className={`tab-btn ${mode === 'month' ? 'active' : ''}`} onClick={() => setMode('month')}>
          Por mes
        </button>
        <button className={`tab-btn ${mode === 'range' ? 'active' : ''}`} onClick={() => setMode('range')}>
          Rango personalizado
        </button>
      </div>

      {mode === 'month' ? (
        <div className="month-picker">
          <button className="btn secondary" onClick={() => shiftMonth(-1)}>
            ← Anterior
          </button>
          <strong style={{ textTransform: 'capitalize', minWidth: 160, textAlign: 'center' }}>
            {monthLabel(year, month)}
          </strong>
          <button className="btn secondary" onClick={() => shiftMonth(1)}>
            Siguiente →
          </button>
          <div style={{ flex: 1 }} />
          <button className="btn" onClick={exportCsv} disabled={rows.length === 0}>
            Exportar CSV
          </button>
        </div>
      ) : (
        <div className="month-picker">
          <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>Del</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>al</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <div style={{ flex: 1 }} />
          <button className="btn" onClick={exportCsv} disabled={rows.length === 0}>
            Exportar CSV
          </button>
        </div>
      )}

      <table>
        <thead>
          <tr>
            <th>Proyecto</th>
            <th>Cliente</th>
            <th>Horas</th>
            <th>Tarifa</th>
            <th>Importe</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.projectId}>
              <td>{r.projectName}</td>
              <td>{r.clientName}</td>
              <td>{formatHours(r.totalHours)}</td>
              <td>{r.hourlyRate != null ? `${r.hourlyRate.toFixed(2)} €/h` : '—'}</td>
              <td>{r.amount != null ? `${r.amount.toFixed(2)} €` : '—'}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} style={{ color: 'var(--text-dim)' }}>
                Sin registros para este periodo.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="totals" style={{ marginTop: 12 }}>
        Total: <strong>{formatHours(totalHours)}</strong> · Importe estimado:{' '}
        <strong>{totalAmount.toFixed(2)} €</strong>
      </div>

      <EntriesList key={`${rangeFromISO}_${rangeToISO}`} fromISO={rangeFromISO} toISO={rangeToISO} onChange={load} />
    </div>
  )
}
