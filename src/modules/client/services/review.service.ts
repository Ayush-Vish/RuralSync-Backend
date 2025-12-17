import mongoose, { Model, ClientSession } from 'mongoose';
import { ApiError } from '../../../utils/helpers';
import { IReview } from '../../../models/review.model'; // You'll need to create this model based on your schema
import { IService } from '../../../models/service.model';
import { IServiceProvider } from '../../../models/serviceProvider.model';
import { INotificationStrategy } from '../../shared/interfaces/notification.interface';

export interface IReviewServiceDependencies {
    ReviewModel: Model<IReview>;
    ServiceModel: Model<IService>;
    ServiceProviderModel: Model<IServiceProvider>;
    notificationStrategies: Record<string, INotificationStrategy>;
}

export class ReviewService {
    private review: Model<IReview>;
    private service: Model<IService>;
    private provider: Model<IServiceProvider>;
    private notifiers: Record<string, INotificationStrategy>;

    constructor({ ReviewModel, ServiceModel, ServiceProviderModel, notificationStrategies }: IReviewServiceDependencies) {
        this.review = ReviewModel;
        this.service = ServiceModel;
        this.provider = ServiceProviderModel;
        this.notifiers = notificationStrategies;
    }

    /**
     * Helper: Calculate and Update Average Rating
     */
    private async updateProviderRating(providerId: string, session: ClientSession) {
        const reviews = await this.review.find({ serviceProvider: providerId }).session(session);

        const avg = reviews.length > 0
            ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1))
            : 0;

        // Directly update the provider document
        await this.provider.findByIdAndUpdate(
            providerId,
            { rating: avg, reviewCount: reviews.length },
            { session }
        );

        return avg;
    }

    /**
     * Create a Review
     */
    async createReview(clientId: string, data: any) {
        const { serviceProviderId, serviceId, rating, comment } = data;

        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
            throw new ApiError('Rating must be an integer between 1 and 5', 400);
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // 1. Validation
            const service = await this.service.findById(serviceId).session(session);
            const provider = await this.provider.findById(serviceProviderId).session(session);

            if (!service || !provider) throw new ApiError('Service or Provider not found', 404);

            const existing = await this.review.findOne({
                serviceProvider: serviceProviderId,
                client: clientId, // 'customer' field in your schema
                service: serviceId
            }).session(session);

            if (existing) throw new ApiError('You have already reviewed this service', 400);

            // 2. Create Review
            const [newReview] = await this.review.create(
                [{
                    client: clientId,
                    serviceProvider: serviceProviderId,
                    service: serviceId,
                    rating,
                    comment,
                }],
                { session }
            );

            // 3. Update Average
            const newAverage = await this.updateProviderRating(serviceProviderId, session);

            await session.commitTransaction();

            // 4. Send Notification (Outside Transaction)
            if (this.notifiers['email'] && provider.email) {
                await this.notifiers['email'].send({
                    to: provider.email,
                    subject: 'New Review Received',
                    message: `You received a ${rating}-star review.`
                });
            }

            return { review: newReview, averageRating: newAverage };

        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Update Review
     */
    async updateReview(clientId: string, reviewId: string, data: any) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const review = await this.review.findOneAndUpdate(
                { _id: reviewId, client: clientId },
                { ...data },
                { new: true, session }
            );

            if (!review) throw new ApiError('Review not found or unauthorized', 404);

            const newAverage = await this.updateProviderRating(review.serviceProvider.toString(), session);

            await session.commitTransaction();
            return { review, averageRating: newAverage };

        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Delete Review
     */
    async deleteReview(clientId: string, reviewId: string) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const review = await this.review.findOneAndDelete({
                _id: reviewId,
                client: clientId
            }).session(session);

            if (!review) throw new ApiError('Review not found', 404);

            const newAverage = await this.updateProviderRating(review.serviceProvider.toString(), session);

            await session.commitTransaction();
            return { message: 'Deleted successfully', averageRating: newAverage };

        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Get Reviews for a Provider (Public)
     */
    async getProviderReviews(providerId: string, page = 1, limit = 10) {
        const skip = (page - 1) * limit;

        const reviews = await this.review.find({ serviceProvider: providerId })
            .populate('client', 'name profileImage') // assuming fields
            .populate('service', 'name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await this.review.countDocuments({ serviceProvider: providerId });

        return {
            reviews,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalReviews: total
        };
    }
}
