# ngrok Docker Desktop Extension

Use [ngrok](https://ngrok.com)'s API Gateway cloud service to forward traffic from internet-accessible endpoint URLs to your local Docker containers.

Go here if you're looking for the [ngrok Docker image](#docker-image).

## Installation

To install the extension:

1. Open Docker Desktop and go to the extensions marketplace.
2. Search for "ngrok" and click "Install".
3. Once installed, activate the extension by clicking on the ngrok icon in the Docker Desktop toolbar.

## Quick start

After installing the extension:

1. The extension will prompt you to add your ngrok authtoken
2. Start an endpoint by clicking the start icon on the container you want to put online
3. Optionally specify a custom URL and [traffic policy](https://ngrok.com/docs/traffic-policy/).
4. You have an endpoint URL for your container that you can share!

## Screenshots
<img width="1292" alt="containers" src="./resources/screenshot.png">

## Development

See [AGENT.md](AGENT.md)

## Docker Image

Perfer a terminal over GUI? You're probably looking for the [ngrok Docker Image](https://hub.docker.com/r/ngrok/ngrok).

The docker image is suited for automation, scripting, and DevOps workflows. 

Links:
- [ngrok Docker Image on Dockerhub](https://hub.docker.com/r/ngrok/ngrok)
- [ngrok Docker Image on Github](https://github.com/ngrok/docker-ngrok)