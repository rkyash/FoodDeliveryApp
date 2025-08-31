package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Review struct {
	ID           uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	UserID       uuid.UUID `json:"userId" gorm:"type:uuid;not null"`
	RestaurantID uuid.UUID `json:"restaurantId" gorm:"type:uuid;not null"`
	OrderID      uuid.UUID `json:"orderId" gorm:"type:uuid;not null"`
	Rating       int       `json:"rating" gorm:"not null;check:rating >= 1 AND rating <= 5"`
	Comment      string    `json:"comment"`
	Photos       []string  `json:"photos" gorm:"type:jsonb"`
	Response     string    `json:"response"`
	ResponseAt   *time.Time `json:"responseAt,omitempty"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`

	// Relationships
	User       User       `json:"user" gorm:"constraint:OnDelete:CASCADE"`
	Restaurant Restaurant `json:"restaurant" gorm:"constraint:OnDelete:CASCADE"`
	Order      Order      `json:"order" gorm:"constraint:OnDelete:CASCADE"`
}

func (r *Review) BeforeCreate(tx *gorm.DB) (err error) {
	if r.ID == uuid.Nil {
		r.ID = uuid.New()
	}
	return
}

type Favorite struct {
	ID           uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	UserID       uuid.UUID `json:"userId" gorm:"type:uuid;not null"`
	RestaurantID uuid.UUID `json:"restaurantId" gorm:"type:uuid;not null"`
	CreatedAt    time.Time `json:"createdAt"`

	// Relationships
	User       User       `json:"user" gorm:"constraint:OnDelete:CASCADE"`
	Restaurant Restaurant `json:"restaurant" gorm:"constraint:OnDelete:CASCADE"`
}

func (f *Favorite) BeforeCreate(tx *gorm.DB) (err error) {
	if f.ID == uuid.Nil {
		f.ID = uuid.New()
	}
	return
}