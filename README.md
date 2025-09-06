# Krav Maga Shadow Fighting Trainer PWA

A Progressive Web App (PWA) built with TypeScript and Vite for Krav Maga shadow fighting training. The app provides random technique announcements via audio to enhance training unpredictability.

## Features

- **TypeScript**: Full type safety and modern JavaScript features
- **PWA**: Installable on mobile and desktop devices
- **Responsive Design**: Mobile-first design with Bootstrap
- **Audio Management**: Web Audio API integration for technique announcements
- **Offline Support**: Service worker for offline functionality
- **Configuration Management**: Local storage for user preferences

## Tech Stack

- **TypeScript**: For type safety and modern JavaScript
- **Vite**: Fast build tool and development server
- **Bootstrap 5**: Responsive UI framework
- **Web Audio API**: Audio playback and management
- **Service Workers**: PWA functionality and offline support

## Getting Started

### Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd krav-maga-shadow-fighting-trainer
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:3000`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run type-check` - Run TypeScript type checking

## Project Structure

```
src/
├── app.ts                 # Main application class
├── main.ts               # Application entry point
├── types/
│   └── index.ts          # TypeScript type definitions
├── managers/             # Business logic managers
│   ├── TechniqueManager.ts
│   ├── AudioManager.ts
│   ├── SessionManager.ts
│   ├── ConfigManager.ts
│   └── UIManager.ts
├── utils/                # Utility functions
└── styles/
    └── main.css          # Application styles
```

## Development

### TypeScript Configuration

The project uses strict TypeScript configuration with:
- ES2020 target
- Strict type checking
- Module resolution for bundler
- Path mapping for clean imports

### Code Quality

- **ESLint**: TypeScript-aware linting
- **Prettier**: Code formatting
- **Type Checking**: Strict TypeScript compilation

### PWA Features

- Service Worker for offline functionality
- Web App Manifest for installation
- Responsive design for mobile devices
- Audio caching for offline playback

## Building for Production

1. Build the project:
```bash
npm run build
```

2. Preview the production build:
```bash
npm run preview
```

3. Deploy the `dist` folder to your hosting provider

## Browser Support

- Chrome 60+
- Firefox 58+
- Safari 11.1+
- Edge 79+

## License

This project is licensed under the ISC License.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## Support

For support and questions, please refer to the project documentation or create an issue in the repository.

