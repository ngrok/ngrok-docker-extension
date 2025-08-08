IMAGE?=ngrok/ngrok-docker-extension
TAG?=0.0.0-dev

# Normalize TAG by stripping 'v' prefix if present
override TAG := $(shell echo $(TAG) | sed 's/^v//')

BUILDER=buildx-multi-arch

INFO_COLOR = \033[0;36m
NO_COLOR   = \033[m

build-extension: ## Build service image to be deployed as a desktop extension
	docker buildx build --build-arg VERSION=$(TAG) --tag=$(IMAGE):$(TAG) . --load

build-extension-dev: ## Build service image with development tools (includes curl)
	docker buildx build --build-arg DEVELOPMENT=true --build-arg VERSION=$(TAG) --tag=$(IMAGE):$(TAG) . --load

install-extension: build-extension ## Install the extension
	docker extension install -f $(IMAGE):$(TAG)

install-extension-dev: build-extension-dev ## Install the extension with development tools
	docker extension install -f $(IMAGE):$(TAG)

dev-up:
	docker extension dev ui-source $(IMAGE):$(TAG) http://localhost:3000
	docker extension dev debug $(IMAGE):$(TAG)

dev-reset:
	docker extension dev reset $(IMAGE):$(TAG)

update-extension: build-extension ## Update the extension
	docker extension update -f $(IMAGE):$(TAG)

update-extension-dev: build-extension-dev ## Update the extension with development tools
	docker extension update -f $(IMAGE):$(TAG)

prepare-buildx: ## Create buildx builder for multi-arch build, if not exists
	docker buildx inspect $(BUILDER) || docker buildx create --name=$(BUILDER) --driver=docker-container --driver-opt=network=host

push-extension: prepare-buildx ## Build & Upload extension image to hub. Do not push if tag already exists: make push-extension tag=0.1
	docker buildx build --push --builder=$(BUILDER) --platform=linux/amd64,linux/arm64 --build-arg VERSION=$(TAG) --tag=$(IMAGE):$(TAG) .

help: ## Show this help
	@echo Please specify a build target. The choices are:
	@grep -E '^[0-9a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "$(INFO_COLOR)%-30s$(NO_COLOR) %s\n", $$1, $$2}'

.PHONY: help
