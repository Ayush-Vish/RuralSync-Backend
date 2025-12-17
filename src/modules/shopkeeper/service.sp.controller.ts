import { Org, RequestWithUser, Service, ServiceProvider } from '@org/db';
import { ApiError, uploadFileToS3 } from '@org/utils';
import { NextFunction, Request, Response } from 'express';

const addNewService = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log('Add new service');

    const {
      name,
      description,
      basePrice,
      category,
      availability,
      estimatedDuration,
      location,
      address,
      additionalTasks,
      tags,
    } = req.body;

    console.log(req.body);

    const ownerId = req.user?.id;
    if (!ownerId) {
      return next(new ApiError('Owner Id not found', 400));
    }

    // Validate required fields
    if (
      !name ||
      !description ||
      !basePrice ||
      !category ||
      !availability ||
      !location
    ) {
      return next(new ApiError('All required fields must be provided', 400));
    }

    const owner = await ServiceProvider.findById(ownerId);
    if (!owner) {
      return next(new ApiError('Owner not found', 404));
    }

    const org = await Org.findOne({ ownerId });
    if (!org) {
      return next(new ApiError('Organization not found', 404));
    }

    // Handle Image Upload
    console.time('Upload Images');
    let imageUrls: string[] = [];
    if (req.files && Array.isArray(req.files.images)) {
      const uploadPromises = req.files.images.map((file) =>
        uploadFileToS3(file)
      );
      const uploadResults = await Promise.all(uploadPromises);
      imageUrls = uploadResults.map((result) => result.url);
    }
    console.timeEnd('Upload Images');

    // Ensure availability and location are properly parsed
    

    const parsedLocation = JSON.parse(location);

    const newService = new Service({
      name,
      description,
      basePrice,
      category,
      additionalTasks: JSON.parse(additionalTasks) || [],
      availability: JSON.parse(availability),
      estimatedDuration,
      location: {
        type: 'Point',
        coordinates: parsedLocation.coordinates,
      },
      images: imageUrls,
      address: address || owner.address, // Use owner address as fallback
      tags: tags || [],
      ownerId,
      serviceCompany: org._id,
      serviceProvider: org.ownerId,
    });

    await newService.save();

    // Update Organization with new service
    const serviceCompany = await Org.findOne({
      ownerId : ownerId
    })
    serviceCompany.services.push(newService._id);
    await serviceCompany.save();
    
    return res
      .status(201)
      .json({ message: 'Service added successfully', data: newService });
  } catch (error) {
    console.error('Error adding service:', error);
    return next(new ApiError('An error occurred: ' + error.message, 500));
  }
};

interface SearchQuery {
  searchString?: string;
  latitude?: string;
  longitude?: string;
  page?: number;
  limit?: number;
}

const searchServices = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log('Search Services');
    const {
      searchString,
      latitude,
      longitude,
      page = 1,
      limit = 10,
    } = req.query as unknown as SearchQuery;

    const query: any = {};
    const aggregationPipeline = [];
    if (latitude && longitude) {
      aggregationPipeline.push({
        $geoNear: {
          near: { type: 'Point', coordinates: [longitude, latitude] },
          distanceField: 'distance',
          spherical: true,
          maxDistance: 50000, // 10 km range (adjustable)
        },
      });
    }

    // Text-based search
    if (searchString) {
      query.$text = { $search: searchString };
      aggregationPipeline.push({
        $match: query,
      });
      aggregationPipeline.push({
        $sort: { score: { $meta: 'textScore' } },
      });
    } else {
      aggregationPipeline.push({ $match: query });
    }

    // Pagination
    const skip = (page - 1) * limit;
    aggregationPipeline.push({ $skip: skip }, { $limit: limit });

    // Execute aggregation
    const services = await Service.aggregate(aggregationPipeline);

    return res.status(200).json({
      message: 'Services retrieved successfully',
      data: services,
      page,
      limit,
      total: services.length,
    });
  } catch (error) {
    return next(new ApiError('An error occurred: ' + error.message, 500));
  }
};

const getAllServices = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
) => {
  try {
    const ownerId = req.user.id;
    const services = await Service.find({
      serviceProvider: ownerId,
    });
    return res.status(200).json({
      message: 'Services retrieved successfully',
      data: services,
    });
  } catch (error) {
    return next(new ApiError('An error occurred: ' + error.message, 500));
  }
};

const deleteService = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log(req.params);
    const { serviceId } = req.params;

    const service = await Service.findByIdAndDelete(serviceId);
    if (!service) {
      return next(new ApiError('Service not found', 404));
    }
    return res.status(200).json({ message: 'Service deleted successfully' });
  } catch (error) {
    return next(new ApiError('An error occurred: ' + error.message, 500));
  }
};

export { addNewService, searchServices, getAllServices, deleteService };
