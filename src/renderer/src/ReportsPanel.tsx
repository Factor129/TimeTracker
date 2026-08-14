import { useEffect, useState } from 'react'
import type { MonthlyReportRow } from '../../shared/types'

function monthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
}

function formatHours(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return `${h}h ${m.toString().padStart(2, '0')}m`
}

export default function ReportsPanel(): React.JSX.Element {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [rows, setRows] = useState<MonthlyReportRow[]>([])

  useEffect(() => {
    void load()
  }, [year, month])

  async function load(): Promise<void> {
    const data = await window.api.report.monthly(year, month)
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
    a.download = `informe-${year}-${month.toString().padStart(2, '0')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalHours = rows.reduce((sum, r) => sum + r.totalHours, 0)
  const totalAmount = rows.reduce((sum, r) => sum + (r.amount ?? 0), 0)

  return (
    <div className="card">
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
                Sin registros para este mes.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="totals" style={{ marginTop: 12 }}>
        Total: <strong>{formatHours(totalHours)}</strong> · Importe estimado:{' '}
        <strong>{totalAmount.toFixed(2)} €</strong>
      </div>
    </div>
  )
}
