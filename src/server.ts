import dotenv from 'dotenv';
// Load env vars before anything else
dotenv.config();

import app from './app';
import { connectDB } from './config/db';

const PORT = process.env.PORT || 5000;

connectDB();
// migrate()


export default app;

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`\n🚀 RuralSync running locally on: http://localhost:${PORT}`);
        console.log(`⭐️ Environment: ${process.env.NODE_ENV}\n`);
    });

}

// Global error handlers
process.on('unhandledRejection', (err: any) => {
    console.log(`❌ Unhandled Rejection: ${err.message}`);
});
