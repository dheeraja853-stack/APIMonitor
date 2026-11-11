
const Monitor = require('./models/Monitor');
const MonitorHistory = require('./models/MonitorHistory');
const Incident = require('./models/Incident');
const { fetchPublicUrl } = require('./safeFetch');

const activeChecks = new Set();

async function checkAPI(monitor) {
    const monitorId = monitor._id.toString();

    if (activeChecks.has(monitorId)) return;

    activeChecks.add(monitorId);

    const startTime = Date.now();

    let newStatus = 'Down';
    let statusCode = null;
    let responseTime = 0;

    try {
        const { response, close } = await fetchPublicUrl(monitor.url, {
    method: 'GET',
    signal: AbortSignal.timeout(10000)
});

try {
    responseTime = Date.now() - startTime;
    newStatus = response.ok ? 'Online' : 'Down';
    statusCode = response.status;
} finally {
    try {
        await response.body?.cancel();
    } finally {
        await close();
    }
} 

    } catch (error) {
    console.error(`${monitor.name} check error:`, error);

    responseTime = Date.now() - startTime;
    newStatus = 'Down';
}

    try {
        await Monitor.findByIdAndUpdate(monitorId, {
            status: newStatus,
            responseTime,
            lastChecked: new Date(),
            statusCode
        });

        await MonitorHistory.create({
            monitor: monitorId,
            status: newStatus,
            responseTime,
            statusCode
        });

        // Create an incident when the API goes Down
        if (newStatus === 'Down' && monitor.status !== 'Down') {
            await Incident.create({
                monitor: monitorId,
                monitorName: monitor.name,
                url: monitor.url,
                status: 'Open',
                startedAt: new Date()
            });

            console.log(`${monitor.name}: Incident created`);
        }

        // Resolve the incident when the API recovers
        if (newStatus === 'Online' && monitor.status === 'Down') {
            const incident = await Incident.findOne({
                monitor: monitorId,
                status: 'Open'
            }).sort({ startedAt: -1 });

            if (incident) {
                incident.status = 'Resolved';
                incident.resolvedAt = new Date();
                await incident.save();

                console.log(`${monitor.name}: Incident resolved`);
            }
        }

        console.log(
            `${monitor.name}: ${newStatus} (${responseTime} ms)`
        );

    } catch (error) {
        console.error(
            'Failed to save monitoring result:',
            error.message
        );

    } finally {
        activeChecks.delete(monitorId);
    }
}

function startMonitoring() {
    setInterval(async () => {
        try {
            const monitors = await Monitor.find();
            const now = Date.now();

            for (const monitor of monitors) {
                const intervalMs = Number(monitor.interval) * 60 * 1000;

                const lastChecked = monitor.lastChecked
                    ? new Date(monitor.lastChecked).getTime()
                    : 0;

                if (now - lastChecked >= intervalMs) {
                    checkAPI(monitor);
                }
            }
        } catch (error) {
            console.error(
                'Monitoring scheduler error:',
                error.message
            );
        }
    }, 10000);

    console.log('MongoDB-based monitoring scheduler started.');
}

module.exports = { startMonitoring, checkAPI };
