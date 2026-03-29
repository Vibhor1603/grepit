import GithubProviderModule from "next-auth/providers/github";
import { isGitHubAuthConfigured } from "./env";

const providers = [];
const GithubProvider = GithubProviderModule.default || GithubProviderModule;

if (isGitHubAuthConfigured()) {
  providers.push(
    GithubProvider({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
      httpOptions: {
        timeout: 15000,
      },
      authorization: {
        params: {
          scope: "read:user user:email repo",
        },
      },
    }),
  );
}

export const authOptions = {
  providers,
  callbacks: {
    async jwt({ token, account }) {
      if (account?.access_token) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token?.sub) {
        session.user.id = token.sub;
      }
      if (token?.accessToken) {
        session.accessToken = token.accessToken;
      }
      return session;
    },
  },
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET || "dev-only-secret-change-me",
  pages: {
    signIn: "/",
    error: "/",
  },
  trustHost: true,
};
