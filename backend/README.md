# FoodDelivery Backend

Golang REST API backend for the FoodDelivery application.

## Tech Stack

- **Go 1.23+** with Gin framework
- **PostgreSQL** database with GORM ORM
- **JWT** for authentication
- **bcrypt** for password hashing
- **UUID** for unique identifiers

## Features

- 🔐 JWT-based authentication system
- 👥 Multi-role user management (Customer, Restaurant Owner, Admin)
- 🏪 Restaurant management
- 🍕 Menu management with customizations
- 📝 Order management with tracking
- ⭐ Reviews and ratings system
- 💫 Favorites functionality
- 🔒 Role-based access control
- 📊 RESTful API with JSON responses

## Project Structure

```
├── cmd/api/              # Application entrypoint
├── config/               # Configuration management
├── internal/
│   ├── handlers/         # HTTP handlers
│   ├── middleware/       # HTTP middleware
│   ├── models/          # Database models
│   ├── repository/      # Database layer
│   ├── services/        # Business logic
│   └── utils/           # Utility functions
└── migrations/          # Database migrations
```

## Getting Started

### Prerequisites

- Go 1.23 or higher
- PostgreSQL 14+
- Git

### Installation

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   go mod download
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. **Set up PostgreSQL database**
   ```bash
   createdb restaurantapp
   ```

5. **Run the application**
   ```bash
   go run cmd/api/main.go
   ```

The API will be available at `http://localhost:8080`

## Environment Variables

Create a `.env` file with the following variables:

```bash
# Server Configuration
SERVER_HOST=localhost
SERVER_PORT=8080
APP_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=restaurantapp
DB_SSLMODE=disable

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile (protected)
- `PUT /api/auth/profile` - Update user profile (protected)

### Health Check
- `GET /health` - Health check endpoint

### Protected Routes
All protected routes require `Authorization: Bearer <token>` header.

#### Users
- `GET /api/users/me` - Get current user profile

#### Restaurants (Coming Soon)
- `GET /api/restaurants` - List restaurants
- `GET /api/public/restaurants` - Public restaurant listing

#### Orders (Coming Soon)
- `GET /api/orders` - List user orders

## Database Models

### User Roles
- `customer` - Regular customers
- `restaurant_owner` - Restaurant owners
- `admin` - System administrators

### Core Models
- **User** - User accounts with role-based access
- **Restaurant** - Restaurant information and settings
- **MenuItem** - Menu items with customizations
- **Order** - Customer orders with tracking
- **Review** - Restaurant reviews and ratings
- **Address** - User delivery addresses

## Development

### Running in Development
```bash
go run cmd/api/main.go
```

### Building for Production
```bash
go build -o bin/api cmd/api/main.go
./bin/api
```

### Database Migration
The application automatically migrates the database schema on startup using GORM's AutoMigrate feature.

## API Response Format

All API responses follow this structure:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... },
  "error": null
}
```

## Authentication

The API uses JWT tokens for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Contributing

1. Follow Go coding standards
2. Use GORM for database operations
3. Include proper error handling
4. Write meaningful commit messages
5. Test your changes before submitting