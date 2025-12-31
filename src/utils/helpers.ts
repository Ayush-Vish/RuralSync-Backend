import multer from 'multer';
import { Response, Request, NextFunction } from 'express';
import { sign, verify } from 'jsonwebtoken';
// import useragent from 'useragent';

// ✅ Fix Imports: Point to local models
import { Agent } from '../models/agent.model';
import { Client } from '../models/client.model';
import { ServiceProvider } from '../models/serviceProvider.model';

// // ✅ Import Queue (Ensure you have queue.ts in src/utils/ or adjust this path)
// // If you don't have queue.ts yet, you might need to copy it or comment this out temporarily
// import { addEmailJob } from './queue';

// Define Role Type locally if not available globally
export type Role = 'CLIENT' | 'AGENT' | 'SERVICE_PROVIDER' | 'ADMIN';

// --- Error Handling Middleware ---
export const errorMiddleware = (err: any, req: Request, res: Response, next: NextFunction) => {
  err.status = err.status || 500;
  console.error(`[Error] ${err.message}`);

  const message = err.message || "Something went wrong";

  res.status(err.status).json({
    success: false,
    message: message,
    // Only show stack in development for security
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

// // --- Device Info Helper ---
// export const getDeviceAndLocationInfo = (req: Request) => {
//   const userAgentString = req.headers['user-agent'] || '';
//   const agent = useragent.parse(userAgentString);
//   const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

//   return {
//     device: `${agent.os.toString()}, ${agent.device.toString()}`,
//     browser: agent.toAgent(),
//     ip: ip || 'Unknown IP',
//   };
// };

// // --- Email Helper ---
// export const sendLoginConfirmationEmail = async (user: any, role: string, req: Request) => {
//   try {
//     const { device, browser, ip } = getDeviceAndLocationInfo(req);

//     // Ensure addEmailJob exists in src/utils/queue.ts
//     await addEmailJob({
//       email: user.email,
//       subject: 'Login Confirmation',
//       content: `
//         <h3>Login Detected</h3>
//         <p>Dear ${user.name || 'User'},</p>
//         <p>Your account as <strong>${role}</strong> has been accessed successfully.</p>
//         <ul>
//           <li><strong>Device:</strong> ${device}</li>
//           <li><strong>Browser:</strong> ${browser}</li>
//           <li><strong>IP Address:</strong> ${ip}</li>
//         </ul>
//         <p>If this wasn't you, please contact support immediately.</p>
//       `,
//     });
//   } catch (error) {
//     console.error("Failed to queue login email:", error);
//     // Don't crash the request if email fails
//   }
// };

// --- API Response Class ---
export class ApiResponse {
  constructor(res: Response, statusCode: number, message: string, data: unknown) {
    res.status(statusCode).json({
      success: true,
      message,
      data
    });
  }
}

// --- API Error Class ---
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    Error.captureStackTrace(this, this.constructor);
  }
}

// --- Cookie Options ---
type CookieOptions = {
  maxAge: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "none" | "lax" | "strict";
  path: string;
};


export const createCookieOptions = (): CookieOptions => {
  if (process.env.NODE_ENV === "production") {
    // Production (Vercel + rewrites)
    return {
      maxAge: 5 * 24 * 60 * 60 * 1000, // 5 days
      httpOnly: true,
      secure: true,        // HTTPS only
      sameSite: "lax",     // FIRST-PARTY COOKIE
      path: "/",
    };
  }

  return {
    maxAge: 5 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: false,       // localhost = no HTTPS
    sameSite: "lax",
    path: "/",
  };
};

// --- Token Generation ---
export const generateAccessAndRefreshToken = async (role: Role, id: string) => {
  try {
    let user = null;

    // Fetch user based on role
    switch (role) {
      case "CLIENT":
        user = await Client.findById(id);
        break;
      case "AGENT":
        user = await Agent.findById(id);
        break;
      case "SERVICE_PROVIDER":
        user = await ServiceProvider.findById(id);
        break;
    }

    if (!user) {
      throw new ApiError("User not found during token generation", 404);
    }

    const secret = process.env.JWT_SECRET || "SOME_SECRET";

    // ✅ FIXED: Removed 'await' from properties (user._id is not a promise)
    const payload = {
      id: user._id,
      email: user.email,
      name: user.name,
      role,
    };

    const accessToken = sign(payload, secret, { expiresIn: "59m" }); // 15 mins
    const refreshToken = sign(payload, secret, { expiresIn: "7d" }); // 7 days

    return { accessToken, refreshToken };

  } catch (error: any) {
    throw new ApiError("Error generating token: " + error.message, 500);
  }
};

// 1. Configure Storage (Use Memory for Vercel/Serverless)
const storage = multer.memoryStorage();

// 2. Define Filters (Optional but recommended)
const fileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'image/gif'];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError('Invalid file type. Only JPEG, PNG, WEBP, and PDF are allowed.', 400), false);
  }
};

// 3. Create Upload Instance
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 4 * 1024 * 1024, // 4MB Limit (Vercel Serverless limit is ~4.5MB)
  },
});

// Re-export S3 utilities for convenience
export {
  uploadToS3,
  uploadMultipleToS3,
  deleteFromS3,
  deleteMultipleFromS3,
  uploadBase64ToS3,
  isS3Configured,
  UploadFolder
} from './s3';
