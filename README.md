# ngrok Docker Desktop Extension

Make your local Docker containers accessible on the internet using [ngrok](https://ngrok.com)’s secure, global network, no port forwarding required. 
This Docker Desktop extension creates public URLs available to anyone on the planet and routes that traffic directly to your containers with a single click.

Looking for the CLI-first option? See the [Official ngrok Docker image](#docker-image).

## Installation

[Install from Docker Desktop Marketplace](https://open.docker.com/extensions/marketplace?extensionId=ngrok/ngrok-docker-extension).

## Quick start

After installing the extension:

1. When prompted, add your ngrok authtoken. If you don’t have one, [sign up for a free ngrok account](https://dashboard.ngrok.com/signup) to get it.
2. Start an endpoint by clicking the `+` icon next to the container you want to put online.
3. Optionally set a custom URL and a [traffic policy](https://ngrok.com/docs/traffic-policy/).
4. Share the public endpoint URL with anyone who needs access.

## Screenshot
<img width="1292" alt="containers" src="./resources/screenshot.png">

## Development

See `AGENT.md`.

## Docker image

Prefer a terminal over a GUI? You may want the [ngrok Docker image](https://hub.docker.com/r/ngrok/ngrok).

The image fits automation, scripting, and DevOps workflows.

Links:
- [ngrok Docker image on Docker Hub](https://hub.docker.com/r/ngrok/ngrok)
- [ngrok Docker image on GitHub](https://github.com/ngrok/docker-ngrok)
