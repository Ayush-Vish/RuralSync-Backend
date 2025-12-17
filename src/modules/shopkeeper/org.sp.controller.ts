import {
  Agent,
  Booking,
  Org,
  RequestWithUser,
  Service,
  ServiceProvider,
} from '@org/db';
import { json, NextFunction, Request, Response } from 'express';
import {
  addEmailJob,
  ApiError,
  ApiResponse,
  emailQueue,
  uploadFileToS3,
} from '@org/utils';

const getServiceProviderById = async (req: Request, res: Response) => {
  try {
    const serviceProvider = await ServiceProvider.findById(req.params.id);
    if (!serviceProvider) {
      return res.status(404).json({ message: 'Service Provider not found' });
    }
    return res.status(200).json(serviceProvider);
  } catch (error) {
    return res.status(500).json({ message: 'An error occurred' });
  }
};

const updateServiceProvider = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { phone, address, services } = req.body;
    const updatedServiceProvider = await ServiceProvider.findByIdAndUpdate(
      req.params.id,
      { phone, address, services },
      { new: true, runValidators: true }
    );
    if (!updatedServiceProvider) {
      return next(new ApiError('Service Provider not found', 404));
    }
    return res.status(200).json({ data: updatedServiceProvider });
  } catch (error) {
    return next(new ApiError('An error occurred', 500));
  }
};

const registerOrg = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      name,
      address,
      phone,
      description,
      website,
      location,
      socialMedia,
      businessHours,
      categories,
      isVerified = true,
    } = req.body;
    console.log('req.body', req.body);
    if (!name || !address || !phone) {
      return next(
        new ApiError('Organization name, address, and phone are required', 400)
      );
    }

    const serviceProvider = await ServiceProvider.findById(req.user.id);
    if (!serviceProvider) {
      return next(new ApiError('Service Provider not found', 404));
    }

    const existingOrg = await Org.findOne({ ownerId: req.user.id });
    if (existingOrg) {
      return next(
        new ApiError('Owner can only register one organization', 400)
      );
    }
    console.log('1');
    // Handle logo upload
    let logoUrl = '';
    if (req.files && req.files.logo && req.files.logo[0]) {
      const logoUpload = await uploadFileToS3(req.files.logo[0]);
      logoUrl = logoUpload.url;
    }
    console.log('2');

    // Handle multiple images upload
    let imageUrls: string[] = [];
    if (req.files && req.files.images) {
      const uploadPromises = req.files.images.map((file) =>
        uploadFileToS3(file)
      );
      const uploadResults = await Promise.all(uploadPromises);
      imageUrls = uploadResults.map((result) => result.url);
    }
    console.log('3');
    const newOrg = new Org({
      name,
      address,
      phone,
      description,
      website,
      logo: logoUrl,
      images: imageUrls,
      location: JSON.parse(location),
      socialMedia: JSON.parse(socialMedia),
      businessHours: JSON.parse(businessHours),
      isVerified,
      categories : JSON.parse(categories),
      ownerId: req.user.id,
    });
    console.log('4');
    serviceProvider.serviceCompany = newOrg._id;
    await newOrg.save();
    await serviceProvider.save();
    console.log('5');

    return res.status(201).json({
      message: 'Organization created successfully',
      data: newOrg,
    });
  } catch (error) {
    return next(new ApiError(`An error occurred: ${error.message}`, 500));
  }
};

const getOrgDetails = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log('sdfjbsdjkfsdjfnsdk');
    console.log(req.user.id);
    const org = await Org.findOne({ ownerId: req.user.id });
    if (!org) {
      return next(new ApiError('Organization not found', 404));
    }
    
    console.log(org);
    return res.status(200).json({
      org:{
        name: org.name,
        address: org.address,
        phone: org.phone,
        description: org.description,
        website: org.website,
        logo: org.logo,
        images: org.images,
        location: org.location,
        socialMedia: org.socialMedia,
        businessHours: org.businessHours,
        isVerified: org.isVerified,
        categories: org.categories,
        agentCount: org.agents.length,
        serviceCount: org.services.length,
        clients:org.clients.length,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt,
      }
    });
  } catch (error) {
    return next(new ApiError('An error occurred: ' + error.message, 500));
  }
};

// Get all service providers with their organization details
const getAllServiceProviders = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const serviceProviders = await ServiceProvider.find({})
      .populate({
        path: 'serviceCompany',
        select: 'name categories description images rating'
      })
      .select('-password -refreshToken')
      .exec();

    return res.status(200).json({
      success: true,
      count: serviceProviders.length,
      data: serviceProviders,
    });
  } catch (error) {
    return next(new ApiError('An error occurred: ' + error.message, 500));
  }
};

// Get service provider details by ID
const getServiceProviderDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const serviceProvider = await ServiceProvider.findById(id)
      .populate({
        path: 'serviceCompany',
        select: 'name categories description images rating'
      })
      .select('-password -refreshToken')
      .exec();

    if (!serviceProvider) {
      return next(new ApiError('Service Provider not found', 404));
    }

    return res.status(200).json({
      success: true,
      data: serviceProvider,
    });
  } catch (error) {
    return next(new ApiError('An error occurred: ' + error.message, 500));
  }
};

// Update service provider rating (called from other services)
const updateServiceProviderRating = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { rating } = req.body;

    if (rating === undefined || rating < 0 || rating > 5) {
      return next(new ApiError('Invalid rating value', 400));
    }

    const serviceProvider = await ServiceProvider.findByIdAndUpdate(
      id,
      { rating },
      { new: true, runValidators: true }
    ).select('-password -refreshToken');

    if (!serviceProvider) {
      return next(new ApiError('Service Provider not found', 404));
    }

    return res.status(200).json({
      success: true,
      data: serviceProvider,
    });
  } catch (error) {
    return next(new ApiError('An error occurred: ' + error.message, 500));
  }
};

export {
  getServiceProviderById,
  registerOrg,
  getOrgDetails,
  updateServiceProvider,
  getAllServiceProviders,
  getServiceProviderDetails,
  updateServiceProviderRating,
};
