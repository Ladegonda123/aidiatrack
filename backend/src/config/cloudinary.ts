import { v2 as cloudinary } from "cloudinary";
import { ENV } from "./env";

const cloudName = ENV.CLOUDINARY_CLOUD_NAME;
const apiKey = ENV.CLOUDINARY_API_KEY;
const apiSecret = ENV.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  console.warn("[Cloudinary] ⚠️  Missing credentials — photo upload will fail");
  console.warn("[Cloudinary] cloud_name:", cloudName || "MISSING");
  console.warn("[Cloudinary] api_key:", apiKey ? "SET" : "MISSING");
  console.warn("[Cloudinary] api_secret:", apiSecret ? "SET" : "MISSING");
} else {
  console.log("[Cloudinary] ✅ Configured — cloud:", cloudName);
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});

export default cloudinary;
