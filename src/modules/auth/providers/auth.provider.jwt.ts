import jwt from 'jsonwebtoken';
import { IAuthProvider, IUserProfile } from '../interfaces/auth.provider.interface';
import { ApiError } from '../../../utils/helpers';

export class JwtStrategy implements IAuthProvider {
    constructor(private secret: string) { }

    async verifyToken(token: string): Promise<IUserProfile> {
        try {
            if (!this.secret) {
                throw new ApiError('JWT Secret is not defined in environment', 500);
            }

            // 1. Verify and Decode
            const decoded: any = jwt.verify(token, this.secret);

            // 2. Return Normalized Profile
            return {
                email: decoded.email,
                name: decoded.name || '',
                providerId: decoded.id
            };
        } catch (error) {
            throw new ApiError('Invalid or Expired Token', 401);
        }
    }
}
