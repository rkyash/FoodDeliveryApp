package handlers

import (
	"net/http"
	"strconv"

	"restaurantapp/config"
	"restaurantapp/internal/models"
	"restaurantapp/internal/repository"
	"restaurantapp/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type OrderHandler struct {
	db  *repository.Database
	cfg *config.Config
}

type CreateOrderRequest struct {
	RestaurantID        uuid.UUID                   `json:"restaurantId" binding:"required"`
	Items               []CreateOrderItemRequest    `json:"items" binding:"required,min=1"`
	DeliveryAddressID   uuid.UUID                   `json:"deliveryAddressId" binding:"required"`
	PaymentMethodType   models.PaymentMethodType    `json:"paymentMethodType" binding:"required"`
	PaymentDetails      interface{}                 `json:"paymentDetails"`
	SpecialInstructions string                      `json:"specialInstructions"`
	Tip                 float64                     `json:"tip"`
}

type CreateOrderItemRequest struct {
	MenuItemID          uuid.UUID   `json:"menuItemId" binding:"required"`
	Quantity            int         `json:"quantity" binding:"required,min=1"`
	CustomizationsData  interface{} `json:"customizationsData"`
	SpecialInstructions string      `json:"specialInstructions"`
}

type UpdateOrderStatusRequest struct {
	Status  models.OrderStatus `json:"status" binding:"required"`
	Message string             `json:"message"`
}

func NewOrderHandler(db *repository.Database, cfg *config.Config) *OrderHandler {
	return &OrderHandler{
		db:  db,
		cfg: cfg,
	}
}

// CreateOrder handles order creation
// @Summary Create a new order
// @Description Create a new order with items
// @Tags orders
// @Accept json
// @Produce json
// @Param order body CreateOrderRequest true "Order details"
// @Success 201 {object} models.OrderResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Security Bearer
// @Router /orders [post]
func (h *OrderHandler) CreateOrder(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var req CreateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Start transaction
	tx := h.db.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Verify restaurant exists and is active
	var restaurant models.Restaurant
	if err := tx.Where("id = ? AND is_active = true", req.RestaurantID).First(&restaurant).Error; err != nil {
		tx.Rollback()
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Restaurant not found or inactive"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify restaurant"})
		}
		return
	}

	// Verify delivery address belongs to user
	var address models.Address
	if err := tx.Where("id = ? AND user_id = ?", req.DeliveryAddressID, userID).First(&address).Error; err != nil {
		tx.Rollback()
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Delivery address not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify delivery address"})
		}
		return
	}

	// Calculate order total
	var totalAmount float64
	var orderItems []models.OrderItem

	for _, item := range req.Items {
		var menuItem models.MenuItem
		if err := tx.Where("id = ? AND restaurant_id = ? AND is_available = true", item.MenuItemID, req.RestaurantID).First(&menuItem).Error; err != nil {
			tx.Rollback()
			if err == gorm.ErrRecordNotFound {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Menu item not found or unavailable"})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify menu item"})
			}
			return
		}

		itemTotal := menuItem.Price * float64(item.Quantity)
		totalAmount += itemTotal

		customizationsJSON, _ := utils.ToJSON(item.CustomizationsData)

		orderItem := models.OrderItem{
			MenuItemID:          item.MenuItemID,
			Name:                menuItem.Name,
			Price:               menuItem.Price,
			Quantity:            item.Quantity,
			CustomizationsData:  customizationsJSON,
			SpecialInstructions: item.SpecialInstructions,
		}
		orderItems = append(orderItems, orderItem)
	}

	// Calculate delivery fee based on distance (simplified)
	deliveryFee := 2.99
	if totalAmount > 35 {
		deliveryFee = 0 // Free delivery for orders over $35
	}

	// Calculate tax (8% for example)
	tax := totalAmount * 0.08

	paymentDetailsJSON, _ := utils.ToJSON(req.PaymentDetails)

	// Create order
	order := models.Order{
		UserID:                userID.(uuid.UUID),
		RestaurantID:          req.RestaurantID,
		Status:                models.PendingStatus,
		TotalAmount:           totalAmount,
		DeliveryFee:           deliveryFee,
		Tax:                   tax,
		Tip:                   req.Tip,
		DeliveryAddressID:     req.DeliveryAddressID,
		PaymentMethodType:     req.PaymentMethodType,
		PaymentDetails:        paymentDetailsJSON,
		SpecialInstructions:   req.SpecialInstructions,
	}

	if err := tx.Create(&order).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create order"})
		return
	}

	// Create order items
	for i := range orderItems {
		orderItems[i].OrderID = order.ID
		if err := tx.Create(&orderItems[i]).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create order items"})
			return
		}
	}

	// Create initial tracking update
	trackingUpdate := models.TrackingUpdate{
		OrderID: order.ID,
		Status:  models.PendingStatus,
		Message: "Order placed successfully",
	}
	if err := tx.Create(&trackingUpdate).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create tracking update"})
		return
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit order"})
		return
	}

	// Load order with relationships
	if err := h.db.DB.Preload("Restaurant").Preload("DeliveryAddress").Preload("Items.MenuItem").Preload("TrackingUpdates").First(&order, order.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load order details"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Order created successfully",
		"data":    order,
	})
}

