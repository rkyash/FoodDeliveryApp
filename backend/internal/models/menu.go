package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type MenuCategory struct {
	ID           uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	RestaurantID uuid.UUID `json:"restaurantId" gorm:"type:uuid;not null"`
	Name         string    `json:"name" gorm:"not null"`
	Description  string    `json:"description"`
	Order        int       `json:"order" gorm:"default:0"`
	IsActive     bool      `json:"isActive" gorm:"default:true"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`

	// Relationships
	Restaurant Restaurant `json:"restaurant" gorm:"constraint:OnDelete:CASCADE"`
	MenuItems  []MenuItem `json:"menuItems" gorm:"foreignKey:CategoryID"`
}

func (mc *MenuCategory) BeforeCreate(tx *gorm.DB) (err error) {
	if mc.ID == uuid.Nil {
		mc.ID = uuid.New()
	}
	return
}

type MenuItem struct {
	ID              uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	RestaurantID    uuid.UUID `json:"restaurantId" gorm:"type:uuid;not null"`
	CategoryID      uuid.UUID `json:"categoryId" gorm:"type:uuid;not null"`
	Name            string    `json:"name" gorm:"not null"`
	Description     string    `json:"description"`
	Price           float64   `json:"price" gorm:"not null"`
	Image           string    `json:"image"`
	IsAvailable     bool      `json:"isAvailable" gorm:"default:true"`
	PreparationTime int       `json:"preparationTime" gorm:"default:15"`
	Allergens       string    `json:"allergens" gorm:"type:text"`
	Calories        *int      `json:"calories,omitempty"`
	Protein         *float64  `json:"protein,omitempty"`
	Carbs           *float64  `json:"carbs,omitempty"`
	Fat             *float64  `json:"fat,omitempty"`
	Fiber           *float64  `json:"fiber,omitempty"`
	Sodium          *float64  `json:"sodium,omitempty"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`

	// Relationships
	Restaurant      Restaurant            `json:"restaurant" gorm:"constraint:OnDelete:CASCADE"`
	Category        MenuCategory          `json:"category" gorm:"constraint:OnDelete:CASCADE"`
	Customizations  []MenuCustomization   `json:"customizations" gorm:"foreignKey:MenuItemID"`
}

func (mi *MenuItem) BeforeCreate(tx *gorm.DB) (err error) {
	if mi.ID == uuid.Nil {
		mi.ID = uuid.New()
	}
	return
}

type CustomizationType string

const (
	SizeCustomization   CustomizationType = "size"
	AddonCustomization  CustomizationType = "addon"
	ChoiceCustomization CustomizationType = "choice"
)

type MenuCustomization struct {
	ID            uuid.UUID         `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	MenuItemID    uuid.UUID         `json:"menuItemId" gorm:"type:uuid;not null"`
	Name          string            `json:"name" gorm:"not null"`
	Type          CustomizationType `json:"type" gorm:"not null"`
	Required      bool              `json:"required" gorm:"default:false"`
	MaxSelections int               `json:"maxSelections" gorm:"default:1"`
	CreatedAt     time.Time         `json:"createdAt"`
	UpdatedAt     time.Time         `json:"updatedAt"`

	// Relationships
	MenuItem MenuItem              `json:"menuItem" gorm:"constraint:OnDelete:CASCADE"`
	Options  []CustomizationOption `json:"options" gorm:"foreignKey:CustomizationID"`
}

func (mc *MenuCustomization) BeforeCreate(tx *gorm.DB) (err error) {
	if mc.ID == uuid.Nil {
		mc.ID = uuid.New()
	}
	return
}

type CustomizationOption struct {
	ID              uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	CustomizationID uuid.UUID `json:"customizationId" gorm:"type:uuid;not null"`
	Name            string    `json:"name" gorm:"not null"`
	PriceModifier   float64   `json:"priceModifier" gorm:"default:0.0"`
	IsAvailable     bool      `json:"isAvailable" gorm:"default:true"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`

	// Relationships
	Customization MenuCustomization `json:"customization" gorm:"constraint:OnDelete:CASCADE"`
}

func (co *CustomizationOption) BeforeCreate(tx *gorm.DB) (err error) {
	if co.ID == uuid.Nil {
		co.ID = uuid.New()
	}
	return
}