import { Model } from 'mongoose';
import { IAgent } from '../../../models/agent.model';
import { IOrganization } from '../../../models/organization.model';
import { IService } from '../../../models/service.model';
import { ApiError } from '../../../utils/helpers';

export class ProviderAgentService {
    constructor(
        private agentModel: Model<IAgent>,
        private orgModel: Model<IOrganization>,
        private serviceModel: Model<IService>
    ) { }

    async getAllAgents(providerId: string) {
        // Agents are linked by 'serviceProviderId' based on your schema
        return await this.agentModel.find({ serviceProviderId: providerId });
    }

    async getAgentDetails(agentId: string) {
        return await this.agentModel.findById(agentId);
    }

    async deleteAgent(providerId: string, agentId: string) {
        const agent = await this.agentModel.findOneAndDelete({ _id: agentId, serviceProviderId: providerId });
        if (!agent) throw new ApiError('Agent not found', 404);
        return { message: 'Agent deleted' };
    }

    async assignAgentToService(providerId: string, agentId: string, serviceId: string) {
        const service = (await this.serviceModel.findById(serviceId));
        if (!service) throw new ApiError('Service not found', 404);

        // Verify ownership indirectly via Org or Provider ID logic
        // Assuming simple check:
        const agent = await this.agentModel.findOne({ _id: agentId, serviceProviderId: providerId });
        if (!agent) throw new ApiError('Agent not found', 404);

        if (!service.assignedAgents.includes(agent._id)) {
            service.assignedAgents.push(agent._id);
            await service.save();
        }
        return { message: 'Agent assigned to service capability' };
    }
}
