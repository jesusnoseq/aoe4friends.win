#GOOS=js GOARCH=wasm go build -o main.wasm
GOOS=linux GOARCH=amd64 go build -o back
