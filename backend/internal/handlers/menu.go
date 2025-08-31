package handlers

import (
	"net/http"

	"restaurantapp/config"
	"restaurantapp/internal/middleware"
	"restaurantapp/internal/models"
	"restaurantapp/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type MenuHandler struct {
	db  *repository.Database
	cfg *config.Config
}

type CreateCategoryRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
	Order       int    `json:"order"`
}

type CreateMenuItemRequest struct {
	CategoryID      string   `json:"categoryId" binding:"required"`
	Name            string   `json:"name" binding:"required"`
	Description     string   `json:"description"`
	Price           float64  `json:"price" binding:"required"`
	Image           string   `json:"image"`
	PreparationTime int      `json:"preparationTime"`
	Allergens       string   `json:"allergens"`
	Calories        *int     `json:"calories,omitempty"`
	Protein         *float64 `json:"protein,omitempty"`
	Carbs           *float64 `json:"carbs,omitempty"`
	Fat             *float64 `json:"fat,omitempty"`
	Fiber           *float64 `json:"fiber,omitempty"`
	Sodium          *float64 `json:"sodium,omitempty"`
}

type MenuItemResponse struct {
	ID              uuid.UUID `json:"id"`
	RestaurantID    uuid.UUID `json:"restaurantId"`
	CategoryID      uuid.UUID `json:"categoryId"`
	Name            string    `json:"name"`
	Description     string    `json:"description"`
	Price           float64   `json:"price"`
	Image           string    `json:"image"`
	IsAvailable     bool      `json:"isAvailable"`
	PreparationTime int       `json:"preparationTime"`
	Allergens       string    `json:"allergens"`
	Calories        *int      `json:"calories,omitempty"`
	Protein         *float64  `json:"protein,omitempty"`
	Carbs           *float64  `json:"carbs,omitempty"`
	Fat             *float64  `json:"fat,omitempty"`
	Fiber           *float64  `json:"fiber,omitempty"`
	Sodium          *float64  `json:"sodium,omitempty"`
}

type CategoryResponse struct {
	ID           uuid.UUID          `json:"id"`
	RestaurantID uuid.UUID          `json:"restaurantId"`
	Name         string             `json:"name"`
	Description  string             `json:"description"`
	Order        int                `json:"order"`
	IsActive     bool               `json:"isActive"`
	MenuItems    []MenuItemResponse `json:"menuItems"`
}

func NewMenuHandler(db *repository.Database, cfg *config.Config) *MenuHandler {
	return &MenuHandler{
		db:  db,
		cfg: cfg,
	}
}

// CreateCategory godoc
// @Summary Create menu category
// @Description Create a new menu category for restaurant
// @Tags menu
// @Accept json
// @Produce json
// @Security Bearer
// @Param category body CreateCategoryRequest true "Category data"
// @Success 201 {object} models.ErrorResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /menu/categories [post]
func (h *MenuHandler) CreateCategory(c *gin.Context) {
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Success: false,
			Message: "User not authenticated",
		})
		return
	}

	// Get user's restaurant
	var restaurant models.Restaurant
	if err := h.db.DB.Where("owner_id = ?", userID).First(&restaurant).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, models.ErrorResponse{
				Success: false,
				Message: "Restaurant not found",
			})
		} else {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse{
				Success: false,
				Message: "Failed to fetch restaurant",
				Error:   err.Error(),
			})
		}
		return
	}

	var req CreateCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Success: false,
			Message: "Invalid request data",
			Error:   err.Error(),
		})
		return
	}

	category := models.MenuCategory{
		RestaurantID: restaurant.ID,
		Name:         req.Name,
		Description:  req.Description,
		Order:        req.Order,
		IsActive:     true,
	}

	if err := h.db.DB.Create(&category).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Success: false,
			Message: "Failed to create category",
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, models.SuccessResponse{
		Success: true,
		Message: "Category created successfully",
		Data:    h.toCategoryResponse(&category),
	})
}

