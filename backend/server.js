const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/db');
const Monitor = require('./models/Monitor');
const MonitorHistory = require('./models/MonitorHistory');
const Incident = require('./models/Incident');
const { startMonitoring } = require('./monitorScheduler');
const { addMonitor, getMonitors } = require('./monitorStore');
const { isPublicUrl, fetchPublicUrl } = require('./safeFetch');

const app = express();

const PORT = process.env.PORT || 5000;



// Middleware
app.use(cors());
app.use(express.json());

// Home route
app.get('/', (req, res) => {
    res.json({
        message: 'API Monitor Backend is running!',
        status: 'Success'
    });
});

// Health check route
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is healthy'
    });
});
// Register a new monitor

app.post('/api/monitors', async (req, res) => {
    try {
        const { name, url, interval } = req.body;

        // Validate required fields
        if (
            typeof name !== 'string' ||
            !name.trim() ||
            typeof url !== 'string' ||
            !url.trim() ||
            interval === undefined ||
            interval === null ||
            interval === ''
        ) {
            return res.status(400).json({
                success: false,
                message: 'Name, URL and interval are required'
            });
        }

        // Validate URL format and protocol
        let parsedUrl;

        try {
            parsedUrl = new URL(url.trim());
        } catch {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid URL'
            });
        }

        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            return res.status(400).json({
                success: false,
                message: 'Only HTTP and HTTPS URLs are allowed'
            });
        }
        const isSafe = await isPublicUrl(parsedUrl.toString());

if (!isSafe) {
    return res.status(400).json({
        success: false,
        message: 'Private or internal URLs are not allowed'
    });
}

        // Validate monitoring interval
        const validIntervals = [1, 5, 10, 30];
        const numericInterval = Number(interval);

        if (!validIntervals.includes(numericInterval)) {
            return res.status(400).json({
                success: false,
                message: 'Interval must be 1, 5, 10 or 30 minutes'
            });
        }

        // Create monitor
        const monitor = await Monitor.create({
            name: name.trim(),
            url: parsedUrl.toString(),
            interval: numericInterval,
            status: 'Pending'
        });

        res.status(201).json({
            success: true,
            message: 'Monitor saved successfully',
            monitor
        });

    } catch (error) {
        console.error('Monitor registration error:', error);

        res.status(500).json({
            success: false,
            message: 'Unable to save monitor'
        });
    }
});

// Get all monitors with calculated uptime
app.get('/api/monitors', async (req, res) => {
    try {
        const monitors = await Monitor.find().sort({ createdAt: -1 });

        const monitorsWithUptime = await Promise.all(
            monitors.map(async (monitor) => {
                const history = await MonitorHistory.find({
                    monitor: monitor._id
                }).select('status');

                const totalChecks = history.length;

                const successfulChecks = history.filter(
                    record => record.status === 'Online'
                ).length;

                const uptime = totalChecks === 0
                    ? 0
                    : Number(
                        ((successfulChecks / totalChecks) * 100).toFixed(2)
                    );

                return {
                    ...monitor.toObject(),
                    uptime
                };
            })
        );

        res.json({
            success: true,
            monitors: monitorsWithUptime
        });

    } catch (error) {
        console.error('Error fetching monitors:', error);

        res.status(500).json({
            success: false,
            message: 'Unable to fetch monitors'
        });
    }
});

// Update an existing monitor

app.patch('/api/monitors/:id', async (req, res) => {
    try {
        const { name, url, interval } = req.body;

        // Validate required fields
        if (
            typeof name !== 'string' ||
            !name.trim() ||
            typeof url !== 'string' ||
            !url.trim() ||
            interval === undefined ||
            interval === null ||
            interval === ''
        ) {
            return res.status(400).json({
                success: false,
                message: 'Name, URL and interval are required'
            });
        }

        // Validate URL
        let parsedUrl;

        try {
            parsedUrl = new URL(url.trim());
        } catch {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid URL'
            });
        }

        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            return res.status(400).json({
                success: false,
                message: 'Only HTTP and HTTPS URLs are allowed'
            });
        }
        const isSafe = await isPublicUrl(parsedUrl.toString());

