package handlers

import (
	"math"
	"net/http"
	"strconv"

	"restaurantapp/config"
	"restaurantapp/internal/middleware"
	"restaurantapp/internal/models"
	"restaurantapp/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type RestaurantHandler struct {
	db  *repository.Database
	cfg *config.Config
}

type CreateRestaurantRequest struct {
	Name            string  `json:"name" binding:"required"`
	Description     string  `json:"description"`
	CuisineType     string  `json:"cuisineType" binding:"required"`
	Address         string  `json:"address" binding:"required"`
	Phone           string  `json:"phone" binding:"required"`
	Email           string  `json:"email" binding:"required,email"`
	PriceRange      int     `json:"priceRange" binding:"required,min=1,max=3"`
	DeliveryFee     float64 `json:"deliveryFee"`
	MinDeliveryTime int     `json:"minDeliveryTime"`
	MaxDeliveryTime int     `json:"maxDeliveryTime"`
	Image           string  `json:"image"`
}

type UpdateRestaurantRequest struct {
	Name            *string  `json:"name,omitempty"`
	Description     *string  `json:"description,omitempty"`
	CuisineType     *string  `json:"cuisineType,omitempty"`
	Address         *string  `json:"address,omitempty"`
	Phone           *string  `json:"phone,omitempty"`
	Email           *string  `json:"email,omitempty"`
	PriceRange      *int     `json:"priceRange,omitempty"`
	DeliveryFee     *float64 `json:"deliveryFee,omitempty"`
	MinDeliveryTime *int     `json:"minDeliveryTime,omitempty"`
	MaxDeliveryTime *int     `json:"maxDeliveryTime,omitempty"`
	Image           *string  `json:"image,omitempty"`
	IsOpen          *bool    `json:"isOpen,omitempty"`
}

type RestaurantResponse struct {
	ID              uuid.UUID `json:"id"`
	OwnerID         uuid.UUID `json:"ownerId"`
	Name            string    `json:"name"`
	Description     string    `json:"description"`
	CuisineType     string    `json:"cuisineType"`
	Address         string    `json:"address"`
	Phone           string    `json:"phone"`
	Email           string    `json:"email"`
	Rating          float64   `json:"rating"`
	ReviewCount     int       `json:"reviewCount"`
	PriceRange      int       `json:"priceRange"`
	DeliveryFee     float64   `json:"deliveryFee"`
	MinDeliveryTime int       `json:"minDeliveryTime"`
	MaxDeliveryTime int       `json:"maxDeliveryTime"`
	IsOpen          bool      `json:"isOpen"`
	IsActive        bool      `json:"isActive"`
	Image           string    `json:"image"`
	CreatedAt       string    `json:"createdAt"`
	UpdatedAt       string    `json:"updatedAt"`
}

func NewRestaurantHandler(db *repository.Database, cfg *config.Config) *RestaurantHandler {
	return &RestaurantHandler{
		db:  db,
		cfg: cfg,
	}
}

// CreateRestaurant godoc
// @Summary Create a new restaurant
// @Description Create a new restaurant (restaurant owners only)
// @Tags restaurants
// @Accept json
// @Produce json
// @Security Bearer
// @Param restaurant body CreateRestaurantRequest true "Restaurant data"
// @Success 201 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 409 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /restaurants [post]
func (h *RestaurantHandler) CreateRestaurant(c *gin.Context) {
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "User not authenticated",
		})
		return
	}

	var req CreateRestaurantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid request data",
			"error":   err.Error(),
		})
		return
	}

	// Check if user already has a restaurant
	var existingRestaurant models.Restaurant
	result := h.db.DB.Where("owner_id = ?", userID).First(&existingRestaurant)
	if result.Error != gorm.ErrRecordNotFound {
		c.JSON(http.StatusConflict, gin.H{
			"success": false,
			"message": "User already owns a restaurant",
		})
		return
	}

	// Create restaurant
	restaurant := models.Restaurant{
		OwnerID:         userID,
		Name:            req.Name,
		Description:     req.Description,
		CuisineType:     req.CuisineType,
		Address:         req.Address,
		Phone:           req.Phone,
		Email:           req.Email,
		PriceRange:      req.PriceRange,
		DeliveryFee:     req.DeliveryFee,
		MinDeliveryTime: req.MinDeliveryTime,
		MaxDeliveryTime: req.MaxDeliveryTime,
		Image:           req.Image,
		IsOpen:          true,
		IsActive:        true,
	}

	if err := h.db.DB.Create(&restaurant).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to create restaurant",
			"error":   err.Error(),
		})
		return
	}

	response := h.toRestaurantResponse(&restaurant)
	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Restaurant created successfully",
		"data":    response,
	})
}

