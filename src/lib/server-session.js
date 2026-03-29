import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export async function getCurrentSession() {
  return getServerSession(authOptions);
}

export function getSessionOwner(session) {
  return session?.user?.email || null;
}

export function getGithubAccessToken(session) {
  return session?.accessToken || null;
}
