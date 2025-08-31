package handlers

import (
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

type ReviewHandler struct {
	db  *repository.Database
	cfg *config.Config
}

type CreateReviewRequest struct {
	OrderID string  `json:"orderId" binding:"required"`
	Rating  int     `json:"rating" binding:"required,min=1,max=5"`
	Comment string  `json:"comment" binding:"required"`
	Photos  []string `json:"photos,omitempty"`
}

type ReviewResponse struct {
	ID           uuid.UUID `json:"id"`
	UserID       uuid.UUID `json:"userId"`
	RestaurantID uuid.UUID `json:"restaurantId"`
	OrderID      uuid.UUID `json:"orderId"`
	Rating       int       `json:"rating"`
	Comment      string    `json:"comment"`
	Photos       []string  `json:"photos"`
	UserName     string    `json:"userName"`
	CreatedAt    string    `json:"createdAt"`
	UpdatedAt    string    `json:"updatedAt"`
}

func NewReviewHandler(db *repository.Database, cfg *config.Config) *ReviewHandler {
	return &ReviewHandler{
		db:  db,
		cfg: cfg,
	}
}

// CreateReview godoc
// @Summary Create a review for a restaurant
// @Description Create a new review for a restaurant based on an order
// @Tags reviews
// @Accept json
// @Produce json
// @Security Bearer
// @Param review body CreateReviewRequest true "Review data"
// @Param restaurantId path string true "Restaurant ID"
// @Success 201 {object} models.SuccessResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Failure 409 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /restaurants/{restaurantId}/reviews [post]
func (h *ReviewHandler) CreateReview(c *gin.Context) {
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Success: false,
			Error:   "User not authenticated",
		})
		return
	}

	restaurantIDStr := c.Param("restaurantId")
	restaurantID, err := uuid.Parse(restaurantIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Success: false,
			Error:   "Invalid restaurant ID",
		})
		return
	}

	var req CreateReviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	orderID, err := uuid.Parse(req.OrderID)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Success: false,
			Error:   "Invalid order ID",
		})
		return
	}

	// Verify the order exists and belongs to the user
	var order models.Order
	if err := h.db.DB.Where("id = ? AND user_id = ? AND restaurant_id = ?", orderID, userID, restaurantID).First(&order).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, models.ErrorResponse{
				Success: false,
				Error:   "Order not found or doesn't belong to user",
			})
		} else {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse{
				Success: false,
				Error:   "Failed to verify order",
			})
		}
		return
	}

	// Check if order is delivered
	if order.Status != "delivered" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Success: false,
			Error:   "Can only review delivered orders",
		})
		return
	}

	// Check if review already exists for this order
	var existingReview models.Review
	result := h.db.DB.Where("user_id = ? AND order_id = ?", userID, orderID).First(&existingReview)
	if result.Error != gorm.ErrRecordNotFound {
		c.JSON(http.StatusConflict, models.ErrorResponse{
			Success: false,
			Error:   "Review already exists for this order",
		})
		return
	}

	// Create review
	review := models.Review{
		UserID:       userID,
		RestaurantID: restaurantID,
		OrderID:      orderID,
		Rating:       req.Rating,
		Comment:      req.Comment,
		Photos:       req.Photos,
	}

	if err := h.db.DB.Create(&review).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Success: false,
			Error:   "Failed to create review",
		})
		return
	}

	// Update restaurant rating
	h.updateRestaurantRating(restaurantID)

	c.JSON(http.StatusCreated, models.SuccessResponse{
		Success: true,
		Message: "Review created successfully",
		Data:    h.toReviewResponse(&review),
	})
}

// GetRestaurantReviews godoc
// @Summary Get reviews for a restaurant
// @Description Get all reviews for a specific restaurant with pagination
// @Tags reviews
// @Accept json
// @Produce json
// @Param restaurantId path string true "Restaurant ID"
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(10)
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /restaurants/{restaurantId}/reviews [get]
func (h *ReviewHandler) GetRestaurantReviews(c *gin.Context) {
	restaurantIDStr := c.Param("id")
	restaurantID, err := uuid.Parse(restaurantIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Success: false,
			Error:   "Invalid restaurant ID",
		})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}

	offset := (page - 1) * limit

	var reviews []models.Review
	var total int64

	// Get total count
	h.db.DB.Model(&models.Review{}).Where("restaurant_id = ?", restaurantID).Count(&total)

	// Get paginated reviews with user information
	if err := h.db.DB.Where("restaurant_id = ?", restaurantID).
		Preload("User").
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&reviews).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Success: false,
			Error:   "Failed to fetch reviews",
		})
		return
	}

	var responses []ReviewResponse
	for _, review := range reviews {
		responses = append(responses, h.toReviewResponse(&review))
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Reviews retrieved successfully",
		"data": gin.H{
			"reviews": responses,
			"pagination": gin.H{
				"page":  page,
				"limit": limit,
				"total": total,
				"pages": (total + int64(limit) - 1) / int64(limit),
			},
		},
	})
}

