set GOOS=linux
set GOARCH=amd64
set CGO_ENABLED=0
go build -o bootstrap
powershell Compress-Archive -Path bootstrap -DestinationPath bootstrap.zip -Force
sam deploy --template-file template.yaml --stack-name AoE4Friends --capabilities CAPABILITY_IAM