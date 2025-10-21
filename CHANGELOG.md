# Changelog

All notable changes to AccuPlanner will be documented in this file.

## [Version 2.2.0] - 2025-10-22

### 🚀 Major Changes

#### Migration to Google Gemini API
- **Complete API Migration**: Migrated from Lovable API to Google Gemini Generative Language API (v1beta)
- **Dynamic Model Discovery**: Implemented intelligent model discovery system that queries available Gemini models at runtime
- **Enhanced Reliability**: Added fallback model selection with preference for `gemini-1.5-flash` and `gemini-pro` models
- **Increased Token Limit**: Raised `maxOutputTokens` from 2048 to 8192 tokens to prevent response truncation

#### New Edge Function
- **Created generate-study-plan-v2**: Built new edge function from scratch with improved architecture
- **Authentication Re-enabled**: Properly secured endpoint with JWT token verification
- **Better Error Handling**: Enhanced error messages and validation throughout the function
- **Removed Legacy Function**: Deleted corrupted `generate-study-plan` function in favor of v2

### 🔧 Technical Improvements

#### JSON Parsing Enhancement
- **Markdown Code Block Support**: Added robust extraction of JSON from markdown-wrapped responses (` ```json ... ``` `)
- **Improved Pattern Matching**: Enhanced regex patterns to handle various JSON response formats
- **Error Recovery**: Better error messages when JSON parsing fails with content previews

#### API Integration
- **Model Discovery Endpoint**: Integrated `/v1beta/models` endpoint for real-time model availability checking
- **Generation Config**: Optimized generation parameters (temperature: 0.7, topK: 40, topP: 0.95)
- **CORS Headers**: Properly configured CORS for cross-origin requests

#### Code Quality
- **Removed Debug Logging**: Cleaned up all console.log statements for production readiness
- **Simplified Error Handling**: Streamlined error handling logic without unnecessary complexity
- **Type Safety**: Maintained strong TypeScript typing throughout (Resource, Step, Plan types)
- **Reduced Bundle Size**: Optimized code from 24.75kB to 23.82kB

### 🐛 Bug Fixes

#### Resolved Issues
- **Fixed "models/gemini-1.5-flash-latest is not found"**: Implemented dynamic model discovery instead of hardcoded names
- **Fixed MAX_TOKENS Error**: Increased token limit to prevent incomplete JSON responses
- **Fixed JSON Parsing Errors**: Properly handles Gemini's markdown code block format
- **Fixed Authentication Issues**: Corrected auth header validation and token passing

#### Response Handling
- **Fixed "Expected ',' or ']' after array element"**: Resolved by increasing output token limit
- **Fixed "Unexpected token '\`'"**: Added proper markdown code block extraction
- **Fixed Empty Response Errors**: Added validation for response structure before parsing

### 🔐 Security Improvements
- **Environment Variables**: Properly configured `GEMINI_API_KEY` as Supabase secret
- **Token Verification**: Re-enabled JWT authentication after testing phase
- **Secure API Calls**: All Gemini API calls use secure HTTPS with API key authentication

### 📚 Documentation
- **Updated API Endpoints**: Frontend now calls `/functions/v1/generate-study-plan-v2`
- **Better Error Messages**: User-friendly error messages for various failure scenarios
- **Deployment Instructions**: Clear separation between testing (--no-verify-jwt) and production deployments

### 🗑️ Cleanup
- **Removed Corrupted Files**: Deleted old `generate-study-plan/index.ts` with syntax errors
- **Removed Debug Code**: Cleaned up temporary logging and debug statements
- **Simplified Codebase**: Removed redundant error handling and validation code

## [Version 2.1.0] - 2025-10-21

### Fixes & Improvements
- Validates YouTube references via oEmbed; dead/private/removed videos are filtered out server-side before returning the plan.
- Edge function now returns validated JSON (non-streaming) to ensure link checks; frontend updated to support both streaming and non‑streaming responses.
- No other features changed; only reference reliability was addressed.

## [Version 2.0.0] - 2025-01-21
 
### 🎯 Major Features

#### AI-Powered Learning Path Generation
- **Intelligent Title Generation**: AI now generates concise, professional titles (max 6 words) for learning paths instead of using raw user input
- **Dynamic Category Assignment**: Automatically categorizes learning goals (e.g., Programming, Language, Data Science, Business, Design) based on content analysis
- **Smart Difficulty Assessment**: AI evaluates and assigns appropriate difficulty levels (Beginner, Intermediate, Advanced) for each learning goal

#### Enhanced Resource Management
- **Curated YouTube References**: Prioritizes verified YouTube videos from reputable educational channels (freeCodeCamp, Traversy Media, Fireship, 3Blue1Brown, etc.)
- **Resource Categorization**: Separates resources into "Free Resources" and "Paid Resources" sections for better clarity
- **Quality Assurance**: YouTube links are verified to ensure videos are from popular channels with high view counts, minimizing broken/deleted content

#### Improved User Experience
- **Task Detail Modal**: Click any task to view comprehensive information including:
  - Full task description
  - Estimated duration
  - Curated resource links (free and paid)
  - Direct links to external resources
- **Persistent Task Numbering**: Fixed bug where task numbers would shift after marking tasks complete - task numbers now remain consistent regardless of completion status
- **Visual Resource Indicators**: 
  - Free resources displayed with standard styling
  - Paid resources highlighted with distinct amber/gold styling and "Paid" badge
  - External link icons for all resources

### 🐛 Bug Fixes
- Fixed issue where user input prompt was displayed as the goal title instead of AI-generated title
- Resolved bug where all goals showed "General" category and "Beginner" difficulty
- Corrected task numbering inconsistency when marking tasks as complete
- Fixed missing task detail dialog that prevented viewing resources

### 🎨 UI/UX Improvements
- Enhanced resource card styling with hover effects
- Added visual distinction between free and paid resources
- Improved modal layout with better spacing and readability
- Added source attribution for all learning resources
- Implemented better icon usage (BookOpen, ExternalLink, DollarSign) for visual clarity

### 🔧 Technical Improvements
- Updated AI prompt engineering for better output quality
- Enhanced StudyPlan interface to include category and difficulty fields
- Improved data flow from AI generation to database storage
- Better error handling and validation throughout the application
- Optimized edge function response handling

### 📊 Data Structure Updates
- Added `category` field to StudyPlan interface
- Added `difficulty` field to StudyPlan interface
- Enhanced resource schema with `isPaid` boolean flag
- Improved type safety across the application

---

## [Version 1.0.0] - Initial Release

### Features
- User authentication (signup/login)
- Create learning goals with AI assistance
- Track progress on individual lessons
- View dashboard with learning statistics
- Basic study plan generation
- Resource links for each lesson

---

**Note**: This changelog follows semantic versioning. Version 2.0.0 represents a major update with significant feature additions and architectural improvements.
