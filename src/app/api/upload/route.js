import { handleUploadPost } from "../../../controllers/upload.controller";

export async function POST(request) {
  return handleUploadPost(request);
}
