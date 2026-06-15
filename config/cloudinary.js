import { v2 as cloudinary } from "cloudinary";

const isConfigured = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (isConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

/**
 * Upload base64 or file path to Cloudinary, or simulate upload in development.
 */
export async function uploadImage(fileStr, folder = "abaya") {
  if (isConfigured) {
    try {
      const uploadResponse = await cloudinary.uploader.upload(fileStr, {
        folder,
        resource_type: "auto",
      });
      return {
        url: uploadResponse.secure_url,
        publicId: uploadResponse.public_id,
      };
    } catch (error) {
      console.error("Cloudinary upload failed, falling back to mock:", error);
    }
  }

  // Graceful fallback simulation: Return the base64 input or a beautiful preset URL
  console.log("Using Mock Cloudinary Upload");
  if (fileStr.startsWith("data:image")) {
    return {
      url: fileStr, // base64 string works in html img src
      publicId: `mock_${Date.now()}`,
    };
  }
  return {
    url: fileStr || "https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=600&auto=format&fit=crop",
    publicId: `mock_${Date.now()}`,
  };
}

export default cloudinary;
