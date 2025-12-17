// backend/src/app.ts
import express from 'express';
import cors from 'cors';
import authRoutes from './modules/auth/auth.routes';
// import agentRoutes from './modules/agent/agent.routes';
// import customerRoutes from './modules/customer/customer.routes';
// import shopkeeperRoutes from './modules/shopkeeper/shopkeeper.routes';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
const app = express();

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(cors({
    origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:3000"],
    credentials: true
}));
app.use(express.json());

// Mount Modules
app.use('/auth', authRoutes);
// app.use('/agent', agentRoutes);
// app.use('/customer', customerRoutes);
// app.use('/shopkeeper', shopkeeperRoutes);

export default app;
