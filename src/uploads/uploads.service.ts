import {
  DeleteObjectCommand,
  GetObjectCommand,
  GetObjectCommandInput,
  PutObjectCommand,
  PutObjectCommandInput,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UploadsService {
  private region: string;
  private bucketName: string;
  private loggerService = new Logger(UploadsService.name);
  private s3Client: S3Client;

  constructor(private readonly configService: ConfigService) {
    this.region = this.configService.getOrThrow<string>('AWS_BUCKET_REGION');
    this.bucketName = this.configService.getOrThrow<string>('AWS_BUCKET_NAME');

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.configService.getOrThrow('AWS_ACCESS_KEY'),
        secretAccessKey: this.configService.getOrThrow('AWS_SECRET_ACCESS_KEY'),
      },
      forcePathStyle: true,
    });
  }

  async uploadFile(file: Express.Multer.File, key: string) {
    try {
      const input: PutObjectCommandInput = {
        Body: file.buffer,
        Bucket: this.bucketName,
        Key: key,
        ContentType: file.mimetype,
      };
      const command = new PutObjectCommand(input);
      return this.s3Client.send(command);
    } catch (err) {
      this.loggerService.error(`Error uploading file: ${err}`);
      return null;
    }
  }

  async getFile(fileKey: string, increasedValidity?: boolean) {
    const downloadParams: GetObjectCommandInput = {
      Key: fileKey,
      Bucket: this.bucketName,
    };

    const getObjectCommand = new GetObjectCommand(downloadParams);

    const options: Record<string, any> = { expiresIn: 60 * 60 * 24 }; // 1 Day

    if (increasedValidity) {
      options.expiresIn = 60 * 60 * 24 * 7; // one week
    }

    try {
      const url = await getSignedUrl(this.s3Client, getObjectCommand, options);

      return url;
    } catch (err) {
      this.loggerService.error(`Error retrieving file: ${err}`);
      return null;
    }
  }

  async deleteFile(fileKey: string) {
    const deleteObjectCommand = new DeleteObjectCommand({
      Key: fileKey,
      Bucket: this.bucketName,
    });
    try {
      return await this.s3Client.send(deleteObjectCommand);
    } catch (err) {
      this.loggerService.error(`Error deleting file: ${err}`);
      return null;
    }
  }
}
