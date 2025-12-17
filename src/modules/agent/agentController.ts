
import { NextFunction, Response } from 'express';
import { RequestWithUser } from '../../models/session.model';
import { Booking } from '../../models/booking.model';



export const getBooking = async (req: RequestWithUser, res: Response, next: NextFunction) =>  {
  try {
    const { bookingId } = req.params;
    console.log("AAAAAAAAAAAAA",bookingId);

    const booking =await  Booking.findById(bookingId)
                    .populate('client', 'name email phone')
                    .populate('agent', 'name email phone')
                    .populate('serviceProvider', 'name email phone');
    return res.status(200).json({ booking });
  } catch (error) {
    return next(new ApiError('Failed to fetch booking', 500));
  }
}

export const getAgentDashboard = async (req: RequestWithUser, res  : Response , next:NextFunction) => {
  try {

    const agentId = req.user.id;

    const bookings = await Booking.find({ agent: agentId })

    const pendingBookings = bookings.filter(b => b.status === 'Pending');
    const inProgressBookings = bookings.filter(b => b.status === 'In Progress');
    const completedBookings = bookings.filter(b => b.status === 'Completed');

    await addAuditLogJob({
      action: 'FETCH_AGENT_DASHBOARD',
      userId: agentId,
      role: 'AGENT',
      metadata: {
        totalBookings: bookings.length,
        pendingBookings: pendingBookings.length,
        inProgressBookings: inProgressBookings.length,
        completedBookings: completedBookings.length,
      },
      username: req.user.name,
      serviceProviderId: bookings.length > 0 ? bookings[0].serviceProvider : null,
      targetId : agentId
    });
    return res.status(200).json({
      totalBookings: bookings.length,
      pendingBookings,
      inProgressBookings,
      completedBookings,
    });
  } catch (error) {
    console.log(error)
    return next(new ApiError('Failed to fetch dash`board data ' , 400));
  }
};


export const updateBookingStatus = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const { bookingId } = req.params;
    const { status } = req.body;
    const agentId = req.user.id;
    const agentName = req.user.name;

    const validStatuses = ['Pending', 'Confirmed', 'In Progress', 'Completed', 'Not Assigned'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status. Must be one of: Pending, Confirmed, In Progress, Completed, Cancelled, Not Assigned'
      });
    }

    const booking = await Booking.findOne({
      _id: bookingId,
      agent: agentId
    });

    if (!booking) {
      return res.status(404).json({
        error: 'Booking not found or not assigned to this agent'
      });
    }

    const validTransitions: { [key: string]: string[] } = {
      'Not Assigned': ['Pending', 'Confirmed'],
      'Pending': ['In Progress', 'Cancelled'],
      'Confirmed': ['In Progress', 'Cancelled'],
      'In Progress': ['Completed', 'Cancelled'],
      'Completed': [],
      'Cancelled': []
    };

    if (!validTransitions[booking.status]?.includes(status)) {
      return res.status(400).json({
        error: `Cannot transition from ${booking.status} to ${status}`
      });
    }

    const previousStatus = booking.status;
    booking.status = status;
    booking.updatedAt = new Date();
    await booking.save();

    await addAuditLogJob({
      action: 'UPDATE_BOOKING_STATUS',
      userId: agentId,
      role: 'AGENT',
      targetId: bookingId,
      metadata: {
        previousStatus,
        newStatus: status,
      },
      username: agentName,
      serviceProviderId: booking.serviceProvider
    });

    return res.status(200).json({
      message: `Booking status updated to ${status}`,
      booking
    });

  } catch (error) {
    return next(new ApiError('Failed to update booking status', 500));
  }
};

// Add or update extra task with price calculation
export const manageExtraTask = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const { bookingId } = req.params;
    const { description, extraPrice, taskId } = req.body;
    const agentId = req.user.id;

    // Validate input
    if (!description || !extraPrice || isNaN(Number(extraPrice))) {
      return res.status(400).json({
        error: 'Description and valid extra price are required'
      });
    }

    // Find and validate booking
    const booking = await Booking.findOne({
      _id: bookingId,
      agent: agentId
    });

    if (!booking) {
      return res.status(404).json({
        error: 'Booking not found or not assigned to this agent'
      });
    }

    // Don't allow modifications if booking is completed
    if (booking.status === 'Completed') {
      return res.status(400).json({
        error: 'Cannot modify extra tasks for completed bookings'
      });
    }

    let action = 'ADD_EXTRA_TASK';
    // Update existing task or add new one
    if (taskId) {
      const taskIndex = booking.extraTasks.findIndex(task => task._id.toString() === taskId);
      if (taskIndex === -1) {
        return res.status(404).json({ error: 'Task not found' });
      }
      booking.extraTasks[taskIndex].set({ description, extraPrice });
      action = 'UPDATE_EXTRA_TASK';
    } else {
      booking.extraTasks.push({ description, extraPrice });
    }

    // Calculate total price including extra tasks
    const extraTasksTotal = booking.extraTasks.reduce((sum, task) => 
      sum + Number(task.extraPrice), 0
    );
    
    // Add base price to total if it exists
    const basePrice = booking.totalPrice || 0;
    booking.totalPrice = basePrice + extraTasksTotal;

    // If payment status is Paid, mark as Unpaid due to price change
    if (booking.paymentStatus === 'Paid') {
      booking.paymentStatus = 'Unpaid';
    }

    await booking.save();

    // Add audit log
    await addAuditLogJob({
      action,
      userId: agentId,
      role: 'AGENT',
      targetId: bookingId,
      metadata: {
        description,
        extraPrice,
        newTotalPrice: booking.totalPrice
      },
      username: req.user.name,
      serviceProviderId: booking.serviceProvider
    });

    return res.status(200).json({
      message: `Extra task ${taskId ? 'updated' : 'added'} successfully`,
      booking: {
        ...booking.toObject(),
        totalPrice: booking.totalPrice,
        paymentStatus: booking.paymentStatus
      }
    });

  } catch (error) {
    return next(new ApiError('Failed to manage extra task', 500));
  }
};

