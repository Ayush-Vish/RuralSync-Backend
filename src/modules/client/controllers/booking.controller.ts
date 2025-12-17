import { Request, Response, NextFunction } from 'express';
import { BookingService } from '../services/booking.service';
import { ApiError } from '../../../utils/helpers';

interface RequestWithUser extends Request {
    user?: { id: string; role: string; };
}

export class BookingController {
    constructor(private bookingService: BookingService) { }

    public create = async (req: RequestWithUser, res: Response, next: NextFunction) => {
        try {
            if (!req.user) throw new ApiError('Unauthorized', 401);

            const { services } = req.body;
            const bookings = await this.bookingService.createBookings(req.user.id, services);

            res.status(201).json({
                success: true,
                message: 'Bookings created successfully',
                data: bookings
            });
        } catch (error) {
            next(error);
        }
    };

    public getAll = async (req: RequestWithUser, res: Response, next: NextFunction) => {
        try {
            if (!req.user) throw new ApiError('Unauthorized', 401);

            const bookings = await this.bookingService.getClientBookings(req.user.id);

            res.status(200).json({
                success: true,
                count: bookings.length,
                data: bookings
            });
        } catch (error) {
            next(error);
        }
    };

    public delete = async (req: RequestWithUser, res: Response, next: NextFunction) => {
        try {
            if (!req.user) throw new ApiError('Unauthorized', 401);

            const { id } = req.params;
            const result = await this.bookingService.cancelBooking(id, req.user.id);

            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };
}
