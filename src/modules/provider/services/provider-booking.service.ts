import { Model } from 'mongoose';
import { IBooking } from '../../../models/booking.model';
import { IAgent } from '../../../models/agent.model';
import { IOrganization } from '../../../models/organization.model';
import { INotificationStrategy } from '../../shared/interfaces/notification.interface';
import { ApiError } from '../../../utils/helpers';

export interface IProviderBookingDependencies {
    BookingModel: Model<IBooking>;
    AgentModel: Model<IAgent>;
    OrgModel: Model<IOrganization>;
    notificationStrategies: Record<string, INotificationStrategy>;
}

export class ProviderBookingService {
    private booking: Model<IBooking>;
    private agent: Model<IAgent>;
    private org: Model<IOrganization>;
    private notifiers: Record<string, INotificationStrategy>;

    constructor({ BookingModel, AgentModel, OrgModel, notificationStrategies }: IProviderBookingDependencies) {
        this.booking = BookingModel;
        this.agent = AgentModel;
        this.org = OrgModel;
        this.notifiers = notificationStrategies;
    }

    async getBookings(providerId: string) {
        // Assuming bookings are linked via Organization
        const org = await this.org.findOne({ ownerId: providerId });
        if (!org) return [];

        return await this.booking.find({ organization: org._id })
            .populate('client', 'name email')
            .populate('service', 'name')
            .populate('agent', 'name')
            .sort({ createdAt: -1 });
    }
    async assignAgentToBooking(providerId: string, bookingId: string, agentId: string) {
        // 1. Fetch dependencies with population for email content
        const agent = await this.agent.findById(agentId);
        if (!agent) throw new ApiError('Agent not found', 404);

        const booking = await this.booking.findById(bookingId)
            .populate('client', 'name email')
            .populate('service', 'name');

        if (!booking) throw new ApiError('Booking not found', 404);

        const org = await this.org.findOne({ ownerId: providerId });
        if (!org) throw new ApiError('Organization not found', 404);

        // 2. Perform Updates
        booking.agent = agent._id as any;
        booking.status = 'ASSIGNED'; // Standardized status

        agent.status = 'BUSY';

        // Add client to Organization's CRM list if not already there
        if (!org.clients.includes(booking.client._id)) {
            org.clients.push(booking.client._id);
        }

        // 3. Save all changes
        await Promise.all([
            booking.save(),
            agent.save(),
            org.save()
        ]);

        // 4. Trigger Notifications via Shared Strategies
        const email = this.notifiers['email'];
        if (email) {
            // Notify Agent
            await email.send({
                to: agent.email,
                subject: 'New Job Assigned',
                message: `Hello ${agent.name}, you have a new job for ${(booking.service as any).name}.`
            });

            // Notify Client
            const client = booking.client as any;
            if (client.email) {
                await email.send({
                    to: client.email,
                    subject: 'Agent Assigned to Your Booking',
                    message: `Hi ${client.name}, ${agent.name} has been assigned to your booking.`
                });
            }
        }

        // 5. Log the action
        // await addAuditLogJob({
        // action: 'ASSIGN_AGENT',
        // userId: providerId,
        // role: 'SERVICE_PROVIDER',
        // targetId: bookingId,
        // metadata: { agentId, agentName: agent.name },
        // username: 'Provider',
        // serviceProviderId: providerId
        // });

        return {
            bookingId: booking._id,
            agentName: agent.name,
            agentPhone: agent.phoneNumber
        };
    }
}
