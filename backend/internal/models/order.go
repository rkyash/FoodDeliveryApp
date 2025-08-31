package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type OrderStatus string

const (
	PendingStatus       OrderStatus = "pending"
	ConfirmedStatus     OrderStatus = "confirmed"
	PreparingStatus     OrderStatus = "preparing"
	ReadyForPickupStatus OrderStatus = "ready_for_pickup"
	PickedUpStatus      OrderStatus = "picked_up"
	OnTheWayStatus      OrderStatus = "on_the_way"
	DeliveredStatus     OrderStatus = "delivered"
	CancelledStatus     OrderStatus = "cancelled"
)

type PaymentMethodType string

const (
	CreditCardPayment    PaymentMethodType = "credit_card"
	DebitCardPayment     PaymentMethodType = "debit_card"
	DigitalWalletPayment PaymentMethodType = "digital_wallet"
	CashPayment          PaymentMethodType = "cash"
)

type Order struct {
	ID                    uuid.UUID   `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	UserID                uuid.UUID   `json:"userId" gorm:"type:uuid;not null"`
	RestaurantID          uuid.UUID   `json:"restaurantId" gorm:"type:uuid;not null"`
	Status                OrderStatus `json:"status" gorm:"default:'pending';not null"`
	TotalAmount           float64     `json:"totalAmount" gorm:"not null"`
	DeliveryFee           float64     `json:"deliveryFee" gorm:"default:0.0"`
	Tax                   float64     `json:"tax" gorm:"default:0.0"`
	Tip                   float64     `json:"tip" gorm:"default:0.0"`
	DeliveryAddressID     uuid.UUID   `json:"deliveryAddressId" gorm:"type:uuid;not null"`
	PaymentMethodType     PaymentMethodType `json:"paymentMethodType" gorm:"not null"`
	PaymentDetails        string      `json:"paymentDetails" gorm:"type:jsonb"`
	SpecialInstructions   string      `json:"specialInstructions"`
	EstimatedDeliveryTime *time.Time  `json:"estimatedDeliveryTime,omitempty"`
	ActualDeliveryTime    *time.Time  `json:"actualDeliveryTime,omitempty"`
	CreatedAt             time.Time   `json:"createdAt"`
	UpdatedAt             time.Time   `json:"updatedAt"`

	// Relationships
	User            User              `json:"user" gorm:"constraint:OnDelete:CASCADE"`
	Restaurant      Restaurant        `json:"restaurant" gorm:"constraint:OnDelete:CASCADE"`
	DeliveryAddress Address           `json:"deliveryAddress" gorm:"foreignKey:DeliveryAddressID"`
	Items           []OrderItem       `json:"items" gorm:"foreignKey:OrderID"`
	TrackingUpdates []TrackingUpdate  `json:"trackingUpdates" gorm:"foreignKey:OrderID"`
}

func (o *Order) BeforeCreate(tx *gorm.DB) (err error) {
	if o.ID == uuid.Nil {
		o.ID = uuid.New()
	}
	return
}

type OrderItem struct {
	ID                  uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	OrderID             uuid.UUID `json:"orderId" gorm:"type:uuid;not null"`
	MenuItemID          uuid.UUID `json:"menuItemId" gorm:"type:uuid;not null"`
	Name                string    `json:"name" gorm:"not null"`
	Price               float64   `json:"price" gorm:"not null"`
	Quantity            int       `json:"quantity" gorm:"not null"`
	CustomizationsData  string    `json:"customizationsData" gorm:"type:jsonb"`
	SpecialInstructions string    `json:"specialInstructions"`
	CreatedAt           time.Time `json:"createdAt"`
	UpdatedAt           time.Time `json:"updatedAt"`

	// Relationships
	Order    Order    `json:"order" gorm:"constraint:OnDelete:CASCADE"`
	MenuItem MenuItem `json:"menuItem" gorm:"constraint:OnDelete:CASCADE"`
}

func (oi *OrderItem) BeforeCreate(tx *gorm.DB) (err error) {
	if oi.ID == uuid.Nil {
		oi.ID = uuid.New()
	}
	return
}

type TrackingUpdate struct {
	ID        uuid.UUID   `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	OrderID   uuid.UUID   `json:"orderId" gorm:"type:uuid;not null"`
	Status    OrderStatus `json:"status" gorm:"not null"`
	Message   string      `json:"message" gorm:"not null"`
	Latitude  *float64    `json:"latitude,omitempty"`
	Longitude *float64    `json:"longitude,omitempty"`
	CreatedAt time.Time   `json:"createdAt"`

	// Relationships
	Order Order `json:"order" gorm:"constraint:OnDelete:CASCADE"`
}

func (tu *TrackingUpdate) BeforeCreate(tx *gorm.DB) (err error) {
	if tu.ID == uuid.Nil {
		tu.ID = uuid.New()
	}
	return
}