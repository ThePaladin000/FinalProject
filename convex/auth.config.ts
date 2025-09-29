// Configure Convex to accept Clerk-issued JWTs from your "convex" JWT template.
// Ensure CLERK_JWT_ISSUER_DOMAIN is set to your Clerk issuer domain, e.g.:
//   https://<your-subdomain>.clerk.accounts.dev
// or your custom Clerk domain in production.

export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN as string,
      applicationID: "convex",
    },
  ],
};


