# Stage 1: Build the application
# Use an appropriate Go version, matching your project if possible
FROM golang:1.22-alpine AS builder

# Set the Current Working Directory inside the container
WORKDIR /app

# Copy go mod and sum files
COPY go.mod go.sum ./

# Download all dependencies. Dependencies will be cached if the go.mod and go.sum files are not changed
RUN go mod download

# Copy the source code into the container
COPY . .

# Build the Go app
# -ldflags="-w -s" reduces the size of the binary
# CGO_ENABLED=0 builds a static binary
# Adjust the path to main.go if it's different
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -a -installsuffix cgo -o main ./cmd/app/main.go

# Stage 2: Create the final, minimal image
FROM alpine:latest

# Add ca-certificates, curl (for downloading migrate), and bash (for entrypoint script)
RUN apk --no-cache add ca-certificates curl bash

# Install golang-migrate CLI
ARG MIGRATE_VERSION=v4.17.1 # Use a specific version
RUN curl -L https://github.com/golang-migrate/migrate/releases/download/${MIGRATE_VERSION}/migrate.linux-amd64.tar.gz | tar xvz && \
    mv migrate /usr/local/bin/migrate # Removed redundant chmod here

WORKDIR /app # Changed WORKDIR to /app for consistency

# Copy migrations (assuming they are in a 'migrations' folder in the build context)
COPY migrations /migrations

# Copy the Pre-built binary file from the previous stage
COPY --from=builder /app/main .

# Copy entrypoint script and set permissions
COPY --chmod=0755 entrypoint.sh /entrypoint.sh

# Expose port 8080 to the outside world (based on your main.go output)
EXPOSE 8080

# Set the entrypoint script
ENTRYPOINT ["/entrypoint.sh"]

# Default command passed to the entrypoint script
CMD ["./main"]
