import { handleAnalyzePost, handleAnalyzeGet } from "../../../controllers/analyze.controller";

export async function POST(request) {
  return handleAnalyzePost(request);
}

export async function GET(request) {
  return handleAnalyzeGet(request);
}
