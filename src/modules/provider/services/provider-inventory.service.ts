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
        const availability = typeof data.availability === 'string' ? JSON.parse(data.availability) : data.availability;
        const additionalTasks = typeof data.additionalTasks === 'string' ? JSON.parse(data.additionalTasks) : data.additionalTasks;

        // Determine service location - ALWAYS use organization's location as default
        let serviceLocation = org.location;
        
        // Only override with provided location if it has VALID coordinates (not [0,0])
        if (data.location) {
            const parsedLocation = typeof data.location === 'string' ? JSON.parse(data.location) : data.location;
            const coords = parsedLocation?.coordinates;
            
            // Check if coordinates are valid (not null, not [0,0], has 2 elements)
            const hasValidCoords = coords && 
                Array.isArray(coords) && 
                coords.length === 2 &&
                (coords[0] !== 0 || coords[1] !== 0) && // Not [0,0]
                !isNaN(coords[0]) && !isNaN(coords[1]);
            
            if (hasValidCoords) {
                serviceLocation = {
                    type: 'Point',
                    coordinates: coords
                };
            }
        }

        // Ensure we have a valid location from organization
        if (!serviceLocation || !serviceLocation.coordinates || 
            (serviceLocation.coordinates[0] === 0 && serviceLocation.coordinates[1] === 0)) {
            throw new ApiError('Organization location is not set. Please update your organization profile with a location first.', 400);
        }

        // Remove location from data to prevent it from overwriting via spread
        const { location: _, ...restData } = data;

        // ✅ Change: Use "new" instead of "create" to guarantee a single document type
        const newService = new this.serviceModel({
            ...restData,
            organization: org._id,
            availability,
            additionalTasks,
            location: serviceLocation,
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

    /**
     * Fix services with invalid [0,0] coordinates by updating them to use organization's location
     */
    async fixServiceLocations(providerId: string) {
        const org = await this.orgModel.findOne({ ownerId: providerId });
        if (!org) throw new ApiError('Organization not found', 404);

        if (!org.location || !org.location.coordinates || 
            (org.location.coordinates[0] === 0 && org.location.coordinates[1] === 0)) {
            throw new ApiError('Organization location is not set. Please update your organization profile first.', 400);
        }

        // Find all services with [0,0] coordinates for this organization
        const result = await this.serviceModel.updateMany(
            {
                organization: org._id,
                $or: [
                    { 'location.coordinates': [0, 0] },
                    { 'location.coordinates.0': 0, 'location.coordinates.1': 0 },
                    { location: { $exists: false } },
                    { location: null }
                ]
            },
            {
                $set: {
                    location: {
                        type: 'Point',
                        coordinates: org.location.coordinates
                    }
                }
            }
        );

        return { 
            message: `Updated ${result.modifiedCount} services with organization location`,
            updatedCount: result.modifiedCount
        };
    }
}
