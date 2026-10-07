import "server-only";

import {
  parseCloudinaryEnvironment,
  type CloudinaryEnvironment,
} from "./cloudinary-env";

export function getCloudinaryEnvironment(): CloudinaryEnvironment {
  return parseCloudinaryEnvironment(process.env);
}
