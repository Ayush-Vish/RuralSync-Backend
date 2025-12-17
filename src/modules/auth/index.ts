// 1. Import Dependencies (Models)
import { Agent } from '../../models/agent.model';
import { Client } from '../../models/client.model';
import { ServiceProvider } from '../../models/serviceProvider.model';
import { Organization } from '../../models/organization.model';

// 2. Import Modules
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './providers/auth.provider.jwt';


const jwtStragety = new JwtStrategy(process.env.JWT_SECRET!);

// 3. Create Service Instance (Inject Models)
const authService = new AuthService({
    AgentModel: Agent,
    ClientModel: Client,
    ServiceProviderModel: ServiceProvider,
    OrganizationModel: Organization,
    authStrategies: {
        "jwt": jwtStragety
    }
});

// 4. Create Controller Instance (Inject Service)
const authController = new AuthController(authService);

// 5. Export the ready-to-use Controller
export { authController };
