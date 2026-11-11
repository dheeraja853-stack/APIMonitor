
const mongoose = require('mongoose');
const dns = require('dns');

const connectDB = async () => {
    try {
        if (process.env.MONGO_DNS_SERVERS) {
            dns.setServers(
                process.env.MONGO_DNS_SERVERS.split(',')
            );
        }

        const MONGO_URI =
            process.env.MONGO_URI ||
            'mongodb://127.0.0.1:27017/api_monitor';

        await mongoose.connect(MONGO_URI);

        console.log('MongoDB connected successfully!');
    } catch (error) {
        console.error('MongoDB connection failed:', error.message);
        process.exit(1);
    }
};

module.exports = connectDB;
