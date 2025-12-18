import { Model } from 'mongoose';
import { IOrganization } from '../../../models/organization.model';
import { IServiceProvider } from '../../../models/serviceProvider.model';
import { ApiError } from '../../../utils/helpers';

export class ProviderProfileService {
    constructor(
        private orgModel: Model<IOrganization>,
        private providerModel: Model<IServiceProvider>
    ) { }

    async getOrgDetails(providerId: string) {
        const org = await this.orgModel.findOne({ ownerId: providerId });
        if (!org) throw new ApiError('Organization not found', 404);

        return org;
    }

    async registerOrganization(providerId: string, data: any) {
        // 1. Validation
        const existingOrg = await this.orgModel.findOne({ ownerId: providerId });
        console.log(existingOrg);
        if (existingOrg) throw new ApiError('You already have an organization', 400);

        const provider = await this.providerModel.findById(providerId);
        if (!provider) throw new ApiError('Provider not found', 404);

        // 2. Parse Data (Assuming Controller handles file uploads and passes URLs)
        const newOrg = await new this.orgModel({
            ...data,
            ownerId: providerId,
            isVerified: true,

            location: typeof data.location === 'string' ? JSON.parse(data.location) : data.location,
            socialMedia: typeof data.socialMedia === 'string' ? JSON.parse(data.socialMedia) : data.socialMedia,
            businessHours: typeof data.businessHours === 'string' ? JSON.parse(data.businessHours) : data.businessHours,
            categories: typeof data.categories === 'string' ? JSON.parse(data.categories) : data.categories,
        });
        await newOrg.save();

        // 3. Link Provider to Org
        provider.serviceCompany = newOrg._id;
        await provider.save();
        await provider.save();

        return newOrg;
    }
}
