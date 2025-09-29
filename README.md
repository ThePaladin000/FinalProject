# Nexus-Tech

## What it is

A knowledge management and AI chat application that allows users to organize, search, and interact with their knowledge base through an intelligent chat interface. The application features automatic content chunking, hierarchical organization, tagging systems, and AI-powered conversation management.

## Tech stack

- **Frontend**: Next.js 14 with TypeScript
- **Backend**: Convex for real-time database and serverless functions
- **Authentication**: Clerk for user management
- **AI Integration**: OpenRouter API for multiple AI model access
- **Styling**: Tailwind CSS
- **Deployment**: Vercel

## How to deploy

1. Clone the repository
2. Install dependencies: `npm install`
3. Create accounts and get API keys:
   - **Clerk**: Sign up at clerk.com for authentication
   - **Convex**: Sign up at convex.dev for database
   - **OpenRouter**: Sign up at openrouter.ai (use free models for testing)
4. Set up environment variables (see ENVIRONMENT_SETUP.md)
5. Start Convex development: `npx convex dev`
6. Start local development server: `npm run dev`
