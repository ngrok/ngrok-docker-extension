LOCAL_IMAGE?=ngrok/ngrok-docker-extension-dev
IMAGE?=ngrok/ngrok-docker-extension
TAG?=latest

BUILDER=buildx-multi-arch

INFO_COLOR = \033[0;36m
NO_COLOR   = \033[m

build-extension: ## Build service image to be deployed as a desktop extension
	docker buildx build --tag=$(IMAGE):$(TAG) . --load

build-dev: ## Build service image to be deployed as a desktop extension
	docker build --tag=$(LOCAL_IMAGE) .

install-extension: build-dev ## Install the extension
	@if $$(docker extension ls | grep -q $(LOCAL_IMAGE)); \
		then docker extension update -f $(LOCAL_IMAGE); \
		else docker extension install -f $(LOCAL_IMAGE); fi
.PHONY: install-extension

dev-up:
	docker extension dev ui-source $(LOCAL_IMAGE) http://localhost:3000
	docker extension dev debug $(LOCAL_IMAGE)

dev-reset:
	docker extension dev reset $(LOCAL_IMAGE)

update-extension: build-extension ## Update the extension
	docker extension update -f $(IMAGE):$(TAG)

prepare-buildx: ## Create buildx builder for multi-arch build, if not exists
	docker buildx inspect $(BUILDER) || docker buildx create --name=$(BUILDER) --driver=docker-container --driver-opt=network=host

push-extension: prepare-buildx ## Build & Upload extension image to hub. Do not push if tag already exists: make push-extension tag=0.1
	docker buildx build --push --builder=$(BUILDER) --platform=linux/amd64,linux/arm64 --build-arg TAG=$(TAG) --tag=$(IMAGE):$(TAG) .

help: ## Show this help
	@echo Please specify a build target. The choices are:
	@grep -E '^[0-9a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "$(INFO_COLOR)%-30s$(NO_COLOR) %s\n", $$1, $$2}'

.PHONY: help
