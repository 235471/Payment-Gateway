#!/bin/sh

# Exit immediately if a command exits with a non-zero status.
set -e

# Simple wait for DB (adjust time or use a more robust check if needed)
echo "Waiting for database..."
sleep 10

# Construct DB URL from environment variables
# Ensure these variables are set in your docker-compose.yml for the go-backend service
DB_URL="postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=${DB_SSLMODE:-disable}"

echo "Running database migrations..."
# The migrate tool and migrations will be added via Dockerfile
# Assuming migrations are copied to /migrations in the container
migrate -path /migrations -database "$DB_URL" up

echo "Migrations finished."

# Execute the main command (passed from Dockerfile CMD)
echo "Starting application..."
exec "$@"
