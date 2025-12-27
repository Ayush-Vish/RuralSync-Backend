# 🚜 RuralSync API

> A robust, scalable backend API for the RuralSync rural services marketplace platform.

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.x-lightgrey.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.x-green.svg)](https://www.mongodb.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Design Principles](#design-principles)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [API Endpoints](#api-endpoints)
- [Authentication](#authentication)
- [Environment Variables](#environment-variables)
- [Database Models](#database-models)
- [AI Features](#ai-features)

---

## 🎯 Overview

RuralSync API is a **modular monolith** backend that powers a marketplace connecting rural service providers (farmers, equipment rentals, repair services) with customers. The API supports three distinct user roles:

- **Clients** - End users who search for and book services
- **Service Providers** - Businesses that offer services and manage agents
- **Agents** - Field workers assigned to fulfill bookings

### Key Features

- 🔐 **Role-Based Authentication** with JWT & HTTP-only Cookies
- 🔍 **AI-Powered Search** using Vector Embeddings (Hugging Face)
- 📍 **Geospatial Queries** for location-based service discovery
- 📊 **Real-time Availability** checking for bookings
- ⭐ **Review & Rating System** for service quality
- 📝 **Audit Logging** for tracking system changes
- 📖 **Swagger Documentation** for API exploration

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              API Gateway                                 │
│                         (Express.js + CORS)                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │    Auth     │  │   Client    │  │  Provider   │  │    Agent    │    │
│  │   Module    │  │   Module    │  │   Module    │  │   Module    │    │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘    │
│         │                │                │                │            │
│  ┌──────▼────────────────▼────────────────▼────────────────▼──────┐    │
│  │                     Shared Services Layer                       │    │
│  │  (Notification Strategies, AI Helpers, Validation, Utilities)   │    │
│  └──────────────────────────────┬─────────────────────────────────┘    │
│                                  │                                      │
│  ┌──────────────────────────────▼─────────────────────────────────┐    │
│  │                      Data Access Layer                          │    │
│  │              (Mongoose Models & Repositories)                   │    │
│  └──────────────────────────────┬─────────────────────────────────┘    │
│                                  │                                      │
└──────────────────────────────────┼──────────────────────────────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │         MongoDB             │
                    │   (Atlas with Vector Search) │
                    └─────────────────────────────┘
```

---

## 🎨 Design Principles

### 1. **Modular Monolith Architecture**

The codebase is organized into **feature modules** (`auth`, `client`, `provider`, `agent`) that are loosely coupled but deployed as a single unit. This provides:

- ✅ Clear domain boundaries
- ✅ Easier refactoring to microservices later
- ✅ Simplified deployment and debugging
- ✅ Shared infrastructure (DB, cache) without network overhead

```
modules/
├── auth/          # Authentication & User Management
├── client/        # Customer-facing features
├── provider/      # Service Provider dashboard features
├── agent/         # Agent mobile app features
└── shared/        # Cross-cutting concerns
```

### 2. **Dependency Injection (Manual DI)**

Controllers receive their dependencies (services) via constructor injection, making the code:

- ✅ **Testable** - Easy to mock dependencies
- ✅ **Flexible** - Swap implementations without changing consumers
- ✅ **Explicit** - Dependencies are clearly visible

```typescript
// modules/provider/index.ts - Composition Root
const profileService = new ProviderProfileService(Organization, ServiceProvider);
const profileController = new ProviderProfileController(profileService);

export { profileController };
```

### 3. **Strategy Pattern for Notifications**

Notifications use the **Strategy Pattern**, allowing different delivery mechanisms (Email, SMS, Push) to be plugged in without modifying business logic:

```typescript
// Interface
interface INotificationStrategy {
  send(payload: INotificationPayload): Promise<boolean>;
}

// Concrete Strategy
class EmailNotificationStrategy implements INotificationStrategy {
  async send({ to, subject, message }) {
    // Send email logic
  }
}

// Usage in Service
const bookingService = new ProviderBookingService({
  notificationStrategies: { email: new EmailNotificationStrategy() }
});
```

### 4. **Repository Pattern (Implicit)**

Services interact with Mongoose Models through a consistent interface, abstracting database operations:

```typescript
class ProviderInventoryService {
  constructor(
    private serviceModel: Model<IService>,
    private orgModel: Model<IOrganization>
  ) {}
  
  async addService(userId: string, data: any) {
    // Business logic + model operations
  }
}
```

### 5. **Middleware Chain for Security**

Authentication and authorization are handled through composable middleware:

```typescript
// Route definition with middleware chain
router.post('/add-service',
  verifyJWT('SERVICE_PROVIDER'),      // 1. Verify token & role
  isAuthorized(['SERVICE_PROVIDER']), // 2. Check permissions
  upload.fields([...]),                // 3. Handle file uploads
  inventoryController.create           // 4. Execute business logic
);
```

### 6. **Single Responsibility Principle (SRP)**

Each class has one reason to change:

| Layer | Responsibility |
|-------|---------------|
| **Controllers** | HTTP request/response handling |
| **Services** | Business logic & orchestration |
| **Models** | Data structure & validation |
| **Middleware** | Cross-cutting concerns (auth, logging) |
| **Utils** | Reusable helper functions |

### 7. **Environment-Based Configuration**

All configuration is externalized via environment variables with sensible defaults:

```typescript
const getAllowedOrigins = (): string[] => {
  const envOrigins = process.env.CORS_ORIGINS;
  if (envOrigins) {
    return envOrigins.split(',').map(origin => origin.trim());
  }
  return ["http://localhost:3000"]; // Default
};
```

### 8. **Error Handling with Custom ApiError**

Consistent error responses using a custom error class:

```typescript
class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

// Usage
throw new ApiError('Unauthorized: No token provided', 401);

// Global handler catches and formats
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    success: false,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});
```

### 9. **AI-Enhanced Search with Vector Embeddings**

Services are indexed with AI-generated vector embeddings for semantic search:

```typescript
// Auto-generate embeddings on save
serviceSchema.pre('save', async function(next) {
  if (this.isModified('description')) {
    const text = `${this.name} ${this.description} ${this.category}`;
    this.embeddings = await generateEmbedding(text);
  }
  next();
});

// Vector search in aggregation pipeline
pipeline.push({
  $vectorSearch: {
    index: "vector_index",
    path: "embeddings",
    queryVector: await generateEmbedding(searchQuery),
    numCandidates: 100,
    limit: 15
  }
});
```

---

## 📁 Project Structure

```
api/
├── src/
│   ├── app.ts                 # Express app configuration
│   ├── server.ts              # Server entry point
│   │
│   ├── config/
│   │   ├── db.ts              # MongoDB connection
│   │   ├── redis.ts           # Redis configuration (optional)
│   │   └── swagger.ts         # OpenAPI/Swagger setup
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts # JWT verification & RBAC
│   │   ├── error.middleware.ts# Global error handler
│   │   └── upload.middleware.ts # Multer file upload
│   │
│   ├── models/
│   │   ├── agent.model.ts
│   │   ├── booking.model.ts
│   │   ├── client.model.ts
│   │   ├── organization.model.ts
│   │   ├── review.model.ts
│   │   ├── service.model.ts
│   │   └── serviceProvider.model.ts
│   │
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   └── index.ts       # Composition root
│   │   │
│   │   ├── client/
│   │   │   ├── client.routes.ts
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   └── index.ts
│   │   │
│   │   ├── provider/
│   │   │   ├── provider.routes.ts
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   └── index.ts
│   │   │
│   │   ├── agent/
│   │   │   └── ...
│   │   │
│   │   └── shared/
│   │       ├── interfaces/
│   │       │   └── notification.interface.ts
│   │       └── providers/
│   │           └── email.provider.ts
│   │
│   └── utils/
│       ├── helpers.ts         # ApiError, JWT utils, Multer
│       ├── ai.helper.ts       # Hugging Face embeddings
│       └── s3.ts              # AWS S3 uploads (optional)
│
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 18.x
- **MongoDB** >= 7.x (or MongoDB Atlas)
- **npm** or **yarn**

### Installation

```bash
# Clone the repository
git clone https://github.com/Ayush-Vish/RS-Monolith.git
cd RS-Monolith/api

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your values
nano .env

# Start development server
npm run dev
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot-reload |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Run production build |

---

## 📡 API Endpoints

### Authentication (`/auth`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register` | Register new user | Public |
| POST | `/auth/login` | Login user | Public |
| POST | `/auth/agent-register` | Register agent (by provider) | Provider |
| GET | `/auth/logout` | Logout user | Any |
| GET | `/auth/user-detail/:role` | Get user profile | Role-specific |

### Client (`/client`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/client/search` | Search services (geo + text) | Public |
| GET | `/client/search/categories` | Get all categories | Public |
| GET | `/client/search/advanced` | Advanced search with filters | Public |
| GET | `/client/services` | List all services | Public |
| GET | `/client/services/:id` | Get service details | Public |
| GET | `/client/profile` | Get client profile | Client |
| PUT | `/client/profile` | Update profile | Client |
| POST | `/client/bookings` | Create booking | Client |
| GET | `/client/bookings` | Get my bookings | Client |
| DELETE | `/client/bookings/:id` | Cancel booking | Client |
| POST | `/client/reviews` | Create review | Client |
| GET | `/client/reviews/my` | Get my reviews | Client |

### Provider (`/provider`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/provider/org-detail` | Get organization details | Provider |
| POST | `/provider/register-org` | Register organization | Provider |
| GET | `/provider/services` | Get my services | Provider |
| POST | `/provider/add-service` | Add new service | Provider |
| DELETE | `/provider/delete-service/:id` | Delete service | Provider |
| GET | `/provider/agents` | Get all agents | Provider |
| POST | `/provider/assign-agent` | Assign agent to service | Provider |
| GET | `/provider/bookings` | Get all bookings | Provider |
| POST | `/provider/assign-booking` | Assign agent to booking | Provider |

### Agent (`/agent`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/agent/bookings` | Get assigned bookings | Agent |
| PATCH | `/agent/bookings/:id/status` | Update booking status | Agent |
| GET | `/agent/profile` | Get agent profile | Agent |

---

## 🔐 Authentication

### JWT Token Flow

```
1. User logs in with email/password
2. Server validates credentials
3. Server generates JWT tokens:
   - accessToken (15 mins expiry)
   - refreshToken (7 days expiry)
4. Tokens are sent as HTTP-only cookies
5. Client includes cookies in subsequent requests
6. Server validates token on protected routes
```

### Role-Based Cookie Names

| Role | Cookie Name |
|------|------------|
| Client | `accessTokenClient` |
| Service Provider | `accessTokenServiceProvider` |
| Agent | `accessTokenAgent` |

### Protecting Routes

```typescript
// Single role
router.get('/profile', verifyJWT('CLIENT'), controller.getProfile);

// Multiple roles allowed
router.get('/dashboard', 
  verifyJWT('ANY'),
  isAuthorized(['CLIENT', 'SERVICE_PROVIDER']),
  controller.getDashboard
);
```

---

## ⚙️ Environment Variables

```bash
# Server Configuration
NODE_ENV=development          # development | production
PORT=5000                     # Server port

# Database
MONGO_URI=mongodb://127.0.0.1:27017/ruralsync

# JWT Secret (use strong secret in production!)
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# CORS Origins (comma-separated for production)
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# AI Features (Optional - Hugging Face)
HF_TOKEN=your-huggingface-token

# AWS S3 (Optional - File Uploads)
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_BUCKET_NAME=your-bucket-name
```

---

## 📊 Database Models

### Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐
│  ServiceProvider│──────▶│  Organization   │
│    (User)       │  1:1  │                 │
└────────┬────────┘       └────────┬────────┘
         │                         │
         │ 1:N                     │ 1:N
         ▼                         ▼
┌─────────────────┐       ┌─────────────────┐
│     Agent       │◀──────│    Service      │
│                 │  N:M  │                 │
└────────┬────────┘       └────────┬────────┘
         │                         │
         │ 1:N                     │ 1:N
         ▼                         ▼
┌─────────────────┐       ┌─────────────────┐
│    Booking      │◀──────│    Client       │
│                 │  N:1  │    (User)       │
└────────┬────────┘       └────────┬────────┘
         │                         │
         │ 1:1                     │ 1:N
         ▼                         ▼
┌─────────────────┐       ┌─────────────────┐
│   AuditLog      │       │    Review       │
│                 │       │                 │
└─────────────────┘       └─────────────────┘
```

### Key Model Features

| Model | Key Features |
|-------|-------------|
| **Service** | Geo-indexed location, AI embeddings, availability schedule |
| **Booking** | Status workflow, agent assignment, extra tasks support |
| **Organization** | Business hours, social media, verification status |
| **Review** | Rating aggregation, linked to service & provider |

---

## 🤖 AI Features

### Semantic Search with Vector Embeddings

The API uses **Hugging Face Inference API** to generate embeddings for services, enabling semantic search:

```typescript
// Generate embedding for text
import { HfInference } from "@huggingface/inference";

const hf = new HfInference(process.env.HF_TOKEN);

export const generateEmbedding = async (text: string): Promise<number[]> => {
  const result = await hf.featureExtraction({
    model: "sentence-transformers/all-MiniLM-L6-v2", // 384 dimensions
    inputs: text,
  });
  return result as number[];
};
```

### MongoDB Atlas Vector Search

Create a vector search index in Atlas:

```json
{
  "mappings": {
    "dynamic": true,
    "fields": {
      "embeddings": {
        "type": "knnVector",
        "dimensions": 384,
        "similarity": "cosine"
      }
    }
  }
}
```

### Search Pipeline

```typescript
// 1. Convert query to vector
const queryVector = await generateEmbedding("tractor repair near me");

// 2. Vector search stage
{ $vectorSearch: { 
    index: "vector_index",
    path: "embeddings",
    queryVector,
    numCandidates: 100,
    limit: 15
}}

// 3. Geo filter stage
{ $match: { 
    location: { 
      $geoWithin: { 
        $centerSphere: [[lng, lat], radiusKm / 6378.1] 
      }
    }
}}

// 4. Category filter
{ $match: { category: "Farm Equipment" }}
```

---

## 📖 API Documentation

Interactive API documentation is available via Swagger UI:

```
http://localhost:5000/api-docs
```

---

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Run with coverage
npm run test:coverage
```

---

## 🚢 Deployment

### Vercel (Serverless)

The API is configured for Vercel deployment with:
- Memory storage for file uploads (4MB limit)
- Environment variables via Vercel dashboard

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 5000
CMD ["node", "dist/server.js"]
```

---

## 📝 License

This project is licensed under the ISC License.

---

## 👥 Contributors

- **Ayush Vishwakarma** - [GitHub](https://github.com/Ayush-Vish)

---

## 🙏 Acknowledgements

- [Express.js](https://expressjs.com/)
- [Mongoose](https://mongoosejs.com/)
- [Hugging Face](https://huggingface.co/)
- [MongoDB Atlas](https://www.mongodb.com/atlas)
