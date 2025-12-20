import { Model } from 'mongoose';
import { IService } from '../../../models/service.model';
import { generateEmbedding } from '../../../utils/ai.helper';

export interface SearchParams {
    lat?: number;
    lng?: number;
    radiusInKm?: number;
    q?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    sortBy?: 'relevance' | 'price-low' | 'price-high' | 'rating' | 'distance' | 'duration';
    page?: number;
    limit?: number;
    // ... (rest of your existing SearchParams)
}

export class SearchService {
    constructor(private serviceModel: Model<IService>) { }

    async searchSmart(params: SearchParams): Promise<IService[]> {
        const { lat, lng, q, category, radiusInKm = 50 } = params;
        const pipeline: any[] = [];

        // 1. SMART SEARCH (Vector Search Stage)
        // This must be the first stage in a MongoDB Atlas Vector Search pipeline
        if (q && q.trim().length > 2) {
            const vector = await generateEmbedding(q);
            if (vector.length > 0) {
                pipeline.push({
                    $vectorSearch: {
                        index: "vector_index", // Name of index created in Atlas UI
                        path: "embeddings",
                        queryVector: vector,
                        numCandidates: 100, // Candidates to probe
                        limit: 15,          // Number of results to return
                    }
                });
            }
        }

        // 2. LOCATION FILTER (If lat/lng provided)
        // We use $match with $geoWithin because $vectorSearch is already taking the 1st stage
        if (lat && lng) {
            pipeline.push({
                $match: {
                    location: {
                        $geoWithin: {
                            $centerSphere: [[lng, lat], radiusInKm / 6378.1] // Radius in radians
                        }
                    }
                }
            });
        }

        // 3. CATEGORY FILTER
        if (category && category !== 'all' && category !== 'undefined') {
            pipeline.push({ $match: { category: category } });
        }

        // 4. FALLBACK: If no query (q) was provided, we use standard geoNear/match
        if (pipeline.length === 0) {
            pipeline.push({ $match: { isActive: true } });
        }

        return await this.serviceModel.aggregate(pipeline);
    }

    // ... (Keep your getCategories and getSuggestions methods)

    async getCategories(): Promise<string[]> {
        const categories = await this.serviceModel.distinct('category', { isActive: true });
        return categories;
    }

    async getSuggestions(q: string, limit: number = 10): Promise<string[]> {
        if (!q || q.trim().length === 0) return [];

        const regex = new RegExp(q.trim(), 'i');
        const suggestions = await this.serviceModel.find({ title: regex, isActive: true })
            .limit(limit)
            .select('title -_id')
            .exec();

        return suggestions.map(s => s.name);
    }

    async searchWithPagination(params: SearchParams & { page?: number; limit?: number; }) {
        const page = params.page && params.page > 0 ? params.page : 1;
        const limit = params.limit && params.limit > 0 ? params.limit : 20;
        const skip = (page - 1) * limit;

        const allResults = await this.searchSmart(params);
        const paginatedResults = allResults.slice(skip, skip + limit);

        return {
            data: paginatedResults,
            total: allResults.length,
            page,
            limit,
            totalPages: Math.ceil(allResults.length / limit),
        };
    }
}
