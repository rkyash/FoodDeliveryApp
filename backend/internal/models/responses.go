package models

// Common API response structures for Swagger documentation

type ErrorResponse struct {
	Success bool   `json:"success" example:"false"`
	Message string `json:"message" example:"Error occurred"`
	Error   string `json:"error" example:"Error message"`
}

type SuccessResponse struct {
	Success bool        `json:"success" example:"true"`
	Message string      `json:"message" example:"Operation completed successfully"`
	Data    interface{} `json:"data,omitempty"`
}

type PaginationResponse struct {
	Page  int `json:"page" example:"1"`
	Limit int `json:"limit" example:"10"`
	Total int `json:"total" example:"100"`
	Pages int `json:"pages" example:"10"`
}

type RestaurantsResponse struct {
	Success bool           `json:"success" example:"true"`
	Message string         `json:"message" example:"Restaurants retrieved successfully"`
	Data    RestaurantData `json:"data"`
}

type RestaurantData struct {
	Restaurants []Restaurant       `json:"restaurants"`
	Pagination  PaginationResponse `json:"pagination"`
}

type OrderResponse struct {
	Success bool   `json:"success" example:"true"`
	Message string `json:"message" example:"Order created successfully"`
	Data    Order  `json:"data"`
}

type OrdersResponse struct {
	Success bool    `json:"success" example:"true"`
	Message string  `json:"message" example:"Orders retrieved successfully"`
	Data    []Order `json:"data"`
}

type MenuResponse struct {
	Success bool           `json:"success" example:"true"`
	Message string         `json:"message" example:"Menu retrieved successfully"`
	Data    []MenuCategory `json:"data"`
}
