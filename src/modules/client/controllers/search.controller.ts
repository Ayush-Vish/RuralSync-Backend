import { NextFunction, Request, Response } from "express";
import { SearchService } from "../services/search.service";

export class SearchController {
    constructor(private searchService: SearchService) { }

    public searchNearest = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const {
                lat,
                lng,
                radiusInKm,
                category,
                q,
            } = req.query;
            console.log("req query=> " , req.query)
            const result = await this.searchService.searchNearest({ lat: Number(lat), lng: Number(lng), radiusInKm: Number(radiusInKm), category: String(category), q: String(q) });
            res.status(200).json({
                success: true,
                data: result,
            })
        } catch (error) {
            next(error);
        }
    }
}
