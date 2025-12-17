import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
dotenv.config();
import sharp from 'sharp';
const s3 = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
/**
 * Utility function to upload a file to S3
 * @param {Object} file - The file object (usually req.file from multer)
 * @param {string} bucketName - The S3 bucket name
 * @returns {Promise<string>} - Returns the URL of the uploaded file
 */
export const uploadFileToS3 = async (
  file,
  bucketName = process.env.AWS_BUCKET_NAME
) => {
  if (!file || !file.buffer) {
    throw new Error('Invalid file data');
  }
  console.time("upload" );
  // const buffer = await sharp(file.buffer)
  //   .resize({})
  //   .toBuffer();
  console.timeEnd("upload");

  const params = {
    Bucket: bucketName,
    Key: Date.now() + file.originalname,
    Body:file.buffer,
    ContentType: file.mimetype,
  };

  try {
    console.time("S3")
    const command = new PutObjectCommand(params);
    await s3.send(command);
    console.timeEnd("S3")
    return {
      url: `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${params.Key}`,
    };
  } catch (error) {
    console.error('Error uploading file to S3:', error);
    throw new Error('File upload failed');
  }
};
import multer from 'multer';
import path from 'path';

// Define the storage configuration
const storage = multer.memoryStorage(); // Use memory storage to get the file buffer

// Define the file filter function
function sanitizeFile(file, cb) {
  const fileExts = ['.png', '.jpg', '.jpeg', '.gif'];
  const isAllowedExt = fileExts.includes(path.extname(file.originalname.toLowerCase()));
  const isAllowedMimeType = file.mimetype.startsWith('image/');

  if (isAllowedExt && isAllowedMimeType) {
    return cb(null, true);
  } else {
    cb('Error: File type not allowed!');
  }
}

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: (req, file, callback) => {
    sanitizeFile(file, callback);
  },
  limits: {
    fileSize: 1024 * 1024 * 10, // 2MB file size
  },
});

export { upload};