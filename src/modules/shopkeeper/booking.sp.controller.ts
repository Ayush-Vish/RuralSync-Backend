import { Booking, RequestWithUser } from '@org/db';
import { ApiError } from '@org/utils';
import { NextFunction, Response, Request } from 'express';

const getBookings = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
) => {
  try {
    const serviceProviderId = req.user.id;
    const bookings = await Booking.find({ serviceProvider: serviceProviderId })
      .populate('client', 'name email') 
      .populate('service', 'name description') // Populate service details (optional)
      .populate('agent', 'name email') // Populate agent details (optional)
      .exec();
      console.log("AAAAAAAAAAAAA",bookings);

    return res.status(200).json({
      message: 'Booking fetched Successfully',
      bookings,
    });
  } catch (error) {
    return next(new ApiError('An error occurred: ' + error.message, 500));
  }
};

const getBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findById(bookingId)
      .populate('client', 'name email') // Populate customer details (optional)
      .populate('service', 'name description') // Populate service details (optional)
      .populate('agent', 'name email') // Populate agent details (optional)
      .exec();
    return res.json({
      message: 'Booking fetched successfully',
      booking,
    });
  } catch (error) {
    return next(new ApiError('An Error occured ' + error.message, 500));
  }
};

export {
      getBooking,
      getBookings
}
