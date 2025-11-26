import NextAuth, { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { cache } from "react";
import { User, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import GoogleProvider from "next-auth/providers/google";
import { updateUserProfile } from "@/lib/db/queries/user";
import {
  createUserSession,
  updateSessionActivity,
  generateSessionToken,
  getActiveSession,
  getUserActiveSessions,
  getUserByEmail,
} from "@/lib/db/queries/user";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email: string;
      image?: string | null;
      permissions?: string[] | null;
    };
    sessionToken?: string;
  }

  interface JWT {
    sessionToken?: string;
    userid?: string;
  }
}

// Note: Invite activation is now handled through the /d/invites page
// This allows users to review and accept/decline invitations manually

const authOptions: NextAuthConfig = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      // The name to display on the sign in form (e.g. 'Sign in with...')
      name: "Credentials",
      // The credentials is used to generate a suitable form on the sign in page.
      // You can specify whatever fields you are expecting to be submitted.
      credentials: {
        email: { label: "Email", type: "email", placeholder: "m@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // You need to provide your own logic here that takes the credentials
        // submitted and returns either a object representing a user or value
        // that is false/null if the credentials are invalid.
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Call our API endpoint to verify credentials
          // This avoids using Node.js crypto module in the Edge runtime
          const res = await fetch(
            `${
              process.env.NEXTAUTH_URL || "http://localhost:3000"
            }/api/auth/credentials`,
            {
              method: "POST",
              body: JSON.stringify({
                email: credentials.email,
                password: credentials.password,
              }),
              headers: { "Content-Type": "application/json" },
            },
          );

          const response = await res.json();

          // If no error and we have user data, return it
          if (res.ok && response.user) {
            return response.user;
          }

          // Handle specific error cases
          if (response.error) {
            throw new Error(response.error);
          }

          // Return null if user data could not be retrieved
          return null;
        } catch (error) {
          // Re-throw the error so NextAuth can handle it
          throw error;
        }
      },
    }),
  ],
  // The Credentials provider can only be used if JSON Web Tokens are enabled for sessions
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/",
    error: "/",
  },
  // Configure logger to suppress CredentialsSignin errors (they're expected behavior)
  logger: {
    error(error: Error) {
      const typedError = error as { cause?: { err?: { input?: string } } };
      if (typedError.cause?.err?.input === "USER_NOT_FOUND") {
        return;
      }

      // Don't log CredentialsSignin errors - they're expected when users enter wrong passwords
      if (error.name === "CredentialsSignin") {
        return;
      }
      // Log all other errors normally
      console.error(`[auth][error] ${error.name}:`, error.message);
    },
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      const dbUser = await getUserByEmail(user.email);
      if (!dbUser) return false;
      if (!dbUser.image && user.image && !dbUser.name && user.name) {
        await updateUserProfile(dbUser.email, {
          image: user.image,
          name: user.name,
        });
      }
      return true;
    },

    async jwt({ token, user, account }) {
      // If this is a new sign-in, create a session
      if (account && user?.email) {
        const dbUser = await db
          .select()
          .from(users)
          .where(eq(users.email, user.email))
          .limit(1);

        if (dbUser.length > 0) {
          token.userid = dbUser[0].userid;
          // Generate and store session token
          const sessionToken = generateSessionToken();
          token.sessionToken = sessionToken;

          // Create session in database
          await createUserSession(
            dbUser[0].userid,
            sessionToken,
            "Web Browser", // Device info - could be enhanced with actual device detection
            undefined, // IP address - would need request context
            undefined, // User agent - would need request context
          );
        }
      }

      // Handle existing tokens that might not have userid (from before this logic was added)
      // This can happen if the user signed in before we added userid to JWT tokens
      if (!token.userid && (user?.email || token.email)) {
        const email = user?.email || token.email;
        if (email) {
          const dbUser = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

          if (dbUser.length > 0) {
            token.userid = dbUser[0].userid;
          }
        }
      }

      // For existing tokens without sessionToken, try to reuse existing session or create new one
      if (!token.sessionToken && token.userid) {
        // First, check if user has any active sessions
        const activeSessions = await getUserActiveSessions(
          token.userid as string,
        );

        if (activeSessions.length > 0) {
          // Reuse the most recently active session
          const mostRecentSession = activeSessions[activeSessions.length - 1];
          token.sessionToken = mostRecentSession.sessiontoken;
        } else {
          // No active sessions exist, create a new one
          const sessionToken = generateSessionToken();
          token.sessionToken = sessionToken;

          // Create session in database
          await createUserSession(
            token.userid as string,
            sessionToken,
            "Web Browser",
            undefined,
            undefined,
          );
        }
      }

      // Update session activity if session exists
      if (typeof token.sessionToken === "string") {
        const updated = await updateSessionActivity(token.sessionToken);
        if (!updated) {
          console.warn(
            "Failed to update session activity, session may not exist in database",
          );
        }
      }

      return token;
    },

    async session({ session, token }) {
      // If we have userid in token, use it
      if (typeof token.userid === "string") {
        session.user.id = token.userid;
      } else if (session.user?.email) {
        // Fallback: fetch user ID from database if missing from token
        try {
          const dbUser = await db
            .select({ userid: users.userid })
            .from(users)
            .where(eq(users.email, session.user.email))
            .limit(1);

          if (dbUser.length > 0) {
            session.user.id = dbUser[0].userid;
          }
        } catch (error) {
          console.error("Failed to fetch user ID from database:", error);
        }
      }

      if (typeof token.sessionToken === "string") {
        session.sessionToken = token.sessionToken;
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);

/**
 * Validates if a user has an active session
 * @param sessionToken - The session token to validate
 * @returns true if session is active, false otherwise
 */
export async function isUserSessionActive(
  sessionToken: string,
): Promise<boolean> {
  try {
    const activeSession = await getActiveSession(sessionToken);
    return !!activeSession;
  } catch (error) {
    console.error("Error checking session activity:", error);
    return false;
  }
}

/**
 * Gets the authenticated user if they have a valid session
 * Returns null if user is not authenticated or session is invalid/expired
 */
export const getUser = cache(async (): Promise<User | null> => {
  const session = await auth();

  if (!session?.user?.email) return null;

  const sessionToken = session.sessionToken;
  const email = session.user.email;

  // Run checks in parallel
  const [activeSession, dbUsers] = await Promise.all([
    sessionToken ? getActiveSession(sessionToken) : Promise.resolve(true),
    db.select().from(users).where(eq(users.email, email)).limit(1),
  ]);

  if (sessionToken && !activeSession) {
    console.warn("Invalid or expired session token");
    return null;
  }

  if (!dbUsers || dbUsers.length === 0) {
    console.error("Sign in User Not Found");
    return null;
  }

  return dbUsers[0];
});

/**
 * Gets the authenticated user along with session information
 * Returns null if user is not authenticated or session is invalid/expired
 */
export async function getUserWithSession(): Promise<{
  user: User;
  sessionToken: string;
} | null> {
  const session = await auth();

  if (!session?.user?.email || !session.sessionToken) return null;

  const sessionToken = session.sessionToken;
  const email = session.user.email;

  const [activeSession, dbUsers] = await Promise.all([
    getActiveSession(sessionToken),
    db.select().from(users).where(eq(users.email, email)).limit(1),
  ]);

  if (!activeSession) {
    console.warn("Invalid or expired session token");
    return null;
  }

  if (!dbUsers || dbUsers.length === 0) {
    console.error("Sign in User Not Found");
    return null;
  }

  return {
    user: dbUsers[0],
    sessionToken: sessionToken,
  };
}
