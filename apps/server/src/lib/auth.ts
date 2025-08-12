import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "../../prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  trustedOrigins: [process.env.CORS_ORIGIN || ""],
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },

  baseURL:
    process.env.NODE_ENV === "production"
      ? "https://smart-notes-server-maurn.ondigitalocean.app"
      : "http://localhost:3000",
  advanced: {
    crossSubDomainCookies: {
      enabled: true,
    },
    cookie: {
      sameSite: "none",
      secure: true,
      path: "/",
    },
    defaultCookieAttributes: {
      secure: true,
      sameSite: "none",
    },
  },
  logger: {
    disabled: false,
    level: "error",
    log: (level, message, ...args) => {
      // Custom logging implementation
      console.log(`[${level}] ${message}`, ...args);
    },
  },
});

export type Session = typeof auth.$Infer.Session;