if (!isSafe) {
    return res.status(400).json({
        success: false,
        message: 'Private or internal URLs are not allowed'
    });
}

        // Validate interval
        const validIntervals = [1, 5, 10, 30];
        const numericInterval = Number(interval);

        if (!validIntervals.includes(numericInterval)) {
            return res.status(400).json({
                success: false,
                message: 'Interval must be 1, 5, 10 or 30 minutes'
            });
        }

        const updatedMonitor = await Monitor.findByIdAndUpdate(
            req.params.id,
            {
                name: name.trim(),
                url: parsedUrl.toString(),
                interval: numericInterval,
                responseTime: null,
                statusCode: null,
                lastChecked: null
            },
            { new: true, runValidators: true }
        );

        if (!updatedMonitor) {
            return res.status(404).json({
                success: false,
                message: 'Monitor not found'
            });
        }

        res.json({
            success: true,
            message: 'Monitor updated successfully',
            monitor: updatedMonitor
        });

    } catch (error) {
        console.error('Error updating monitor:', error);

        res.status(500).json({
            success: false,
            message: 'Unable to update monitor'
        });
    }
});



// Delete a monitor
app.delete('/api/monitors/:id', async (req, res) => {
    try {
        const monitor = await Monitor.findByIdAndDelete(
            req.params.id
        );

        if (!monitor) {
            return res.status(404).json({
                success: false,
                message: 'Monitor not found'
            });
        }

        await Promise.all([
            MonitorHistory.deleteMany({ monitor: req.params.id }),
            Incident.deleteMany({ monitor: req.params.id })
        ]);

        res.json({
            success: true,
            message: 'Monitor deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting monitor:', error);

        res.status(500).json({
            success: false,
            message: 'Unable to delete monitor'
        });
    }
});

// Get monitoring history for a specific monitor
app.get('/api/monitors/:id/history', async (req, res) => {
    try {
        const history = await MonitorHistory.find({
            monitor: req.params.id
        })
            .sort({ checkedAt: -1 })
            .limit(100);

        res.json({
            success: true,
            history
        });

    } catch (error) {
        console.error('Error fetching monitoring history:', error);

        res.status(500).json({
            success: false,
            message: 'Unable to fetch monitoring history'
        });
    }
});

// Get all incidents
app.get('/api/incidents', async (req, res) => {
    try {
        const incidents = await Incident.find()
            .sort({ startedAt: -1 });

        res.json({
            success: true,
            incidents
        });

    } catch (error) {
        console.error('Error fetching incidents:', error);

        res.status(500).json({
            success: false,
            message: 'Unable to fetch incidents'
        });
    }
});

// API monitoring route


app.post('/api/monitor/check', async (req, res) => {
    const { url } = req.body;

    if (!url || typeof url !== 'string') {
        return res.status(400).json({
            success: false,
            message: 'A valid API URL is required'
        });
    }

    let parsedUrl;

    try {
        parsedUrl = new URL(url.trim());
    } catch {
        return res.status(400).json({
            success: false,
            message: 'Please enter a valid URL'
        });
    }

    const isSafe = await isPublicUrl(parsedUrl.toString());

    if (!isSafe) {
        return res.status(400).json({
            success: false,
            message: 'This URL is not allowed. Please use a publicly accessible HTTP or HTTPS URL.'
        });
    }

    const startTime = Date.now();
    let close;

    try {
        const result = await fetchPublicUrl(parsedUrl.toString(), {
            method: 'GET',
            signal: AbortSignal.timeout(10000)
        });

        const { response } = result;
        close = result.close;

        const responseTime = Date.now() - startTime;

        res.json({
            success: true,
            status: response.ok ? 'Online' : 'Down',
            statusCode: response.status,
            responseTime
        });

        await response.body?.cancel();

    } catch (error) {
        const responseTime = Date.now() - startTime;

        if (!res.headersSent) {
            res.json({
                success: true,
                status: 'Down',
                statusCode: null,
                responseTime,
                error: error.message
            });
        }
    } finally {
        if (close) {
            await close();
        }
    }
});



// Start server
const startServer = async () => {
    await connectDB();

    app.listen(PORT, () => {
        console.log(`API Monitor server running on port ${PORT}`);

        startMonitoring();
    });
};

startServer();