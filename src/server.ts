import dotenv from 'dotenv';
// Load env vars before anything else
dotenv.config();

import app from './app';
import { connectDB } from './config/db';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        // 1. Connect to Database
        await connectDB();

        // 2. Start Express Server
        app.listen(PORT, () => {
            console.log(`\n🚀 RuralSync running on: http://localhost:${PORT}`);
            console.log(`⭐️ Environment: ${process.env.NODE_ENV || 'development'}\n`);
        });

    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// Handle unhandled promise rejections (e.g. broken DB connection after start)
process.on('unhandledRejection', (err: any) => {
    console.log(`❌ Unhandled Rejection: ${err.message}`);
    // Close server & exit process
    process.exit(1);
});

startServer();
