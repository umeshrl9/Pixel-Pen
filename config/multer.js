import multer from "multer";
import dotenv from "dotenv";
dotenv.config();
import { CloudinaryStorage  } from "multer-storage-cloudinary";
import cloudinary from "./cloudinary.js";

const storage = new CloudinaryStorage({
    cloudinary: cloudinary, 
    params: {
        folder: "pixel-and-pen-profiles",
        allowed_formats: ["jpg", "png", "jpeg", "webp"]
    }
});

const upload = multer({ storage });

export default upload;