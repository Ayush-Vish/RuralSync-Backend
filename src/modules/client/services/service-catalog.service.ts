import { Model } from 'mongoose';
import { IService } from '../../../models/service.model';
import { IServiceProvider } from '../../../models/serviceProvider.model';
import { ApiError } from '../../../utils/helpers';

export class ServiceCatalogService {
    constructor(
        private serviceModel: Model<IService>,
        private providerModel: Model<IServiceProvider>
    ) { }

    /**
     * Get All Services (with search/filter support in future)
     */
    async getAllServices() {
        // Populate organization (formerly serviceCompany) and provider
        const services = await this.serviceModel.find({})
            .populate('organization', 'name categories')
            .populate('organization', 'name email'); // serviceProvider -> organization owner? Verify relation

        // Note: Adjust populate fields based on your exact schema needs
        return services;
    }

    /**
     * Get Single Service by ID
     */
    async getServiceById(id: string) {
        const service = await this.serviceModel.findById(id)
            .populate('organization', 'name categories');

        if (!service) throw new ApiError(`Service with ID ${id} not found`, 404);
        return service;
    }

    /**
     * Get All Service Providers
     */
    async getAllProviders() {
        // We query the DB directly instead of calling an external API
        const providers = await this.providerModel.find({ isVerified: true })
            .select('name email phone rating reviewCount location');

        return providers;
    }
}
