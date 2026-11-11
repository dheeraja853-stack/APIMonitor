
import { useState, useEffect } from 'react'
import {
  checkBackend,
  checkMonitor,
  registerMonitor,
  getMonitors,
  getMonitorHistory,
  getIncidents,
  updateMonitor,
  deleteMonitor
} from './services/api'

function App() {
  const [activeTab, setActiveTab] = useState('Overview')
  const [showForm, setShowForm] = useState(false)
  const [monitors, setMonitors] = useState([])
  const [editingMonitor, setEditingMonitor] = useState(null)
  const [incidents, setIncidents] = useState([])
  const [selectedMonitor, setSelectedMonitor] = useState(null)
  const [monitorHistory, setMonitorHistory] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [backendConnected, setBackendConnected] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    url: '',
    interval: '5'
  })

  useEffect(() => {
    const checkConnection = async () => {
      try {
        await checkBackend()
        setBackendConnected(true)
      } catch (error) {
        setBackendConnected(false)
      }
    }

    checkConnection()
    const interval = setInterval(checkConnection, 5000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const fetchMonitorData = async () => {
      try {
        const data = await getMonitors()
        setMonitors(data)
      } catch (error) {
        console.log('Unable to refresh monitor data')
      }
    }

    fetchMonitorData()
    const interval = setInterval(fetchMonitorData, 5000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const fetchIncidentData = async () => {
      try {
        const data = await getIncidents()
        setIncidents(data)
      } catch (error) {
        console.log('Unable to refresh incident data')
      }
    }

    fetchIncidentData()
    const interval = setInterval(fetchIncidentData, 5000)

    return () => clearInterval(interval)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      const result = editingMonitor
        ? { monitor: await updateMonitor(editingMonitor._id, formData) }
        : await registerMonitor({
            name: formData.name,
            url: formData.url,
            interval: formData.interval
          })

      const newMonitor = {
        ...result.monitor,
        status: editingMonitor ? 'Pending' : 'Checking...',
        responseTime: editingMonitor ? null : 'Checking...',
        uptime: 'N/A'
      }

      if (editingMonitor) {
        setMonitors((prev) =>
          prev.map((monitor) =>
            (monitor._id || monitor.id) === newMonitor._id
              ? newMonitor
              : monitor
          )
        )
      } else {
        setMonitors((prev) => [...prev, newMonitor])
      }

      setShowForm(false)
      setFormData({ name: '', url: '', interval: '5' })
      setEditingMonitor(null)

      try {
        const checkResult = await checkMonitor(newMonitor.url)

        setMonitors((prev) =>
          prev.map((monitor) =>
            (monitor._id || monitor.id) === (newMonitor._id || newMonitor.id)
              ? {
                  ...monitor,
                  status: checkResult.status,
                  responseTime: `${checkResult.responseTime} ms`
                }
              : monitor
          )
        )
      } catch (error) {
        setMonitors((prev) =>
          prev.map((monitor) =>
            (monitor._id || monitor.id) === (newMonitor._id || newMonitor.id)
              ? {
                  ...monitor,
                  status: 'Down',
                  responseTime: 'N/A'
                }
              : monitor
          )
        )
      }
    } catch (error) {
      console.error('Monitor registration failed:', error)
      alert('Unable to register monitor. Please check the backend.')
    }
  }

  const handleEdit = (monitor) => {
    setEditingMonitor(monitor)

    setFormData({
      name: monitor.name,
      url: monitor.url,
      interval: String(monitor.interval)
    })

    setShowForm(true)
  }

  const handleDelete = async (monitor) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${monitor.name}?`
    )

    if (!confirmed) return

    try {
      await deleteMonitor(monitor._id || monitor.id)

      setMonitors((prev) =>
        prev.filter(
          (item) =>
            (item._id || item.id) !== (monitor._id || monitor.id)
        )
      )

      setIncidents((prev) =>
        prev.filter(
          (incident) =>
            String(incident.monitor) !== String(monitor._id || monitor.id)
        )
      )

      console.log('Monitor deleted successfully')
    } catch (error) {
      console.error('Delete failed:', error)
      alert(error.message || 'Unable to delete monitor.')
    }
  }

  const handleViewHistory = async (monitor) => {
    try {
      const history = await getMonitorHistory(
        monitor._id || monitor.id
      )

      setSelectedMonitor(monitor)
      setMonitorHistory(history)
      setShowHistory(true)
    } catch (error) {
      console.error('Unable to load monitor history:', error)
      alert('Unable to load monitoring history.')
    }
  }

  const openIncidentCount = incidents.filter(
    (incident) => incident.status === 'Open'
  ).length

  const onlineCount = monitors.filter(
    (monitor) => monitor.status === 'Online'
  ).length

  const downCount = monitors.filter(
    (monitor) => monitor.status === 'Down'
  ).length

  const pendingCount = monitors.filter(
    (monitor) =>
      monitor.status === 'Pending' ||
      monitor.status === 'Checking...'
  ).length

  const stats = [
    {
      title: 'Total Monitors',
      value: monitors.length,
      detail: 'Registered API endpoints',
      icon: '◈',
      color: 'blue',
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-400'
    },
    {
      title: 'Operational',
      value: onlineCount,
      detail: 'Currently online',
      icon: '✓',
      color: 'emerald',
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-400'
    },
    {
      title: 'Down',
      value: downCount,
      detail: 'Require attention',
      icon: '!',
      color: 'rose',
      iconBg: 'bg-rose-500/10',
      iconColor: 'text-rose-400'
    },
    {
      title: 'Pending',
      value: pendingCount,
      detail: 'Awaiting first check',
      icon: '◷',
      color: 'amber',
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-400'
    }
  ]

  const menuItems = [
    { name: 'Overview', icon: '▦' },
    { name: 'Monitors', icon: '◉' },
    { name: 'Incidents', icon: '⚑' }
  ]

  const getStatusStyle = (status) => {
    if (status === 'Online' || status === 'Resolved') {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    }

    if (status === 'Down' || status === 'Open') {
      return 'bg-rose-500/10 text-rose-400 border-rose-500/20'
    }

    return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
  }

  const formatDate = (date) => {
    return date ? new Date(date).toLocaleString() : '—'
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingMonitor(null)
    setFormData({ name: '', url: '', interval: '5' })
  }

  return (
    <div className="min-h-screen bg-[#080b14] text-slate-100 flex">

      {/* Sidebar */}
      <aside className="w-64 min-h-screen shrink-0 border-r border-slate-800/70 bg-[#0c1120] p-6 hidden md:flex md:flex-col shadow-2xl shadow-black/20">

        <div className="flex items-center gap-3 mb-12">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center font-bold text-xl shadow-lg shadow-blue-500/20">
            A
          </div>

          <div>
            <h1 className="font-bold text-lg tracking-tight text-white">
              API Monitor
            </h1>
            <p className="text-xs text-slate-500">
              Monitoring Dashboard
            </p>
          </div>
        </div>

        <div>
          <p className="text-[11px] text-slate-500 uppercase tracking-[0.2em] font-semibold mb-4 px-3">
            Workspace
          </p>

          <nav className="space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.name}
                onClick={() => setActiveTab(item.name)}
                className={`w-full flex items-center gap-3 text-left px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
                  activeTab === item.name
                    ? 'bg-gradient-to-r from-blue-600/20 to-violet-600/10 text-blue-300 border border-blue-500/20 shadow-lg shadow-blue-950/20'
                    : 'text-slate-400 border border-transparent hover:bg-white/[0.04] hover:text-white hover:border-white/5'
                }`}
              >
                <span className="text-lg w-5 text-center">
                  {item.icon}
                </span>
                <span className="text-sm">{item.name}</span>

                {item.name === 'Incidents' && openIncidentCount > 0 && (
                  <span className="ml-auto rounded-full bg-rose-500/15 text-rose-400 text-xs px-2 py-0.5">
                    {openIncidentCount}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto pt-10">
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/50 shadow-xl shadow-black/20">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold tracking-wide text-slate-200">
                System Status
              </p>
              <span className={`w-2 h-2 rounded-full ${
                backendConnected
                  ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]'
                  : 'bg-rose-400'
              }`} />
            </div>

            <p className="text-xs text-slate-400">
              Frontend is running
            </p>

            <p className={`text-xs mt-3 font-medium ${
              backendConnected ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              ● {backendConnected ? 'Backend connected' : 'Backend disconnected'}
            </p>
          </div>

          <p className="text-[11px] text-slate-600 text-center mt-5">
            API Monitor · Dashboard
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 p-5 md:p-8 lg:p-10 overflow-hidden bg-gradient-to-br from-[#080b14] via-[#0b1020] to-[#0d1020]">

        {/* Header */}
        <header className="flex flex-wrap justify-between items-center gap-5 mb-8 pb-7 border-b border-slate-800/70">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              Workspace / {activeTab}
            </p>

            <h2 className="text-3xl md:text-4xl font-bold mt-3 tracking-tight text-white">
              {activeTab}
            </h2>

            <p className="text-slate-400 mt-2 text-sm">
              Monitor and manage your API performance.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('Incidents')}
              className="relative w-11 h-11 flex items-center justify-center rounded-xl border border-slate-700/70 bg-slate-800/40 text-slate-300 hover:text-white hover:bg-slate-700/50 transition"
              title="View incidents"
            >
              <span className="text-xl">♧</span>

              {openIncidentCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-bold rounded-full min-w-5 h-5 flex items-center justify-center px-1 border-2 border-[#080b14]">
                  {openIncidentCount}
                </span>
              )}
            </button>

            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
              A
            </div>
          </div>
        </header>

        {/* Mobile Navigation */}
        <div className="flex md:hidden gap-2 mb-7 overflow-x-auto pb-2">
          {menuItems.map((item) => (
            <button
              key={item.name}
              onClick={() => setActiveTab(item.name)}
              className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                activeTab === item.name
                  ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                  : 'bg-slate-800/40 text-slate-400 border border-slate-700/50'
              }`}
            >
              {item.name}
            </button>
          ))}
        </div>

        {/* Welcome Banner */}
        {activeTab !== 'Incidents' && (
          <section className="mb-8 rounded-2xl border border-blue-500/15 bg-gradient-to-r from-blue-600/10 via-indigo-600/5 to-violet-600/10 p-6 md:p-7 shadow-xl shadow-blue-950/10">
            <div className="flex flex-wrap justify-between items-center gap-5">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] font-semibold text-blue-400 mb-2">
                  Monitoring workspace
                </p>

                <h3 className="text-xl md:text-2xl font-bold tracking-tight text-white">
                  Welcome to API Monitor!
                </h3>

                <p className="text-slate-400 text-sm mt-2">
                  Add your API endpoints and monitor their health from one place.
                </p>
              </div>

              <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-400/20 items-center justify-center text-2xl text-blue-300">
                ◈
              </div>
            </div>
          </section>
        )}

        {/* Overview Statistics */}
        {activeTab === 'Overview' && (
          <>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Performance Overview
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Current status of your monitored endpoints
                </p>
              </div>

              <span className="text-xs text-slate-500 border border-slate-700/60 bg-slate-800/30 px-3 py-2 rounded-lg">
                Live statistics
              </span>
            </div>

            <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
              {stats.map((stat) => (
                <div
                  key={stat.title}
                  className="group relative overflow-hidden bg-[#111827]/90 border border-slate-700/50 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/30 hover:bg-[#151f31] hover:shadow-xl hover:shadow-blue-950/10"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-slate-400 text-sm font-medium">
                      {stat.title}
                    </p>

                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold ${stat.iconBg} ${stat.iconColor}`}>
                      {stat.icon}
                    </div>
                  </div>

                  <h3 className="text-4xl font-bold mt-6 tracking-tight text-white">
                    {stat.value}
                  </h3>

                  <p className="text-slate-500 text-xs mt-2">
                    {stat.detail}
                  </p>

                  <div className="absolute -right-8 -bottom-12 w-28 h-28 rounded-full bg-blue-500/[0.035] blur-2xl group-hover:bg-blue-500/[0.08] transition" />
                </div>
              ))}
            </section>

            {/* Overview Summary */}
            <section className="bg-[#111827]/80 border border-slate-700/50 rounded-2xl p-6">
              <div className="flex flex-wrap justify-between items-center gap-4 mb-5">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Monitoring Summary
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Overall health of your API monitoring system
                  </p>
                </div>

                <button
                  onClick={() => setActiveTab('Monitors')}
                  className="text-sm text-blue-400 hover:text-blue-300 font-medium transition"
                >
                  View all monitors →
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl bg-emerald-500/[0.06] border border-emerald-500/15 p-4">
                  <p className="text-xs text-slate-400">Online endpoints</p>
                  <p className="text-2xl font-bold text-emerald-400 mt-2">
                    {onlineCount}
                  </p>
                </div>

                <div className="rounded-xl bg-rose-500/[0.06] border border-rose-500/15 p-4">
                  <p className="text-xs text-slate-400">Down endpoints</p>
                  <p className="text-2xl font-bold text-rose-400 mt-2">
                    {downCount}
                  </p>
                </div>

                <div className="rounded-xl bg-amber-500/[0.06] border border-amber-500/15 p-4">
                  <p className="text-xs text-slate-400">Open incidents</p>
                  <p className="text-2xl font-bold text-amber-400 mt-2">
                    {openIncidentCount}
                  </p>
                </div>
              </div>
            </section>
          </>
        )}

        {/* Monitors Page */}
        {activeTab === 'Monitors' && (
          <section className="bg-[#111827]/85 border border-slate-700/50 rounded-2xl p-5 md:p-6 shadow-xl shadow-black/10">

            <div className="flex flex-wrap justify-between items-center gap-4 mb-7">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Your API Monitors
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Manage and monitor your API endpoints
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingMonitor(null)
                  setFormData({ name: '', url: '', interval: '5' })
                  setShowForm(true)
                }}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-5 py-3 rounded-xl text-sm font-semibold text-white shadow-lg shadow-blue-900/25 transition-all duration-200 hover:-translate-y-0.5"
              >
                + Add Monitor
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left min-w-[850px]">
                <thead className="text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-700/70">
                  <tr>
                    <th className="py-4 px-3 font-semibold">API Name</th>
                    <th className="py-4 px-3 font-semibold">URL</th>
                    <th className="py-4 px-3 font-semibold">Status</th>
                    <th className="py-4 px-3 font-semibold">Response Time</th>
                    <th className="py-4 px-3 font-semibold">Uptime</th>
                    <th className="py-4 px-3 font-semibold">Interval</th>
                    <th className="py-4 px-3 font-semibold">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800/70">
                  {monitors.map((monitor) => (
                    <tr
                      key={monitor._id || monitor.id}
                      className="group hover:bg-white/[0.025] transition-colors"
                    >
                      <td className="py-5 px-3 font-semibold text-slate-200">
                        {monitor.name}
                      </td>

                      <td className="py-5 px-3 text-slate-400 max-w-48 truncate">
                        {monitor.url}
                      </td>

                      <td className="py-5 px-3">
                        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap ${getStatusStyle(monitor.status)}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {monitor.status}
                        </span>
                      </td>

                      <td className="py-5 px-3 text-slate-300">
                        {monitor.responseTime !== null && monitor.responseTime !== undefined
                          ? typeof monitor.responseTime === 'number'
                            ? `${monitor.responseTime} ms`
                            : monitor.responseTime
                          : 'N/A'}
                      </td>

                      <td className="py-5 px-3 text-slate-300">
                        {monitor.uptime !== undefined
                          ? `${monitor.uptime}%`
                          : 'Calculating...'}
                      </td>

                      <td className="py-5 px-3 text-slate-400 whitespace-nowrap">
                        {monitor.interval} min
                      </td>

                      <td className="py-5 px-3">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleViewHistory(monitor)}
                            className="text-blue-400 hover:text-blue-300 text-xs font-medium whitespace-nowrap transition"
                          >
                            History
                          </button>

                          <button
                            onClick={() => handleEdit(monitor)}
                            className="text-amber-400 hover:text-amber-300 text-xs font-medium transition"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => handleDelete(monitor)}
                            className="text-rose-400 hover:text-rose-300 text-xs font-medium transition"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {monitors.length === 0 && (
                <div className="text-center py-16">
                  <div className="w-14 h-14 rounded-2xl bg-slate-800/70 border border-slate-700/60 flex items-center justify-center mx-auto mb-4 text-2xl text-slate-400">
                    ◈
                  </div>

                  <p className="text-slate-300 font-medium">
                    No APIs added yet
                  </p>

                  <p className="text-slate-500 text-sm mt-2">
                    Click Add Monitor to register your first API.
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Incidents Page */}
        {activeTab === 'Incidents' && (
          <section className="bg-[#111827]/85 border border-slate-700/50 rounded-2xl p-5 md:p-6 shadow-xl shadow-black/10">

            <div className="flex flex-wrap justify-between items-center gap-4 mb-7">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  API Incidents
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Track API failures and recovery status.
                </p>
              </div>

              <span className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-xs font-medium text-rose-400">
                {openIncidentCount} Open Incidents
              </span>
            </div>

            {incidents.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4 text-2xl text-emerald-400">
                  ✓
                </div>

                <p className="text-slate-200 font-medium">
                  No incidents detected
                </p>

                <p className="text-slate-500 text-sm mt-2">
                  Your APIs are looking good!
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left min-w-[700px]">
                  <thead className="text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-700/70">
                    <tr>
                      <th className="py-4 px-3 font-semibold">API Name</th>
                      <th className="py-4 px-3 font-semibold">URL</th>
                      <th className="py-4 px-3 font-semibold">Status</th>
                      <th className="py-4 px-3 font-semibold">Started At</th>
                      <th className="py-4 px-3 font-semibold">Resolved At</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-800/70">
                    {incidents.map((incident) => (
                      <tr
                        key={incident._id}
                        className="hover:bg-white/[0.025] transition-colors"
                      >
                        <td className="py-5 px-3 font-semibold text-slate-200">
                          {incident.monitorName}
                        </td>

                        <td className="py-5 px-3 text-slate-400 max-w-48 truncate">
                          {incident.url}
                        </td>

                        <td className="py-5 px-3">
                          <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${getStatusStyle(incident.status)}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {incident.status}
                          </span>
                        </td>

                        <td className="py-5 px-3 text-slate-400 whitespace-nowrap">
                          {formatDate(incident.startedAt)}
                        </td>

                        <td className="py-5 px-3 text-slate-400 whitespace-nowrap">
                          {formatDate(incident.resolvedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>

      {/* Monitor History Modal */}
      {showHistory && selectedMonitor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl border border-slate-700/70 bg-[#111827] shadow-2xl shadow-black/50">

            <div className="flex items-center justify-between p-6 border-b border-slate-700/70">
              <div>
                <p className="text-xs uppercase tracking-wider text-blue-400 font-semibold">
                  API Details
                </p>

                <h2 className="text-xl font-bold text-white mt-1">
                  Monitoring History
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  {selectedMonitor.name}
                </p>
              </div>

              <button
                onClick={() => setShowHistory(false)}
                className="w-9 h-9 rounded-xl text-slate-400 hover:bg-slate-700/60 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              {monitorHistory.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-slate-300 font-medium">
                    No monitoring history available yet.
                  </p>
                  <p className="text-slate-500 text-sm mt-2">
                    History will appear after monitoring checks.
                  </p>
                </div>
              ) : (
                <div className="max-h-[55vh] overflow-auto rounded-xl border border-slate-700/60">
                  <table className="w-full text-left text-sm min-w-[550px]">
                    <thead className="sticky top-0 bg-[#172033] text-[11px] uppercase tracking-wider text-slate-400">
                      <tr>
                        <th className="p-4 font-semibold">Time</th>
                        <th className="p-4 font-semibold">Status</th>
                        <th className="p-4 font-semibold">Response</th>
                        <th className="p-4 font-semibold">Code</th>
                      </tr>
                    </thead>

                    <tbody>
                      {monitorHistory.map((record) => (
                        <tr
                          key={record._id}
                          className="border-t border-slate-700/50 hover:bg-white/[0.025]"
                        >
                          <td className="p-4 text-slate-300 whitespace-nowrap">
                            {formatDate(record.checkedAt)}
                          </td>

                          <td className="p-4">
                            <span className={`inline-flex px-2.5 py-1 rounded-full border text-xs font-medium ${getStatusStyle(record.status)}`}>
                              {record.status}
                            </span>
                          </td>

                          <td className="p-4 text-slate-300">
                            {record.responseTime !== null
                              ? `${record.responseTime} ms`
                              : 'N/A'}
                          </td>

                          <td className="p-4 text-slate-300">
                            {record.statusCode || 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowHistory(false)}
                  className="rounded-xl bg-slate-700/70 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-600 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Monitor Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700/70 bg-[#111827] p-7 shadow-2xl shadow-black/50">

            <div className="flex justify-between items-center mb-7">
              <div>
                <p className="text-xs uppercase tracking-wider text-blue-400 font-semibold">
                  Monitor Configuration
                </p>

                <h3 className="text-xl font-bold text-white mt-1">
                  {editingMonitor ? 'Edit Monitor' : 'Add New Monitor'}
                </h3>
              </div>

              <button
                onClick={closeForm}
                className="w-9 h-9 rounded-xl text-slate-400 hover:bg-slate-700/60 hover:text-white text-xl transition"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  API Name
                </label>

                <input
                  type="text"
                  required
                  placeholder="Example: My Backend API"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      name: e.target.value
                    })
                  }
                  className="w-full bg-[#090f1d] border border-slate-700/70 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  API URL
                </label>

                <input
                  type="url"
                  required
                  placeholder="https://api.example.com/health"
                  value={formData.url}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      url: e.target.value
                    })
                  }
                  className="w-full bg-[#090f1d] border border-slate-700/70 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Monitoring Interval
                </label>

                <select
                  value={formData.interval}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      interval: e.target.value
                    })
                  }
                  className="w-full bg-[#090f1d] border border-slate-700/70 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition"
                >
                  <option value="1">Every 1 minute</option>
                  <option value="5">Every 5 minutes</option>
                  <option value="10">Every 10 minutes</option>
                  <option value="30">Every 30 minutes</option>
                </select>
              </div>

              <div className="pt-2 space-y-3">
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl py-3 font-semibold text-sm text-white shadow-lg shadow-blue-900/25 transition"
                >
                  {editingMonitor ? 'Update Monitor' : 'Save Monitor'}
                </button>

                <button
                  type="button"
                  onClick={closeForm}
                  className="w-full bg-slate-800/70 border border-slate-700/60 hover:bg-slate-700/70 rounded-xl py-3 text-sm font-medium text-slate-300 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
