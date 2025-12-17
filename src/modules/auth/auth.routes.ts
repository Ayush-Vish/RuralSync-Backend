import { Router } from 'express';
// ✅ Import the 'wired' controller from index.ts
import { authController } from '.';
import { verifyJWT, isAuthorized } from '../../middleware/auth.middleware';

const router = Router();

// Public Routes
/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Login user
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */

router.post('/login', authController.login);
/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Register user
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Register successful
 */
router.post('/register', authController.register);

// Protected Routes
router.post(
  '/agent-register',
  verifyJWT("SERVICE_PROVIDER"),
  isAuthorized(['SERVICE_PROVIDER']),
  authController.agentRegister
);

router.get('/logout', verifyJWT("ANY"), authController.logout);

// Detail Routes
router.get('/user-detail/agent', verifyJWT("AGENT"), authController.getUserDetails);
router.get('/user-detail/service-provider', verifyJWT("SERVICE_PROVIDER"), authController.getUserDetails);
router.get('/user-detail/client', verifyJWT("CLIENT"), authController.getUserDetails);

export default router;
