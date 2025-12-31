import { Request, Response, NextFunction } from 'express';
import { ProviderInventoryService } from '../services/provider-inventory.service';
import { ApiError } from '../../../utils/helpers';
import { uploadMultipleToS3, UploadFolder } from '../../../utils/s3';

interface RequestWithUser extends Request {
    user?: { id: string };
    files?: any;
}

export class ProviderInventoryController {
    constructor(private service: ProviderInventoryService) { }

    public create = async (req: RequestWithUser, res: Response, next: NextFunction) => {
        try {
            if (!req.user) throw new ApiError('Unauthorized', 401);

            // Upload images to S3
            let imageUrls: string[] = [];
            if (req.files && req.files.images) {
                imageUrls = await uploadMultipleToS3(req.files.images, UploadFolder.SERVICES);
            }

            const data = {
                ...req.body,
                images: imageUrls
            };

            const newService = await this.service.addService(req.user.id, data);

            res.status(201).json({
                success: true,
                message: 'Service added successfully',
                data: newService
            });
        } catch (error) {
            next(error);
        }
    };

    public getAll = async (req: RequestWithUser, res: Response, next: NextFunction) => {
        try {
            if (!req.user) throw new ApiError('Unauthorized', 401);
            const services = await this.service.getMyServices(req.user.id);
            res.status(200).json({ success: true, data: services });
        } catch (error) {
            next(error);
        }
    };

    public delete = async (req: RequestWithUser, res: Response, next: NextFunction) => {
        try {
            if (!req.user) throw new ApiError('Unauthorized', 401);
            const { id } = req.params;
            const result = await this.service.deleteService(req.user.id, id);
            res.status(200).json({ success: true, ...result });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Fix all services with [0,0] coordinates by updating them to use organization's location
     */
    public fixLocations = async (req: RequestWithUser, res: Response, next: NextFunction) => {
        try {
            if (!req.user) throw new ApiError('Unauthorized', 401);
            const result = await this.service.fixServiceLocations(req.user.id);
            res.status(200).json({ success: true, ...result });
        } catch (error) {
            next(error);
        }
    };
}
