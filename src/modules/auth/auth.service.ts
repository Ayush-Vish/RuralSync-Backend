import bcrypt from 'bcryptjs';
import { ApiError, generateAccessAndRefreshToken, Role } from '../../utils/helpers';
import { IAuthProvider } from './interfaces/auth.provider.interface';
import { IAgent } from '../../models/agent.model';
import { Model } from 'mongoose';
import { IClient } from '../../models/client.model';
import { IOrganization } from '../../models/organization.model';
import { IServiceProvider } from '../../models/serviceProvider.model';

// Define the shape of dependencies this service needs
export interface IAuthDependencies {
    AgentModel: Model<IAgent>;
    ClientModel: Model<IClient>;
    ServiceProviderModel: Model<IServiceProvider>;
    OrganizationModel: Model<IOrganization>;
    authStrategies: Record<string, IAuthProvider>;
}

export class AuthService {
    private agent: Model<IAgent>;
    private client: Model<IClient>;
    private provider: Model<IServiceProvider>;
    private org: Model<IOrganization>;

    private strategies: Record<string, IAuthProvider>;

    // Manual Dependency Injection
    constructor({
        AgentModel,
        ClientModel,
        ServiceProviderModel,
        OrganizationModel,
        authStrategies
    }: IAuthDependencies) {
        this.agent = AgentModel;
        this.client = ClientModel;
        this.provider = ServiceProviderModel;
        this.org = OrganizationModel;
        this.strategies = authStrategies;
    }

    /**
     * Universal Login (Email/Password)
     */
    async login(role: string, email: string, password: string) {
        let user: IAgent | IClient | IServiceProvider | null;

        // 1. Select Model based on Role
        if (role === 'SERVICE_PROVIDER') {
            user = await this.provider.findOne({ email }).select('+password');
        } else if (role === 'AGENT') {
            user = await this.agent.findOne({ email }).select('+password');
        } else if (role === 'CLIENT') {
            user = await this.client.findOne({ email }).select('+password');
        } else {
            throw new ApiError('Invalid Role provided', 400);
        }

        if (!user) throw new ApiError('User not found', 404);

        // Agent-specific check
        if (role === 'AGENT' && !user.password) {
            throw new ApiError('Agent account not properly configured', 500);
        }

        // 2. Validate Password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) throw new ApiError('Invalid Credentials', 401);

        // 3. Generate Tokens
        const tokens = await generateAccessAndRefreshToken(role, user._id.toString());

        // 4. Update Refresh Token
        user.refreshToken = tokens.refreshToken;
        await user.save();

        // 5. Sanitize Output
        const userResponse = user.toObject ? user.toObject() : user;
        delete userResponse.password;

        return { user: userResponse, tokens };
    }

    /**
     * [NEW] Strategy Login (e.g. Google, GitHub, JWT)
     * This utilizes the injected strategies
     */
    async loginWithProvider(providerName: string, token: string, role: string) {
        const strategy = this.strategies[providerName];
        if (!strategy) {
            throw new ApiError(`Authentication provider '${providerName}' not supported`, 400);
        }

        // 1. Verify Token using the Strategy
        const profile = await strategy.verifyToken(token);

        // 2. Find User (Logic can be customized per role if needed)
        let user;
        if (role === 'CLIENT') {
            user = await this.client.findOne({ email: profile.email });

            // Optional: Auto-register if using social login
            if (!user) {
                user = await this.client.create({
                    email: profile.email,
                    name: profile.name,
                    // You might want to store providerId here
                });
            }
        } else {
            // For Agents/Providers, usually we require them to exist first
            if (role === 'SERVICE_PROVIDER') user = await this.provider.findOne({ email: profile.email });
            else if (role === 'AGENT') user = await this.agent.findOne({ email: profile.email });
        }

        if (!user) throw new ApiError('User not found', 404);

        // 3. Generate Tokens
        return generateAccessAndRefreshToken(role as Role, user._id.toString());
    }

    /**
     * Register a new Service Provider
     */
    async registerServiceProvider(data: any) {
        const { email, password , name} = data;
        if (!email || !password || !name) throw new ApiError('Email and password required', 400);

        const exists = await this.provider.findOne({ email });
        if (exists) throw new ApiError('Service Provider already exists', 400);

        const newUser = await new this.provider({
            email,
            password,
            name
        });
        await newUser.save();
        return generateAccessAndRefreshToken('SERVICE_PROVIDER', newUser._id.toString());
    }

    /**
     * Register a new Client
     */
    async registerClient(data: any) {
        const { email, password, name } = data;
        if (!email || !password || !name) throw new ApiError('Email and password required', 400);

        const exists = await this.client.findOne({ email });
        if (exists) throw new ApiError('Client already exists', 400);

        const newUser = await new this.client({
            email,
            password,
            name
        });
        await newUser.save();
        return generateAccessAndRefreshToken('CLIENT', newUser._id.toString());
    }

    /**
     * Register a new Agent (Requires Provider Authorization)
     */
    async registerAgent(data: any, providerId: string) {
        const { email, password, name } = data;
        if (!email || !password || !name) throw new ApiError('Missing required fields', 400);

        const exists = await this.agent.findOne({ email });
        if (exists) throw new ApiError('Agent already exists', 400);

        // Verify Organization exists for this provider
        const org = await this.org.findOne({ ownerId: providerId });
        if (!org) throw new ApiError('Organization not found for this provider', 404);

        // Create Agent
        const newAgent = await new this.agent({
            ...data,
            serviceProviderId: providerId,
            location: {
                type: "Point",
                coordinates: [data.location?.longitude || 0, data.location?.latitude || 0]
            }
        });
        await newAgent.save();
        // Link Agent to Organization
        org.agents.push(newAgent._id);
        await org.save();

        return newAgent;
    }

    /**
     * Logout
     */
    async logout(userId: string, role: string) {
        const update = { $unset: { refreshToken: 1 } };

        if (role === 'SERVICE_PROVIDER') await this.provider.findByIdAndUpdate(userId, update);
        else if (role === 'AGENT') await this.agent.findByIdAndUpdate(userId, update);
        else if (role === 'CLIENT') await this.client.findByIdAndUpdate(userId, update);
    }

    /**
     * Get Current User Details
     */
    async getUserDetails(userId: string, role: string) {
        if (role === 'SERVICE_PROVIDER') return this.provider.findById(userId);
        if (role === 'AGENT') return this.agent.findById(userId);
        if (role === 'CLIENT') return this.client.findById(userId);
        return null;
    }
}
