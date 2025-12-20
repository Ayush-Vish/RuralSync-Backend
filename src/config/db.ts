import mongoose from 'mongoose';
import { Service } from '../models/service.model';
import { generateEmbedding } from '../utils/ai.helper';

export const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ruralsync';
        console.log( "fdnfjdn => " ,  process.env.MONGO_URI)

        const conn = await mongoose.connect(mongoURI);

        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error: any) {
        console.error(`❌ Database Connection Error: ${error.message}`);
        process.exit(1);
    }
};
// export async function migrate() {
//     const connawait mongoose.connect(process.env.MONGO_URI!);
//     const services = await Service.find({ embeddings: { $size: 0 } });

//     console.log(`Processing ${services.length} services...`);

//     for (const service of services) {
//         const text = `${service.name} ${service.description} ${service.category}`;
//         service.embeddings = await generateEmbedding(text);
//         await service.save();
//         console.log(`✅ Embedded: ${service.name}`);

//     }

//     console.log("Done!");
//     process.exit(0);
// }