// GetUserOrders handles getting all orders for a user
// @Summary Get user orders
// @Description Get all orders for the authenticated user
// @Tags orders
// @Produce json
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(10)
// @Success 200 {object} models.OrdersResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Security Bearer
// @Router /orders [get]
func (h *OrderHandler) GetUserOrders(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	offset := (page - 1) * limit

	var orders []models.Order
	var total int64

	// Get total count
	if err := h.db.DB.Model(&models.Order{}).Where("user_id = ?", userID).Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count orders"})
		return
	}

	// Get orders with relationships
	if err := h.db.DB.Where("user_id = ?", userID).
		Preload("Restaurant").
		Preload("DeliveryAddress").
		Preload("Items.MenuItem").
		Order("created_at DESC").
		Limit(limit).Offset(offset).
		Find(&orders).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch orders"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    orders,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
		},
	})
}

// GetOrder handles getting a specific order
// @Summary Get order by ID
// @Description Get order details by ID
// @Tags orders
// @Produce json
// @Param id path string true "Order ID"
// @Success 200 {object} models.OrderResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Security Bearer
// @Router /orders/{id} [get]
func (h *OrderHandler) GetOrder(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	orderID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid order ID"})
		return
	}

	var order models.Order
	if err := h.db.DB.Where("id = ? AND user_id = ?", orderID, userID).
		Preload("Restaurant").
		Preload("DeliveryAddress").
		Preload("Items.MenuItem").
		Preload("TrackingUpdates", func(db *gorm.DB) *gorm.DB {
			return db.Order("created_at DESC")
		}).
		First(&order).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch order"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    order,
	})
}

// UpdateOrderStatus handles updating order status (restaurant owner only)
// @Summary Update order status
// @Description Update order status and add tracking update
// @Tags orders
// @Accept json
// @Produce json
// @Param id path string true "Order ID"
// @Param status body UpdateOrderStatusRequest true "Status update"
// @Success 200 {object} models.OrderResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 403 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Security Bearer
// @Router /orders/{id}/status [patch]
func (h *OrderHandler) UpdateOrderStatus(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	orderID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid order ID"})
		return
	}

	var req UpdateOrderStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify user owns the restaurant for this order
	var order models.Order
	if err := h.db.DB.Preload("Restaurant").Where("id = ?", orderID).First(&order).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch order"})
		}
		return
	}

	if order.Restaurant.OwnerID != userID.(uuid.UUID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized to update this order"})
		return
	}

	// Start transaction
	tx := h.db.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Update order status
	if err := tx.Model(&order).Update("status", req.Status).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update order status"})
		return
	}

	// Create tracking update
	message := req.Message
	if message == "" {
		switch req.Status {
		case models.ConfirmedStatus:
			message = "Order confirmed by restaurant"
		case models.PreparingStatus:
			message = "Order is being prepared"
		case models.ReadyForPickupStatus:
			message = "Order is ready for pickup"
		case models.PickedUpStatus:
			message = "Order picked up by delivery driver"
		case models.OnTheWayStatus:
			message = "Order is on the way"
		case models.DeliveredStatus:
			message = "Order delivered successfully"
		case models.CancelledStatus:
			message = "Order cancelled"
		default:
			message = "Order status updated"
		}
	}

	trackingUpdate := models.TrackingUpdate{
		OrderID: order.ID,
		Status:  req.Status,
		Message: message,
	}
	if err := tx.Create(&trackingUpdate).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create tracking update"})
		return
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit status update"})
		return
	}

	// Load updated order
	if err := h.db.DB.Preload("Restaurant").Preload("DeliveryAddress").Preload("Items.MenuItem").Preload("TrackingUpdates", func(db *gorm.DB) *gorm.DB {
		return db.Order("created_at DESC")
	}).First(&order, order.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load updated order"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Order status updated successfully",
		"data":    order,
	})
}

// GetRestaurantOrders handles getting orders for a restaurant
// @Summary Get restaurant orders
// @Description Get all orders for restaurant owner's restaurant
// @Tags orders
// @Produce json
// @Param status query string false "Filter by status"
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(10)
// @Success 200 {object} models.OrdersResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Security Bearer
// @Router /restaurant/orders [get]
func (h *OrderHandler) GetRestaurantOrders(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Get restaurant owned by user
	var restaurant models.Restaurant
	if err := h.db.DB.Where("owner_id = ?", userID).First(&restaurant).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Restaurant not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to find restaurant"})
		}
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	offset := (page - 1) * limit
	status := c.Query("status")

	query := h.db.DB.Where("restaurant_id = ?", restaurant.ID)
	if status != "" {
		query = query.Where("status = ?", status)
	}

	var orders []models.Order
	var total int64

	// Get total count
	if err := query.Model(&models.Order{}).Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count orders"})
		return
	}

	// Get orders
	if err := query.Preload("User").
		Preload("DeliveryAddress").
		Preload("Items.MenuItem").
		Order("created_at DESC").
		Limit(limit).Offset(offset).
		Find(&orders).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch orders"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    orders,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
		},
	})
}