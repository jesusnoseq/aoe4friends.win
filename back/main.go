package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
)

const (
	dataFolder = "temp/data"
)

func analyzeLambdaHandler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {

	profileIDStr := request.QueryStringParameters["profile_id"]
	if profileIDStr == "" {
		return events.APIGatewayProxyResponse{
			StatusCode: http.StatusBadRequest,
			Body:       "Missing profile_id",
		}, nil
	}
	profileID, err := strconv.Atoi(profileIDStr)
	if err != nil {
		return events.APIGatewayProxyResponse{
			StatusCode: http.StatusBadRequest,
			Body:       "Invalid profile_id",
		}, nil
	}

	filePath := fmt.Sprintf("%s/player_games_%d.json", dataFolder, profileID)
	games, err := processPlayerGames(profileID, filePath)
	if err != nil {
		return events.APIGatewayProxyResponse{
			StatusCode: http.StatusInternalServerError,
			Body:       "Error processing player games: " + err.Error(),
		}, nil
	}
	analysis := AnalyzeGames(games, profileID)
	respBody, err := json.Marshal(analysis)
	if err != nil {
		return events.APIGatewayProxyResponse{
			StatusCode: http.StatusInternalServerError,
			Body:       "Error encoding response: " + err.Error(),
		}, nil
	}
	return events.APIGatewayProxyResponse{
		StatusCode: http.StatusOK,
		Headers: map[string]string{
			"Content-Type":                 "application/json",
			"Access-Control-Allow-Origin":  "*",
			"Access-Control-Allow-Methods": "GET,OPTIONS",
		},
		Body: string(respBody),
	}, nil
}

func main() {
	lambda.Start(analyzeLambdaHandler)
}
