import { Request, Response, NextFunction } from 'express';
import { ServiceCatalogService } from '../services/service-catalog.service';
import { ApiError } from '../../../utils/helpers';

export class ServiceCatalogController {
    constructor(private catalogService: ServiceCatalogService) { }

    public getAllServices = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const services = await this.catalogService.getAllServices();

            res.status(200).json({
                success: true,
                count: services.length,
                data: services,
            });
        } catch (error) {
            next(error);
        }
    };

    public getServiceById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const service = await this.catalogService.getServiceById(id);

            res.status(200).json({
                success: true,
                data: service,
            });
        } catch (error) {
            next(error);
        }
    };

    public getAllServiceProviders = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const providers = await this.catalogService.getAllProviders();

            res.status(200).json({
                success: true,
                count: providers.length,
                data: providers,
            });
        } catch (error) {
            next(error);
        }
    };
    public searchNearest = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await this.searchNearest(req, res, next);
            res.status(200).json({
                success: true,
                data: result,
            })
        } catch (error) {
            next(error);
        }
    }
}
