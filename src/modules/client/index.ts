// Models
import { Booking } from '../../models/booking.model';
import { Client } from '../../models/client.model';
import { Service } from '../../models/service.model';
import { ServiceProvider } from '../../models/serviceProvider.model';
import { Review } from '../../models/review.model'; // Make sure to export this model!

// Shared
import { EmailNotificationStrategy } from '../shared/providers/email.provider';

// Services
import { BookingService } from './services/booking.service';
import { ClientService } from './services/client.service';
import { ReviewService } from './services/review.service';

// Controllers
import { BookingController } from './controllers/booking.controller';
import { ClientController } from './controllers/client.controller';
import { ReviewController } from './controllers/review.controller';

// 1. Strategies
const emailStrategy = new EmailNotificationStrategy();

// 2. Services
const bookingService = new BookingService({
    BookingModel: Booking as any,
    ClientModel: Client as any,
    ServiceModel: Service as any,
    notificationStrategies: { 'email': emailStrategy }
});

const clientService = new ClientService(Client as any);

const reviewService = new ReviewService({
    ReviewModel: Review as any,
    ServiceModel: Service as any,
    ServiceProviderModel: ServiceProvider as any,
    notificationStrategies: { 'email': emailStrategy }
});

// 3. Controllers
const bookingController = new BookingController(bookingService);
const clientController = new ClientController(clientService);
const reviewController = new ReviewController(reviewService);

export { bookingController, clientController, reviewController };
