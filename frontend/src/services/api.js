
const API_BASE_URL = 'http://localhost:5000';

// Common request handler
async function apiRequest(endpoint, options = {}) {
    let response;

    try {
        response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    } catch (error) {
        throw new Error(
            'Cannot connect to the backend. Please check whether the server is running.'
        );
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(
            data.message || `Request failed with status ${response.status}`
        );
    }

    return data;
}

// Check backend connection
export async function checkBackend() {
    return await apiRequest('/api/health');
}

// Check an individual API
export async function checkMonitor(url) {
    return await apiRequest('/api/monitor/check', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url })
    });
}

// Register a new monitor
export async function registerMonitor(monitor) {
    return await apiRequest('/api/monitors', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(monitor)
    });
}

// Fetch all monitors
export async function getMonitors() {
    const data = await apiRequest('/api/monitors');
    return data.monitors || [];
}

// Fetch monitoring history
export const getMonitorHistory = async (monitorId) => {
    const data = await apiRequest(
        `/api/monitors/${monitorId}/history`
    );

    return data.history || [];
};

// Fetch incidents
export const getIncidents = async () => {
    const data = await apiRequest('/api/incidents');
    return data.incidents || [];
};

// Update monitor
export const updateMonitor = async (id, monitorData) => {
    const data = await apiRequest(`/api/monitors/${id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(monitorData)
    });

    return data.monitor;
};

// Delete monitor
export const deleteMonitor = async (id) => {
    return await apiRequest(`/api/monitors/${id}`, {
        method: 'DELETE'
    });
};