// GetRestaurants godoc
// @Summary Get all restaurants
// @Description Get all active restaurants with pagination and filtering
// @Tags restaurants
// @Accept json
// @Produce json
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(10)
// @Param cuisine query string false "Filter by cuisine type"
// @Param search query string false "Search in restaurant names"
// @Success 200 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /public/restaurants [get]
func (h *RestaurantHandler) GetRestaurants(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	cuisine := c.Query("cuisine")
	search := c.Query("search")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	offset := (page - 1) * limit

	query := h.db.DB.Where("is_active = ?", true)

	if cuisine != "" {
		query = query.Where("LOWER(cuisine_type) = LOWER(?)", cuisine)
	}

	if search != "" {
		query = query.Where("LOWER(name) ILIKE LOWER(?)", "%"+search+"%")
	}

	var restaurants []models.Restaurant
	var total int64

	// Get total count
	query.Model(&models.Restaurant{}).Count(&total)

	// Get paginated results
	if err := query.Offset(offset).Limit(limit).Order("rating DESC, review_count DESC").Find(&restaurants).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to fetch restaurants",
			"error":   err.Error(),
		})
		return
	}

	var responses []RestaurantResponse
	for _, restaurant := range restaurants {
		responses = append(responses, h.toRestaurantResponse(&restaurant))
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Restaurants retrieved successfully",
		"data": gin.H{
			"restaurants": responses,
			"pagination": gin.H{
				"page":  page,
				"limit": limit,
				"total": total,
				"pages": (total + int64(limit) - 1) / int64(limit),
			},
		},
	})
}

// GetRestaurant godoc
// @Summary Get restaurant by ID
// @Description Get a single restaurant with its details
// @Tags restaurants
// @Accept json
// @Produce json
// @Param id path string true "Restaurant ID"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Router /public/restaurants/{id} [get]
func (h *RestaurantHandler) GetRestaurant(c *gin.Context) {
	idStr := c.Param("id")
	restaurantID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid restaurant ID",
		})
		return
	}

	var restaurant models.Restaurant
	if err := h.db.DB.Where("id = ? AND is_active = ?", restaurantID, true).Preload("Categories").Preload("MenuItems").First(&restaurant).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "Restaurant not found",
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "Failed to fetch restaurant",
				"error":   err.Error(),
			})
		}
		return
	}

	response := h.toRestaurantResponse(&restaurant)
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Restaurant retrieved successfully",
		"data":    response,
	})
}

// UpdateRestaurant godoc
// @Summary Update restaurant
// @Description Update restaurant details (owner only)
// @Tags restaurants
// @Accept json
// @Produce json
// @Security Bearer
// @Param id path string true "Restaurant ID"
// @Param restaurant body UpdateRestaurantRequest true "Restaurant update data"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 403 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /restaurants/{id} [put]
func (h *RestaurantHandler) UpdateRestaurant(c *gin.Context) {
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "User not authenticated",
		})
		return
	}

	idStr := c.Param("id")
	restaurantID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid restaurant ID",
		})
		return
	}

	var req UpdateRestaurantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid request data",
			"error":   err.Error(),
		})
		return
	}

	var restaurant models.Restaurant
	if err := h.db.DB.Where("id = ?", restaurantID).First(&restaurant).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "Restaurant not found",
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "Failed to fetch restaurant",
				"error":   err.Error(),
			})
		}
		return
	}

	// Check ownership
	if restaurant.OwnerID != userID {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"message": "You can only update your own restaurant",
		})
		return
	}

	// Update fields
	if req.Name != nil {
		restaurant.Name = *req.Name
	}
	if req.Description != nil {
		restaurant.Description = *req.Description
	}
	if req.CuisineType != nil {
		restaurant.CuisineType = *req.CuisineType
	}
	if req.Address != nil {
		restaurant.Address = *req.Address
	}
	if req.Phone != nil {
		restaurant.Phone = *req.Phone
	}
	if req.Email != nil {
		restaurant.Email = *req.Email
	}
	if req.PriceRange != nil {
		restaurant.PriceRange = *req.PriceRange
	}
	if req.DeliveryFee != nil {
		restaurant.DeliveryFee = *req.DeliveryFee
	}
	if req.MinDeliveryTime != nil {
		restaurant.MinDeliveryTime = *req.MinDeliveryTime
	}
	if req.MaxDeliveryTime != nil {
		restaurant.MaxDeliveryTime = *req.MaxDeliveryTime
	}
	if req.Image != nil {
		restaurant.Image = *req.Image
	}
	if req.IsOpen != nil {
		restaurant.IsOpen = *req.IsOpen
	}

	if err := h.db.DB.Save(&restaurant).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to update restaurant",
			"error":   err.Error(),
		})
		return
	}

	response := h.toRestaurantResponse(&restaurant)
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Restaurant updated successfully",
		"data":    response,
	})
}

