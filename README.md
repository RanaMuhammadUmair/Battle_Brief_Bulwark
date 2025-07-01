# Battle Brief buklwark

A web-based application for summarizing military reports using various LLM (Large Language Model) technologies.

## Features

- Secure login system
- Upload and process various document formats (PDF, DOC, TXT)
- Multiple AI model selection (GPT-4, BART, Claude, Grok etc)
- Ethical content filtering
- Summary history tracking
- Modern, responsive UI

## Structure

- `/frontend` - React-based user interface
- `/backend` - FastAPI server with summarization capabilities

## Deployment

The application is deployed at https://militaryintelligencesummarizer.space/

## Development

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# If you encounter dependency conflicts, use:
npm install --legacy-peer-deps

# Start development server
npm run dev
```

### Backend Setup

```bash
cd backend

# Install required Python packages
pip install -r requirements.txt

# Start the FastAPI server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Common Issues

If you encounter dependency conflicts with React and react-pdf, make sure you're using React v18 instead of v19.

### Vite Not Found

If you encounter the error `sh: 1: vite: not found`, install Vite globally:

```bash
npm install -g vite
```

Then, reinstall the local dependencies:

```bash
cd frontend
rm -rf node_modules
npm install --legacy-peer-deps
```

Finally, start the development server:

```bash
npm run dev
```

## Troubleshooting

### Vite Not Found

If you encounter the error `sh: 1: vite: not found` or `Cannot find package 'vite'`:

1. Install Vite locally:
   ```bash
   npm install vite --save-dev
   ```

2. If the issue persists, clean and reinstall dependencies:
   ```bash
   rm -rf node_modules
   npm cache clean --force
   npm install --legacy-peer-deps
   ```

3. Verify Vite installation:
   ```bash
   npx vite --version
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

### Vite Configuration

Ensure the Vite configuration file is set up correctly in `/frontend/vite.config.js`:

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

### Tailwind CSS PostCSS Plugin Error

If you encounter the error:
```
It looks like you're trying to use `tailwindcss` directly as a PostCSS plugin...
```

Follow these steps:

1. Install the correct PostCSS plugin:
   ```bash
   npm install @tailwindcss/postcss7-compat
   ```

2. Update your `postcss.config.js`:
   ```javascript
   export default {
     plugins: {
       '@tailwindcss/postcss7-compat': {},
       autoprefixer: {},
     },
   }
   ```

3. Clean and reinstall dependencies:
   ```bash
   rm -rf node_modules
   npm cache clean --force
   npm install --legacy-peer-deps
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```
