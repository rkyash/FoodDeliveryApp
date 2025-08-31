# FoodDelivery Frontend

React TypeScript frontend for the FoodDelivery application.

## Tech Stack

- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **React Router DOM** for routing
- **Axios** for API calls
- **Lucide React** for icons
- **Headless UI** for accessible components

## Features

- 🎨 Modern, responsive design with Tailwind CSS
- 🌙 Dark/Light theme support
- 🔐 JWT authentication with protected routes
- 🛒 Shopping cart functionality
- 📱 Mobile-first responsive design
- ⚡ Fast development with Vite
- 🔥 Hot module replacement
- 📦 Optimized production builds

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env .env.local
   # Edit .env.local with your API endpoint
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to http://localhost:5173

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/        # Reusable UI components
│   ├── layout/       # Layout components (Navbar, Footer)
│   └── ui/           # Generic UI components
├── context/          # React Context providers
├── hooks/            # Custom React hooks
├── pages/            # Page components
├── services/         # API services
├── types/            # TypeScript type definitions
└── utils/            # Utility functions
```

## Environment Variables

Create a `.env.local` file with:

```bash
VITE_API_BASE_URL=http://localhost:8080/api
VITE_APP_NAME=FoodDelivery
VITE_MAP_API_KEY=your_google_maps_api_key_here
```

## Contributing

1. Follow the existing code structure
2. Use TypeScript for all new components
3. Follow the established naming conventions
4. Write responsive, mobile-first designs
5. Test your changes across different screen sizes
