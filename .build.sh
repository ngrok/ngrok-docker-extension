docker buildx build -t ngrok/ngrok-docker-extension:latest . --load
docker extension update ngrok/ngrok-docker-extension:latest -f
docker extension dev debug ngrok/ngrok-docker-extension:latest
docker extension dev ui-source ngrok/ngrok-docker-extension:latest http://localhost:3000