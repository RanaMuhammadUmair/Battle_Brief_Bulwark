# Battle Brief Bulwark

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/…/Battle_Brief_Bulwark/releases)
[![Build Status](https://img.shields.io/github/actions/workflow/status/RanaMuhammadUmair/Nato-llm-summerizer/ci.yml)]()

A web application for military intelligence report summarization powered by state-of-the-art LLMs, built as an academic master’s thesis project in collaboration with NATO JWC.

---

## Table of Contents

# Battle Brief Bulwark

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)

A powerful web application for military intelligence report summarization powered by cutting-edge Large Language Models (LLMs).

## Table of Contents
- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Contributing](#contributing)
- [Acknowledgments](#acknowledgments)

## Overview

Battle Brief Bulwark transforms lengthy military intelligence reports into concise, actionable summaries while preserving critical context and accuracy. It integrates ethical content filtering to ensure responsible AI-assisted summarization.

## Key Features

### Document Processing
- **Multi-format Support**: PDF, DOCX, and TXT files
- **Batch Processing**: Summarize multiple documents at once
- **Manual Text Input**: Paste content directly

### AI Capabilities
- **Model Selection**: GPT-4.1, Claude Sonnet 3.7, Mistral, Gemini 2.5 Pro, and more
- **Performance Analytics**: Compare model accuracy, speed, and resource usage
- **Ethical Filtering**: Automatic detection of sensitive or problematic content

### User Experience
- **Secure Authentication**: JWT-based role-based access control
- **Summary History**: Track and retrieve past summarization sessions
- **Data Visualization**: Interactive charts for summary quality and ethical metrics
- **Export Options**: Download summaries as PDF or copy to clipboard
- **Responsive Design**: Desktop and mobile optimized

## Architecture

- **Frontend**: React SPA with Material-UI and Tailwind CSS
- **Backend**: FastAPI server with SQLite for persistence
- **AI Services**: Integrates multiple LLM endpoints (OpenAI, Mistral, RunPod)

## Getting Started

### Prerequisites
- Node.js v16+
- Python 3.9+
- npm or yarn
- Git

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Usage

1. Sign up or log in.
2. Upload or paste a report.
3. Select an AI model and click **Summarize**.
4. Review and download your summary.

## Acknowledgments

- NATO Joint Warfare Centre for project Collaboration & inspiration
- University of Stavanger for academic support
- Open-source community for tools and libraries


