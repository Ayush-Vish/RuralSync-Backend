import { Agent, Booking, Org, RequestWithUser, Service } from '@org/db';
import { addAuditLogJob, addEmailJob, ApiError, ApiResponse } from '@org/utils';
import { NextFunction, Request, Response } from 'express';

const assignAgent = async (req, res, next) => {
  try {
    const { agentId, serviceId } = req.body;
    if (!agentId || !serviceId) {
      return next(new ApiError('Agent Id and Service Id are required', 400));
    }

    const service = await Service.findById(serviceId);
    if (!service) {
      return next(new ApiError('Service not found', 404));
    }

    // Check if the agent exists
    const agent = await Agent.findById(agentId);
    if (!agent) {
      return next(new ApiError('Agent not found', 404));
    }

    // Add agent to assignedAgents if not already present
    if (!service.assignedAgents.includes(agentId)) {
      service.assignedAgents.push(agentId);
      await service.save();
    }


    return res.status(200).json({ message: 'Agent assigned successfully' });
  } catch (error) {
    return next(new ApiError('An error occurred: ' + error.message, 500));
  }
};

const assignAgentForaBooking = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
) => {
  try {
    const { agentId, bookingId } = req.body;
    const serviceProviderId = req.user.id;
    // Retrieve agent and check if exists
    const agent = await Agent.findById(agentId);
    if (!agent) {
      return next(new ApiError('Agent not Found ', 400));
    }

    // Retrieve booking and populate required fields
    const booking = await Booking.findById(bookingId)
      .populate('client', 'name email') // Populate customer details (optional)
      .populate('service', 'name description');

    if (!booking) {
      return next(new ApiError('Booking not Found ', 400));
    }

    console.log('Agent:', agent);
    console.log('Booking:', booking);

    // Send email to agent
    await addEmailJob({
      email: agent.email,
      subject: 'New Booking Assigned',
      content: `
            <p>Dear ${agent.name},</p>
            <p>You have been assigned a new booking. Please find the details below:</p>
            <p><strong>Booking ID:</strong> ${bookingId}</p>
            <p><strong>Service:</strong> ${(booking.service as any).name}</p>
            <p><strong>Client:</strong> ${(booking.client as any).name}</p>
            <p><strong>Booking Date:</strong> ${booking.bookingDate.toDateString()}</p>
            <p><strong>Booking Time:</strong> ${booking.bookingTime}</p>
            <p><strong>Location:</strong> ${booking.location.coordinates.join(
              ', '
            )}</p>
            <p><strong>Extra Tasks:</strong></p>
            <ul>
              ${booking.extraTasks
                .map(
                  (task) => `<li>${task.description} - ${task.extraPrice}</li>`
                )
                .join('')}
            </ul>
            <p>Please make sure to be available at the specified time and location.</p>
            <p>Best regards,<br/>Service Provider</p>
          `,
    });

    // Send email to client
    if (booking.client && (booking.client as any).email) {
      console.log('Sending email to client:', (booking.client as any).email);
      await addEmailJob({
        email: (booking.client as any).email,
        subject: 'Booking Confirmation',
        content: `
              <p>Dear ${(booking.client as any).name},</p>
              <p>Your booking has been confirmed. Please find the details below:</p>
              <p><strong>Booking ID:</strong> ${bookingId}</p>
              <p><strong>Service:</strong> ${(booking.service as any).name}</p>
              <p><strong>Agent:</strong> ${agent.name}</p>
              <p><strong>Booking Date:</strong> ${booking.bookingDate.toDateString()}</p>
              <p><strong>Booking Time:</strong> ${booking.bookingTime}</p>
              <p><strong>Location:</strong> ${booking.location.coordinates.join(
                ', '
              )}</p>
              <p><strong>Extra Tasks:</strong></p>
              <ul>
                ${booking.extraTasks
                  .map(
                    (task) =>
                      `<li>${task.description} - ${task.extraPrice}</li>`
                  )
                  .join('')}
              </ul>
              <p>Thank you for choosing our service. We look forward to serving you.</p>
              <p>Best regards,<br/>Service Provider</p>
            `,
      });
    } else {
      console.warn('Client email not found or client not populated correctly');
    }

    const serviceCompany = await Org.findOne({
      ownerId : serviceProviderId
    })
    await serviceCompany.clients.push(booking.client._id);
    console.log('serviceCompany:', serviceCompany.clients);
    await serviceCompany.save();

    // Update booking and agent status
    booking.agent = agentId;
    booking.status = 'Pending';
    agent.status = 'BUSY';
    await agent.save();
    await booking.save();
    await addAuditLogJob({
      action: 'ASSIGN_AGENT',
      userId: agentId,
      role: 'AGENT',
      targetId: bookingId,
      metadata:{
        bookingId,
        agentId,
      },
      username :agent.name,
      serviceProviderId:agent.serviceProviderId
    })

    // Send response
    return new ApiResponse(res, 201, 'Booking Created', {
      agentName: agent.name,
      agentPhone: agent.phoneNumber,
      bookingId,
      agentId,
    });
  } catch (error) {
    console.error('Error in assignAgentForaBooking:', error);
    return next(new ApiError(error.message, 400));
  }
};

const availableAgents = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log('Check Availability');
    const ownerId = req.user.id;
    const org = await Org.findOne({
      ownerId,
    });
    if (!org) {
      return next(new ApiError('Organization not found', 404));
    }
    const availableAgents = await Agent.find({
      availability: true,
      serviceCompany: org._id,
    });
    return res.status(200).json(availableAgents);
  } catch (error) {
    return next(new ApiError('An error occurred: ' + error.message, 500));
  }
};
const getAllAgents = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
) => {
  try {
    const ownerId = req.user.id;
    const agents = await Agent.find({ serviceProviderId: ownerId });
    return res.status(200).json({
      message: 'Agents retrieved successfully',
      data: agents,
    });
  } catch (error) {
    return next(new ApiError('An error occurred: ' + error.message, 500));
  }
};
const deleteAgent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { agentId } = req.params;
    const agent = await Agent.findByIdAndDelete(agentId);
    if (!agent) {
      return next(new ApiError('Agent not found', 404));
    }
    return res.status(200).json({ message: 'Agent deleted successfully' });
  } catch (error) {
    return next(new ApiError('An error occurred: ' + error.message, 500));
  }
};

const getAgent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { agentId } = req.params;
    const agent = await Agent.findById(agentId);
    if (!agent) {
      return next(new ApiError('Agent not found', 404));
    }
    const agentBooking = await Booking.find({ agent: agentId });
    const agentServices = await Service.find({ assignedAgents: agentId });

    return res.status(200).json({
      message: 'Agent retrieved successfully',
      agent,
      agentBooking,
      agentServices,
    });
  } catch (error) {
    return next(new ApiError('An error occurred: ' + error.message, 500));
  }
};
export {
  assignAgent,
  availableAgents,
  assignAgentForaBooking,
  getAllAgents,
  deleteAgent,
  getAgent,
};
