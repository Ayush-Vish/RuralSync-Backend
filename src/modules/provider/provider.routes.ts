import { Router } from 'express';
import { verifyJWT, isAuthorized } from '../../middleware/auth.middleware';
import { upload } from '../../utils/helpers'; // Assuming multer upload is here

import {
    bookingController,
    profileController,
    inventoryController,
    agentController
} from './index';

const router = Router();

// Global Middleware: All routes require SERVICE_PROVIDER role
router.use(verifyJWT('SERVICE_PROVIDER'));
router.use(isAuthorized(['SERVICE_PROVIDER']));

// --- Profile Routes ---
router.get('/org-detail', profileController.getDetails);
router.post('/register-org',
    upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'images', maxCount: 5 }]),
    verifyJWT('SERVICE_PROVIDER'),
    isAuthorized(['SERVICE_PROVIDER']),
    profileController.register
);
router.put('/org-update', profileController.updateOrg);

// --- Inventory (Services) Routes ---
router.get('/services', inventoryController.getAll);
router.post('/add-service',
    upload.fields([{ name: 'images', maxCount: 5 }]),
    inventoryController.create
);
router.delete('/delete-service/:id', inventoryController.delete);
router.patch('/services/fix-locations', inventoryController.fixLocations); // Fix services with [0,0] coordinates

// --- Agent Routes ---
router.get('/agents', agentController.getAll); // All agents
router.get('/agent/:id', agentController.getOne);
router.delete('/agent/:id', agentController.delete);
router.post('/assign-agent', agentController.assignToService); // Link agent to service capability

// --- Booking Routes ---
router.get('/bookings', bookingController.getBookings);
router.post('/assign-booking', bookingController.assignAgent); // Assign agent to specific job

export default router;
