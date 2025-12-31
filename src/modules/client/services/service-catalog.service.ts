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
        const providers = await this.providerModel.find({ isVerified: false })
            .select('name email phone rating reviewCount location')
            .populate({
                path: 'serviceCompany',
                select: 'name description logo images categories rating reviewCount location address phone website businessHours'
            });
        return providers;
    }

    /**
     * Get Single Service Provider by ID with full details
     */
    async getProviderById(id: string) {
        const provider = await this.providerModel.findById(id)
            .select('name email phone address rating reviewCount location serviceCompany services')
            .populate({
                path: 'serviceCompany',
                select: 'name description logo images categories rating reviewCount location address phone website businessHours socialMedia'
            })
            .populate({
                path: 'service',
                select: 'name description price duration images category rating reviewCount'
            });

        if (!provider) throw new ApiError(`Service Provider with ID ${id} not found`, 404);
        return provider;
    }
}
