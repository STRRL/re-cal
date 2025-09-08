# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ReCal is a Next.js application for creating calendar reminders. Users can capture thoughts and schedule them to be revisited at a future time by generating downloadable `.ics` calendar files.

## Commands

### Development
```bash
npm run dev      # Start development server with Turbopack (http://localhost:3000)
npm run build    # Production build with Turbopack
npm start        # Start production server
npm run lint     # Run ESLint
```

### Installation
```bash
npm install      # Install dependencies
```

## Architecture

### Tech Stack
- **Next.js 15.5.2** with App Router (`/app` directory)
- **React 19.1.0** with TypeScript
- **Tailwind CSS v4** with CSS variables theming
- **shadcn/ui** component library with Radix UI primitives
- **react-hook-form** + **zod** for form validation
- **date-fns** for date calculations

### Key Architectural Patterns

1. **Component Library**: Using shadcn/ui components in `/components/ui/` with "new-york" style theme. Components follow compound pattern (e.g., Card.Header, Card.Content).

2. **Form Handling**: Forms use react-hook-form with Zod validation schemas. Main form schema:
   ```typescript
   const formSchema = z.object({
     title: z.string().min(1, "Title is required"),
     content: z.string().optional(),
     timeDelay: z.string(),
   })
   ```

3. **Custom Components**: 
   - `WheelPicker` component provides iOS-style scrollable selector
   - All UI components are client-side only (`"use client"` directive)

4. **State Management**: 
   - Form state via react-hook-form
   - Local storage for persisting recent selections
   - No server-side state management

5. **File Generation**: ICS calendar files are generated client-side using Blob API and downloaded via browser.

### Project Structure
- `/app` - Next.js App Router pages and layouts
- `/components/ui` - shadcn/ui components (button, card, form, input, wheel-picker, etc.)
- `/lib/utils.ts` - Tailwind class utilities (cn function)
- Path alias: `@/*` maps to project root

### Styling
- Tailwind CSS with utility-first approach
- CSS variables for theming (defined in globals.css)
- Mobile-first responsive design
- Geist fonts (sans and mono) via next/font

## Important Notes

- **Client-side only**: This is a frontend-only application with no API routes or server-side functionality
- **No tests**: Currently no testing infrastructure is set up
- **TypeScript**: Strict mode enabled, use proper types
- **Imports**: Use `@/` path alias for clean imports
- **Component patterns**: Follow existing shadcn/ui patterns when adding new components