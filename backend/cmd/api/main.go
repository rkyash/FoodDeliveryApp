package main

import (
	"log"
	"net/http"

	"restaurantapp/config"
	_ "restaurantapp/docs"
	"restaurantapp/internal/handlers"
	"restaurantapp/internal/middleware"
	"restaurantapp/internal/models"
	"restaurantapp/internal/repository"

	"github.com/gin-gonic/gin"
	ginSwagger "github.com/swaggo/gin-swagger"
	swaggerFiles "github.com/swaggo/files"
)

// @title Restaurant App API
// @version 1.0
// @description A comprehensive food delivery application API
// @termsOfService http://swagger.io/terms/

// @contact.name API Support
// @contact.url http://www.swagger.io/support
// @contact.email support@swagger.io

// @license.name Apache 2.0
// @license.url http://www.apache.org/licenses/LICENSE-2.0.html

// @host localhost:8080
// @BasePath /api

// @securityDefinitions.apikey Bearer
// @in header
// @name Authorization
// @description Type "Bearer" followed by a space and JWT token.

func main() {
	// Load configuration
	cfg := config.Load()

	// Initialize database
	db := repository.NewDatabase(&cfg.Database)

	// Auto migrate database schema
	if err := db.AutoMigrate(); err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}

	// Set Gin mode based on environment
	if cfg.Server.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Initialize Gin router
	router := gin.Default()
	
	// Disable automatic redirect for trailing slash
	router.RedirectTrailingSlash = false
	router.RedirectFixedPath = false

	// Add middleware
	router.Use(middleware.CORSMiddleware())

	// Swagger route
	router.GET("/docs/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	// Health check route
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status": "healthy",
			"message": "Restaurant App API is running",
		})
	})

	// API routes
	api := router.Group("/api")
	
	// Initialize handlers
	authHandler := handlers.NewAuthHandler(db, cfg)
	restaurantHandler := handlers.NewRestaurantHandler(db, cfg)
	menuHandler := handlers.NewMenuHandler(db, cfg)
	orderHandler := handlers.NewOrderHandler(db, cfg)
	reviewHandler := handlers.NewReviewHandler(db, cfg)
	adminHandler := handlers.NewAdminHandler(db, cfg)
	uploadHandler := handlers.NewUploadHandler(db, cfg)

	// Auth routes
	auth := api.Group("/auth")
	{
		auth.POST("/register", authHandler.Register)
		auth.POST("/login", authHandler.Login)
		auth.POST("/refresh", authHandler.RefreshToken)
		auth.POST("/logout", middleware.AuthMiddleware(cfg.JWT.SecretKey), authHandler.Logout)
		auth.POST("/forgot-password", authHandler.ForgotPassword)
		auth.POST("/reset-password", authHandler.ResetPassword)
		auth.POST("/change-password", middleware.AuthMiddleware(cfg.JWT.SecretKey), authHandler.ChangePassword)
		auth.GET("/profile", middleware.AuthMiddleware(cfg.JWT.SecretKey), authHandler.GetProfile)
		auth.PUT("/profile", middleware.AuthMiddleware(cfg.JWT.SecretKey), authHandler.UpdateProfile)
	}

	// Protected routes
	protected := api.Group("/")
	protected.Use(middleware.AuthMiddleware(cfg.JWT.SecretKey))
	{
		// User routes
		users := protected.Group("/users")
		{
			users.GET("/me", authHandler.GetProfile)
		}

		// Restaurant routes - register directly to avoid trailing slash issues
		protected.POST("/restaurants", middleware.RequireRole(string(models.RestaurantOwnerRole)), restaurantHandler.CreateRestaurant)
		protected.GET("/restaurants/me", middleware.RequireRole(string(models.RestaurantOwnerRole)), restaurantHandler.GetMyRestaurant)
		protected.PUT("/restaurants/:id", middleware.RequireRole(string(models.RestaurantOwnerRole)), restaurantHandler.UpdateRestaurant)

		// Menu routes
		menu := protected.Group("/menu")
		menu.Use(middleware.RequireRole(string(models.RestaurantOwnerRole)))
		{
			menu.POST("/categories", menuHandler.CreateCategory)
			menu.POST("/items", menuHandler.CreateMenuItem)
			menu.PUT("/items/:id", menuHandler.UpdateMenuItem)
			menu.PATCH("/items/:id/toggle", menuHandler.ToggleItemAvailability)
			menu.DELETE("/items/:id", menuHandler.DeleteMenuItem)
		}

		// Order routes
		orders := protected.Group("/orders")
		{
			orders.POST("/", orderHandler.CreateOrder)
			orders.GET("/", orderHandler.GetUserOrders)
			orders.GET("/:id", orderHandler.GetOrder)
		}

		// Restaurant order management routes
		restaurantOrders := protected.Group("/restaurant")
		restaurantOrders.Use(middleware.RequireRole(string(models.RestaurantOwnerRole)))
		{
			restaurantOrders.GET("/orders", orderHandler.GetRestaurantOrders)
			restaurantOrders.PATCH("/orders/:id/status", orderHandler.UpdateOrderStatus)
		}

		// Review routes (protected)
		reviews := protected.Group("/reviews")
		{
			reviews.GET("/:id", reviewHandler.GetReview)
			reviews.PUT("/:id", reviewHandler.UpdateReview)
			reviews.DELETE("/:id", reviewHandler.DeleteReview)
		}

		// Admin routes (admin only)
		admin := protected.Group("/admin")
		admin.Use(middleware.RequireRole(string(models.AdminRole)))
		{
			admin.GET("/stats", adminHandler.GetDashboardStats)
			admin.GET("/users", adminHandler.GetAllUsers)
			admin.PATCH("/users/:userId/status", adminHandler.UpdateUserStatus)
			admin.PATCH("/users/:userId/role", adminHandler.UpdateUserRole)
			admin.GET("/orders", adminHandler.GetAllOrders)
			admin.GET("/restaurants", adminHandler.GetAllRestaurants)
		}

		// Upload routes (protected)
		upload := protected.Group("/upload")
		{
			upload.POST("/image", uploadHandler.UploadImage)
			upload.DELETE("/images/:subdir/:filename", uploadHandler.DeleteUploadedFile)
		}
	}

	// Public restaurant routes
	public := api.Group("/public")
	{
		public.GET("/restaurants", restaurantHandler.GetRestaurants)
		public.GET("/restaurants/search", restaurantHandler.SearchRestaurants)
		public.GET("/restaurants/:id", restaurantHandler.GetRestaurant)
		public.GET("/restaurants/:id/menu", menuHandler.GetRestaurantMenu)
		public.GET("/restaurants/:id/reviews", reviewHandler.GetRestaurantReviews)
	}

	// Public menu item route
	api.GET("/menu-items/:id", menuHandler.GetMenuItem)

	// Public review routes for creating reviews (requires auth)
	api.POST("/restaurants/:restaurantId/reviews", middleware.AuthMiddleware(cfg.JWT.SecretKey), reviewHandler.CreateReview)

	// File serving routes (public)
	api.GET("/uploads/:category/:subdir/:filename", uploadHandler.ServeUploadedFile)

	// Start server
	addr := cfg.Server.Host + ":" + cfg.Server.Port
	log.Printf("Starting server on %s", addr)
	if err := router.Run(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}