// CreateMenuItem godoc
// @Summary Create menu item
// @Description Create a new menu item for restaurant
// @Tags menu
// @Accept json
// @Produce json
// @Security Bearer
// @Param item body CreateMenuItemRequest true "Menu item data"
// @Success 201 {object} models.SuccessResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /menu/items [post]
func (h *MenuHandler) CreateMenuItem(c *gin.Context) {
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Success: false,
			Message: "User not authenticated",
		})
		return
	}

	var req CreateMenuItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Success: false,
			Message: "Invalid request data",
			Error:   err.Error(),
		})
		return
	}

	categoryID, err := uuid.Parse(req.CategoryID)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Success: false,
			Message: "Invalid category ID",
		})
		return
	}

	// Get user's restaurant
	var restaurant models.Restaurant
	if err := h.db.DB.Where("owner_id = ?", userID).First(&restaurant).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, models.ErrorResponse{
				Success: false,
				Message: "Restaurant not found",
			})
		} else {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse{
				Success: false,
				Message: "Failed to fetch restaurant",
				Error:   err.Error(),
			})
		}
		return
	}

	// Verify category belongs to the restaurant
	var category models.MenuCategory
	if err := h.db.DB.Where("id = ? AND restaurant_id = ?", categoryID, restaurant.ID).First(&category).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, models.ErrorResponse{
				Success: false,
				Message: "Category not found",
			})
		} else {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse{
				Success: false,
				Message: "Failed to fetch category",
				Error:   err.Error(),
			})
		}
		return
	}

	menuItem := models.MenuItem{
		RestaurantID:    restaurant.ID,
		CategoryID:      categoryID,
		Name:            req.Name,
		Description:     req.Description,
		Price:           req.Price,
		Image:           req.Image,
		IsAvailable:     true,
		PreparationTime: req.PreparationTime,
		Allergens:       req.Allergens,
		Calories:        req.Calories,
		Protein:         req.Protein,
		Carbs:           req.Carbs,
		Fat:             req.Fat,
		Fiber:           req.Fiber,
		Sodium:          req.Sodium,
	}

	if err := h.db.DB.Create(&menuItem).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Success: false,
			Message: "Failed to create menu item",
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, models.SuccessResponse{
		Success: true,
		Message: "Menu item created successfully",
		Data:    h.toMenuItemResponse(&menuItem),
	})
}

// GetRestaurantMenu godoc
// @Summary Get restaurant menu
// @Description Get complete menu with categories and items for a restaurant
// @Tags menu
// @Accept json
// @Produce json
// @Param id path string true "Restaurant ID"
// @Success 200 {object} models.SuccessResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Router /public/restaurants/{id}/menu [get]
func (h *MenuHandler) GetRestaurantMenu(c *gin.Context) {
	idStr := c.Param("id")
	restaurantID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Success: false,
			Message: "Invalid restaurant ID",
		})
		return
	}

	var categories []models.MenuCategory
	if err := h.db.DB.Where("restaurant_id = ? AND is_active = ?", restaurantID, true).
		Preload("MenuItems", "is_available = ?", true).
		Order("\"order\" ASC").
		Find(&categories).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Success: false,
			Message: "Failed to fetch menu",
			Error:   err.Error(),
		})
		return
	}

	var responses []CategoryResponse
	for _, category := range categories {
		responses = append(responses, h.toCategoryResponse(&category))
	}

	c.JSON(http.StatusOK, models.SuccessResponse{
		Success: true,
		Message: "Menu retrieved successfully",
		Data:    responses,
	})
}

