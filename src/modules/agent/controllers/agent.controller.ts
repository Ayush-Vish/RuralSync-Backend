import { Request, Response, NextFunction } from 'express';
import { AgentService } from '../services/agent.service';
import { ApiError } from '../../../utils/helpers';
import { uploadToS3, UploadFolder } from '../../../utils/s3';

interface RequestWithUser extends Request {
    user?: { id: string; name: string };
    file?: Express.Multer.File;
}

export class AgentController {
    constructor(private agentService: AgentService) { }

    public getDashboard = async (req: RequestWithUser, res: Response, next: NextFunction) => {
        try {
            const data = await this.agentService.getDashboard(req.user!.id, req.user!.name);
            res.status(200).json({ success: true, data });
        } catch (error) { next(error); }
    };

    public uploadProfileImage = async (req: RequestWithUser, res: Response, next: NextFunction) => {
        try {
            if (!req.user) throw new ApiError('Unauthorized', 401);
            if (!req.file) throw new ApiError('No image file provided', 400);

            // Upload to S3
            const imageUrl = await uploadToS3(req.file, UploadFolder.PROFILES);

            // Update agent profile with image URL
            const updated = await this.agentService.updateProfile(req.user.id, { profileImage: imageUrl });

            res.status(200).json({
                success: true,
                message: "Profile image uploaded successfully",
                data: { profileImage: imageUrl }
            });
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

    // public payBooking = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    //     try {
    //         const { bookingId } = req.params;
    //         const booking = await this.agentService.processPayment(req.user!.id, bookingId, req.user!.name);
    //         res.status(200).json({ success: true, message: 'Payment confirmed', booking });
    //     } catch (error) { next(error); }
    // };
    public markAsPaid = async (req: RequestWithUser, res: Response, next: NextFunction) => {
        try {
            const { bookingId } = req.params;
            const { method } = req.body; // e.g., "CASH"
            const result = await this.agentService.processPayment(req.user!.id, bookingId, method);
            res.status(200).json({ success: true, booking: result });
        } catch (error) { next(error); }
    };
}
