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
- **Logging & Analytics**: PostHog for event tracking and error logging

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
7. You can also test the site out by visiting [NexusTech.run](https://www.nexustech.run/)

## How to Use Nexus-Tech

### Getting Started

1. **Create an Account**: Sign up for free or use the test account:

   ```
   review@codeagency.dev
   Welcome2NT!
   ```

2. **Create Your First Nexus**: A nexus is your main knowledge container - think of it as a project or topic area.

3. **Create Loci**: Within each nexus, create loci (notebooks) to organize specific aspects of your knowledge.

### Core Features Guide

#### Import Content

**Import via JSON or Text:**

- Right-click on any locus in the sidebar
- Select "Import" from the context menu
- Choose your import method:
  - **JSON Import**: Upload structured data with chunks, tags, and metadata
  - **Text Import**: Paste plain text that will be automatically chunked
- The system supports multiple content types: `text`, `code`, and `document`
- Imported content is automatically organized and tagged

**Supported JSON Structure:**

```json
{
  "chunks": [
    {
      "originalText": "Your content here",
      "chunkType": "text",
      "source": "import",
      "tags": ["tag1", "tag2"]
    }
  ]
}
```

#### Export Content

**Export Loci:**

- Right-click on any locus in the sidebar
- Select "Export" from the context menu
- Download as JSON file containing:
  - Locus metadata (name, description, meta question)
  - All chunks with their content and metadata
  - Tags and meta tags
  - Export timestamp and statistics

#### Create and Manage Nexi

**Creating a Nexus:**

1. Click the "Create Nexus" button on the main page
2. Enter a name and optional description
3. Your nexus will appear in the sidebar

**Editing a Nexus:**

- Right-click on a nexus in the sidebar
- Select "Edit" to modify name and description
- Changes are saved automatically

**Deleting a Nexus:**

- Right-click on a nexus in the sidebar
- Select "Delete" (this removes all associated loci and chunks)

#### Create and Manage Loci

**Creating a Locus:**

1. Navigate to a nexus
2. Click the "+" button in the locus manager
3. Enter name, description, and optional meta question
4. Press Ctrl+Enter or click "Create Locus"

**Editing a Locus:**

- Right-click on a locus in the sidebar
- Select "Edit" to modify name, description, and meta question
- The meta question helps guide AI conversations within that locus

**Locus Organization:**

- Drag and drop loci to reorder them
- Each locus can contain multiple chunks of content
- Loci are organized hierarchically within nexi

#### Research and AI Chat

**Starting Research:**

1. Navigate to any locus
2. Use the chat interface to ask questions
3. The AI has access to all content within the current nexus
4. Ask questions like:
   - "Summarize the key points from this locus"
   - "What are the main concepts discussed?"
   - "Find information about [specific topic]"

**AI Features:**

- Context-aware responses based on your knowledge base
- Automatic content summarization
- Intelligent search across all your content
- Model selection (choose from different AI models)

**Research Workflow:**

1. Ask questions to explore your content
2. Save interesting responses as chunks
3. Organize findings with meta tags and regular tags
4. Build connections between different concepts

#### Save Chunks

**Saving AI Responses:**

- After getting an AI response, click the "Save" button
- Choose chunk type: `text`, `code`, or `document`
- Assign meta tags for categorization
- Add custom tags for organization

**Chunk Types:**

- **Text**: Regular written content, summaries, notes
- **Code**: Programming code, scripts, technical documentation
- **Document**: Structured documents, reports, articles

**Manual Chunk Creation:**

- Click "Add Chunk" in any locus
- Enter your content directly
- Choose appropriate chunk type and meta tag
- Save to organize your knowledge

#### Meta Tags System

**Understanding Meta Tags:**

- Meta tags provide qualitative classification of content
- System includes: CORE, SUPPORTING, REFERENCE, etc.
- Help organize content by importance and type

**Assigning Meta Tags:**

- When saving chunks, select appropriate meta tag
- Change meta tags by clicking the tag dropdown on any chunk
- Meta tags help the AI understand content importance

**Meta Tag Types:**

- **CORE**: Essential, fundamental content
- **SUPPORTING**: Additional context and details
- **REFERENCE**: Background information and sources
- **EXAMPLES**: Specific examples and use cases

#### Moving Chunks Around

**Moving Between Loci:**

1. Right-click on any chunk
2. Select "Move" from the context menu
3. Choose destination locus from the dropdown
4. Chunk is moved with all its metadata intact

**Reordering Chunks:**

- Drag and drop chunks within a locus to reorder
- Use "Move to Top" or "Move to Bottom" options
- Changes are saved automatically

**Chunk Management:**

- Edit chunk content by clicking the edit button
- Delete chunks with the delete button
- Duplicate chunks to reuse content
- Link related chunks together

#### Editing Nexi and Loci

**Editing Nexus Properties:**

- Right-click nexus → "Edit"
- Modify name and description
- Changes affect the entire nexus structure

**Editing Locus Properties:**

- Right-click locus → "Edit"
- Update name, description, and meta question
- Meta question guides AI conversations in that locus

**Bulk Operations:**

- Select multiple loci for batch operations
- Reorder loci by dragging
- Delete multiple loci at once
- Export multiple loci together

### Advanced Features

#### Content Connections

- Create links between related chunks
- Build knowledge graphs of connected concepts
- Navigate between related content easily

#### Content Organization

- Use tags for flexible categorization
- Create custom tag hierarchies
- Filter content by tags and meta tags

#### AI Integration

- Multiple AI model support via OpenRouter
- Context-aware responses
- Automatic content summarization
- Intelligent search and discovery

#### Data Management

- Automatic backups of your content
- Export/import for data portability
- Version history for important changes
- Guest mode for testing without account

## Logging and Error Handling

This application implements centralized logging and error handling adapted for serverless deployment on Vercel.

### Architecture

**Traditional vs. Serverless Approach:**

Since Vercel uses serverless functions (no persistent file system), we adapted the standard logging requirements:

- **Request Logging**: Instead of `request.log` file → PostHog events + Vercel logs
- **Error Logging**: Instead of `error.log` file → PostHog error capture + Vercel logs
- **Centralized Error Handler**: Implemented in `src/lib/errorHandler.ts`
- **Logger Module**: Located in `src/lib/logger.ts` (sends to PostHog + console)

### Implementation Details

**Centralized Error Handler** (`src/lib/errorHandler.ts`):

- Custom error classes for different HTTP status codes
- `handleApiError()` function for consistent error responses
- Automatic error logging with context and metadata
- Development vs. production error message filtering

**Logger Module** (`src/lib/logger.ts`):

- `logRequest()` - Logs all API requests and responses
- `logError()` - Logs errors with full stack traces
- Sends events to PostHog for long-term storage and analysis
- Falls back to console.log (captured by Vercel's logging system)

**API Route Integration**:
All API routes in `/src/app/api/*` use the centralized error handler and log all requests/responses automatically.

### Why PostHog?

PostHog provides:

- Free tier (1M events/month)
- Request/response tracking
- Error monitoring with stack traces
- Session recording for debugging
- User analytics and funnels
- Feature flags for gradual rollouts
- Works seamlessly with Vercel serverless architecture

This approach meets the spirit of traditional logging requirements while being optimized for modern serverless infrastructure.
