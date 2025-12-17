import {
  addAuditLogJob,
  addEmailJob,
  ApiError,
  createCookieOptions,
  generateAccessAndRefreshToken,
  getDeviceAndLocationInfo,
  sendLoginConfirmationEmail,
} from '@org/utils';
import { Request, Response, NextFunction } from 'express';

import { Agent, Client, Org, RequestWithUser, ServiceProvider } from '@org/db';
import { sign } from 'jsonwebtoken';
import bcrypt, { compare } from 'bcrypt';

const registerServiceProvider = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return next(new ApiError('Email and password are required', 400));
    }
    const userExists = await ServiceProvider.findOne({ email });
    if (userExists) {
      return next(new ApiError('Service Provider already exists', 400));
    }
    const newServiceProvider = await ServiceProvider.create(req.body);
    const token = sign(
      {
        id: newServiceProvider._id,
        email: newServiceProvider.email,
        name: newServiceProvider.name,
        role: 'SERVICE_PROVIDER',
      },
      'SOME_SECRET'
    );
    res.cookie('token', token, createCookieOptions());
    return res.status(201).json({
      message: 'Service Provider created successfully',
      data: newServiceProvider,
    });
  } catch (error) {
    return next(new ApiError('An error occurred: ' + error.message, 500));
  }
};

const clientRegister = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return next(new ApiError('Email and password are required', 400));
    }
    const clientExists = await Client.findOne({ email });
    if (clientExists) {
      return next(new ApiError('Client already exists', 400));
    }
    const newClient = await Client.create(req.body);
    const token = sign(
      {
        id: newClient._id,
        email: newClient.email,
        name: newClient.name,
        role: 'CLIENT',
      },
      'SOME_SECRET'
    );
    res.cookie('token', token, createCookieOptions());
    return res.status(201).json({
      message: 'Client created successfully',
      data: newClient,
    });
  } catch (error) {
    return next(new ApiError('An error occurred: ' + error.message, 500));
  }
};

export const agentRegister = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
) => {
  try {

    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return next(new ApiError('Email, password, and name are required', 400));
    }
    console.log(req.user)
    const serviceProviderId = req.user.id;
    if(!serviceProviderId) {
      return next(new ApiError("Agent can be registered by SERVICE_PROVIDER" , 400));
      
    }
    const agentExists = await Agent.findOne({ email });
    if (agentExists) {
      return next(new ApiError('Agent already exists', 400));
    }
    console.log(req.body)
    const serviceCompany = await Org.findOne({
      ownerId : serviceProviderId
    })

    const newAgent = await Agent.create({...req.body, serviceProviderId, location:{
      type: "Point",
      coordinates: [req.body.location.longitude, req.body.location.latitude]
    }});
    
    (await serviceCompany).agents.push(newAgent._id);
    await serviceCompany.save();
    
    return res.status(201).json({
      message: 'Agent created successfully',
      data: newAgent,
    });
  } catch (error) {
    return next(new ApiError('An error occurred: ' + error.message, 500));
  }
};

const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role, email, password } = req.body;

    if (!email || !password || !role) {
      return next(new ApiError('Email, password, and role are required', 400));
    }

    switch (role) {
      case 'SERVICE_PROVIDER':
        return await registerServiceProvider(req, res, next);
      case 'CLIENT':
        return await clientRegister(req, res, next);
      default:
        return next(new ApiError('Invalid role', 400));
    }
  } catch (error) {
    return next(new ApiError('An error occurred: ' + error.message, 500));
  }
};


const loginServiceProvider = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return next(new ApiError('Email and password are required', 400));
    }
    const serviceProvider = await ServiceProvider.findOne({ email });
    if (!serviceProvider) {
      return next(new ApiError('Invalid credentials', 400));
    }

    const isMatch = await bcrypt.compare(password, serviceProvider.password);
    if (!isMatch) {
      return next(new ApiError('Invalid credentials', 400));
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      'SERVICE_PROVIDER',
      serviceProvider._id
    );
    res.cookie('accessTokenServiceProvider', accessToken, createCookieOptions());
    res.cookie('refreshTokenServiceProvider', refreshToken, createCookieOptions());
    await sendLoginConfirmationEmail(serviceProvider, 'SERVICE_PROVIDER', req);
    

    return res.status(200).json({
      message: 'Login successful',
      data: serviceProvider,
    });
  } catch (error) {
    return next(new ApiError('An error occurred' + error.message, 500));
  }
};

