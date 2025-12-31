import { Request, Response, NextFunction } from 'express';
import { ProviderProfileService } from '../services/provider-profile.service';
import { ApiError } from '../../../utils/helpers';
import { uploadToS3, uploadMultipleToS3, UploadFolder } from '../../../utils/s3';

interface RequestWithUser extends Request {
    user?: { id: string };
    files?: any; // For Multer
}

export class ProviderProfileController {
    constructor(private service: ProviderProfileService) { }

    public register = async (req: RequestWithUser, res: Response, next: NextFunction) => {
        try {
            if (!req.user) throw new ApiError('Unauthorized', 401);

            // 1. Handle File Uploads to S3
            let logoUrl = '';
            let imageUrls: string[] = [];

            if (req.files) {
                // Upload logo to S3
                if (req.files.logo?.[0]) {
                    logoUrl = await uploadToS3(req.files.logo[0], UploadFolder.ORGANIZATIONS);
                }
                // Upload images to S3
                if (req.files.images) {
                    imageUrls = await uploadMultipleToS3(req.files.images, UploadFolder.ORGANIZATIONS);
                }
            }

            const data = {
                ...req.body,
                logo: logoUrl,
                images: imageUrls
            };

            const org = await this.service.registerOrganization(req.user.id, data);

            res.status(201).json({
                success: true,
                message: 'Organization registered successfully',
                data: org
            });
        } catch (error) {
            next(error);
        }
    };

    public getDetails = async (req: RequestWithUser, res: Response, next: NextFunction) => {
        try {
            if (!req.user) throw new ApiError('Unauthorized', 401);

            const org = await this.service.getOrgDetails(req.user.id);

            res.status(200).json({
                success: true,
                data: org
            });
        } catch (error) {
            next(error);
        }
    };

    public updateOrg = async (req: RequestWithUser, res: Response, next: NextFunction) => {
        try {
            if (!req.user) throw new ApiError('Unauthorized', 401);

            const org = await this.service.updateOrganization(req.user.id, req.body);

            res.status(200).json({
                success: true,
                message: 'Organization updated successfully',
                data: org
            });
        } catch (error) {
            next(error);
        }
    };
}
