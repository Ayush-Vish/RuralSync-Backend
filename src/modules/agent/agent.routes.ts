import { Router } from 'express';
import { verifyJWT } from '../../middleware/auth.middleware';
import { upload } from '../../utils/helpers';
import { agentController } from './index';

const router = Router();

// All agent routes protected by AGENT role
router.use(verifyJWT('AGENT'));

router.get('/dashboard', agentController.getDashboard);
router.post('/profile/image', upload.single('image'), agentController.uploadProfileImage);
router.patch('/bookings/:bookingId/status', agentController.updateStatus);

router.get('/get/:bookingId', agentController.getBooking);

// Status and Payment
router.patch('/bookings/:bookingId/status', agentController.updateStatus);
router.post('/booking/:bookingId/pay', agentController.markAsPaid);

// Extra Tasks
router.post('/bookings/:bookingId/extra-tasks', agentController.handleExtraTask); // Add
router.patch('/bookings/:bookingId/extra-tasks/:taskId', agentController.handleExtraTask); // Update
router.delete('/bookings/:bookingId/extra-tasks/:taskId', agentController.removeExtraTask); // Delete
export default router;
