import { Model } from 'mongoose';
import { IService } from '../../../models/service.model';
import { IOrganization } from '../../../models/organization.model';
import { ApiError } from '../../../utils/helpers';

export class ProviderInventoryService {
    constructor(
        private serviceModel: Model<IService>,
        private orgModel: Model<IOrganization>
    ) { }

    async addService(providerId: string, data: any) {
        const org = await this.orgModel.findOne({ ownerId: providerId });
        if (!org) throw new ApiError('You must register an organization first', 400);

        // Parse specific fields if they come as strings
        const parsedLocation = typeof data.location === 'string' ? JSON.parse(data.location) : data.location;
        const availability = typeof data.availability === 'string' ? JSON.parse(data.availability) : data.availability;
        const additionalTasks = typeof data.additionalTasks === 'string' ? JSON.parse(data.additionalTasks) : data.additionalTasks;

        // ✅ Change: Use "new" instead of "create" to guarantee a single document type
        const newService = new this.serviceModel({
            ...data,
            organization: org._id,
            availability,
            additionalTasks,
            location: {
                type: 'Point',
                coordinates: parsedLocation.coordinates
            },
        });

        // Save the document
        await newService.save();

        // ✅ Now TypeScript knows newService is a single document, so ._id works!
        org.services.push(newService._id as any);
        await org.save();

        return newService;
    }


    async getMyServices(providerId: string) {
        const org = await this.orgModel.findOne({ ownerId: providerId });
        if (!org) return [];
        return await this.serviceModel.find({ organization: org._id });
    }

    async deleteService(providerId: string, serviceId: string) {
        const org = await this.orgModel.findOne({ ownerId: providerId });
        // Ensure ownership
        const service = await this.serviceModel.findOneAndDelete({
            _id: serviceId,
            organization: org?._id
        });

        if (!service) throw new ApiError('Service not found or unauthorized', 404);
        return { message: 'Service deleted' };
    }
}
