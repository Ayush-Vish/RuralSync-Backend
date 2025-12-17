import { Booking, RequestWithUser, Service } from '@org/db';
import { ApiError, addAuditLogJob, addEmailJob } from '@org/utils';
import { NextFunction, Request, RequestParamHandler, Response } from 'express';
import moment from 'moment';
import mongoose from 'mongoose';

/// Utility function for date validation
// const isValidDate = (date: string) => {
//   return !isNaN(Date.parse(date));
// };

type ExtraTask = {
  description: string;
  extraPrice: number;
};

type Location = {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
};

type NewBookingData = {
  client: mongoose.Types.ObjectId;
  service: mongoose.Types.ObjectId;
  bookingDate: Date;
  bookingTime: string;
  extraTasks?: ExtraTask[];
  location?: Location;
  address?:string;
};

export const createBooking = async (
  req: RequestWithUser,
  res: Response
): Promise<void> => {
  try {
    const customerId = req.user.id; // Assuming customer ID is extracted from the authenticated user
    const {
      services, // Accept an array of services
    }: {
      services: {
        serviceId: string;
        bookingDate: string;
        bookingTime: string;
        extraTasks?: ExtraTask[];
        location?: Location;
        address?:string;
      }[];
    } = req.body;

    // Validate that services array is provided
    if (!services || services.length === 0) {
      res.status(400).json({ message: 'At least one service is required' });
      return;
    }

    // Result array to store created bookings
    const createdBookings = [];

    // Loop through each service and create a booking
    for (const serviceData of services) {
      const {
        serviceId,
        bookingDate,
        bookingTime,
        extraTasks,
        location,
      } = serviceData;

      // Validate required fields
      if (!serviceId || !bookingDate || !bookingTime) {
        res.status(400).json({ message: 'All fields are required for each service' });
        return;
      }

      // Validate booking time (e.g., "10:00 AM", "2:30 PM")
      const timeRegex = /^(0?[1-9]|1[0-2]):([0-5]\d)\s?(AM|PM)$/i;
      if (!timeRegex.test(bookingTime)) {
        res.status(400).json({
          message: 'Invalid booking time format. Use format like "10:00 AM"',
        });
        return;
      }

      // Validate location if provided
      if (location) {
        if (
          !location.type ||
          location.type !== 'Point' ||
          !Array.isArray(location.coordinates) ||
          location.coordinates.length !== 2
        ) {
          res.status(400).json({
            message:
              'Invalid location format. Location must be a geoJSON Point with [longitude, latitude]',
          });
          return;
        }
      }

      // Check if the service exists
      const service = await Service.findById(serviceId);
      if (!service) {
        res.status(404).json({ message: 'Service not found' });
        return;
      }

      // Validate and format the date using moment.js
      const formattedBookingDate = moment(bookingDate, 'YYYY-MM-DD').format(
        'YYYY-MM-DD'
      );
      if (!moment(formattedBookingDate, 'YYYY-MM-DD', true).isValid()) {
        res
          .status(400)
          .json({ message: 'Invalid booking date format. Use "YYYY-MM-DD"' });
        return;
      }

      // Build the booking object
      const newBookingData: NewBookingData = {
        client: customerId as any,
        service: serviceId as any,
        bookingDate: new Date(`${formattedBookingDate}T00:00:00Z`), // Only save the date part
        bookingTime: bookingTime, // Save time as string
      };

      // If extra tasks are provided, add them to the booking
      if (extraTasks && extraTasks.length > 0) {
        newBookingData.extraTasks = extraTasks.map((task) => ({
          description: task.description,
          extraPrice: task.extraPrice,
        }));
      }

      // If location is provided, add it to the booking
      if (location) {
        newBookingData.location = location;
      }

      // Create the new booking
      const newBooking = await Booking.create({
        ...newBookingData,
        serviceProvider: service.serviceProvider,

        customer: customerId,
      });

      // Populate the booking with necessary details
      const populatedBooking = await Booking.findById(newBooking._id)
        .populate('service', 'name description')
        .populate('client', 'name email')
        .populate('serviceProvider', 'name email')
        .exec();

      console.log('PopulatedBooking ', populatedBooking);

      await populatedBooking.save();
      createdBookings.push(populatedBooking); // Add to result array

      await addAuditLogJob({
        action: 'CREATE_BOOKING',
        userId: customerId,
        role: 'CLIENT',
        targetId: newBooking._id,
        metadata: {
          service: serviceId,
          bookingDate: formattedBookingDate,
          bookingTime,
          extraTasks,
          location,
        },
        username: req.user.name,
        serviceProviderId: service.serviceProvider,
      });
    }

    res.status(201).json({ message: 'Bookings created successfully', bookings: createdBookings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};


export const getCustomerBookings = async (
  req: RequestWithUser,
  res: Response
): Promise<void> => {
  try {
    const customerId = req.user.id; 
    console.log('Customer ID:', customerId);
    // Validate that the customerId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      res.status(400).json({ message: 'Invalid customer ID' });
      return;
    }
    

    // Fetch all bookings associated with the customer
    const customerBookings = await Booking.find({ customer: customerId }).sort({
      bookingDate: -1,
    }).populate('service')
    .populate('serviceProvider' )
    .populate('client')
    .populate('agent')
    .populate('extraTasks.description')
    

    console.log('Customer Bookings:', customerBookings);
    // Check if bookings are found
    if (customerBookings.length === 0) {
      res.status(200).json({ message: 'No bookings found for this customer' });
      return;
    }


    // Return the bookings
    res.status(200).json(customerBookings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};


// Delete a Booking
export const deleteBooking = async (
  req: RequestWithUser,
  res: Response
): Promise<void> => {
  try {
    // Get the booking ID from the request parameters
    console.log('adihsjdfbhjfbdjhfbg', req.params);
    const { id } = req.params;

    console.log('adillllllll', id);
    // Check if the booking ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid booking ID format' });
      return;
    }

    // Find and delete the booking
    const deletedBooking = (await Booking.findByIdAndDelete(id)).populate('Service');

    // If no booking was found, return a 404 error
    if (!deletedBooking) {
      res.status(404).json({ message: 'Booking not found' });
      return;
    }


     // Fetch the customer details
     const customer = await req.user;

     // Send email to the customer notifying them of the cancellation
    //  await addEmailJob({
    //    email: customer.email,
    //    subject: 'Booking Cancellation',
    //    content: `
    //      <p>Dear ${customer.name},</p>
    //      <p>Your booking has been successfully canceled. Here are the details:</p>
    //      <p><strong>Booking ID:</strong> ${deletedBooking._id}</p>
    //      <p><strong>Service:</strong> ${deletedBooking.service.name}</p>
    //      <p><strong>Booking Date:</strong> ${moment(deletedBooking.bookingDate).format('YYYY-MM-DD')}</p>
    //      <p><strong>Booking Time:</strong> ${deletedBooking.bookingTime}</p>
    //      <p>We are sorry for any inconvenience this may have caused.</p>
    //      <p>Best regards,<br/>Service Provider</p>
    //    `,
    //  });

    // Return a success message
    res.status(200).json({ message: 'Booking deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAllServices = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const services = await Service.find({})
      .populate('serviceProvider', 'name email')
      .populate('serviceCompany','name categories')
      .exec();
    if (!services || services.length === 0) {
      return next(new ApiError('No services found', 404));
    }

    res.status(200).json({
      success: true,
      count: services.length,
      data: services,
    });
  } catch (error) {
    next(
      new ApiError(
        'An error occurred while fetching services: ' + error.message,
        500
      )
    );
  }
};