// GetMyRestaurant godoc
// @Summary Get current user's restaurant
// @Description Get restaurant owned by current user
// @Tags restaurants
// @Accept json
// @Produce json
// @Security Bearer
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Router /restaurants/me [get]
func (h *RestaurantHandler) GetMyRestaurant(c *gin.Context) {
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "User not authenticated",
		})
		return
	}

	var restaurant models.Restaurant
	if err := h.db.DB.Where("owner_id = ?", userID).Preload("Categories").Preload("MenuItems").First(&restaurant).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "Restaurant not found",
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "Failed to fetch restaurant",
				"error":   err.Error(),
			})
		}
		return
	}

	response := h.toRestaurantResponse(&restaurant)
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Restaurant retrieved successfully",
		"data":    response,
	})
}

// SearchRestaurants godoc
// @Summary Search restaurants with advanced filters
// @Description Search restaurants with various filters like cuisine, price range, rating, etc.
// @Tags restaurants
// @Accept json
// @Produce json
// @Param q query string false "Search query (name or cuisine)"
// @Param cuisine query string false "Cuisine type filter"
// @Param minRating query number false "Minimum rating (0-5)"
// @Param maxPrice query number false "Maximum price range (1-4)"
// @Param deliveryFee query number false "Maximum delivery fee"
// @Param isOpen query bool false "Filter by open status"
// @Param sortBy query string false "Sort by: rating, delivery_fee, delivery_time" Enums(rating, delivery_fee, delivery_time)
// @Param sortOrder query string false "Sort order: asc, desc" Enums(asc, desc)
// @Param page query int false "Page number (default: 1)"
// @Param limit query int false "Items per page (default: 10)"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /restaurants/search [get]
func (h *RestaurantHandler) SearchRestaurants(c *gin.Context) {
	query := c.DefaultQuery("q", "")
	cuisine := c.DefaultQuery("cuisine", "")
	minRating := c.DefaultQuery("minRating", "0")
	maxPrice := c.DefaultQuery("maxPrice", "4")
	deliveryFee := c.DefaultQuery("deliveryFee", "999")
	isOpenStr := c.DefaultQuery("isOpen", "")
	sortBy := c.DefaultQuery("sortBy", "rating")
	sortOrder := c.DefaultQuery("sortOrder", "desc")
	pageStr := c.DefaultQuery("page", "1")
	limitStr := c.DefaultQuery("limit", "10")

	// Parse query parameters
	page := 1
	if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
		page = p
	}

	limit := 10
	if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
		limit = l
	}

	minRat := 0.0
	if r, err := strconv.ParseFloat(minRating, 64); err == nil && r >= 0 && r <= 5 {
		minRat = r
	}

	maxPr := 4
	if p, err := strconv.Atoi(maxPrice); err == nil && p >= 1 && p <= 4 {
		maxPr = p
	}

	maxDeliveryFee := 999.0
	if f, err := strconv.ParseFloat(deliveryFee, 64); err == nil && f >= 0 {
		maxDeliveryFee = f
	}

	// Build the query
	dbQuery := h.db.DB.Model(&models.Restaurant{}).Where("is_active = ?", true)

	// Text search
	if query != "" {
		searchTerm := "%" + query + "%"
		dbQuery = dbQuery.Where("name ILIKE ? OR cuisine_type ILIKE ? OR description ILIKE ?", 
			searchTerm, searchTerm, searchTerm)
	}

	// Cuisine filter
	if cuisine != "" {
		dbQuery = dbQuery.Where("cuisine_type ILIKE ?", "%"+cuisine+"%")
	}

	// Rating filter
	if minRat > 0 {
		dbQuery = dbQuery.Where("rating >= ?", minRat)
	}

	// Price range filter
	if maxPr < 4 {
		dbQuery = dbQuery.Where("price_range <= ?", maxPr)
	}

	// Delivery fee filter
	if maxDeliveryFee < 999 {
		dbQuery = dbQuery.Where("delivery_fee <= ?", maxDeliveryFee)
	}

	// Open status filter
	if isOpenStr != "" {
		if isOpen, err := strconv.ParseBool(isOpenStr); err == nil {
			dbQuery = dbQuery.Where("is_open = ?", isOpen)
		}
	}

	// Sorting
	validSortFields := map[string]string{
		"rating":        "rating",
		"delivery_fee":  "delivery_fee",
		"delivery_time": "min_delivery_time",
		"name":          "name",
		"created_at":    "created_at",
	}

	sortField, exists := validSortFields[sortBy]
	if !exists {
		sortField = "rating"
	}

	if sortOrder != "asc" && sortOrder != "desc" {
		sortOrder = "desc"
	}

	dbQuery = dbQuery.Order(sortField + " " + sortOrder)

	// Get total count for pagination
	var total int64
	countQuery := dbQuery
	if err := countQuery.Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to count restaurants",
			"error":   err.Error(),
		})
		return
	}

	// Apply pagination
	offset := (page - 1) * limit
	dbQuery = dbQuery.Offset(offset).Limit(limit)

	var restaurants []models.Restaurant
	if err := dbQuery.Find(&restaurants).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to fetch restaurants",
			"error":   err.Error(),
		})
		return
	}

	// Convert to response format
	var restaurantResponses []RestaurantResponse
	for _, restaurant := range restaurants {
		restaurantResponses = append(restaurantResponses, h.toRestaurantResponse(&restaurant))
	}

	// Calculate pagination info
	totalPages := int(math.Ceil(float64(total) / float64(limit)))

	pagination := gin.H{
		"page":   page,
		"limit":  limit,
		"total":  total,
		"pages":  totalPages,
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Restaurants retrieved successfully",
		"data": gin.H{
			"restaurants": restaurantResponses,
			"pagination":  pagination,
			"filters": gin.H{
				"query":           query,
				"cuisine":         cuisine,
				"minRating":       minRat,
				"maxPrice":        maxPr,
				"maxDeliveryFee":  maxDeliveryFee,
				"isOpen":          isOpenStr,
				"sortBy":          sortBy,
				"sortOrder":       sortOrder,
			},
		},
	})
}

func (h *RestaurantHandler) toRestaurantResponse(restaurant *models.Restaurant) RestaurantResponse {
	return RestaurantResponse{
		ID:              restaurant.ID,
		OwnerID:         restaurant.OwnerID,
		Name:            restaurant.Name,
		Description:     restaurant.Description,
		CuisineType:     restaurant.CuisineType,
		Address:         restaurant.Address,
		Phone:           restaurant.Phone,
		Email:           restaurant.Email,
		Rating:          restaurant.Rating,
		ReviewCount:     restaurant.ReviewCount,
		PriceRange:      restaurant.PriceRange,
		DeliveryFee:     restaurant.DeliveryFee,
		MinDeliveryTime: restaurant.MinDeliveryTime,
		MaxDeliveryTime: restaurant.MaxDeliveryTime,
		IsOpen:          restaurant.IsOpen,
		IsActive:        restaurant.IsActive,
		Image:           restaurant.Image,
		CreatedAt:       restaurant.CreatedAt.Format("2006-01-02T15:04:05Z"),
		UpdatedAt:       restaurant.UpdatedAt.Format("2006-01-02T15:04:05Z"),
	}
}