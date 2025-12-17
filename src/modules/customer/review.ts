import { RequestWithUser, Review, Service } from "@org/db";
import { addEmailJob } from "@org/utils";
import mongoose from "mongoose";
import { Response } from "express";
import { ShopkeeperService } from "../services/shopkeeperService";

// Define the request body type for review creation and updates
interface ReviewRequestBody {
  serviceProviderId: string;
  serviceId: string;
  rating: number;
  comment?: string;
}

// Helper function to calculate average rating
const calculateAverageRating = (reviews: { rating: number }[]): number =>
  Number((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1));

// Controller to create a new review
export const createReview = async (req: RequestWithUser, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const customerId = req.user.id;
    const { serviceProviderId, serviceId, rating, comment }: ReviewRequestBody = req.body;

    if (!serviceProviderId || !serviceId || !rating || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      res.status(400).json({ message: 'Invalid input data' });
      return;
    }

    // Fetch service provider details from shopkeeper service
    const serviceProviderResult = await ShopkeeperService.getServiceProviderById(serviceProviderId);
    const serviceProvider = serviceProviderResult.data;

    const service = await Service.findById(serviceId).session(session);

    if (!serviceProvider || !service) {
      res.status(404).json({ message: 'Service provider or service not found' });
      return;
    }

    const existingReview = await Review.findOne({
      serviceProvider: serviceProviderId,
      customer: customerId,
      service: serviceId,
    }).session(session);

    if (existingReview) {
      res.status(400).json({ message: 'You have already reviewed this service provider for this service' });
      return;
    }

    const newReview = await Review.create(
      [
        {
          serviceProvider: serviceProviderId,
          customer: customerId,
          service: serviceId,
          rating,
          comment,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      { session }
    );

    const allReviews = await Review.find({ serviceProvider: serviceProviderId }).session(session);
    const averageRating = calculateAverageRating(allReviews);

    if (serviceProvider.serviceCompany) {
      // Update rating via shopkeeper service REST API
      await ShopkeeperService.updateServiceProviderRating(serviceProviderId, averageRating);
    }

    await addEmailJob({
      email: serviceProvider.email,
      subject: 'New Review Received',
      content: `
        <p>Dear ${serviceProvider.name},</p>
        <p>You have received a new review for your service.</p>
        <p><strong>Rating:</strong> ${rating} stars</p>
        ${comment ? `<p><strong>Comment:</strong> "${comment}"</p>` : ''}
        <p>Your new average rating is ${averageRating}.</p>
      `,
    });

    await session.commitTransaction();
    res.status(201).json({
      message: 'Review created successfully',
      data: {
        review: newReview[0],
        averageRating,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    session.endSession();
  }
};

// Controller to update an existing review
export const updateReview = async (req: RequestWithUser, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const customerId = req.user.id;
    const { reviewId } = req.params;
    const { rating, comment }: Partial<ReviewRequestBody> = req.body;

    if (rating !== undefined && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
      res.status(400).json({ message: 'Rating must be an integer between 1 and 5' });
      return;
    }

    const review = await Review.findOneAndUpdate(
      { _id: reviewId, customer: customerId },
      { ...(rating && { rating }), ...(comment !== undefined && { comment }), updatedAt: new Date() },
      { new: true, session }
    ).populate('serviceProvider', 'name email');

    if (!review) {
      res.status(404).json({ message: 'Review not found or unauthorized' });
      return;
    }

    const allReviews = await Review.find({ serviceProvider: review.serviceProvider._id }).session(session);
    const averageRating = calculateAverageRating(allReviews);

    // Update rating via shopkeeper service REST API
    await ShopkeeperService.updateServiceProviderRating(
      review.serviceProvider._id.toString(),
      averageRating
    );

    await session.commitTransaction();
    res.status(200).json({
      message: 'Review updated successfully',
      data: { review, averageRating },
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    session.endSession();
  }
};

// Controller to get reviews for a service provider
export const getServiceProviderReviews = async (req: RequestWithUser, res: Response): Promise<void> => {
  try {
    const { serviceProviderId } = req.params;
    const { limit = 10, page = 1 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const totalReviews = await Review.countDocuments({ serviceProvider: serviceProviderId });
    const reviews = await Review.find({ serviceProvider: serviceProviderId })
      .populate('customer', 'name avatar')
      .populate('service', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const averageRating = calculateAverageRating(reviews);

    res.status(200).json({
      success: true,
      data: { reviews, averageRating, totalReviews, currentPage: Number(page), totalPages: Math.ceil(totalReviews / Number(limit)) },
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Controller to delete a review
export const deleteReview = async (req: RequestWithUser, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const customerId = req.user.id;
    const { reviewId } = req.params;

    const review = await Review.findOneAndDelete({
      _id: reviewId,
      customer: customerId,
    }).session(session);

    if (!review) {
      res.status(404).json({ message: 'Review not found or unauthorized' });
      return;
    }

    const allReviews = await Review.find({ serviceProvider: review.serviceProvider }).session(session);
    const averageRating = allReviews.length > 0 ? calculateAverageRating(allReviews) : 0;

    // Update rating via shopkeeper service REST API
    await ShopkeeperService.updateServiceProviderRating(
      review.serviceProvider.toString(),
      averageRating
    );

    await session.commitTransaction();
    res.status(200).json({
      message: 'Review deleted successfully',
      data: { averageRating },
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    session.endSession();
  }
};

// Controller to get customer's reviews
export const getCustomerReviews = async (req: RequestWithUser, res: Response): Promise<void> => {
  try {
    const customerId = req.user.id;
    const { limit = 10, page = 1 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const totalReviews = await Review.countDocuments({ customer: customerId });
    const reviews = await Review.find({ customer: customerId })
      .populate('serviceProvider', 'name')
      .populate('service', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      data: { reviews, totalReviews, currentPage: Number(page), totalPages: Math.ceil(totalReviews / Number(limit)) },
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};