// GetReview godoc
// @Summary Get a specific review
// @Description Get details of a specific review by ID
// @Tags reviews
// @Accept json
// @Produce json
// @Param reviewId path string true "Review ID"
// @Success 200 {object} models.SuccessResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Router /reviews/{reviewId} [get]
func (h *ReviewHandler) GetReview(c *gin.Context) {
	reviewIDStr := c.Param("reviewId")
	reviewID, err := uuid.Parse(reviewIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Success: false,
			Error:   "Invalid review ID",
		})
		return
	}

	var review models.Review
	if err := h.db.DB.Where("id = ?", reviewID).Preload("User").First(&review).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, models.ErrorResponse{
				Success: false,
				Error:   "Review not found",
			})
		} else {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse{
				Success: false,
				Error:   "Failed to fetch review",
			})
		}
		return
	}

	c.JSON(http.StatusOK, models.SuccessResponse{
		Success: true,
		Message: "Review retrieved successfully",
		Data:    h.toReviewResponse(&review),
	})
}

// UpdateReview godoc
// @Summary Update a review
// @Description Update a review (author only)
// @Tags reviews
// @Accept json
// @Produce json
// @Security Bearer
// @Param reviewId path string true "Review ID"
// @Param review body CreateReviewRequest true "Updated review data"
// @Success 200 {object} models.SuccessResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 403 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Router /reviews/{reviewId} [put]
func (h *ReviewHandler) UpdateReview(c *gin.Context) {
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Success: false,
			Error:   "User not authenticated",
		})
		return
	}

	reviewIDStr := c.Param("reviewId")
	reviewID, err := uuid.Parse(reviewIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Success: false,
			Error:   "Invalid review ID",
		})
		return
	}

	var req CreateReviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	var review models.Review
	if err := h.db.DB.Where("id = ?", reviewID).First(&review).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, models.ErrorResponse{
				Success: false,
				Error:   "Review not found",
			})
		} else {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse{
				Success: false,
				Error:   "Failed to fetch review",
			})
		}
		return
	}

	// Check ownership
	if review.UserID != userID {
		c.JSON(http.StatusForbidden, models.ErrorResponse{
			Success: false,
			Error:   "You can only update your own reviews",
		})
		return
	}

	// Update review
	review.Rating = req.Rating
	review.Comment = req.Comment
	review.Photos = req.Photos

	if err := h.db.DB.Save(&review).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Success: false,
			Error:   "Failed to update review",
		})
		return
	}

	// Update restaurant rating
	h.updateRestaurantRating(review.RestaurantID)

	c.JSON(http.StatusOK, models.SuccessResponse{
		Success: true,
		Message: "Review updated successfully",
		Data:    h.toReviewResponse(&review),
	})
}

// DeleteReview godoc
// @Summary Delete a review
// @Description Delete a review (author or admin only)
// @Tags reviews
// @Accept json
// @Produce json
// @Security Bearer
// @Param reviewId path string true "Review ID"
// @Success 200 {object} models.SuccessResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 403 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Router /reviews/{reviewId} [delete]
func (h *ReviewHandler) DeleteReview(c *gin.Context) {
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Success: false,
			Error:   "User not authenticated",
		})
		return
	}

	reviewIDStr := c.Param("reviewId")
	reviewID, err := uuid.Parse(reviewIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Success: false,
			Error:   "Invalid review ID",
		})
		return
	}

	var review models.Review
	if err := h.db.DB.Where("id = ?", reviewID).First(&review).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, models.ErrorResponse{
				Success: false,
				Error:   "Review not found",
			})
		} else {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse{
				Success: false,
				Error:   "Failed to fetch review",
			})
		}
		return
	}

	// Check permissions (owner or admin)
	var user models.User
	h.db.DB.Where("id = ?", userID).First(&user)
	if review.UserID != userID && user.Role != models.AdminRole {
		c.JSON(http.StatusForbidden, models.ErrorResponse{
			Success: false,
			Error:   "You can only delete your own reviews",
		})
		return
	}

	restaurantID := review.RestaurantID

	// Delete review
	if err := h.db.DB.Delete(&review).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Success: false,
			Error:   "Failed to delete review",
		})
		return
	}

	// Update restaurant rating
	h.updateRestaurantRating(restaurantID)

	c.JSON(http.StatusOK, models.SuccessResponse{
		Success: true,
		Message: "Review deleted successfully",
	})
}

func (h *ReviewHandler) updateRestaurantRating(restaurantID uuid.UUID) {
	var avgRating float64
	var reviewCount int64

	h.db.DB.Model(&models.Review{}).Where("restaurant_id = ?", restaurantID).Count(&reviewCount)
	h.db.DB.Model(&models.Review{}).Where("restaurant_id = ?", restaurantID).Select("AVG(rating)").Scan(&avgRating)

	h.db.DB.Model(&models.Restaurant{}).Where("id = ?", restaurantID).Updates(map[string]interface{}{
		"rating":       avgRating,
		"review_count": reviewCount,
	})
}

func (h *ReviewHandler) toReviewResponse(review *models.Review) ReviewResponse {
	response := ReviewResponse{
		ID:           review.ID,
		UserID:       review.UserID,
		RestaurantID: review.RestaurantID,
		OrderID:      review.OrderID,
		Rating:       review.Rating,
		Comment:      review.Comment,
		Photos:       review.Photos,
		CreatedAt:    review.CreatedAt.Format("2006-01-02T15:04:05Z"),
		UpdatedAt:    review.UpdatedAt.Format("2006-01-02T15:04:05Z"),
	}

	if review.User.FirstName != "" {
		response.UserName = review.User.FirstName + " " + review.User.LastName
	}

	return response
}