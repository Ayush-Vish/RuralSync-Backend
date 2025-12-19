import { Model } from 'mongoose';
import { IService } from '../../../models/service.model';

export class SearchService {
    constructor(private serviceModel: Model<IService>) { }

    async searchNearest(params: any) {
        const { lat, lng, q, category } = params;
        console.log(params)
        const pipeline: any[] = [];

        if (lat && lng) {
            pipeline.push({
                $geoNear: {
                    near: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
                    distanceField: "distance", // Distance in meters
                    spherical: true,
                    maxDistance: 5000000, // 50km radius
                    query: { isActive: true }
                }
            });
        } else {
            pipeline.push({ $match: { isActive: true } });
        }

        if (q) {
            pipeline.push({
                $match: {
                    $or: [
                        { name: { $regex: q, $options: 'i' } },
                        { category: { $regex: q, $options: 'i' } },
                        { tags: { $in: [new RegExp(q, 'i')] } }
                    ]
                }
            });
        }

        if (category) {
            pipeline.push({ $match: { category: category } });
        }
        console.log(pipeline)
        const data = await this.serviceModel.aggregate(pipeline); 
        console.log(data);
        return data
    }
}
