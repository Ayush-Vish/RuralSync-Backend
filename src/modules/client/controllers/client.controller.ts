import { Request, Response, NextFunction } from 'express';
import { ClientService } from '../services/client.service';
import { ApiError } from '../../../utils/helpers';
import { uploadToS3, UploadFolder } from '../../../utils/s3';

interface RequestWithUser extends Request {
    user?: { id: string };
    file?: Express.Multer.File;
}

export class ClientController {
    constructor(private clientService: ClientService) { }

    public getProfile = async (req: RequestWithUser, res: Response, next: NextFunction) => {
        try {
            if (!req.user) throw new ApiError('Unauthorized', 401);
            const profile = await this.clientService.getProfile(req.user.id);
            res.status(200).json({ success: true, data: profile });
        } catch (error) {
            next(error);
        }
    };

    public updateProfile = async (req: RequestWithUser, res: Response, next: NextFunction) => {
        try {
            if (!req.user) throw new ApiError('Unauthorized', 401);
            const updated = await this.clientService.updateProfile(req.user.id, req.body);
            res.status(200).json({ success: true, message: "Profile updated", data: updated });
        } catch (error) {
            next(error);
        }
    };

    public uploadProfileImage = async (req: RequestWithUser, res: Response, next: NextFunction) => {
        try {
            if (!req.user) throw new ApiError('Unauthorized', 401);
            if (!req.file) throw new ApiError('No image file provided', 400);

            // Upload to S3
            const imageUrl = await uploadToS3(req.file, UploadFolder.PROFILES);

            // Update client profile with image URL
            const updated = await this.clientService.updateProfile(req.user.id, { profileImage: imageUrl });

            res.status(200).json({
                success: true,
                message: "Profile image uploaded successfully",
                data: { profileImage: imageUrl }
            });
        } catch (error) {
            next(error);
        }
    };

    public changePassword = async (req: RequestWithUser, res: Response, next: NextFunction) => {
        try {
            const { oldPassword, newPassword } = req.body;
            if (!req.user) throw new ApiError('Unauthorized', 401);

            const result = await this.clientService.changePassword(req.user.id, oldPassword, newPassword);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };
}
