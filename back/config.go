package main

import (
	"os"
	"sync"
)

const (
	StorageTypeLocal      = "local"
	StorageTypeCloudflare = "cloudflare"
	StorageTypeNone       = "none"
)

type Config struct {
	StorageType string
	R2Endpoint  string
	R2AccessKey string
	R2SecretKey string
	R2Bucket    string
}

var (
	configInstance *Config
	configOnce     sync.Once
)

// GetConfig returns the singleton config instance.
func GetConfig() *Config {
	configOnce.Do(func() {
		configInstance = &Config{
			StorageType: getEnv("STORAGE_TYPE", StorageTypeNone),
			R2Endpoint:  getEnv("R2_ENDPOINT", ""),
			R2AccessKey: getEnv("R2_ACCESS_KEY", ""),
			R2SecretKey: getEnv("R2_SECRET_KEY", ""),
			R2Bucket:    getEnv("R2_BUCKET", ""),
		}
	})
	return configInstance
}

func getEnv(key, defaultVal string) string {
	val := os.Getenv(key)
	if val == "" {
		return defaultVal
	}
	return val
}
