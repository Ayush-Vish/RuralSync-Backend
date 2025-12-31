import {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
    GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import path from 'path';

// S3 Configuration
const s3Config = {
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
};

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'shellsync';
const CDN_URL = process.env.AWS_CLOUDFRONT_URL || ''; // Optional: CloudFront CDN URL

// Create S3 Client
const s3Client = new S3Client(s3Config);

// Folder structure for different upload types
export enum UploadFolder {
    SERVICES = 'services',
    ORGANIZATIONS = 'organizations',
    PROFILES = 'profiles',
    BOOKINGS = 'bookings',
    REVIEWS = 'reviews',
    MISC = 'misc',
}

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
];

/**
 * Generate a unique filename
 */
const generateUniqueFilename = (originalName: string): string => {
    const ext = path.extname(originalName);
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    return `${timestamp}-${randomString}${ext}`;
};

/**
 * Get content type from file extension
 */
const getContentType = (filename: string): string => {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.gif': 'image/gif',
        '.pdf': 'application/pdf',
    };
    return mimeTypes[ext] || 'application/octet-stream';
};

/**
 * Check if S3 is configured
 */
export const isS3Configured = (): boolean => {
    return !!(
        process.env.AWS_ACCESS_KEY_ID &&
        process.env.AWS_SECRET_ACCESS_KEY 
    );
};

/**
 * Upload a single file to S3
 */
export const uploadToS3 = async (
    file: Express.Multer.File,
    folder: UploadFolder = UploadFolder.MISC
): Promise<string> => {
    // Check if S3 is configured
    if (!isS3Configured()) {
        console.warn('S3 not configured, returning placeholder URL');
        return `https://placeholder.com/${folder}/${file.originalname}`;
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        throw new Error(`Invalid file type: ${file.mimetype}. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`);
    }

    const uniqueFilename = generateUniqueFilename(file.originalname);
    const key = `${folder}/${uniqueFilename}`;

    const params = {
        Bucket: BUCKET_NAME,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
    };

    try {
        await s3Client.send(new PutObjectCommand(params));

        // Return CloudFront URL if available, otherwise S3 URL
        if (CDN_URL) {
            return `${CDN_URL}/${key}`;
        }
        return `https://${BUCKET_NAME}.s3.${s3Config.region}.amazonaws.com/${key}`;
    } catch (error: any) {
        console.error('S3 Upload Error:', error);
        throw new Error(`Failed to upload file to S3: ${error.message}`);
    }
};

/**
 * Upload multiple files to S3
 */
export const uploadMultipleToS3 = async (
    files: Express.Multer.File[],
    folder: UploadFolder = UploadFolder.MISC
): Promise<string[]> => {
    if (!files || files.length === 0) return [];

    const uploadPromises = files.map((file) => uploadToS3(file, folder));
    return Promise.all(uploadPromises);
};

/**
 * Delete a file from S3
 */
export const deleteFromS3 = async (fileUrl: string): Promise<boolean> => {
    if (!isS3Configured()) {
        console.warn('S3 not configured, skipping delete');
        return false;
    }

    try {
        // Extract key from URL
        let key = '';

        if (CDN_URL && fileUrl.startsWith(CDN_URL)) {
            key = fileUrl.replace(`${CDN_URL}/`, '');
        } else {
            // Extract from S3 URL
            const urlPattern = new RegExp(`https://${BUCKET_NAME}\\.s3\\.[^/]+\\.amazonaws\\.com/(.+)`);
            const match = fileUrl.match(urlPattern);
            if (match) {
                key = match[1];
            }
        }

        if (!key) {
            console.warn('Could not extract key from URL:', fileUrl);
            return false;
        }

        await s3Client.send(
            new DeleteObjectCommand({
                Bucket: BUCKET_NAME,
                Key: key,
            })
        );

        return true;
    } catch (error: any) {
        console.error('S3 Delete Error:', error);
        return false;
    }
};

/**
 * Delete multiple files from S3
 */
export const deleteMultipleFromS3 = async (fileUrls: string[]): Promise<void> => {
    if (!fileUrls || fileUrls.length === 0) return;

    const deletePromises = fileUrls.map((url) => deleteFromS3(url));
    await Promise.all(deletePromises);
};

/**
 * Generate a pre-signed URL for temporary access
 */
export const getPresignedUrl = async (
    key: string,
    expiresIn: number = 3600 // 1 hour
): Promise<string> => {
    if (!isS3Configured()) {
        throw new Error('S3 not configured');
    }

    const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
    });

    return getSignedUrl(s3Client, command, { expiresIn });
};

/**
 * Upload from base64 string
 */
export const uploadBase64ToS3 = async (
    base64Data: string,
    filename: string,
    folder: UploadFolder = UploadFolder.MISC
): Promise<string> => {
    if (!isS3Configured()) {
        console.warn('S3 not configured, returning placeholder URL');
        return `https://placeholder.com/${folder}/${filename}`;
    }

    // Remove data:image/xxx;base64, prefix if present
    const base64String = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64String, 'base64');

    const uniqueFilename = generateUniqueFilename(filename);
    const key = `${folder}/${uniqueFilename}`;
    const contentType = getContentType(filename);

    const params = {
        Bucket: BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType,
    };

    try {
        await s3Client.send(new PutObjectCommand(params));

        if (CDN_URL) {
            return `${CDN_URL}/${key}`;
        }
        return `https://${BUCKET_NAME}.s3.${s3Config.region}.amazonaws.com/${key}`;
    } catch (error: any) {
        console.error('S3 Upload Error:', error);
        throw new Error(`Failed to upload base64 to S3: ${error.message}`);
    }
};

// Export S3 client for advanced usage
export { s3Client, BUCKET_NAME };
