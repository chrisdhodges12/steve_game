# AGENT.md - SteveGame Development Guide

## Build/Development Commands
- `npm run dev` - Start development server with Vite
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm start` - Start express server

## Architecture Overview
- **Frontend**: Vanilla HTML5 Canvas game with JavaScript
- **Assets**: Static images/audio in `/assets` folder
- **Game Engine**: Custom 2D canvas-based game loop
- **Mobile Support**: Touch controls via custom joystick

## Code Style Guidelines
- Use ES6 modules (`type: "module"` in package.json)
- Camel case for variables and functions
- Global game state variables at top of main.js
- Image/audio loading via utility functions
- Event listeners for keyboard/touch input
- Game loop pattern: update → render → requestAnimationFrame
- Canvas 2D context for all rendering
- HTML DOM manipulation for UI elements (buttons, menus)

## No test framework configured - implement tests if needed
