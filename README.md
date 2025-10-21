# AccuPlanner

AccuPlanner is an AI-powered learning path generator that helps users create personalized study plans with curated resources. Built with React, TypeScript, Supabase, and Google Gemini AI.

## ✨ Features

- 🤖 **AI-Powered Learning Paths**: Generate comprehensive study plans using Google Gemini API
- 📚 **Curated Resources**: Verified YouTube videos, articles, courses, and exercises
- 📊 **Progress Tracking**: Track your learning progress across multiple goals
- 🎯 **Smart Categorization**: Automatic category assignment and difficulty assessment
- 🔐 **Secure Authentication**: User authentication powered by Supabase
- 💾 **Persistent Storage**: Save and manage multiple learning goals

## 🚀 Getting Started

### Prerequisites

- Node.js & npm - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- Supabase CLI - [installation guide](https://supabase.com/docs/guides/cli)
- Google Gemini API Key - [get it here](https://aistudio.google.com/app/apikey)

### Installation

```sh
# Step 1: Clone the repository
git clone https://github.com/Siddhesh-00/AccuPlanner.git

# Step 2: Navigate to the project directory
cd AccuPlanner

# Step 3: Install dependencies
npm install

# Step 4: Set up environment variables
# Create a .env file in the root directory with:
# VITE_SUPABASE_URL=your_supabase_url
# VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Step 5: Link to your Supabase project
npx supabase link --project-ref your_project_ref

# Step 6: Set up Gemini API key as Supabase secret
npx supabase secrets set GEMINI_API_KEY=your_google_gemini_api_key

# Step 7: Deploy Supabase Edge Functions
npx supabase functions deploy generate-study-plan-v2
npx supabase functions deploy create-goal
npx supabase functions deploy get-goals
npx supabase functions deploy update-goal-progress

# Step 8: Start the development server
npm run dev
```

The application will be available at `http://localhost:8080` (or the next available port).

## 🔑 API Configuration

### Google Gemini API

AccuPlanner uses Google Gemini API for AI-powered learning path generation. To set it up:

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Set it as a Supabase secret:
   ```sh
   npx supabase secrets set GEMINI_API_KEY=AIzaSy...your_key_here
   ```

**Important**: The API key must be a valid Google Gemini API key starting with `AIzaSy`.

### Supabase Configuration

1. Create a new project at [Supabase](https://supabase.com)
2. Get your project URL and anon key from Project Settings > API
3. Add them to your `.env` file:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```

## 🏗️ Architecture

### Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI Framework**: Tailwind CSS, shadcn/ui components
- **Backend**: Supabase (PostgreSQL, Edge Functions)
- **AI**: Google Gemini API (v1beta)
- **Authentication**: Supabase Auth
- **Deployment**: Lovable (Frontend), Supabase (Backend)

### Edge Functions

- `generate-study-plan-v2`: AI-powered study plan generation with dynamic model discovery
- `create-goal`: Create and save learning goals
- `get-goals`: Retrieve user's learning goals
- `update-goal-progress`: Track lesson completion progress

## 📁 Project Structure

```
AccuPlanner/
├── src/
│   ├── components/        # React components
│   │   ├── ui/           # shadcn/ui components
│   │   ├── AuthForm.tsx
│   │   └── ProtectedRoute.tsx
│   ├── contexts/          # React contexts
│   │   └── AuthContext.tsx
│   ├── hooks/            # Custom React hooks
│   ├── integrations/     # External integrations
│   │   └── supabase/    # Supabase client & types
│   ├── lib/             # Utility functions
│   │   ├── api.ts       # API client
│   │   └── utils.ts     # Helper functions
│   └── pages/           # Page components
│       ├── Dashboard.tsx
│       ├── Index.tsx
│       ├── LearningPath.tsx
│       ├── Login.tsx
│       ├── NotFound.tsx
│       └── Onboarding.tsx
├── supabase/
│   ├── functions/       # Edge Functions
│   │   ├── generate-study-plan-v2/
│   │   ├── create-goal/
│   │   ├── get-goals/
│   │   └── update-goal-progress/
│   └── migrations/      # Database migrations
└── public/              # Static assets
```

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Deploying Edge Functions

```sh
# Deploy a specific function
npx supabase functions deploy generate-study-plan-v2

# Deploy all functions
npx supabase functions deploy
```

## 🐛 Troubleshooting

### Gemini API Issues

**Error: "models/gemini-xxx is not found"**
- The function uses dynamic model discovery, so this should be rare
- Verify your API key is correct and has proper permissions

**Error: "MAX_TOKENS" or incomplete responses**
- Already resolved: `maxOutputTokens` is set to 8192
- If issues persist, check Supabase function logs

**Error: "API Keys are not supported by this API"**
- Ensure you're using a Google Gemini API key (starts with `AIzaSy`)
- Not a Lovable or other API key

### Authentication Issues

**Error: "Missing authorization header"**
- User must be signed in
- Check that the session token is being passed correctly

### Function Deployment Issues

**Warning: "Functions using fallback import map"**
- This is a non-critical warning
- Can be resolved by adding a `deno.json` file to each function directory

## 📝 Recent Updates (v2.2.0)

- ✅ Migrated from Lovable API to Google Gemini API
- ✅ Implemented dynamic model discovery
- ✅ Increased token limit to 8192 for complete responses
- ✅ Enhanced JSON parsing for markdown-wrapped responses
- ✅ Improved error handling and security
- ✅ Cleaned up codebase and removed debug logging

See [CHANGELOG.md](./CHANGELOG.md) for complete version history.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the MIT License.

## 👥 Project Partner

- Siddhesh - [GitHub](https://github.com/Siddhesh-00)

## 🙏 Acknowledgments

- [Supabase](https://supabase.com) for the backend infrastructure
- [Google Gemini](https://ai.google.dev/) for AI capabilities
- [shadcn/ui](https://ui.shadcn.com/) for beautiful UI components
- [Lovable](https://lovable.dev) for deployment platform
```