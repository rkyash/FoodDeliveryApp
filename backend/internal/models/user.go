package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type UserRole string

const (
	CustomerRole       UserRole = "customer"
	RestaurantOwnerRole UserRole = "restaurant_owner"
	AdminRole          UserRole = "admin"
)

type User struct {
	ID        uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Email     string    `json:"email" gorm:"uniqueIndex;not null"`
	Password  string    `json:"-" gorm:"not null"`
	FirstName string    `json:"firstName" gorm:"not null"`
	LastName  string    `json:"lastName" gorm:"not null"`
	Phone     string    `json:"phone" gorm:"not null"`
	Role      UserRole  `json:"role" gorm:"type:varchar(20);default:'customer';not null"`
	IsActive  bool      `json:"isActive" gorm:"default:true"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`

	// Relationships
	Addresses   []Address    `json:"addresses" gorm:"foreignKey:UserID"`
	Orders      []Order      `json:"orders" gorm:"foreignKey:UserID"`
	Reviews     []Review     `json:"reviews" gorm:"foreignKey:UserID"`
	Favorites   []Favorite   `json:"favorites" gorm:"foreignKey:UserID"`
	Restaurant  *Restaurant  `json:"restaurant" gorm:"foreignKey:OwnerID"`
}

func (u *User) BeforeCreate(tx *gorm.DB) (err error) {
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	return
}

type Address struct {
	ID        uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	UserID    uuid.UUID `json:"userId" gorm:"type:uuid;not null"`
	Street    string    `json:"street" gorm:"not null"`
	City      string    `json:"city" gorm:"not null"`
	State     string    `json:"state" gorm:"not null"`
	ZipCode   string    `json:"zipCode" gorm:"not null"`
	Country   string    `json:"country" gorm:"default:'US';not null"`
	IsDefault bool      `json:"isDefault" gorm:"default:false"`
	Latitude  *float64  `json:"latitude,omitempty"`
	Longitude *float64  `json:"longitude,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`

	// Relationships
	User User `json:"user" gorm:"constraint:OnDelete:CASCADE"`
}

func (a *Address) BeforeCreate(tx *gorm.DB) (err error) {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return
}