const loginAgent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    // Debug log incoming request
    console.log('Login attempt:', { 
      email, 
      passwordProvided: !!password,
      passwordLength: password?.length 
    });

    // Input validation
    if (!email || !password) {
      return next(new ApiError('Email and password are required', 400));
    }

    // Find agent with password explicitly selected
    const agent = await Agent.findOne({ email }).select('+password');

    // Debug log agent lookup
    console.log('Agent lookup result:', {
      found: !!agent,
      hasPassword: !!agent?.password,
      passwordHashLength: agent?.password?.length
    });

    if (!agent) {
      return next(new ApiError('Invalid credentials', 401));
    }

    if (!agent.password) {
      console.log('Agent has no password hash stored');
      return next(new ApiError('Agent account not properly configured', 500));
    }

    // Debug password comparison
    console.log('Starting password comparison:', {
      providedPassword: password,
      storedHash: agent.password
    });

    // Validate password
    const isMatch = await bcrypt.compare(password, agent.password);

    // Debug log password match result
    console.log('Password match result:', isMatch);

    if (!isMatch) {
      return next(new ApiError('Invalid credentials', 401));
    }

    // Generate tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      'AGENT',
      agent.id
    );
    
    const agentResponse = agent.toObject();
    delete agentResponse.password;
    await sendLoginConfirmationEmail(agent, 'AGENT', req);

    // Set cookies and send response
    return res
      .cookie('accessTokenAgent', accessToken, createCookieOptions())
      .cookie('refreshTokenAgent', refreshToken, createCookieOptions())
      .status(200)
      .json({
        success: true,
        message: 'Login successful',
        data: agentResponse,
      });

  } catch (error) {
    // Detailed error logging
    console.error('Login error:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    if (error.name === 'BcryptError') {
      return next(new ApiError('Password comparison failed', 500));
    }

    return next(new ApiError(
      'An error occurred during login', 
      error.status || 500
    ));
  }
};
const loginClient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return next(new ApiError('Email and password are required', 400));
    }
    const client = await Client.findOne({ email });
    if (!client) {
      return next(new ApiError('Invalid credentials', 400));
    }

    // Validate password
    const isMatch = await compare(password, client.password);
    if (!isMatch) {
      return next(new ApiError('Invalid credentials', 400));
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      'CLIENT',
      client.id
    );
    res.cookie('accessTokenClient', accessToken, createCookieOptions());
    res.cookie('refreshTokenClient', refreshToken, createCookieOptions());
    await sendLoginConfirmationEmail(client, 'CLIENT', req);
    
    return res.status(200).json({
      message: 'Login successful',
      data: client,
    });
  } catch (error) {
    return next(new ApiError('An error occurred', 500));
  }
};

const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role } = req.body;
    switch (role) {
      case 'SERVICE_PROVIDER':
        return await loginServiceProvider(req, res, next);
      case 'AGENT':
        return await loginAgent(req, res, next);
      case 'CLIENT':
        return await loginClient(req, res, next);
      default:
        return res.status(400).json({ message: 'Invalid role' });
    }
  } catch (error) {
    return next(new ApiError('An error occurred', 500));
  }
};

const logout = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
) => {
  try {
    const { role } = req.query;
    switch (role) {
      case 'SERVICE_PROVIDER':
        await ServiceProvider.findByIdAndUpdate(req.user.id, {
          $unset: { refreshToken: 1 },
        });
        break;
      case 'AGENT':
        await Agent.findByIdAndUpdate(req.user.id, {
          $unset: { refreshToken: 1 },
        });
        break;
      case 'CLIENT':
        await Client.findByIdAndUpdate(req.user.id, {
          $unset: { refreshToken: 1 },
        });
        break;
      default:
        return res.status(400).json({ message: 'Invalid role' });
    }
    return res
      .status(200)
      .clearCookie('accessToken', createCookieOptions())
      .clearCookie('refreshToken', createCookieOptions())
      .json({ message: 'Logout successful' });
  } catch (error) {
    return next(new ApiError('An error occurred', 500));
  }
};


const getUserDetails = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const { role, id } = req.user;

    let user;
    switch (role) {
      case 'SERVICE_PROVIDER':
        user = await ServiceProvider.findById(id);
        break;
      case 'AGENT':
        user = await Agent.findById(id);
        break;
      case 'CLIENT':
        user = await Client.findById(id);
        break;
      default:
        return res.status(400).json({ message: 'Invalid role' });
    }

    if (!user) {
      return next(new ApiError('User not found', 404));
    }

    return res.status(200).json({ data: user });
  } catch (error) {
    return next(new ApiError('An error occurred: ' + error.message, 500));
  }
};

export { register, login, logout  ,getUserDetails};
