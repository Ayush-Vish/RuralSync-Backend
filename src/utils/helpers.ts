import { Agent, Client, Role, ServiceProvider } from '@org/db';
import { sign, verify } from 'jsonwebtoken';
import { Response } from 'express';
import { Mongoose, ObjectId, Schema } from 'mongoose';
import useragent from "useragent";
import { addEmailJob } from './queue';

export function utils(): string {
  return 'utils';
}


export const errorMiddleware = (err,req,res,next) =>{
  err.status = err.status || 500
  console.log(err.message)
  err.message  = err.message || "Something went Wrong"
  res.status(err.status).json({
      success:false,
      message:err.message,
      stack:err.stack
      
  })
}


export const getDeviceAndLocationInfo = (req) => {
  const userAgent = useragent.parse(req.headers['user-agent']);
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  return {
    device: `${userAgent.os.toString()}, ${userAgent.device.toString()}`,
    browser: userAgent.toAgent(),
    ip: ip || 'Unknown IP',
  };
};
export const sendLoginConfirmationEmail = async (user, role, req) => {
  const { device, browser, ip } = getDeviceAndLocationInfo(req);

  await addEmailJob({
    email: user.email,
    subject: 'Login Confirmation',
    content: `
      <p>Dear ${user.name || 'User'},</p>
      <p>Your account as ${role} has been accessed successfully.</p>
      <p><strong>Device:</strong> ${device}</p>
      <p><strong>Browser:</strong> ${browser}</p>
      <p><strong>IP Address:</strong> ${ip}</p>
      <p>If this wasn't you, please contact support immediately.</p>
    `,
  });
};


export class ApiResponse  {
  constructor (res:Response , statusCode : number , message : string , data : unknown ) {
    res.status(statusCode).json({
      message,
      data
    })
  }
}

export class ApiError extends Error {
    status:number;
    constructor(message:string , status:number) {
      super(message);
      this.status = status;
      console.log( "Error Message: =>",  message);
      Error.captureStackTrace(this, this.constructor);


    }
}
type CookieOptions = {
  maxAge: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "none";
  path: string;
};

export const createCookieOptions = (): CookieOptions => {
  const  path = "/";
  // Set a different path for each role if needed
  return {
    maxAge: 5 * 24 * 60 * 60 * 1000, // Note: fixed the 100 multiplier to 1000 to represent milliseconds
    httpOnly: false,
    secure: true,
    sameSite: "none",
    path: path,
  };
};

export const generateAccessAndRefreshToken = async (role : Role , id :any)  => {
  try {
    let user = null;
    switch (role ) {
      case "CLIENT" :
         user =await Client.findById(id);
        break;
      case "AGENT" :
        user = await Agent.findById(id);
        break;
      case "SERVICE_PROVIDER" :
        user =await ServiceProvider.findById(id);
        break;

    }
    if (!user) {
      throw new ApiError("User not found", 404);
    }
    const accessToken =  sign(
      {
        id: await user._id,
        email: await user.email,
        name: await  user.name,
        role,
      },
      "SOME_SECRET",
      {
        expiresIn: "30d",
      }
    );
    console.log(verify(accessToken  , "SOME_SECRET"));
    const refreshToken = sign(
      {
        id:await  user._id,
        email:await user.email,
        name: await user.name,
        role,
      },
      "SOME_SECRET",

      {
        expiresIn: "30d",
      }
    );
    return { accessToken, refreshToken };

  } catch (error) {
    throw new ApiError("Error generating token" + error.message, 500);
  }
} 