// Delete extra task
export const deleteExtraTask = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const { bookingId, taskId } = req.params;
    const agentId = req.user.id;

    // Find and validate booking
    const booking = await Booking.findOne({
      _id: bookingId,
      agent: agentId
    });

    if (!booking) {
      return res.status(404).json({
        error: 'Booking not found or not assigned to this agent'
      });
    }

    // Don't allow modifications if booking is completed
    if (booking.status === 'Completed') {
      return res.status(400).json({
        error: 'Cannot delete extra tasks for completed bookings'
      });
    }

    // Find and remove task
    const taskIndex = booking.extraTasks.findIndex(task => 
      task._id.toString() === taskId
    );

    if (taskIndex === -1) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const deletedTask = booking.extraTasks[taskIndex];
    booking.extraTasks.splice(taskIndex, 1);

    // Recalculate total price
    const extraTasksTotal = booking.extraTasks.reduce((sum, task) => 
      sum + Number(task.extraPrice), 0
    );
    
    const basePrice = booking.totalPrice || 0;
    booking.totalPrice = basePrice + extraTasksTotal;

    // If payment status is Paid, mark as Unpaid due to price change
    if (booking.paymentStatus === 'Paid') {
      booking.paymentStatus = 'Unpaid';
    }

    await booking.save();

    // Add audit log
    await addAuditLogJob({
      action: 'DELETE_EXTRA_TASK',
      userId: agentId,
      role: 'AGENT',
      targetId: bookingId,
      metadata: {
        deletedTask,
        newTotalPrice: booking.totalPrice
      },
      username: req.user.name,
      serviceProviderId: booking.serviceProvider
    });

    return res.status(200).json({
      message: 'Extra task deleted successfully',
      booking: {
        ...booking.toObject(),
        totalPrice: booking.totalPrice,
        paymentStatus: booking.paymentStatus
      }
    });

  } catch (error) {
    return next(new ApiError('Failed to delete extra task', 500));
  }
};


export const markBookingAsPaid = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const { bookingId } = req.params;
    const agentId = req.user.id;

    // Find and validate booking
    const booking = await Booking.findOne({
      _id: bookingId,
      agent: agentId
    });

    if (!booking) {
      return res.status(404).json({
        error: 'Booking not found or not assigned to this agent'
      });
    }

  

    // Recalculate total price to ensure consistency
    const extraTasksTotal = booking.extraTasks.reduce((sum, task) => 
      sum + Number(task.extraPrice), 0
    );
    const service = await Service.findOne({
      serviceProvider : booking.serviceProvider
    })
    const basePrice = service.basePrice || 0;  // Assuming basePrice is a separate field in the Booking schema
    const calculatedTotalPrice = basePrice + extraTasksTotal;

    // If there's a mismatch, update the booking's totalPrice
    if (calculatedTotalPrice !== booking.totalPrice) {
      booking.totalPrice = calculatedTotalPrice;
    }

    // Update payment status
    booking.paymentStatus = 'Paid';
    booking.status = "Completed";
    booking.updatedAt = new Date();
    await booking.save();
    await Agent.findByIdAndUpdate(agentId, { status: 'FREE' });

    // Add audit log
    await addAuditLogJob({
      action: 'MARK_BOOKING_PAID',
      userId: agentId,
      role: 'AGENT',
      targetId: bookingId,
      metadata: {
        calculatedTotalPrice,
        finalPrice: booking.totalPrice
      },
      username: req.user.name,
      serviceProviderId: booking.serviceProvider
    });

    return res.status(200).json({
      message: 'Booking marked as paid successfully',
      booking: {
        ...booking.toObject(),
        totalPrice: booking.totalPrice,
        paymentStatus: booking.paymentStatus
      }
    });

  } catch (error) {
    return next(new ApiError('Failed to mark booking as paid', 500));
  }
};
