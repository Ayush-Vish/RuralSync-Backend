// backend/src/app.ts
import express from 'express';
import cors from 'cors';
import authRoutes from './modules/auth/auth.routes';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import cookieParser from 'cookie-parser';
const app = express();

app.use(cookieParser());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use(cors({
    origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:3000"],
    credentials: true
}));
app.use(express.json());

// Mount Modules
app.use('/auth', authRoutes);


export default app;
