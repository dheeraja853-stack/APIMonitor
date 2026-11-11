
import { useState, useEffect } from 'react'
import { checkBackend, checkMonitor, registerMonitor, getMonitors, getMonitorHistory, getIncidents, updateMonitor, deleteMonitor } from './services/api'

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
        // Register monitor in the backend
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
        // Update existing monitor or add a new one
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

setFormData({
    name: '',
    url: '',
    interval: '5'
})

setEditingMonitor(null)

        // Perform the first API check
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
    setEditingMonitor(monitor);

    setFormData({
        name: monitor.name,
        url: monitor.url,
        interval: String(monitor.interval)
    });

    setShowForm(true);
};

const handleDelete = async (monitor) => {
    const confirmed = window.confirm(
        `Are you sure you want to delete ${monitor.name}?`
    );

    if (!confirmed) return;

    try {
        await deleteMonitor(monitor._id || monitor.id);

        setMonitors((prev) =>
            prev.filter(
                (item) =>
                    (item._id || item.id) !== (monitor._id || monitor.id)
            )
        );

        setIncidents((prev) =>
            prev.filter(
                (incident) =>
                    String(incident.monitor) !== String(monitor._id || monitor.id)
            )
        );

        console.log('Monitor deleted successfully');

    } catch (error) {
        console.error('Delete failed:', error);
        alert(error.message || 'Unable to delete monitor.');
    }
};


