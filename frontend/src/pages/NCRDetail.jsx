import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/client.js'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import SeverityBadge from '../components/SeverityBadge.jsx'

export default function NCRDetail() {
  const { ncrId } = useParams()
  const navigate = useNavigate()
  const [ncr, setNcr] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const data = await api.getNcrDetail(ncrId)
        setNcr(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [ncrId])

  if (loading) return <LoadingSpinner message="Loading NCR detail..." />

  if (error) return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
        <strong>Error loading NCR:</strong> {error}
        <button onClick={() => navigate(-1)} className="ml-4 text-sm underline">← Go back</button>
      </div>
    </div>
  )

  if (!ncr) return null

  // Safe JSON parsing with fallbacks
  let actions = []
  try {
    const parsed = JSON.parse(ncr.actions_json || '[]')
    actions = Array.isArray(parsed) ? parsed : []
  } catch { actions = [] }

  let scheduleImpact = {}
  try {
    scheduleImpact = JSON.parse(ncr.schedule_impact_json || '{}') || {}
  } catch { scheduleImpact = {} }

  const wConformPct = ncr.w_conform != null
    ? Math.round(parseFloat(ncr.w_conform) * 100)
    : null

  const wConformColor = wConformPct != null
    ? wConformPct >= 70 ? 'bg-green-500'
      : wConformPct >= 40 ? 'bg-amber-400'
      : 'bg-red-500'
    : 'bg-slate-300'

  const impactTasks = scheduleImpact?.tasks || []

  return (
    <div className="max-w-4xl mx-auto space-y-5">

      {/* Top bar */}
      <div className="flex items-center justify-between no-print">
        <button
          onClick={() => navigate(-1)}
          className="text-slate-500 hover:text-slate-700 text-sm font-medium flex items-center gap-1"
        >
          ← Back
        </button>
        <div className="flex items-center gap-3">
          <span className="text-slate-400 text-xs">
            {(ncr.raised_ts || '').slice(0, 19).replace('T', ' ')}
          </span>
          <button
            onClick={() => window.print()}
            className="bg-slate-700 hover:bg-slate-800 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            🖨 Export to PDF
          </button>
        </div>
      </div>

      {/* Header card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <SeverityBadge severity={ncr.severity || 'MINOR'} />
          <SeverityBadge severity={ncr.status || 'open'} />
        </div>
        <h1 className="text-xl font-bold text-slate-800">
          {ncr.title || 'Non-Conformance Report'}
        </h1>
        <p className="text-slate-500 text-sm mt-2">
          {ncr.vendor_name || 'Unknown vendor'}
          {ncr.po_number ? ` · ${ncr.po_number}` : ''}
          {ncr.due_date ? ` · Due: ${ncr.due_date}` : ''}
          {ncr.assigned_to ? ` · Assigned to: ${ncr.assigned_to}` : ''}
        </p>
      </div>

      {/* Deviation details */}
      {(ncr.attribute_name || ncr.specified_value) && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h2 className="font-semibold text-slate-700 mb-4">Deviation Details</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="text-slate-500 text-xs font-medium uppercase tracking-wide mb-1">
                Attribute
              </div>
              <div className="font-semibold text-slate-800">
                {(ncr.attribute_name || 'N/A').replace(/_/g, ' ')}
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="text-slate-500 text-xs font-medium uppercase tracking-wide mb-1">
                Deviation
              </div>
              <div className="font-semibold text-slate-700">
                {ncr.deviation_pct != null
                  ? `${parseFloat(ncr.deviation_pct).toFixed(1)}% from spec`
                  : 'Type/value mismatch'}
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-slate-500 text-xs font-medium uppercase tracking-wide mb-1">
                Specified Value
              </div>
              <div className="font-bold text-green-700 text-lg">
                {ncr.specified_value || 'N/A'}
              </div>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <div className="text-slate-500 text-xs font-medium uppercase tracking-wide mb-1">
                Submitted Value
              </div>
              <div className="font-bold text-red-700 text-lg">
                {ncr.submitted_value || 'N/A'}
              </div>
            </div>
          </div>

          {wConformPct != null && (
            <div className="mt-5">
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="text-slate-600 font-medium">Conformance Weight (w_conform)</span>
                <span className="font-bold text-slate-700">{wConformPct}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${wConformColor}`}
                  style={{ width: `${wConformPct}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>Non-conformant</span>
                <span>Fully compliant</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Specification reference */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
        <h2 className="font-semibold text-slate-700 mb-2">Specification Reference</h2>
        <p className="font-mono text-sm text-slate-700">
          {ncr.clause_number
            ? `Clause ${ncr.clause_number}`
            : ncr.spec_clause_ref || 'See project specification'}
          {ncr.clause_title ? ` — ${ncr.clause_title}` : ''}
        </p>
        {ncr.equipment_description && (
          <p className="text-slate-500 text-sm mt-1">
            Equipment: {ncr.equipment_description}
          </p>
        )}
        {ncr.description && (
          <div className="mt-3 text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
            {ncr.description}
          </div>
        )}
      </div>

      {/* Schedule impact */}
      {impactTasks.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h2 className="font-semibold text-slate-700 mb-3">Schedule Impact</h2>
          <div className="flex items-center gap-3 mb-3">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              scheduleImpact.risk_level === 'CRITICAL' ? 'bg-red-600 text-white' :
              scheduleImpact.risk_level === 'HIGH' ? 'bg-orange-500 text-white' :
              scheduleImpact.risk_level === 'MEDIUM' ? 'bg-amber-400 text-slate-900' :
              'bg-green-100 text-green-800'
            }`}>
              {scheduleImpact.risk_level || 'LOW'}
            </span>
            <span className="text-sm text-slate-600">
              Min float: <strong>{scheduleImpact.min_float_days ?? 'N/A'}</strong> days
              {scheduleImpact.days_until_required != null &&
                ` · First linked task in ${scheduleImpact.days_until_required} days`}
            </span>
          </div>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold text-slate-600">Code</th>
                  <th className="text-left px-3 py-2 font-semibold text-slate-600">Description</th>
                  <th className="text-center px-3 py-2 font-semibold text-slate-600">Float Days</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {impactTasks.map(t => (
                  <tr key={t.id} className={t.float_days === 0 ? 'bg-red-50' : ''}>
                    <td className="px-3 py-2 font-mono text-xs text-slate-600">{t.code || t.id}</td>
                    <td className="px-3 py-2 text-slate-700">{t.description}</td>
                    <td className={`px-3 py-2 text-center font-bold ${
                      t.float_days === 0 ? 'text-red-600' : 'text-slate-600'
                    }`}>
                      {t.float_days}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recommended actions */}
      {actions.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h2 className="font-semibold text-slate-700 mb-4">Recommended Actions</h2>
          <ol className="space-y-3">
            {actions.map((action, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="flex-shrink-0 w-6 h-6 bg-teal-100 text-teal-700 rounded-full
                  flex items-center justify-center font-bold text-xs">
                  {i + 1}
                </span>
                <span className="text-slate-700 leading-relaxed">{action}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}