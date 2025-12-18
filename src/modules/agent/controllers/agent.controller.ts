import { Request, Response, NextFunction } from 'express';
import { AgentService } from '../services/agent.service';
import { ApiError } from '../../../utils/helpers';

interface RequestWithUser extends Request {
    user?: { id: string; name: string };
}

export class AgentController {
    constructor(private agentService: AgentService) { }

    public getDashboard = async (req: RequestWithUser, res: Response, next: NextFunction) => {
        try {
            const data = await this.agentService.getDashboard(req.user!.id, req.user!.name);
            res.status(200).json({ success: true, data });
        } catch (error) { next(error); }
    };

    public updateStatus = async (req: RequestWithUser, res: Response, next: NextFunction) => {
        try {
            const { bookingId } = req.params;
            const { status } = req.body;
            const booking = await this.agentService.updateStatus(req.user!.id, bookingId, status, req.user!.name);
            res.status(200).json({ success: true, message: `Status updated to ${status}`, data: booking });
        } catch (error) { next(error); }
    };

    public handleExtraTask = async (req: RequestWithUser, res: Response, next: NextFunction) => {
        try {
            const { bookingId } = req.params;
            const { description, price, taskId } = req.body;
            const booking = await this.agentService.manageExtraTask(req.user!.id, bookingId, { description, price, taskId });
            res.status(200).json({ success: true, data: booking });
        } catch (error) { next(error); }
    };
    public getBooking = async (req: RequestWithUser, res: Response, next: NextFunction) => {
        try {
            const { bookingId } = req.params;
            const booking = await this.agentService.getBookingById(bookingId);
            res.status(200).json({ success: true, booking });
        } catch (error) { next(error); }
    };

    public removeExtraTask = async (req: RequestWithUser, res: Response, next: NextFunction) => {
        try {
            const { bookingId, taskId } = req.params;
            const booking = await this.agentService.deleteExtraTask(req.user!.id, bookingId, taskId);
            res.status(200).json({ success: true, message: 'Task deleted', booking });
        } catch (error) { next(error); }
    };

    public payBooking = async (req: RequestWithUser, res: Response, next: NextFunction) => {
        try {
            const { bookingId } = req.params;
            const booking = await this.agentService.processPayment(req.user!.id, bookingId, req.user!.name);
            res.status(200).json({ success: true, message: 'Payment confirmed', booking });
        } catch (error) { next(error); }
    };
}
