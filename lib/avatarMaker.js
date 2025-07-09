import axios from 'axios';
import { v4 as uuid } from 'uuid';
import {v2 as cloudinary} from 'cloudinary';
import { uploadFilesToCloudinary } from '../utils/features.js';
import { User } from '../models/user.js';

const avatarMaker = async(username)=>{
    try {
        const dicebearUrl = `https://api.dicebear.com/9.x/initials/png?seed=${encodeURIComponent(username)}&backgroundColor=3f51b5`;

        const dicebearRes = await axios.get(dicebearUrl, {
          responseType: "arraybuffer",
        });

        const base64 = Buffer.from(dicebearRes.data, "binary").toString("base64");
        const dataUri = `data:image/png;base64,${base64}`;

        const result = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload(
            dataUri,
            {
              resource_type: "image",
              public_id: uuid(),
            },
            (error, result) => {
              if (error) return reject(error);
              resolve(result);
            });
          });
         return result;
    } catch (error) {
      console.error('Error in avatarMaker:', error);
      throw error; // Re-throw the error for proper error handling
    }
}


export const processAvatarInBackground = async (userId, file, name) => {
    try {
        let avatar = {};
        
        if (file) {
            const result = await uploadFilesToCloudinary([file]);
            avatar = {
                publicId: result[0].publicId,
                url: result[0].url,
            };
        } else {
            const result = await avatarMaker(name);
            avatar = {
                publicId: result.public_id,
                url: result.secure_url,
            };
        }

        // Update user with actual avatar
        await User.findByIdAndUpdate(userId, { avatar });
        
    } catch (error) {
        console.error("Error processing avatar:", error);
    }
};