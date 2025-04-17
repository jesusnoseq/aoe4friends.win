package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
)

// StorageService defines the interface for storage operations.
type StorageService interface {
	LoadData(filePath string, v interface{}) error
	SaveData(filePath string, v interface{}) error
}

func getStorageService() StorageService {
	cfg := GetConfig()
	if cfg.StorageType == StorageTypeCloudflare {
		service, err := NewCloudflareR2StorageService(
			context.Background(), cfg.R2Endpoint, cfg.R2AccessKey, cfg.R2SecretKey, cfg.R2Bucket,
		)
		if err != nil {
			panic(fmt.Sprintf("Failed to initialize Cloudflare R2 storage: %v", err))
		}
		return service
	}
	// Default to local storage
	return &LocalStorageService{}
}

// LocalStorageService implements StorageService for local files.
type LocalStorageService struct{}

func (s *LocalStorageService) LoadData(filePath string, v interface{}) error {
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		return nil // No file, treat as empty
	}
	data, err := os.ReadFile(filePath)
	if err != nil {
		return err
	}
	return json.Unmarshal(data, v)
}

func (s *LocalStorageService) SaveData(filePath string, v interface{}) error {
	data, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(filePath, data, 0644)
}

// CloudflareR2StorageService implements StorageService for Cloudflare R2.
type CloudflareR2StorageService struct {
	Client     *s3.Client
	BucketName string
}

func NewCloudflareR2StorageService(ctx context.Context, endpoint, accessKey, secretKey, bucket string) (*CloudflareR2StorageService, error) {
	cfg, err := config.LoadDefaultConfig(ctx,
		config.WithRegion("auto"),
		config.WithCredentialsProvider(
			credentials.NewStaticCredentialsProvider(accessKey, secretKey, ""),
		),
		config.WithEndpointResolver(
			aws.EndpointResolverFunc(func(service, region string) (aws.Endpoint, error) {
				return aws.Endpoint{
					URL:           endpoint,
					SigningRegion: "auto",
				}, nil
			}),
		),
	)
	if err != nil {
		return nil, err
	}
	client := s3.NewFromConfig(cfg)
	return &CloudflareR2StorageService{
		Client:     client,
		BucketName: bucket,
	}, nil
}

func (s *CloudflareR2StorageService) LoadData(filePath string, v interface{}) error {
	out, err := s.Client.GetObject(context.TODO(), &s3.GetObjectInput{
		Bucket: &s.BucketName,
		Key:    &filePath,
	})
	var nsk *types.NoSuchKey
	if err != nil {
		if ok := errors.As(err, &nsk); ok {
			return nil // No file, treat as empty
		}
		return err
	}
	defer out.Body.Close()
	data, err := io.ReadAll(out.Body)
	if err != nil {
		return err
	}
	return json.Unmarshal(data, v)
}

func (s *CloudflareR2StorageService) SaveData(filePath string, v interface{}) error {
	data, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return err
	}
	_, err = s.Client.PutObject(context.TODO(), &s3.PutObjectInput{
		Bucket: &s.BucketName,
		Key:    &filePath,
		Body:   bytes.NewReader(data),
	})
	return err
}
