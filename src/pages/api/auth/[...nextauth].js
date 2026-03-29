import NextAuthModule from "next-auth";
import { authOptions } from "../../../lib/auth";

const NextAuth = NextAuthModule.default || NextAuthModule;

export default NextAuth(authOptions);
