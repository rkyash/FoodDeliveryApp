package utils

import (
	"encoding/json"
	"fmt"
)

// ToJSON converts any interface{} to JSON string
func ToJSON(v interface{}) (string, error) {
	if v == nil {
		return "", nil
	}
	
	jsonBytes, err := json.Marshal(v)
	if err != nil {
		return "", fmt.Errorf("failed to marshal to JSON: %v", err)
	}
	
	return string(jsonBytes), nil
}

// FromJSON converts JSON string to interface{}
func FromJSON(jsonStr string, v interface{}) error {
	if jsonStr == "" {
		return nil
	}
	
	err := json.Unmarshal([]byte(jsonStr), v)
	if err != nil {
		return fmt.Errorf("failed to unmarshal from JSON: %v", err)
	}
	
	return nil
}