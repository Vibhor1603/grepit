import { handleStreamPost } from "../../../../controllers/stream.controller";

export async function POST(request) {
  return handleStreamPost(request);
}