// UpdateMenuItem godoc
// @Summary Update menu item
// @Description Update menu item details
// @Tags menu
// @Accept json
// @Produce json
// @Security Bearer
// @Param id path string true "Menu Item ID"
// @Param item body CreateMenuItemRequest true "Menu item update data"
// @Success 200 {object} models.SuccessResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /menu/items/{id} [put]
func (h *MenuHandler) UpdateMenuItem(c *gin.Context) {
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Success: false,
			Message: "User not authenticated",
		})
		return
	}

	idStr := c.Param("id")
	menuItemID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Success: false,
			Message: "Invalid menu item ID",
		})
		return
	}

	// Get user's restaurant
	var restaurant models.Restaurant
	if err := h.db.DB.Where("owner_id = ?", userID).First(&restaurant).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, models.ErrorResponse{
				Success: false,
				Message: "Restaurant not found",
			})
		} else {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse{
				Success: false,
				Message: "Failed to fetch restaurant",
				Error:   err.Error(),
			})
		}
		return
	}

	var menuItem models.MenuItem
	if err := h.db.DB.Where("id = ? AND restaurant_id = ?", menuItemID, restaurant.ID).First(&menuItem).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, models.ErrorResponse{
				Success: false,
				Message: "Menu item not found",
			})
		} else {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse{
				Success: false,
				Message: "Failed to fetch menu item",
				Error:   err.Error(),
			})
		}
		return
	}

	var req CreateMenuItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Success: false,
			Message: "Invalid request data",
			Error:   err.Error(),
		})
		return
	}

	// Update fields
	menuItem.Name = req.Name
	menuItem.Description = req.Description
	menuItem.Price = req.Price
	menuItem.Image = req.Image
	menuItem.PreparationTime = req.PreparationTime
	menuItem.Allergens = req.Allergens
	menuItem.Calories = req.Calories
	menuItem.Protein = req.Protein
	menuItem.Carbs = req.Carbs
	menuItem.Fat = req.Fat
	menuItem.Fiber = req.Fiber
	menuItem.Sodium = req.Sodium

	if err := h.db.DB.Save(&menuItem).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Success: false,
			Message: "Failed to update menu item",
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.SuccessResponse{
		Success: true,
		Message: "Menu item updated successfully",
		Data:    h.toMenuItemResponse(&menuItem),
	})
}

// ToggleItemAvailability godoc
// @Summary Toggle menu item availability
// @Description Toggle availability of a menu item
// @Tags menu
// @Accept json
// @Produce json
// @Security Bearer
// @Param id path string true "Menu Item ID"
// @Success 200 {object} models.SuccessResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /menu/items/{id}/toggle [patch]
func (h *MenuHandler) ToggleItemAvailability(c *gin.Context) {
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Success: false,
			Message: "User not authenticated",
		})
		return
	}

	idStr := c.Param("id")
	menuItemID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Success: false,
			Message: "Invalid menu item ID",
		})
		return
	}

	// Get user's restaurant
	var restaurant models.Restaurant
	if err := h.db.DB.Where("owner_id = ?", userID).First(&restaurant).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, models.ErrorResponse{
				Success: false,
				Message: "Restaurant not found",
			})
		} else {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse{
				Success: false,
				Message: "Failed to fetch restaurant",
				Error:   err.Error(),
			})
		}
		return
	}

	var menuItem models.MenuItem
	if err := h.db.DB.Where("id = ? AND restaurant_id = ?", menuItemID, restaurant.ID).First(&menuItem).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, models.ErrorResponse{
				Success: false,
				Message: "Menu item not found",
			})
		} else {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse{
				Success: false,
				Message: "Failed to fetch menu item",
				Error:   err.Error(),
			})
		}
		return
	}

	menuItem.IsAvailable = !menuItem.IsAvailable

	if err := h.db.DB.Save(&menuItem).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Success: false,
			Message: "Failed to update menu item availability",
			Error:   err.Error(),
		})
		return
	}

	status := "unavailable"
	if menuItem.IsAvailable {
		status = "available"
	}

	c.JSON(http.StatusOK, models.SuccessResponse{
		Success: true,
		Message: "Menu item is now " + status,
		Data:    h.toMenuItemResponse(&menuItem),
	})
}

