
const mongoose = require('mongoose');

const monitorHistorySchema = new mongoose.Schema({
    monitor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Monitor',
        required: true
    },

    status: {
        type: String,
        enum: ['Online', 'Down'],
        required: true
    },

    responseTime: {
        type: Number,
        default: null
    },

    statusCode: {
        type: Number,
        default: null
    },

    checkedAt: {
        type: Date,
        default: Date.now
    }

});

module.exports = mongoose.model('MonitorHistory', monitorHistorySchema);
