import { Model } from 'mongoose';
import { IBooking } from '../../../models/booking.model';
import { IAgent } from '../../../models/agent.model';
import { IService } from '../../../models/service.model';
import { ApiError } from '../../../utils/helpers';

export class AgentService {
    constructor(
        private bookingModel: Model<IBooking>,
        private agentModel: Model<IAgent>,
        private serviceModel: Model<IService>
    ) { }

    /**
     * Get Dashboard Data
     */
    async getDashboard(agentId: string, agentName: string) {
        const bookings = await this.bookingModel.find({ agent: agentId });

        const stats = {
            total: bookings.length,
            pending: bookings.filter(b => b.status === 'PENDING').length,
            inProgress: bookings.filter(b => b.status === 'IN_PROGRESS').length,
            completed: bookings.filter(b => b.status === 'COMPLETED').length,
        };

        // await addAuditLogJob({
        //     action: 'FETCH_AGENT_DASHBOARD',
        //     userId: agentId,
        //     role: 'AGENT',
        //     metadata: stats,
        //     username: agentName,
        //     targetId: agentId
        // });

        return {
            stats: {
                total: bookings.length,
                // ✅ Include 'ASSIGNED' in the pending count
                pending: bookings.filter(b => b.status === 'PENDING' || b.status === 'ASSIGNED').length,
                inProgress: bookings.filter(b => b.status === 'IN_PROGRESS').length,
                completed: bookings.filter(b => b.status === 'COMPLETED').length,
            },
            bookings: {
                // ✅ Include 'ASSIGNED' bookings in the pending array
                pending: bookings.filter(b => b.status === 'PENDING' || b.status === 'ASSIGNED'),
                inProgress: bookings.filter(b => b.status === 'IN_PROGRESS'),
                completed: bookings.filter(b => b.status === 'COMPLETED')
            }
        };
    }

    /**
     * Status Transition Logic
     */
    async updateStatus(agentId: string, bookingId: string, newStatus: string, agentName: string) {
        const booking = await this.bookingModel.findOne({ _id: bookingId, agent: agentId });
        if (!booking) throw new ApiError('Booking not found', 404);

        // ✅ Standardize to Uppercase for logic checks
        const targetStatus = newStatus.toUpperCase();
        const currentStatus = booking.status.toUpperCase();

        // ✅ Define valid paths
        const validTransitions: Record<string, string[]> = {
            'PENDING': ['ASSIGNED', 'CANCELLED'],
            'ASSIGNED': ['IN_PROGRESS', 'CANCELLED', 'COMPLETED'], // 👈 Added ASSIGNED logic
            'IN_PROGRESS': ['COMPLETED', 'CANCELLED'],
            'COMPLETED': [],
            'CANCELLED': []
        };

        if (!validTransitions[currentStatus]?.includes(targetStatus)) {
            throw new ApiError(`Cannot transition from ${currentStatus} to ${targetStatus}`, 400);
        }

        // ✅ Save back in the format your enum expects (e.g., 'In Progress' or 'IN_PROGRESS')
        // If your Mongoose enum is Title Case, use: targetStatus === 'IN_PROGRESS' ? 'In Progress' : targetStatus
        booking.status = newStatus as any;

        if (targetStatus === 'COMPLETED') {
            await this.agentModel.findByIdAndUpdate(agentId, { status: 'FREE' });
        }

        await booking.save();
        return booking;
    }

    /**
     * Manage Extra Tasks (Add/Update)
     */
    async manageExtraTask(agentId: string, bookingId: string, taskData: { description: string, price: number, taskId?: string }) {
        const booking = await this.bookingModel.findOne({ _id: bookingId, agent: agentId });
        if (!booking) throw new ApiError('Booking not found', 404);
        if (booking.status === 'COMPLETED') throw new ApiError('Cannot modify completed bookings', 400);

        if (taskData.taskId) {
            // Update existing
            const task = booking.extraTasks.find(t => (t as any)._id.toString() === taskData.taskId);
            if (!task) throw new ApiError('Task not found', 404);
            task.description = taskData.description;
            task.price = taskData.price;
        } else {
            // Add new
            booking.extraTasks.push({ description: taskData.description, price: taskData.price });
        }

        // Recalculate Total Price
        // Note: Always re-fetch base price from Service to prevent price manipulation
        const service = await this.serviceModel.findById(booking.service);
        const extraTotal = booking.extraTasks.reduce((sum, t) => sum + t.price, 0);
        booking.totalPrice = (service?.basePrice || 0) + extraTotal;

        if (booking.paymentStatus === 'PAID') booking.paymentStatus = 'UNPAID';

        await booking.save();
        return booking;
    }
    async getBookingById(bookingId: string) {
        const booking = await this.bookingModel.findById(bookingId)
            .populate('client', 'name email phoneNumber')
            .populate('service', 'name basePrice')
            .populate('organization', 'name email phoneNumber');

        if (!booking) throw new ApiError('Booking not found', 404);
        return booking;
    }

    /**
     * Delete Extra Task
     */
    async deleteExtraTask(agentId: string, bookingId: string, taskId: string) {
        const booking = await this.bookingModel.findOne({ _id: bookingId, agent: agentId });
        if (!booking) throw new ApiError('Booking not found', 404);
        if (booking.status === 'COMPLETED') throw new ApiError('Cannot modify completed bookings', 400);

        // Filter out the task
        booking.extraTasks = booking.extraTasks.filter((task: any) => task._id.toString() !== taskId);

        // Recalculate Price
        const service = await this.serviceModel.findById(booking.service);
        const extraTotal = booking.extraTasks.reduce((sum, t) => sum + t.price, 0);
        booking.totalPrice = (service?.basePrice || 0) + extraTotal;

        if (booking.paymentStatus === 'PAID') booking.paymentStatus = 'UNPAID';

        await booking.save();
        return booking;
    }

    /**
     * Mark as Paid and Complete Job
     */
    async processPayment(agentId: string, bookingId: string, agentName: string) {
        const booking = await this.bookingModel.findOne({ _id: bookingId, agent: agentId });
        if (!booking) throw new ApiError('Booking not found', 404);

        // 1. Final Price Verification
        const service = await this.serviceModel.findById(booking.service);
        const expectedBase = service?.basePrice || 0;
        const extraTotal = booking.extraTasks.reduce((sum, t) => sum + t.price, 0);

        // Ensure the total price matches our internal calculation before marking paid
        booking.totalPrice = expectedBase + extraTotal;
        booking.paymentStatus = 'PAID';
        booking.status = 'COMPLETED';

        await booking.save();

        // 2. Set Agent to Free
        await this.agentModel.findByIdAndUpdate(agentId, { status: 'FREE' });

        // 3. Audit Log
        // await addAuditLogJob({
        //   action: 'MARK_BOOKING_PAID',
        //   userId: agentId,
        //   role: 'AGENT',
        //   targetId: bookingId,
        //   metadata: { finalPrice: booking.totalPrice },
        //   username: agentName
        // });

        return booking;
    }
}