// ADD THE NEW FUNCTION HERE
const handleViewHistory = async (monitor) => {
    try {
        const history = await getMonitorHistory(
            monitor._id || monitor.id
        );

        setSelectedMonitor(monitor);
        setMonitorHistory(history);
        setShowHistory(true);

    } catch (error) {
        console.error('Unable to load monitor history:', error);
        alert('Unable to load monitoring history.');
    }
};
const openIncidentCount = incidents.filter(
    (incident) => incident.status === 'Open'
).length
  const stats = [
    {
        title: 'Total Monitors',
        value: monitors.length,
        detail: 'APIs added'
    },
    {
        title: 'Operational',
        value: monitors.filter(m => m.status === 'Online').length,
        detail: 'Currently online'
    },
    {
        title: 'Down',
        value: monitors.filter(m => m.status === 'Down').length,
        detail: 'Needs attention'
    },
    {
        title: 'Pending',
        value: monitors.filter(
            m => m.status === 'Pending' || m.status === 'Checking...'
        ).length,
        detail: 'Awaiting first check'
    }
]

  const menuItems = ['Overview', 'Monitors', 'Incidents']

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex">

      {/* Sidebar */}
      <aside className="w-64 min-h-screen border-r border-white/10 bg-[#0e0e11] p-6 hidden md:block">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-xl">
            A
          </div>
          <div>
            <h1 className="font-bold text-lg">API Monitor</h1>
            <p className="text-xs text-gray-500">Monitoring Dashboard</p>
          </div>
        </div>

        <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">
          Workspace
        </p>

        <nav className="space-y-2">
          {menuItems.map((item) => (
            <button
              key={item}
              onClick={() => setActiveTab(item)}
              className={`w-full text-left px-4 py-3 rounded-lg transition ${
                activeTab === item
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              {item}
            </button>
          ))}
        </nav>

        <div className="mt-16 p-4 rounded-xl bg-white/5 border border-white/10">
    <p className="text-sm font-semibold">System Status</p>

    <p className="text-xs text-gray-400 mt-2">
        Frontend is running
    </p>

    <p className={`text-xs mt-3 ${
        backendConnected ? 'text-green-400' : 'text-red-400'
    }`}>
        ● {backendConnected ? 'Backend connected' : 'Backend disconnected'}
    </p>
</div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 overflow-hidden">
        <header className="flex justify-between items-center mb-10">
          <div>
            <p className="text-sm text-gray-500">Workspace / {activeTab}</p>
            <h2 className="text-3xl font-bold mt-2">{activeTab}</h2>
            <p className="text-gray-400 mt-2 text-sm">
              Monitor and manage your API performance.
            </p>
          </div>

          <div className="flex items-center gap-5">

    <button
        onClick={() => setActiveTab('Incidents')}
        className="relative text-gray-300 hover:text-white text-2xl"
        title="View incidents"
    >
        🔔

        {openIncidentCount > 0 && (
            <span className="absolute -top-2 -right-3 bg-red-600 text-white text-xs font-bold rounded-full min-w-5 h-5 flex items-center justify-center px-1">
                {openIncidentCount}
            </span>
        )}
    </button>

    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold">
        A
    </div>

</div>
        </header>
{activeTab !== 'Incidents' && (
        <section className="mb-8">
          <h3 className="text-xl font-semibold">Welcome to API Monitor!</h3>
          <p className="text-gray-400 text-sm mt-1">
            Add your API endpoints and manage them from one place.
          </p>
        </section>
        )} 

{activeTab === 'Incidents' && (
    <section className="bg-[#141418] border border-white/10 rounded-2xl p-6 mb-8">
        <div className="mb-6">
            <h3 className="text-lg font-semibold">API Incidents</h3>
            <p className="text-sm text-gray-500 mt-1">
                Track API failures and recovery status.
            </p>
        </div>

        {incidents.length === 0 ? (
            <div className="text-center py-12">
                <p className="text-gray-400">No incidents detected.</p>
                <p className="text-gray-600 text-sm mt-2">
                    Your APIs are looking good!
                </p>
            </div>
        ) : (
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-gray-500 border-b border-white/10">
                        <tr>
                            <th className="py-4">API NAME</th>
                            <th className="py-4">URL</th>
                            <th className="py-4">STATUS</th>
                            <th className="py-4">STARTED AT</th>
                            <th className="py-4">RESOLVED AT</th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-white/5">
                        {incidents.map((incident) => (
                            <tr key={incident._id}>
                                <td className="py-5 font-medium">
                                    {incident.monitorName}
                                </td>
                                <td className="py-5 text-gray-400 max-w-48 truncate">
                                    {incident.url}
                                </td>
                                <td className={`py-5 font-medium ${
                                    incident.status === 'Open'
                                        ? 'text-red-400'
                                        : 'text-green-400'
                                }`}>
                                    ● {incident.status}
                                </td>
                                <td className="py-5 text-gray-400">
                                    {new Date(incident.startedAt).toLocaleString()}
                                </td>
                                <td className="py-5 text-gray-400">
                                    {incident.resolvedAt
                                        ? new Date(incident.resolvedAt).toLocaleString()
                                        : '—'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
    </section>
)} 

        {/* Statistics - Overview only */}
{activeTab === 'Overview' && (
    <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
          {stats.map((stat) => (
            <div key={stat.title} className="bg-[#141418] border border-white/10 rounded-2xl p-6">
              <p className="text-gray-400 text-sm">{stat.title}</p>
              <h3 className="text-3xl font-bold mt-5">{stat.value}</h3>
              <p className="text-gray-500 text-xs mt-2">{stat.detail}</p>
            </div>
          ))}
        </section>
)} 
        {/* Monitors Table - Monitors page only */}
{activeTab === 'Monitors' && (
    <section className="bg-[#141418] border border-white/10 rounded-2xl p-6">
          <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
            <div>
              <h3 className="text-lg font-semibold">Your API Monitors</h3>
              <p className="text-sm text-gray-500 mt-1">
                Manage your API endpoints
              </p>
            </div>

            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-500 px-5 py-3 rounded-lg text-sm font-medium"
            >
              + Add Monitor
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-gray-500 border-b border-white/10">
                <tr>
                  <th className="py-4">API NAME</th>
                  <th className="py-4">URL</th>
                  <th className="py-4">STATUS</th>
                  <th className="py-4">RESPONSE TIME</th>
                  <th className="py-4">UPTIME</th>
                  <th className="py-4">INTERVAL</th>
                  <th className="py-4">ACTIONS</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/5">
                {monitors.map((monitor) => (
                  <tr key={monitor._id || monitor.id}>
                    <td className="py-5 font-medium">{monitor.name}</td>
                    <td className="py-5 text-gray-400 max-w-48 truncate">{monitor.url}</td>
                    <td className="py-5 text-yellow-400">● {monitor.status}</td>
                    <td className="py-5">
    {monitor.responseTime !== null && monitor.responseTime !== undefined
        ? typeof monitor.responseTime === 'number'
            ? `${monitor.responseTime} ms`
            : monitor.responseTime
        : 'N/A'}
</td>
                    <td className="py-5">
    {monitor.uptime !== undefined
        ? `${monitor.uptime}%`
        : 'Calculating...'}
</td>
                    <td className="py-5">{monitor.interval} min</td>
                    <td className="py-5">
    <div className="flex items-center gap-3">
        <button
            onClick={() => handleViewHistory(monitor)}
            className="text-blue-400 hover:text-blue-300"
        >
            View History
        </button>

        <button
            onClick={() => handleEdit(monitor)}
            className="text-yellow-400 hover:text-yellow-300"
        >
            Edit
        </button>

        <button
            onClick={() => handleDelete(monitor)}
            className="text-red-400 hover:text-red-300"
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
              <div className="text-center py-12">
                <p className="text-gray-400">No APIs added yet.</p>
                <p className="text-gray-600 text-sm mt-2">
                  Click Add Monitor to register your first API.
                </p>
              </div>
            )}
          </div>
        </section>  
)}
</main>
{/* Monitor History Modal */}
{showHistory && selectedMonitor && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
        <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#18181b] p-6 shadow-2xl">

            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white">
                        Monitoring History
                    </h2>
                    <p className="mt-1 text-sm text-gray-400">
                        {selectedMonitor.name}
                    </p>
                </div>

                <button
                    onClick={() => setShowHistory(false)}
                    className="rounded-lg px-3 py-2 text-gray-400 hover:bg-white/10 hover:text-white"
                >
                    ✕
                </button>
            </div>

            {monitorHistory.length === 0 ? (
                <p className="py-10 text-center text-gray-400">
                    No monitoring history available yet.
                </p>
            ) : (
                <div className="max-h-80 overflow-y-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="sticky top-0 bg-[#18181b] text-gray-400">
                            <tr>
                                <th className="p-3">TIME</th>
                                <th className="p-3">STATUS</th>
                                <th className="p-3">RESPONSE</th>
                                <th className="p-3">CODE</th>
                            </tr>
                        </thead>

                        <tbody>
                            {monitorHistory.map((record) => (
                                <tr
                                    key={record._id}
                                    className="border-t border-white/10"
                                >
                                    <td className="p-3 text-gray-300">
                                        {new Date(record.checkedAt).toLocaleString()}
                                    </td>

                                    <td className={`p-3 font-medium ${
                                        record.status === 'Online'
                                            ? 'text-green-400'
                                            : 'text-red-400'
                                    }`}>
                                        {record.status}
                                    </td>

                                    <td className="p-3 text-gray-300">
                                        {record.responseTime !== null
                                            ? `${record.responseTime} ms`
                                            : 'N/A'}
                                    </td>

                                    <td className="p-3 text-gray-300">
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
                    className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-500"
                >
                    Close
                </button>
            </div>

        </div>
    </div>
)}
      {/* Add Monitor Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#18181b] border border-white/10 rounded-2xl p-7 w-full max-w-md">

            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">
    {editingMonitor ? 'Edit Monitor' : 'Add New Monitor'}
</h3>
              <button
                onClick={() => {
    setShowForm(false);
    setEditingMonitor(null);
    setFormData({ name: '', url: '', interval: '5' });
}}
                className="text-gray-400 hover:text-white text-xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">

              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  API Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Example: My Backend API"
                  value={formData.name}
                  onChange={(e) => setFormData({
                    ...formData,
                    name: e.target.value
                  })}
                  className="w-full bg-[#09090b] border border-white/10 rounded-lg px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  API URL
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://api.example.com/health"
                  value={formData.url}
                  onChange={(e) => setFormData({
                    ...formData,
                    url: e.target.value
                  })}
                  className="w-full bg-[#09090b] border border-white/10 rounded-lg px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  Monitoring Interval
                </label>
                <select
                  value={formData.interval}
                  onChange={(e) => setFormData({
                    ...formData,
                    interval: e.target.value
                  })}
                  className="w-full bg-[#09090b] border border-white/10 rounded-lg px-4 py-3 outline-none focus:border-blue-500"
                >
                  <option value="1">Every 1 minute</option>
                  <option value="5">Every 5 minutes</option>
                  <option value="10">Every 10 minutes</option>
                  <option value="30">Every 30 minutes</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 rounded-lg py-3 font-semibold"
              >
                {editingMonitor ? 'Update Monitor' : 'Save Monitor'}
              </button>

              <button
                type="button"
                onClick={() => {
    setShowForm(false)
    setEditingMonitor(null)
    setFormData({ name: '', url: '', interval: '5' })
}}
                className="w-full bg-white/5 hover:bg-white/10 rounded-lg py-3 text-gray-300"
              >
                Cancel
              </button>

            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
