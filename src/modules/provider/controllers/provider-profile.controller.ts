import { Request, Response, NextFunction } from 'express';
import { ProviderProfileService } from '../services/provider-profile.service';
import { ApiError } from '../../../utils/helpers';

interface RequestWithUser extends Request {
    user?: { id: string };
    files?: any; // For Multer
}

export class ProviderProfileController {
    constructor(private service: ProviderProfileService) { }

    public register = async (req: RequestWithUser, res: Response, next: NextFunction) => {
        try {
            if (!req.user) throw new ApiError('Unauthorized', 401);

            // 1. Handle File Uploads (Quick extraction logic)
            // Note: In a real app, you might want a helper for this to keep controllers clean
            let logoUrl = '';
            let imageUrls: string[] = [];

            if (req.files) {
                if (req.files.logo?.[0]) logoUrl = req.files.logo[0].location || req.files.logo[0].path;
                if (req.files.images) {
                    imageUrls = req.files.images.map((f: any) => f.location || f.path);
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
}
