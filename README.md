# FoodDelivery App

A modern food delivery web application built with React TypeScript frontend and Golang/Gin backend.

## Project Structure

```
RestaurantApp/
├── frontend/          # React TypeScript frontend
├── backend/           # Golang/Gin backend API
├── docs/             # Documentation
└── README.md         # This file
```

## Features

### Core Functionality
- Restaurant browsing with search and filtering
- Individual restaurant pages with menu items
- Shopping cart with item customization
- User authentication and profile management
- Order placement and tracking
- Order history

### User Roles
- **Customers**: Browse restaurants, place orders, track deliveries
- **Restaurant Owners**: Manage menu, view orders, update status
- **Admin**: System management and oversight

### Technical Stack
- **Frontend**: React with TypeScript, Vite, Tailwind CSS
- **Backend**: Golang with Gin framework
- **Database**: PostgreSQL
- **Authentication**: JWT tokens

## Getting Started

### Prerequisites
- Node.js (v18+)
- Go (v1.21+)
- PostgreSQL (v14+)

### Setup Instructions

1. **Database Setup**
   ```bash
   # Create PostgreSQL database and user
   sudo -u postgres psql
   CREATE USER restaurantapp WITH PASSWORD 'password';
   CREATE DATABASE restaurantapp OWNER restaurantapp;
   GRANT ALL PRIVILEGES ON DATABASE restaurantapp TO restaurantapp;
   \q
   ```

2. **Backend Setup**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your database credentials
   go mod tidy
   go build -o bin/api cmd/api/main.go
   ./bin/api
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   echo "VITE_API_BASE_URL=http://localhost:8080/api" > .env
   npm install
   npm run dev
   ```

## Development

```bash
# Start backend (from backend directory)
go run cmd/api/main.go

# Start frontend (from frontend directory)
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8080
- API Documentation: http://localhost:8080/docs

## API Documentation

API documentation will be available at `/api/docs` when the backend is running.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request