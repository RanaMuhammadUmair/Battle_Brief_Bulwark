# Battle Brief Bulwark

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)

A sophisticated web application for military intelligence report summarization powered by state-of-the-art Large Language Models (LLMs).

![Battle Brief Bulwark Dashboard](frontend\public\picture\Battel-brief-bulwark.gif)

## Academic Project

This application was developed as part of a master's thesis project at university of stavanger in collaboration with NATO Joint Warfare Centre, Stavanger, norway. This is an academic work and not intended for commercial distribution.

## Overview

Battle Brief Bulwark transforms lengthy military intelligence reports into concise, actionable summaries while maintaining critical information integrity. The platform leverages multiple LLM technologies with ethical content filtering to ensure accurate, reliable intelligence distillation.

## Key Features

### Document Processing
- **Multi-format Support**: Process PDF, DOCX, and TXT documents
- **Batch Processing**: Summarize multiple documents simultaneously
- **Manual Text Input**: Directly paste content for processing

### AI Capabilities
- **Model Selection**: Choose from multiple LLMs including GPT-4.1, Claude Sonnet 3.7, Mistral, Gemini 2.5 Pro, and more
- **Performance Analytics**: Compare model effectiveness across multiple metrics
- **Ethical Content Filtering**: Automatic detection and reduction of potentially problematic content

### User Experience
- **Secure Authentication**: Role-based access control system
- **Summary History**: Track and retrieve all previous summarization activities
- **Data Visualization**: Interactive charts showing quality metrics and ethical considerations
- **Export Options**: Download summaries as PDF or copy to clipboard
- **Responsive Design**: Optimized for both desktop and mobile devices

## Architecture

The application follows a modern client-server architecture:

- **Frontend**: React-based SPA with Material UI components
- **Backend**: FastAPI server with ML processing capabilities
- **Authentication**: JWT-based secure authentication system

## Deployment

The application is deployed at [https://militaryintelligencesummarizer.space/](https://militaryintelligencesummarizer.space/)

## Development Setup

### Prerequisites
- Node.js (v16+)
- Python 3.9+
- npm or yarn
- Git

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# For dependency conflicts
npm install --legacy-peer-deps

# Start development server
npm run dev
```

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install required Python packages
pip install -r requirements.txt

# Start the FastAPI server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Troubleshooting

### Vite Configuration Issues

If you encounter Vite-related errors:

1. Install Vite locally:
   ```bash
   npm install vite --save-dev
   ```

2. Clean and reinstall dependencies if needed:
   ```bash
   rm -rf node_modules
   npm cache clean --force
   npm install --legacy-peer-deps
   ```

3. Verify configuration in `/frontend/vite.config.js`:
   ```javascript
   import { defineConfig } from 'vite'
   import react from '@vitejs/plugin-react'

   export default defineConfig({
     plugins: [react()],
     server: {
       port: 5173,
       open: true,
     },
   })
   ```

### Tailwind CSS Configuration

For Tailwind CSS PostCSS plugin errors:

1. Install the correct plugin:
   ```bash
   npm install @tailwindcss/postcss7-compat
   ```

2. Update `postcss.config.js`:
   ```javascript
   export default {
     plugins: {
       '@tailwindcss/postcss7-compat': {},
       autoprefixer: {},
     },
   }
   ```

## Contributing

We welcome contributions to Battle Brief Bulwark. Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- NATO for inspiration and use case scenarios
- The open-source community for tools and libraries
- All contributors who have helped shape this project


