package handlers

import (
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"restaurantapp/config"
	"restaurantapp/internal/middleware"
	"restaurantapp/internal/models"
	"restaurantapp/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type UploadHandler struct {
	db  *repository.Database
	cfg *config.Config
}

type UploadResponse struct {
	URL      string `json:"url"`
	Filename string `json:"filename"`
	Size     int64  `json:"size"`
	Type     string `json:"type"`
}

const (
	MaxFileSize   = 5 * 1024 * 1024 // 5MB
	UploadDir     = "uploads"
	ImagesDir     = "images"
	RestaurantDir = "restaurants"
	MenuDir       = "menu"
)

var AllowedImageTypes = map[string]bool{
	"image/jpeg": true,
	"image/jpg":  true,
	"image/png":  true,
	"image/webp": true,
	"image/gif":  true,
}

func NewUploadHandler(db *repository.Database, cfg *config.Config) *UploadHandler {
	return &UploadHandler{
		db:  db,
		cfg: cfg,
	}
}

// UploadImage godoc
// @Summary Upload an image file
// @Description Upload an image for restaurant or menu item
// @Tags upload
// @Accept multipart/form-data
// @Produce json
// @Security Bearer
// @Param file formData file true "Image file to upload"
// @Param type formData string true "Upload type" Enums(restaurant, menu)
// @Success 200 {object} models.SuccessResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 401 {object} models.ErrorResponse
// @Failure 413 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /upload/image [post]
func (h *UploadHandler) UploadImage(c *gin.Context) {
	_, exists := middleware.GetCurrentUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Success: false,
			Error:   "User not authenticated",
		})
		return
	}

	// Get upload type (restaurant or menu)
	uploadType := c.PostForm("type")
	if uploadType == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Success: false,
			Error:   "Upload type is required (restaurant or menu)",
		})
		return
	}

	// Validate upload type
	if uploadType != "restaurant" && uploadType != "menu" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Success: false,
			Error:   "Invalid upload type. Must be 'restaurant' or 'menu'",
		})
		return
	}

	// Get the file from form
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Success: false,
			Error:   "No file provided or invalid file",
		})
		return
	}
	defer file.Close()

	// Validate file size
	if header.Size > MaxFileSize {
		c.JSON(http.StatusRequestEntityTooLarge, models.ErrorResponse{
			Success: false,
			Error:   fmt.Sprintf("File too large. Maximum size is %d bytes", MaxFileSize),
		})
		return
	}

	// Validate file type
	contentType := header.Header.Get("Content-Type")
	if !AllowedImageTypes[contentType] {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Success: false,
			Error:   "Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed",
		})
		return
	}

	// Generate unique filename
	ext := filepath.Ext(header.Filename)
	if ext == "" {
		// Try to determine extension from content type
		switch contentType {
		case "image/jpeg":
			ext = ".jpg"
		case "image/png":
			ext = ".png"
		case "image/webp":
			ext = ".webp"
		case "image/gif":
			ext = ".gif"
		default:
			ext = ".jpg"
		}
	}

	filename := fmt.Sprintf("%s_%d%s", uuid.New().String(), time.Now().Unix(), ext)

	// Create directory structure
	var subDir string
	switch uploadType {
	case "restaurant":
		subDir = RestaurantDir
	case "menu":
		subDir = MenuDir
	}

	uploadPath := filepath.Join(UploadDir, ImagesDir, subDir)
	if err := os.MkdirAll(uploadPath, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Success: false,
			Error:   "Failed to create upload directory",
		})
		return
	}

	// Full file path
	filePath := filepath.Join(uploadPath, filename)

	// Create the file
	dst, err := os.Create(filePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Success: false,
			Error:   "Failed to create file",
		})
		return
	}
	defer dst.Close()

	// Copy uploaded file to destination
	if _, err := io.Copy(dst, file); err != nil {
		// Clean up created file on error
		os.Remove(filePath)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Success: false,
			Error:   "Failed to save file",
		})
		return
	}

	// Generate URL for the uploaded file
	fileURL := fmt.Sprintf("/api/uploads/%s/%s/%s", ImagesDir, subDir, filename)

	response := UploadResponse{
		URL:      fileURL,
		Filename: filename,
		Size:     header.Size,
		Type:     contentType,
	}

	c.JSON(http.StatusOK, models.SuccessResponse{
		Success: true,
		Message: "File uploaded successfully",
		Data:    response,
	})
}

// ServeUploadedFile serves uploaded files
func (h *UploadHandler) ServeUploadedFile(c *gin.Context) {
	// Get path parameters
	category := c.Param("category") // images
	subdir := c.Param("subdir")     // restaurants or menu
	filename := c.Param("filename")

	// Validate path components to prevent directory traversal
	if strings.Contains(category, "..") || strings.Contains(subdir, "..") || strings.Contains(filename, "..") {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Success: false,
			Error:   "Invalid file path",
		})
		return
	}

	// Construct file path
	filePath := filepath.Join(UploadDir, category, subdir, filename)

	// Check if file exists
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, models.ErrorResponse{
			Success: false,
			Error:   "File not found",
		})
		return
	}

	// Serve the file
	c.File(filePath)
}

// DeleteUploadedFile deletes an uploaded file
func (h *UploadHandler) DeleteUploadedFile(c *gin.Context) {
	_, exists := middleware.GetCurrentUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Success: false,
			Error:   "User not authenticated",
		})
		return
	}

	// Get path parameters
	category := c.Param("category") // images
	subdir := c.Param("subdir")     // restaurants or menu
	filename := c.Param("filename")

	// Validate path components
	if strings.Contains(category, "..") || strings.Contains(subdir, "..") || strings.Contains(filename, "..") {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Success: false,
			Error:   "Invalid file path",
		})
		return
	}

	// Construct file path
	filePath := filepath.Join(UploadDir, category, subdir, filename)

	// Check if file exists
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, models.ErrorResponse{
			Success: false,
			Error:   "File not found",
		})
		return
	}

	// TODO: Add permission check here
	// For restaurant images: check if user owns the restaurant
	// For menu images: check if user owns the restaurant that has this menu item

	// Delete the file
	if err := os.Remove(filePath); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Success: false,
			Error:   "Failed to delete file",
		})
		return
	}

	c.JSON(http.StatusOK, models.SuccessResponse{
		Success: true,
		Message: "File deleted successfully",
	})
}

// Helper function to validate file by reading its header
func validateFileType(file multipart.File) (string, error) {
	// Read the first 512 bytes to determine content type
	buffer := make([]byte, 512)
	n, err := file.Read(buffer)
	if err != nil && err != io.EOF {
		return "", err
	}

	// Reset file pointer to beginning
	file.Seek(0, 0)

	// Detect content type
	contentType := http.DetectContentType(buffer[:n])
	
	if !AllowedImageTypes[contentType] {
		return "", fmt.Errorf("invalid file type: %s", contentType)
	}

	return contentType, nil
}