// DeleteMenuItem godoc
// @Summary Delete menu item
// @Description Delete a menu item
// @Tags menu
// @Accept json
// @Produce json
// @Security Bearer
// @Param id path string true "Menu Item ID"
// @Success 200 {object} models.SuccessResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /menu/items/{id} [delete]
func (h *MenuHandler) DeleteMenuItem(c *gin.Context) {
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Success: false,
			Message: "User not authenticated",
		})
		return
	}

	idStr := c.Param("id")
	menuItemID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Success: false,
			Message: "Invalid menu item ID",
		})
		return
	}

	// Get user's restaurant
	var restaurant models.Restaurant
	if err := h.db.DB.Where("owner_id = ?", userID).First(&restaurant).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, models.ErrorResponse{
				Success: false,
				Message: "Restaurant not found",
			})
		} else {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse{
				Success: false,
				Message: "Failed to fetch restaurant",
				Error:   err.Error(),
			})
		}
		return
	}

	// Check if menu item exists and belongs to this restaurant
	var menuItem models.MenuItem
	if err := h.db.DB.Where("id = ? AND restaurant_id = ?", menuItemID, restaurant.ID).First(&menuItem).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, models.ErrorResponse{
				Success: false,
				Message: "Menu item not found",
			})
		} else {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse{
				Success: false,
				Message: "Failed to fetch menu item",
				Error:   err.Error(),
			})
		}
		return
	}

	// Delete the menu item
	if err := h.db.DB.Delete(&menuItem).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Success: false,
			Message: "Failed to delete menu item",
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.SuccessResponse{
		Success: true,
		Message: "Menu item deleted successfully",
	})
}

// GetMenuItem godoc
// @Summary Get menu item details
// @Description Get detailed information about a specific menu item
// @Tags menu
// @Accept json
// @Produce json
// @Param id path string true "Menu Item ID"
// @Success 200 {object} models.SuccessResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /menu-items/{id} [get]
func (h *MenuHandler) GetMenuItem(c *gin.Context) {
	idStr := c.Param("id")
	menuItemID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Success: false,
			Message: "Invalid menu item ID",
		})
		return
	}

	var menuItem models.MenuItem
	if err := h.db.DB.Preload("Category").Where("id = ?", menuItemID).First(&menuItem).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, models.ErrorResponse{
				Success: false,
				Message: "Menu item not found",
			})
		} else {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse{
				Success: false,
				Message: "Failed to fetch menu item",
				Error:   err.Error(),
			})
		}
		return
	}

	// Get restaurant info for additional context
	var restaurant models.Restaurant
	if err := h.db.DB.Select("id, name, image").Where("id = ?", menuItem.RestaurantID).First(&restaurant).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Success: false,
			Message: "Failed to fetch restaurant info",
			Error:   err.Error(),
		})
		return
	}

	response := h.toMenuItemResponse(&menuItem)

	// Add additional context
	itemWithContext := map[string]interface{}{
		"menuItem": response,
		"restaurant": map[string]interface{}{
			"id":    restaurant.ID,
			"name":  restaurant.Name,
			"image": restaurant.Image,
		},
		"category": map[string]interface{}{
			"id":   menuItem.Category.ID,
			"name": menuItem.Category.Name,
		},
	}

	c.JSON(http.StatusOK, models.SuccessResponse{
		Success: true,
		Message: "Menu item retrieved successfully",
		Data:    itemWithContext,
	})
}

func (h *MenuHandler) toCategoryResponse(category *models.MenuCategory) CategoryResponse {
	response := CategoryResponse{
		ID:           category.ID,
		RestaurantID: category.RestaurantID,
		Name:         category.Name,
		Description:  category.Description,
		Order:        category.Order,
		IsActive:     category.IsActive,
		MenuItems:    []MenuItemResponse{},
	}

	for _, item := range category.MenuItems {
		response.MenuItems = append(response.MenuItems, h.toMenuItemResponse(&item))
	}

	return response
}

func (h *MenuHandler) toMenuItemResponse(item *models.MenuItem) MenuItemResponse {
	return MenuItemResponse{
		ID:              item.ID,
		RestaurantID:    item.RestaurantID,
		CategoryID:      item.CategoryID,
		Name:            item.Name,
		Description:     item.Description,
		Price:           item.Price,
		Image:           item.Image,
		IsAvailable:     item.IsAvailable,
		PreparationTime: item.PreparationTime,
		Allergens:       item.Allergens,
		Calories:        item.Calories,
		Protein:         item.Protein,
		Carbs:           item.Carbs,
		Fat:             item.Fat,
		Fiber:           item.Fiber,
		Sodium:          item.Sodium,
	}
}
