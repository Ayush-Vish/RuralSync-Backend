import { Router } from 'express';
import { verifyJWT } from '../../middleware/auth.middleware';
import { upload } from '../../utils/helpers';
import { bookingController, clientController, reviewController, catalogController, searchController } from './index';

const router = Router();

// --- Search (Public) ---
router.get('/search', searchController.searchNearest);
router.get('/search/categories', searchController.getCategories);
// router.get('/search/suggestions', searchController.getSuggestions);
router.get('/search/advanced', searchController.searchAdvanced);

// --- Profile ---
router.get('/profile', verifyJWT('CLIENT'), clientController.getProfile);
router.put('/profile', verifyJWT('CLIENT'), clientController.updateProfile);
router.post('/profile/image', verifyJWT('CLIENT'), upload.single('image'), clientController.uploadProfileImage);
router.patch('/password', verifyJWT('CLIENT'), clientController.changePassword);

// --- Bookings ---
router.get('/bookings/availability', bookingController.checkAvailability);
router.post('/bookings', verifyJWT('CLIENT'), bookingController.create);
router.get('/bookings', verifyJWT('CLIENT'), bookingController.getAll);
router.delete('/bookings/:id', verifyJWT('CLIENT'), bookingController.delete);

// --- Reviews ---
router.get('/reviews/my', verifyJWT('CLIENT'), reviewController.getMyReviews);
router.post('/reviews', verifyJWT('CLIENT'), reviewController.create);
router.put('/reviews/:reviewId', verifyJWT('CLIENT'), reviewController.update);
router.delete('/reviews/:reviewId', verifyJWT('CLIENT'), reviewController.delete);
// Public route to see reviews for a provider
router.get('/reviews/provider/:serviceProviderId', reviewController.getByProvider);
router.get('/services', catalogController.getAllServices);
router.get('/services/providers', catalogController.getAllServiceProviders); // Specific path before :id
router.get('/services/providers/:id', catalogController.getServiceProviderById); // Single provider details
router.get('/services/:id', catalogController.getServiceById);

export default router;
