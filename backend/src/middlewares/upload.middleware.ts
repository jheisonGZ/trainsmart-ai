import multer from 'multer';

import { ValidationError } from '../utils/api-response';

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

const storage = multer.memoryStorage();

export const uploadImage = multer({
  storage,
  limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
  fileFilter: (_req, file, callback) => {
    if (!file.mimetype.startsWith('image/')) {
      callback(new ValidationError('Only image uploads are allowed.'));
      return;
    }

    callback(null, true);
  },
}).single('image');
