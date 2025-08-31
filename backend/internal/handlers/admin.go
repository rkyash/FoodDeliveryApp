package handlers

import (
	"net/http"
	"strconv"
	"time"

	"restaurantapp/config"
	"restaurantapp/internal/middleware"
	"restaurantapp/internal/models"
	"restaurantapp/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AdminHandler struct {
	db  *repository.Database
	cfg *config.Config
}

type AdminStatsResponse struct {
	TotalUsers       int64   `json:"totalUsers"`
	TotalRestaurants int64   `json:"totalRestaurants"`
	TotalOrders      int64   `json:"totalOrders"`
	TotalRevenue     float64 `json:"totalRevenue"`
	ActiveUsers      int64   `json:"activeUsers"`
	PendingOrders    int64   `json:"pendingOrders"`
	DeliveredOrders  int64   `json:"deliveredOrders"`
	CancelledOrders  int64   `json:"cancelledOrders"`
}

type AdminUserResponse struct {
	ID        uuid.UUID `json:"id"`
	Email     string    `json:"email"`
	FirstName string    `json:"firstName"`
	LastName  string    `json:"lastName"`
	Phone     string    `json:"phone"`
	Role      string    `json:"role"`
	IsActive  bool      `json:"isActive"`
	CreatedAt string    `json:"createdAt"`
	UpdatedAt string    `json:"updatedAt"`
}

type UpdateUserStatusRequest struct {
	IsActive bool `json:"isActive"`
}

type UpdateUserRoleRequest struct {
	Role string `json:"role" binding:"required,oneof=customer restaurant_owner admin"`
}

func NewAdminHandler(db *repository.Database, cfg *config.Config) *AdminHandler {
	return &AdminHandler{
		db:  db,
		cfg: cfg,
	}
}

// GetDashboardStats godoc
// @Summary Get admin dashboard statistics
// @Description Get comprehensive statistics for admin dashboard
// @Tags admin
// @Accept json
// @Produce json
// @Security Bearer
// @Success 200 {object} models.SuccessResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 403 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /admin/stats [get]
func (h *AdminHandler) GetDashboardStats(c *gin.Context) {
	var stats AdminStatsResponse

	// Get total users
	h.db.DB.Model(&models.User{}).Count(&stats.TotalUsers)

	// Get active users (logged in within last 30 days - simplified to just active users)
	h.db.DB.Model(&models.User{}).Where("is_active = ?", true).Count(&stats.ActiveUsers)

	// Get total restaurants
	h.db.DB.Model(&models.Restaurant{}).Count(&stats.TotalRestaurants)

	// Get total orders
	h.db.DB.Model(&models.Order{}).Count(&stats.TotalOrders)

	// Get order counts by status
	h.db.DB.Model(&models.Order{}).Where("status IN ?", []string{"pending", "confirmed", "preparing"}).Count(&stats.PendingOrders)
	h.db.DB.Model(&models.Order{}).Where("status = ?", "delivered").Count(&stats.DeliveredOrders)
	h.db.DB.Model(&models.Order{}).Where("status = ?", "cancelled").Count(&stats.CancelledOrders)

	// Get total revenue (sum of delivered orders)
	var revenue struct {
		Total float64
	}
	h.db.DB.Model(&models.Order{}).
		Select("COALESCE(SUM(total_amount + delivery_fee + tax + tip), 0) as total").
		Where("status = ?", "delivered").
		Scan(&revenue)
	stats.TotalRevenue = revenue.Total

	c.JSON(http.StatusOK, models.SuccessResponse{
		Success: true,
		Message: "Dashboard statistics retrieved successfully",
		Data:    stats,
	})
}

