import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/helpers';

// Extend Express Request to include User
export interface RequestWithUser extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

/**
 * Middleware to verify JWT from Cookies or Header
 * @param requiredRole The role expected for this route (used to check specific cookies)
 */
export const verifyJWT = (requiredRole: string = "ANY") => {
  return async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      let token = null;

      // 1. Try to find the token in the specific cookie for the role
      if (requiredRole === 'SERVICE_PROVIDER') {
        token = req.cookies?.accessTokenServiceProvider;
      } else if (requiredRole === 'AGENT') {
        token = req.cookies?.accessTokenAgent;
      } else if (requiredRole === 'CLIENT') {
        token = req.cookies?.accessTokenClient;
      }

      // 2. If no specific role required (or cookie not found), try finding ANY valid token
      if (!token || requiredRole === "ANY") {
        token =
          req.cookies?.accessToken ||
          req.cookies?.accessTokenServiceProvider ||
          req.cookies?.accessTokenAgent ||
          req.cookies?.accessTokenClient ||
          req.header('Authorization')?.replace('Bearer ', '');
      }

      if (!token) {
        return next(new ApiError('Unauthorized request: No token provided', 401));
      }

      // 3. Verify the Token
      const secret = process.env.JWT_SECRET || 'SOME_SECRET'; // Ensure this matches your .env
      const decoded: any = jwt.verify(token, secret);

      // 4. Attach User to Request
      req.user = {
        id: decoded.id,
        role: decoded.role,
        email: decoded.email,
      };

      // 5. Optional: strictly enforce role at this stage if needed
      // (This is usually handled by isAuthorized, but we can do a sanity check here)
      if (requiredRole !== "ANY" && req.user.role !== requiredRole) {
        // Allow if it's an admin or special case, otherwise fail
        return next(new ApiError('Unauthorized: Token role mismatch', 403));
      }

      next();
    } catch (error: any) {
      return next(new ApiError('Invalid or Expired Token', 401));
    }
  };
};

/**
 * Middleware to check if the authenticated user has permission
 * @param roles Array of allowed roles (e.g. ['ADMIN', 'SERVICE_PROVIDER'])
 */
export const isAuthorized = (roles: string[]) => {
  return (req: RequestWithUser, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError('Unauthorized: User not found', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ApiError('Forbidden: You do not have permission to perform this action', 403));
    }

    next();
  };
};
