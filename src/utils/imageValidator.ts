import path from "path";

/**
 * Validates if a file has an allowed image extension and MIME type.
 * @param originalname The original file name
 * @param mimetype The file MIME type
 * @returns true if valid, false otherwise
 */
export function isValidImage(originalname: string, mimetype: string): boolean {
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(originalname).toLowerCase();
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  
  return allowedExtensions.includes(ext) && allowedMimeTypes.includes(mimetype);
}
