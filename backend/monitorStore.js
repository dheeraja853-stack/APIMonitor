const monitors = new Map();

function addMonitor(monitor) {
    monitors.set(monitor.id, monitor);
}

function getMonitors() {
    return Array.from(monitors.values());
}

function getMonitor(id) {
    return monitors.get(id);
}

function updateMonitor(id, updates) {
    const monitor = monitors.get(id);

    if (monitor) {
        monitors.set(id, {
            ...monitor,
            ...updates
        });
    }
}

module.exports = {
    addMonitor,
    getMonitors,
    getMonitor,
    updateMonitor
};