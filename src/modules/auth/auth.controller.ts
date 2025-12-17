import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { ApiError, createCookieOptions } from '../../utils/helpers';

// Interface for Request with User
interface RequestWithUser extends Request {
  user?: { id: string; role: string; email: string };
}

export class AuthController {

  // Dependency Injection via Constructor
  constructor(private authService: AuthService) { }

  // --- Login ---
  public login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { role, email, password } = req.body;

      const { user, tokens } = await this.authService.login(role, email, password);

      const suffix = role === 'SERVICE_PROVIDER' ? 'ServiceProvider' : role === 'AGENT' ? 'Agent' : 'Client';

      res.cookie(`accessToken${suffix}`, tokens.accessToken, createCookieOptions());
      res.cookie(`refreshToken${suffix}`, tokens.refreshToken, createCookieOptions());

      return res.status(200).json({
        message: 'Login successful',
        data: user
      });
    } catch (error) {
      next(error);
    }
  };

  // --- Register ---
  public register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { role } = req.body;
      console.log(role);    
      let result;

      if (role === 'SERVICE_PROVIDER') {
        result = await this.authService.registerServiceProvider(req.body);
      } else if (role === 'CLIENT') {
        result = await this.authService.registerClient(req.body);
      } else {
        throw new ApiError('Invalid role provided', 400);
      }

      res.cookie('accessToken', result.accessToken, createCookieOptions());
      res.cookie('refreshToken', result.refreshToken, createCookieOptions());

      return res.status(201).json({ message: `${role} registered successfully` });
    } catch (error) {
      next(error);
    }
  };

  // --- Agent Register (Protected) ---
  public agentRegister = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      if (!req.user || req.user.role !== 'SERVICE_PROVIDER') {
        throw new ApiError('Unauthorized: Only Service Providers can register Agents', 401);
      }

      const newAgent = await this.authService.registerAgent(req.body, req.user.id);

      return res.status(201).json({
        message: 'Agent registered successfully',
        data: newAgent
      });
    } catch (error) {
      next(error);
    }
  };

  // --- Logout ---
  public logout = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new ApiError('Unauthorized', 401);

      await this.authService.logout(req.user.id, req.user.role);

      return res
        .status(200)
        .clearCookie('accessToken', createCookieOptions())
        .clearCookie('refreshToken', createCookieOptions())
        .clearCookie('accessTokenServiceProvider')
        .clearCookie('accessTokenAgent')
        .clearCookie('accessTokenClient')
        .json({ message: 'Logout successful' });
    } catch (error) {
      next(error);
    }
  };

  // --- Get User Details ---
  public getUserDetails = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new ApiError('Unauthorized', 401);

      const user = await this.authService.getUserDetails(req.user.id, req.user.role);
      if (!user) throw new ApiError('User not found', 404);

      return res.status(200).json({ data: user });
    } catch (error) {
      next(error);
    }
  };
}
