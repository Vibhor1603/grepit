import { handleQueryPost, handleQueryGet, handleQueryDelete } from "../../../controllers/query.controller";

export async function POST(request) {
  return handleQueryPost(request);
}

export async function GET(request) {
  return handleQueryGet(request);
}

export async function DELETE(request) {
  return handleQueryDelete(request);
}
