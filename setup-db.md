# Database Setup Instructions

## Prerequisites
1. Install PostgreSQL on your system
2. Create a database user and database

## Setup Steps

### 1. Install PostgreSQL (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

### 2. Create Database and User
```bash
sudo -u postgres psql

CREATE USER restaurantapp WITH PASSWORD 'password';
CREATE DATABASE restaurantapp OWNER restaurantapp;
GRANT ALL PRIVILEGES ON DATABASE restaurantapp TO restaurantapp;
\q
```

### 3. Test Connection
```bash
psql -h localhost -U restaurantapp -d restaurantapp
```

### 4. Environment Variables
Make sure your backend/.env file has the correct database configuration:
```
DB_HOST=localhost
DB_PORT=5432
DB_USER=restaurantapp
DB_PASSWORD=password
DB_NAME=restaurantapp
DB_SSLMODE=disable
```

### 5. Run the Application
The backend will automatically create all necessary tables on first run using GORM AutoMigrate.

## Sample Data
After starting the application, you can use the API endpoints to create sample restaurants and menu items, or create a seeder script.