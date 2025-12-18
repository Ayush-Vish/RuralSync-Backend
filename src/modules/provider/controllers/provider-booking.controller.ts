import { Request, Response, NextFunction } from 'express';
import { ProviderBookingService } from '../services/provider-booking.service';
import { ApiError } from '../../../utils/helpers';

interface RequestWithUser extends Request {
    user?: { id: string };
}

export class ProviderBookingController {
    constructor(private service: ProviderBookingService) { }

    public getBookings = async (req: RequestWithUser, res: Response, next: NextFunction) => {
        try {
            if (!req.user) throw new ApiError('Unauthorized', 401);
            const data = await this.service.getBookings(req.user.id);
            res.status(200).json({ success: true, data });
        } catch (error) { next(error); }
    };

    // public assignAgent = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    //     try {
    //         if (!req.user) throw new ApiError('Unauthorized', 401);
    //         const { bookingId, agentId } = req.body;
    //         const data = await this.service.assignAgentToBooking(req.user.id, bookingId, agentId);
    //         res.status(200).json({ success: true, message: 'Agent Assigned', data });
    //     } catch (error) { next(error); }
    // };
    public assignAgent = async (req: RequestWithUser, res: Response, next: NextFunction) => {
        try {
            const { agentId, bookingId } = req.body;
            const providerId = req.user!.id;

            if (!agentId || !bookingId) {
                throw new ApiError('Agent ID and Booking ID are required', 400);
            }

            const result = await this.service.assignAgentToBooking(providerId, bookingId, agentId);

            res.status(200).json({
                success: true,
                message: 'Agent assigned successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    };
}
