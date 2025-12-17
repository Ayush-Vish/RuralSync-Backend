import { Router } from 'express';
import { verifyJWT, isAuthorized } from '@org/utils';

// Controllers
import {
  getCustomerProfile,
  updateCustomerProfile,
  changePassword,
} from '../controllers/profileEdit';

import {
  createBooking,
  getCustomerBookings,
  deleteBooking,
} from '../controllers/booking';

import {
  createReview,
  deleteReview,
  getCustomerReviews,
  getServiceProviderReviews,
  updateReview,
} from '../controllers/review';

import {
  getAllServices,
  getServiceById,
  getAllServiceProviders,
} from '../controllers/service';

const router = Router();

// ----------------- Root Test -----------------
router.get('/', (req, res) => {
  res.send({ message: 'Welcome to Customer API!' });
});

// ----------------- Profile -----------------
router.get('/profile', verifyJWT('CLIENT'), getCustomerProfile);
router.put('/profile-update', verifyJWT('CLIENT'), updateCustomerProfile);
router.patch('/password', verifyJWT('CLIENT'), changePassword);

// ----------------- Bookings -----------------
router.post('/booking/book', verifyJWT('CLIENT'), isAuthorized(['CLIENT']), createBooking);
router.get('/booking/bookings', verifyJWT('CLIENT'), isAuthorized(['CLIENT']), getCustomerBookings);
router.delete('/booking/bookings/:id', verifyJWT('CLIENT'), isAuthorized(['CLIENT']), deleteBooking);

// ----------------- Reviews -----------------
router.post('/review/reviews', verifyJWT('CLIENT'), createReview);
router.put('/review/reviews/:reviewId', verifyJWT('CLIENT'), updateReview);
router.get('/review/serviceProviders/:serviceProviderId/reviews', getServiceProviderReviews);
router.delete('/review/reviews/:reviewId', verifyJWT('CLIENT'), deleteReview);
router.get('/review/customers/reviews', verifyJWT('CLIENT'), getCustomerReviews);

// ----------------- Services -----------------
router.get('/services', getAllServices);
router.get('/services/:id', getServiceById);
router.get('/services/service-provider', getAllServiceProviders);

export default router;
