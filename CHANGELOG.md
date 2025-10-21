# Changelog

All notable changes to AccuPlanner will be documented in this file.

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
