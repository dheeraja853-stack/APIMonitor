
const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
    monitor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Monitor',
        required: true
    },
    monitorName: {
        type: String,
        required: true
    },
    url: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['Open', 'Resolved'],
        default: 'Open'
    },
    startedAt: {
        type: Date,
        default: Date.now
    },
    resolvedAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model('Incident', incidentSchema);
