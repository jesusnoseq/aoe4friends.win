#!/bin/bash
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -o bootstrap
zip function.zip bootstrap
sam deploy --template-file template.yaml --stack-name AoE4Friends --capabilities CAPABILITY_IAM