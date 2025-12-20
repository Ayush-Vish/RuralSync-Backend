import { NextFunction, Request, Response } from "express";
import { SearchService, SearchParams } from "../services/search.service";
import { ApiError } from "../../../utils/helpers";

export class SearchController {
    constructor(private searchService: SearchService) { }

    /**
     * Main "Smart" Search endpoint
     * Uses Vector Search if 'q' is provided, else standard GeoSearch
     */
    public searchNearest = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const params = this.parseSearchParams(req.query);

            // Using the new searchSmart method we implemented in the service
            const result = await this.searchService.searchSmart(params);
            
            res.status(200).json({
                success: true,
                data: result,
                count: result.length,
                meta: {
                    query: params.q || 'none',
                    category: params.category || 'all',
                    coordinates: params.lat ? [params.lng, params.lat] : 'not provided'
                }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Advanced Search with Pagination
     * Useful for the "All Services" page with filters
     */
    public searchAdvanced = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const params = this.parseSearchParams(req.query);
            
            // This calls the method that handles $skip, $limit, and total counts
            const result = await this.searchService.searchWithPagination(params);
            
            res.status(200).json({
                success: true,
                ...result
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get unique categories for filter UI
     */
    public getCategories = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const categories = await this.searchService.getCategories();
            res.status(200).json({
                success: true,
                data: categories
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Helper to safely parse and type-cast query parameters
     */
    private parseSearchParams(query: any): SearchParams {
        return {
            lat: query.lat ? parseFloat(String(query.lat)) : undefined,
            lng: query.lng ? parseFloat(String(query.lng)) : undefined,
            radiusInKm: query.radiusInKm ? parseInt(String(query.radiusInKm)) : 50,
            category: query.category as string,
            q: query.q as string,
            minPrice: query.minPrice ? parseFloat(String(query.minPrice)) : undefined,
            maxPrice: query.maxPrice ? parseFloat(String(query.maxPrice)) : undefined,
            minRating: query.minRating ? parseFloat(String(query.minRating)) : undefined,
            sortBy: query.sortBy as SearchParams['sortBy'],
            page: query.page ? parseInt(String(query.page)) : 1,
            limit: query.limit ? parseInt(String(query.limit)) : 20
        };
    }
}
