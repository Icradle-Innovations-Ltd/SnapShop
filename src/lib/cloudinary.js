const { v2: cloudinary } = require("cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const isConfigured = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

/**
 * Upload image buffer/path to Cloudinary.
 * Returns { url, publicId }.
 */
async function uploadImage(filePath) {
  const result = await cloudinary.uploader.upload(filePath, {
    folder: "snapshop/products",
    transformation: [{ width: 800, height: 800, crop: "limit", quality: "auto" }],
  });
  return { url: result.secure_url, publicId: result.public_id };
}

/**
 * Delete image from Cloudinary by public_id.
 */
async function deleteImage(publicId) {
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId);
}

module.exports = { cloudinary, isConfigured, uploadImage, deleteImage };
