import {
  getAgentDashboard,
  getBooking,
  manageExtraTask,
  deleteExtraTask,
  updateBookingStatus,
  markBookingAsPaid,
} from '../controllers/agentController';
import { isAuthorized, verifyJWT } from '@org/utils';
import express from 'express';
const router = express.Router();

// Setup Multer for image uploads

// Agent dashboard: View all bookings
router.get(
  '/dashboard',
  verifyJWT('AGENT'),
  getAgentDashboard
);
router.get(
  '/get/:bookingId',
  verifyJWT('AGENT'),
  isAuthorized(['AGENT']),
  getBooking
);
router.patch('/bookings/:bookingId/status', verifyJWT("AGENT" ) ,updateBookingStatus);
router.post('/bookings/:bookingId/extra-tasks', verifyJWT("AGENT" ) ,  manageExtraTask);
router.patch('/bookings/:bookingId/extra-tasks/:taskId', verifyJWT("AGENT" ) , manageExtraTask);
router.delete('/bookings/:bookingId/extra-tasks/:taskId',verifyJWT("AGENT" ) , deleteExtraTask);
router.post('/booking/:bookingId/pay', verifyJWT("AGENT"), markBookingAsPaid);
export default router;
