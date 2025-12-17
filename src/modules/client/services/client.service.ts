import { Model } from 'mongoose';
import { IClient } from '../../../models/client.model';
import { ApiError } from '../../../utils/helpers';
import bcrypt from 'bcryptjs';
import { INotificationStrategy } from '../../shared/interfaces/notification.interface';
export interface IClientServiceDependencies {
    ClientModel: Model<IClient>;
    notificationStrategies: Record<string, INotificationStrategy>;
}
export class ClientService {
    private notificationStrategies: Record<string, INotificationStrategy>;
    private clientModel: Model<IClient>;
    constructor({ClientModel, notificationStrategies}: IClientServiceDependencies) {
        this.clientModel = ClientModel;
        this.notificationStrategies = notificationStrategies;
    }

    /**
     * Get Client Profile
     */
    async getProfile(id: string) {
        const client = await this.clientModel.findById(id).select('-password');
        if (!client) throw new ApiError('Client not found', 404);
        return client;
    }

    /**
     * Update Client Profile
     */
    async updateProfile(id: string, updateData: any) {
        // Prevent updating password through this route
        delete updateData.password;
        delete updateData.email; // Usually we don't allow email changes easily

        const client = await this.clientModel.findByIdAndUpdate(id, updateData, { new: true }).select('-password');
        if (!client) throw new ApiError('Client not found', 404);
        return client;
    }

    /**
     * Change Password
     */
    async changePassword(id: string, oldPass: string, newPass: string) {
        const client = await this.clientModel.findById(id).select('+password');
        if (!client) throw new ApiError('Client not found', 404);

        const isMatch = await bcrypt.compare(oldPass, client.password);
        if (!isMatch) throw new ApiError('Incorrect old password', 400);

        client.password = newPass;
        // We rely on the pre-save hook in ClientModel to hash this
        await client.save();

        return { message: 'Password updated successfully' };
    }
}
