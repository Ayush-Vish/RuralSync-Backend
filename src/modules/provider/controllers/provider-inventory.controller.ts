import { Request, Response, NextFunction } from 'express';
import { ProviderInventoryService } from '../services/provider-inventory.service';
import { ApiError } from '../../../utils/helpers';

interface RequestWithUser extends Request {
    user?: { id: string };
    files?: any;
}

export class ProviderInventoryController {
    constructor(private service: ProviderInventoryService) { }

    public create = async (req: RequestWithUser, res: Response, next: NextFunction) => {
        try {
            if (!req.user) throw new ApiError('Unauthorized', 401);

            let imageUrls: string[] = [];
            if (req.files && req.files.images) {
                imageUrls = req.files.images.map((f: any) => f.location || f.path);
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
}
