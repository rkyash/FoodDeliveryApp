package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Restaurant struct {
	ID          uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	OwnerID     uuid.UUID `json:"ownerId" gorm:"type:uuid;not null"`
	Name        string    `json:"name" gorm:"not null"`
	Description string    `json:"description"`
	CuisineType string    `json:"cuisineType" gorm:"not null"`
	Address     string    `json:"address" gorm:"not null"`
	Phone       string    `json:"phone" gorm:"not null"`
	Email       string    `json:"email" gorm:"not null"`
	Rating      float64   `json:"rating" gorm:"default:0.0"`
	ReviewCount int       `json:"reviewCount" gorm:"default:0"`
	PriceRange  int       `json:"priceRange" gorm:"default:1;check:price_range >= 1 AND price_range <= 3"`
	DeliveryFee float64   `json:"deliveryFee" gorm:"default:0.0"`
	MinDeliveryTime int   `json:"minDeliveryTime" gorm:"default:30"`
	MaxDeliveryTime int   `json:"maxDeliveryTime" gorm:"default:60"`
	IsOpen      bool      `json:"isOpen" gorm:"default:true"`
	IsActive    bool      `json:"isActive" gorm:"default:true"`
	Image       string    `json:"image"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`

	// Relationships
	Owner           User             `json:"owner" gorm:"constraint:OnDelete:CASCADE"`
	Categories      []MenuCategory   `json:"categories" gorm:"foreignKey:RestaurantID"`
	MenuItems       []MenuItem       `json:"menuItems" gorm:"foreignKey:RestaurantID"`
	Orders          []Order          `json:"orders" gorm:"foreignKey:RestaurantID"`
	Reviews         []Review         `json:"reviews" gorm:"foreignKey:RestaurantID"`
	OpeningHours    []OpeningHours   `json:"openingHours" gorm:"foreignKey:RestaurantID"`
	Gallery         []RestaurantImage `json:"gallery" gorm:"foreignKey:RestaurantID"`
}

func (r *Restaurant) BeforeCreate(tx *gorm.DB) (err error) {
	if r.ID == uuid.Nil {
		r.ID = uuid.New()
	}
	return
}

type OpeningHours struct {
	ID           uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	RestaurantID uuid.UUID `json:"restaurantId" gorm:"type:uuid;not null"`
	Day          string    `json:"day" gorm:"not null"`
	OpenTime     string    `json:"openTime"`
	CloseTime    string    `json:"closeTime"`
	IsClosed     bool      `json:"isClosed" gorm:"default:false"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`

	// Relationships
	Restaurant Restaurant `json:"restaurant" gorm:"constraint:OnDelete:CASCADE"`
}

func (oh *OpeningHours) BeforeCreate(tx *gorm.DB) (err error) {
	if oh.ID == uuid.Nil {
		oh.ID = uuid.New()
	}
	return
}

type RestaurantImage struct {
	ID           uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	RestaurantID uuid.UUID `json:"restaurantId" gorm:"type:uuid;not null"`
	ImageURL     string    `json:"imageUrl" gorm:"not null"`
	Caption      string    `json:"caption"`
	Order        int       `json:"order" gorm:"default:0"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`

	// Relationships
	Restaurant Restaurant `json:"restaurant" gorm:"constraint:OnDelete:CASCADE"`
}

func (ri *RestaurantImage) BeforeCreate(tx *gorm.DB) (err error) {
	if ri.ID == uuid.Nil {
		ri.ID = uuid.New()
	}
	return
}