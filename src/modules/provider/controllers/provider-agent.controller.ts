import { Request, Response, NextFunction } from 'express';
import { ProviderAgentService } from '../services/provider-agent.service';
import { ApiError } from '../../../utils/helpers';

interface RequestWithUser extends Request {
    user?: { id: string };
}

export class ProviderAgentController {
    constructor(private service: ProviderAgentService) { }

    public getAll = async (req: RequestWithUser, res: Response, next: NextFunction) => {
        try {
            if (!req.user) throw new ApiError('Unauthorized', 401);
            const agents = await this.service.getAllAgents(req.user.id);
            res.status(200).json({ success: true, data: agents });
        } catch (error) { next(error); }
    };

    public getOne = async (req: RequestWithUser, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const agent = await this.service.getAgentDetails(id);
            res.status(200).json({ success: true, data: agent });
        } catch (error) { next(error); }
    };

    public delete = async (req: RequestWithUser, res: Response, next: NextFunction) => {
        try {
            if (!req.user) throw new ApiError('Unauthorized', 401);
            const { id } = req.params;
            const result = await this.service.deleteAgent(req.user.id, id);
            res.status(200).json({ success: true, ...result });
        } catch (error) { next(error); }
    };

    public assignToService = async (req: RequestWithUser, res: Response, next: NextFunction) => {
        try {
            if (!req.user) throw new ApiError('Unauthorized', 401);
            const { agentId, serviceId } = req.body;
            const result = await this.service.assignAgentToService(req.user.id, agentId, serviceId);
            res.status(200).json({ success: true, ...result });
        } catch (error) { next(error); }
    };

    
}   