// GetAllUsers godoc
// @Summary Get all users with pagination
// @Description Get paginated list of all users for admin management
// @Tags admin
// @Accept json
// @Produce json
// @Security Bearer
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(20)
// @Param search query string false "Search by email or name"
// @Param role query string false "Filter by role"
// @Param status query string false "Filter by status (active/inactive)"
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} models.ErrorResponse
// @Failure 403 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /admin/users [get]
func (h *AdminHandler) GetAllUsers(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	search := c.Query("search")
	roleFilter := c.Query("role")
	statusFilter := c.Query("status")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	offset := (page - 1) * limit

	query := h.db.DB.Model(&models.User{})

	// Apply search filter
	if search != "" {
		query = query.Where("email ILIKE ? OR first_name ILIKE ? OR last_name ILIKE ?", 
			"%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	// Apply role filter
	if roleFilter != "" {
		query = query.Where("role = ?", roleFilter)
	}

	// Apply status filter
	if statusFilter == "active" {
		query = query.Where("is_active = ?", true)
	} else if statusFilter == "inactive" {
		query = query.Where("is_active = ?", false)
	}

	var total int64
	query.Count(&total)

	var users []models.User
	if err := query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Success: false,
			Error:   "Failed to fetch users",
		})
		return
	}

	var responses []AdminUserResponse
	for _, user := range users {
		responses = append(responses, h.toAdminUserResponse(&user))
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Users retrieved successfully",
		"data": gin.H{
			"users": responses,
			"pagination": gin.H{
				"page":  page,
				"limit": limit,
				"total": total,
				"pages": (total + int64(limit) - 1) / int64(limit),
			},
		},
	})
}

// UpdateUserStatus godoc
// @Summary Update user active status
// @Description Activate or deactivate a user account
// @Tags admin
// @Accept json
// @Produce json
// @Security Bearer
// @Param userId path string true "User ID"
// @Param status body UpdateUserStatusRequest true "Status update"
// @Success 200 {object} models.SuccessResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 403 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Router /admin/users/{userId}/status [patch]
func (h *AdminHandler) UpdateUserStatus(c *gin.Context) {
	userIDStr := c.Param("userId")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Success: false,
			Error:   "Invalid user ID",
		})
		return
	}

	var req UpdateUserStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	var user models.User
	if err := h.db.DB.Where("id = ?", userID).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, models.ErrorResponse{
				Success: false,
				Error:   "User not found",
			})
		} else {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse{
				Success: false,
				Error:   "Failed to fetch user",
			})
		}
		return
	}

	// Update user status
	if err := h.db.DB.Model(&user).Update("is_active", req.IsActive).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Success: false,
			Error:   "Failed to update user status",
		})
		return
	}

	action := "activated"
	if !req.IsActive {
		action = "deactivated"
	}

	c.JSON(http.StatusOK, models.SuccessResponse{
		Success: true,
		Message: "User " + action + " successfully",
		Data:    h.toAdminUserResponse(&user),
	})
}

// UpdateUserRole godoc
// @Summary Update user role
// @Description Change a user's role (customer, restaurant_owner, admin)
// @Tags admin
// @Accept json
// @Produce json
// @Security Bearer
// @Param userId path string true "User ID"
// @Param role body UpdateUserRoleRequest true "Role update"
// @Success 200 {object} models.SuccessResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 403 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Router /admin/users/{userId}/role [patch]
func (h *AdminHandler) UpdateUserRole(c *gin.Context) {
	currentUserID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Success: false,
			Error:   "User not authenticated",
		})
		return
	}

	userIDStr := c.Param("userId")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Success: false,
			Error:   "Invalid user ID",
		})
		return
	}

	// Prevent users from changing their own role
	if currentUserID == userID {
		c.JSON(http.StatusForbidden, models.ErrorResponse{
			Success: false,
			Error:   "Cannot change your own role",
		})
		return
	}

	var req UpdateUserRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	var user models.User
	if err := h.db.DB.Where("id = ?", userID).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, models.ErrorResponse{
				Success: false,
				Error:   "User not found",
			})
		} else {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse{
				Success: false,
				Error:   "Failed to fetch user",
			})
		}
		return
	}

	// Convert string role to enum
	var newRole models.UserRole
	switch req.Role {
	case "customer":
		newRole = models.CustomerRole
	case "restaurant_owner":
		newRole = models.RestaurantOwnerRole
	case "admin":
		newRole = models.AdminRole
	default:
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Success: false,
			Error:   "Invalid role",
		})
		return
	}

	// Update user role
	if err := h.db.DB.Model(&user).Update("role", newRole).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Success: false,
			Error:   "Failed to update user role",
		})
		return
	}

	user.Role = newRole

	c.JSON(http.StatusOK, models.SuccessResponse{
		Success: true,
		Message: "User role updated successfully",
		Data:    h.toAdminUserResponse(&user),
	})
}

