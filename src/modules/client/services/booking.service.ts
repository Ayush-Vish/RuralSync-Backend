import { Model, Types } from 'mongoose';
import moment from 'moment';
import { ApiError } from '../../../utils/helpers';
import { IBooking } from '../../../models/booking.model';
import { IClient } from '../../../models/client.model';
import { IService } from '../../../models/service.model';
import { INotificationStrategy } from '../../shared/interfaces/notification.interface';

export interface IBookingServiceDependencies {
    BookingModel: Model<IBooking>;
    ClientModel: Model<IClient>;
    ServiceModel: Model<IService>;
    notificationStrategies: Record<string, INotificationStrategy>;
}

export class BookingService {
    private booking: Model<IBooking>;
    private client: Model<IClient>;
    private service: Model<IService>;
    private notifiers: Record<string, INotificationStrategy>;

    constructor({ BookingModel, ClientModel, ServiceModel, notificationStrategies }: IBookingServiceDependencies) {
        this.booking = BookingModel;
        this.client = ClientModel;
        this.service = ServiceModel;
        this.notifiers = notificationStrategies;
    }

    /**
     * Create Multiple Bookings (Cart Checkout)
     */
    async createBookings(clientId: string, servicesData: any[]) {
        if (!servicesData || servicesData.length === 0) {
            throw new ApiError('At least one service is required', 400);
        }

        const createdBookings = [];

        for (const item of servicesData) {
            // 1. Validate Input
            if (!item.serviceId || !item.bookingDate || !item.bookingTime) {
                throw new ApiError('Service ID, Date, and Time are required', 400);
            }

            // 2. Fetch Service Details
            const service = await this.service.findById(item.serviceId);
            if (!service) throw new ApiError(`Service not found: ${item.serviceId}`, 404);
            const orgId = service.organization || (service as any).serviceCompany;
            if (!orgId) {
                throw new ApiError(`Service "${service.name}" is not properly linked to an organization.`, 400);
            }
            // 3. Date Parsing
            const date = moment(item.bookingDate, 'YYYY-MM-DD');
            if (!date.isValid()) throw new ApiError(`Invalid Date: ${item.bookingDate}`, 400);

            // 4. Calculate Price (Base + Extra Tasks)
            let finalPrice = service.basePrice;
            const formattedTasks = [];

            if (item.extraTasks && Array.isArray(item.extraTasks)) {
                for (const task of item.extraTasks) {
                    finalPrice += Number(task.extraPrice) || 0;
                    formattedTasks.push({
                        description: task.description,
                        price: Number(task.extraPrice)
                    });
                }
            }

            // 5. Create Booking Object
            const newBooking = await this.booking.create({
                client: clientId,
                service: service._id,
                // organization: service.organization, // Link to the company
                bookingDate: date.toDate(),
                organization: orgId,
                bookingTime: item.bookingTime,
                status: 'PENDING',
                totalPrice: finalPrice,
                extraTasks: formattedTasks,
                location: item.location,
                address: item.address || 'Default Address',
            });

            // 6. Push to array
            createdBookings.push(newBooking);
        }

        return createdBookings;
    }

    /**
     * Get Client Bookings
     */
    async getClientBookings(clientId: string) {
        return await this.booking.find({ client: clientId })
            .populate('service', 'name description')
            .populate('organization', 'name phone')
            .populate('agent', 'name')
            .sort({ bookingDate: -1 });
    }

    /**
     * Delete/Cancel Booking
     */
    async cancelBooking(bookingId: string, clientId: string) {
        const booking = await this.booking.findById(bookingId);
        if (!booking) throw new ApiError('Booking not found', 404);

        if (booking.client.toString() !== clientId) {
            throw new ApiError('Unauthorized action', 403);
        }

        if (booking.status === 'COMPLETED' || booking.status === 'IN_PROGRESS') {
            throw new ApiError('Cannot cancel active or completed booking', 400);
        }

        await this.booking.findByIdAndDelete(bookingId);

        // Notify User
        const client = await this.client.findById(clientId);
        if (client && this.notifiers['email']) {
            await this.notifiers['email'].send({
                to: client.email,
                subject: "Booking Cancelled",
                message: `Booking ${bookingId} has been cancelled.`
            });
        }

        return { message: 'Booking cancelled successfully' };
    }
}
