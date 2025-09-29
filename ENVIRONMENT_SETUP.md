# Environment Setup Guide

## Required Environment Variables

Create a `.env.local` file in your project root with the following variables:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_JWT_ISSUER_DOMAIN=https://your-app-name.clerk.accounts.dev

# Convex Database
NEXT_PUBLIC_CONVEX_URL=your_convex_url
CONVEX_DEPLOYMENT=your_convex_deployment
CONVEX_CLIENT_URL=your_convex_client_url

# OpenRouter API
OPEN_ROUTER_API_KEY=your_openrouter_api_key
```

## How to Get Each Secret

### Clerk Authentication

1. **Sign up at [clerk.com](https://clerk.com)**
2. **Create a new application**
3. **Go to API Keys section in your dashboard**
4. **Copy the values:**
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - starts with `pk_test_` or `pk_live_`
   - `CLERK_SECRET_KEY` - starts with `sk_test_` or `sk_live_`
5. **Get your JWT Issuer Domain:**
   - Go to "JWT Templates" in your Clerk dashboard
   - Create a new JWT template (or use the default)
   - Copy the issuer domain (format: `https://your-app-name.clerk.accounts.dev`)
   - This becomes your `CLERK_JWT_ISSUER_DOMAIN`

### Convex Database

1. **Sign up at [convex.dev](https://convex.dev)**
2. **Install Convex CLI:**
   ```bash
   npm install -g convex
   ```
3. **Login and deploy:**
   ```bash
   convex login
   npx convex dev
   ```
4. **Copy the values from your terminal output:**
   - `NEXT_PUBLIC_CONVEX_URL` - looks like `https://your-project.convex.cloud`
   - `CONVEX_DEPLOYMENT` - your deployment name
   - `CONVEX_CLIENT_URL` - same as NEXT_PUBLIC_CONVEX_URL

### OpenRouter API

1. **Sign up at [openrouter.ai](https://openrouter.ai)**
2. **Go to API Keys section**
3. **Create a new API key**
4. **Copy the key value for `OPEN_ROUTER_API_KEY`**

## Setup Steps

1. **Create the `.env.local` file** with all required variables
2. **Start Convex development:**
   ```bash
   npx convex dev
   ```
3. **Start the development server:**
   ```bash
   npm run dev
   ```
4. **Navigate to `http://localhost:3000`** to test the application
