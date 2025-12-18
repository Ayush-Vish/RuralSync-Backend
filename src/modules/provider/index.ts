// Models
import { Booking } from '../../models/booking.model';
import { Agent } from '../../models/agent.model';
import { Organization } from '../../models/organization.model';
import { ServiceProvider } from '../../models/serviceProvider.model';
import { Service } from '../../models/service.model';

// Strategies
import { EmailNotificationStrategy } from '../shared/providers/email.provider';

// Services
import { ProviderBookingService } from './services/provider-booking.service';
import { ProviderProfileService } from './services/provider-profile.service';
import { ProviderInventoryService } from './services/provider-inventory.service';
import { ProviderAgentService } from './services/provider-agent.service';

// Controllers
import { ProviderBookingController } from './controllers/provider-booking.controller';
import { ProviderProfileController } from './controllers/provider-profile.controller';
import { ProviderInventoryController } from './controllers/provider-inventory.controller';
import { ProviderAgentController } from './controllers/provider-agent.controller';

const emailStrategy = new EmailNotificationStrategy();

// --- 1. Booking Module ---
const bookingService = new ProviderBookingService({
    BookingModel: Booking as any,
    AgentModel: Agent as any,
    OrgModel: Organization as any,
    notificationStrategies: { 'email': emailStrategy }
});
const bookingController = new ProviderBookingController(bookingService);

// --- 2. Profile Module ---
const profileService = new ProviderProfileService(Organization as any, ServiceProvider as any);
const profileController = new ProviderProfileController(profileService);

// --- 3. Inventory Module ---
const inventoryService = new ProviderInventoryService(Service as any, Organization as any);
const inventoryController = new ProviderInventoryController(inventoryService);

// --- 4. Agent Module ---
const agentService = new ProviderAgentService(Agent as any, Organization as any, Service as any);
const agentController = new ProviderAgentController(agentService);

// Export Controllers to use in Routes
export {
    bookingController,
    profileController,
    inventoryController,
    agentController
};
