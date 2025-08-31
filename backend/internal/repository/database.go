package repository

import (
	"log"

	"restaurantapp/config"
	"restaurantapp/internal/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type Database struct {
	DB *gorm.DB
}

func NewDatabase(cfg *config.DatabaseConfig) *Database {
	var logLevel logger.LogLevel
	if cfg.SSLMode == "disable" {
		logLevel = logger.Info
	} else {
		logLevel = logger.Error
	}

	db, err := gorm.Open(postgres.Open(cfg.DSN()), &gorm.Config{
		Logger: logger.Default.LogMode(logLevel),
	})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	return &Database{DB: db}
}

func (d *Database) AutoMigrate() error {
	return d.DB.AutoMigrate(
		&models.User{},
		&models.Address{},
		&models.Restaurant{},
		&models.OpeningHours{},
		&models.RestaurantImage{},
		&models.MenuCategory{},
		&models.MenuItem{},
		&models.MenuCustomization{},
		&models.CustomizationOption{},
		&models.Order{},
		&models.OrderItem{},
		&models.TrackingUpdate{},
		&models.Review{},
		&models.Favorite{},
	)
}

func (d *Database) Close() error {
	sqlDB, err := d.DB.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}