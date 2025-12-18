import { Booking } from '../../models/booking.model';
import { Agent } from '../../models/agent.model';
import { Service } from '../../models/service.model';
import { AgentService } from './services/agent.service';
import { AgentController } from './controllers/agent.controller';

const agentService = new AgentService(
    Booking as any,
    Agent as any,
    Service as any
);

const agentController = new AgentController(agentService);

export { agentController };