// GetAllOrders godoc
// @Summary Get all orders with pagination
// @Description Get paginated list of all orders for admin monitoring
// @Tags admin
// @Accept json
// @Produce json
// @Security Bearer
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(20)
// @Param status query string false "Filter by order status"
// @Param restaurant query string false "Filter by restaurant name"
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} models.ErrorResponse
// @Failure 403 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /admin/orders [get]
func (h *AdminHandler) GetAllOrders(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	statusFilter := c.Query("status")
	restaurantFilter := c.Query("restaurant")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	offset := (page - 1) * limit

	query := h.db.DB.Model(&models.Order{}).
		Preload("User").
		Preload("Restaurant")

	// Apply status filter
	if statusFilter != "" {
		query = query.Where("status = ?", statusFilter)
	}

	// Apply restaurant filter
	if restaurantFilter != "" {
		query = query.Joins("JOIN restaurants ON orders.restaurant_id = restaurants.id").
			Where("restaurants.name ILIKE ?", "%"+restaurantFilter+"%")
	}

	var total int64
	query.Count(&total)

	var orders []models.Order
	if err := query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&orders).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Success: false,
			Error:   "Failed to fetch orders",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Orders retrieved successfully",
		"data": gin.H{
			"orders": orders,
			"pagination": gin.H{
				"page":  page,
				"limit": limit,
				"total": total,
				"pages": (total + int64(limit) - 1) / int64(limit),
			},
		},
	})
}

// GetAllRestaurants godoc
// @Summary Get all restaurants with pagination
// @Description Get paginated list of all restaurants for admin management
// @Tags admin
// @Accept json
// @Produce json
// @Security Bearer
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(20)
// @Param search query string false "Search by restaurant name"
// @Param status query string false "Filter by status (active/inactive)"
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} models.ErrorResponse
// @Failure 403 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /admin/restaurants [get]
func (h *AdminHandler) GetAllRestaurants(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	search := c.Query("search")
	statusFilter := c.Query("status")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	offset := (page - 1) * limit

	query := h.db.DB.Model(&models.Restaurant{}).Preload("Owner")

	// Apply search filter
	if search != "" {
		query = query.Where("name ILIKE ? OR cuisine_type ILIKE ?", "%"+search+"%", "%"+search+"%")
	}

	// Apply status filter
	if statusFilter == "active" {
		query = query.Where("is_active = ?", true)
	} else if statusFilter == "inactive" {
		query = query.Where("is_active = ?", false)
	}

	var total int64
	query.Count(&total)

	var restaurants []models.Restaurant
	if err := query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&restaurants).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Success: false,
			Error:   "Failed to fetch restaurants",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Restaurants retrieved successfully",
		"data": gin.H{
			"restaurants": restaurants,
			"pagination": gin.H{
				"page":  page,
				"limit": limit,
				"total": total,
				"pages": (total + int64(limit) - 1) / int64(limit),
			},
		},
	})
}

func (h *AdminHandler) toAdminUserResponse(user *models.User) AdminUserResponse {
	return AdminUserResponse{
		ID:        user.ID,
		Email:     user.Email,
		FirstName: user.FirstName,
		LastName:  user.LastName,
		Phone:     user.Phone,
		Role:      string(user.Role),
		IsActive:  user.IsActive,
		CreatedAt: user.CreatedAt.Format(time.RFC3339),
		UpdatedAt: user.UpdatedAt.Format(time.RFC3339),
	}
}