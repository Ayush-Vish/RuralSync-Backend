import { Request, Response, NextFunction } from 'express';
import { ReviewService } from '../services/review.service';
import { ApiError } from '../../../utils/helpers';

interface RequestWithUser extends Request {
  user?: { id: string };
}

export class ReviewController {
  constructor(private reviewService: ReviewService) {}

  public create = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new ApiError('Unauthorized', 401);
      const result = await this.reviewService.createReview(req.user.id, req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  public update = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new ApiError('Unauthorized', 401);
      const { reviewId } = req.params;
      const result = await this.reviewService.updateReview(req.user.id, reviewId, req.body);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  public delete = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new ApiError('Unauthorized', 401);
      const { reviewId } = req.params;
      const result = await this.reviewService.deleteReview(req.user.id, reviewId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  public getByProvider = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { serviceProviderId } = req.params;
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      
      const result = await this.reviewService.getProviderReviews(serviceProviderId, page, limit);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  public getMyReviews = async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new ApiError('Unauthorized', 401);
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      
      const result = await this.reviewService.getClientReviews(req.user.id, page, limit);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };
}
