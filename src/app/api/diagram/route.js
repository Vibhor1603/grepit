import { handleDiagramPost } from "../../../controllers/diagram.controller";

export async function POST(request) {
  return handleDiagramPost(request);
}
