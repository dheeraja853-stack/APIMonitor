const mongoose = require('mongoose');

const monitorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },

    url: {
        type: String,
        required: true
    },

    interval: {
        type: Number,
        default: 5
    },

    status: {
        type: String,
        default: 'Pending'
    },

    responseTime: {
        type: Number,
        default: null
    },

    statusCode: {
        type: Number,
        default: null
    },

    lastChecked: {
        type: Date,
        default: null
    }

}, {
    timestamps: true
});

module.exports = mongoose.model('Monitor', monitorSchema);