// backend/src/app.ts
import express from 'express';
import cors from 'cors';
import authRoutes from './modules/auth/auth.routes';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import cookieParser from 'cookie-parser';
import clientRoutes from './modules/client/client.routes';
import providerRoutes from './modules/provider/provider.routes';
import agentRoutes from './modules/agent/agent.routes';

const app = express();
const MODE = process.env.NODE_ENV || 'development';
// CORS Origins - Parse from environment or use defaults
const getAllowedOrigins = (): string[] => {
    const envOrigins = process.env.CORS_ORIGINS;
    if (MODE === 'production' && envOrigins) {
        return envOrigins.split(',').map(origin => origin.trim());
    }
    // Default origins for local development
    return [
        "http://localhost:5173",
        "http://localhost:5174", 
        "http://localhost:5175",
        "http://localhost:3000"
    ];
};

app.use(cookieParser());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use(cors({
    origin: getAllowedOrigins(),
    credentials: true
}));
app.use(express.json());

// Mount Modules
app.use('/api/auth', authRoutes);
app.use('/api/client', clientRoutes);
app.use('/api/provider', providerRoutes);
app.use('/api/agent', agentRoutes);
app.use((err: any, req: any, res: any, next: any) => {
    err.status = err.status || 500
    console.log(err.message)
    err.message = err.message || "Something went Wrong"
    res.status(err.status).json({
        success: false,
        message: err.message,
        stack: err.stack
    })
})



export default app;
