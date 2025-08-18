import { UnprocessableEntityException } from '@nestjs/common';

export const imageValidator = (
  req: any,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
): void => {
  if (
    !file.originalname.match(/\.(jpg|jpeg|png)$/) ||
    !['image/jpeg', 'image/png'].includes(file.mimetype)
  ) {
    return cb(
      new UnprocessableEntityException('Only image files are allowed'),
      false,
    );
  }

  cb(null, true);
};
