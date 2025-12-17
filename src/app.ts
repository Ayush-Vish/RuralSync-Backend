// backend/src/app.ts
import express from 'express';
import cors from 'cors';
import authRoutes from './modules/auth/auth.routes';
import agentRoutes from './modules/agent/agent.routes';
import customerRoutes from './modules/customer/customer.routes';
import shopkeeperRoutes from './modules/shopkeeper/shopkeeper.routes';

const app = express();

app.use(cors());
app.use(express.json());

// Mount Modules
app.use('/auth', authRoutes);
app.use('/agent', agentRoutes);
app.use('/customer', customerRoutes);
app.use('/shopkeeper', shopkeeperRoutes);

export default app;
