# Anti-Fraud Microservice (NestJS)

## Description

This project is a NestJS-based microservice designed to process incoming invoice data and detect potential fraud based on a set of configurable rules. It uses Prisma as the ORM, PostgreSQL as the database, and runs within a Docker environment managed by Docker Compose.

## Features

- Processes invoice data for fraud detection.
- Calculates a dynamic suspicion score based on recent rejected transactions.
- Implements multiple fraud detection specifications:
    - **Suspicious Account:** Checks if the account's dynamic suspicion score exceeds a configured threshold.
    - **Unusual Amount:** Compares the invoice amount against the account's historical transaction patterns using Median Absolute Deviation (MAD) for robust outlier detection. It considers recent history (configurable time window) with a fallback to a fixed number of past invoices if recent data is insufficient.
    - **Frequent High Value:** Detects if an account has made an excessive number of transactions within a defined timeframe.
- Stores invoice details and fraud history (if detected) in a PostgreSQL database.
- Provides API endpoints to retrieve invoice information (`GET /invoices`, `GET /invoices/:id`).
- Integrates with Kafka for asynchronous processing (see Kafka Integration section).

## Kafka Integration

This microservice integrates with Apache Kafka to decouple the fraud detection process:

-   **Consumes:** Listens to the `pending_transactions` topic for new invoices submitted for fraud analysis.
-   **Produces:** After processing, it publishes the result (approved or rejected with reason) to the `transactions_result` topic.
-   **Workflow:** The Go backend service is expected to consume messages from the `transactions_result` topic to update the final status of the invoice.

*(Note: Kafka broker details are typically configured via environment variables specific to the Kafka client setup, which are not detailed in this README but would be necessary for deployment.)*

## Technology Stack

- [NestJS](https://nestjs.com/)
- [Prisma](https://www.prisma.io/)
- [PostgreSQL](https://www.postgresql.org/)
- [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)
- [TypeScript](https://www.typescriptlang.org/)
- [Joi](https://joi.dev/) (for environment variable validation)

## Prerequisites

- Node.js (LTS version recommended, e.g., v20)
- npm or yarn
- Docker Desktop or Docker Engine/CLI
- Docker Compose

## Getting Started

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd anti-fraud-micro-service
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Create `.env` file:**
    Copy the `.env.example` file and create a new `.env` file in the project root and edit the necessary environment variables. See the Configuration section below.

    ```bash
    cp .env.example .env
    # or create .env manually
    ```

## Configuration

Create a `.env` file in the project root with the following variables:

```dotenv
# Mandatory: Connection string for the PostgreSQL database
# For local development targeting the Docker container via mapped port:
DATABASE_URL="postgresql://<username>:<password>@localhost:5433/<db-name>"
# For running inside Docker Compose network:
# DATABASE_URL="postgresql://<username>:<password>@db:5432/<db-name>"

# Optional: Port for the NestJS application (defaults to 3000 if not set)
# PORT=3000

# --- Fraud Detection Parameters ---

# Threshold score above which an account is considered suspicious
# (Used by SuspiciousAccountSpecification)
SUSPICIOUS_SCORE_THRESHOLD=10 # Example value

# --- Unusual Amount Specification Parameters ---
# Number of days to look back for recent invoice history
FRAUD_HISTORY_WINDOW_DAYS=60 # Example value
# Minimum number of invoices required within the history window for MAD calculation
FRAUD_MIN_INVOICES_WINDOW=10 # Example value
# Absolute minimum number of invoices needed (either from window or fallback) for any calculation
FRAUD_MIN_INVOICES_FALLBACK=3 # Example value
# Multiplier for MAD to determine the unusual amount threshold (Threshold = Median + Multiplier * 1.4826 * MAD)
FRAUD_MAD_MULTIPLIER=3 # Example value
# Fallback: Number of past invoices to fetch if the time window yields insufficient data (< FRAUD_MIN_INVOICES_WINDOW)
INVOICES_HISTORY_COUNT=5 # Example value (Note: Original example value was 10, ensure consistency or update example)

# --- Frequent High Value Specification Parameters ---
# Number of invoices within the timeframe to trigger frequent high-value fraud
# (Used by FrequentHighValueSpecification)
SUSPICIOUS_INVOICES_COUNT=5 # Example value

# Timeframe in hours to check for frequent high-value invoices
# (Used by FrequentHighValueSpecification)
SUSPICIOUS_TIMEFRAME_HOURS=24 # Example value

# --- Scoring Points ---
# POINTS_UNUSUAL_PATTERN=3 # Example value
# POINTS_FREQUENT_HIGH_VALUE=2 # Example value
```

## Running the Application (Docker)

This project uses Docker Compose to manage the NestJS application and the PostgreSQL database containers.

1.  **Build and Start Containers:**
    ```bash
    docker-compose up -d --build
    ```
    *   `--build` ensures images are built if they don't exist or if the Dockerfile changed.
    *   `-d` runs the containers in detached mode.

2.  **Starting the NestJS Application:**
    The current `Dockerfile` uses `CMD [ "tail", "-f", "/dev/null" ]`, which keeps the container running but doesn't start the NestJS application automatically. You need to start it manually inside the container:
    ```bash
    # Start in development/watch mode (requires devDependencies installed)
    docker-compose exec nestjs npm run start:dev

    # Or start in production mode (requires build step: npm run build)
    # docker-compose exec nestjs node dist/main
    ```
    Alternatively, modify the `CMD` in the `Dockerfile` to start the application automatically (e.g., `CMD [ "npm", "run", "start:dev" ]`).

3.  **Accessing the Application:**
    The application should be accessible at `http://localhost:3333` (or the port specified by `PORT` mapped to 3000).

## Database Migrations (Prisma)

This project uses Prisma Migrate for database schema management. The recommended development workflow leverages the volume mount configured in `docker-compose.yml`.

1.  **Ensure Containers are Running:**
    ```bash
    docker-compose up -d
    ```

2.  **Make Schema Changes:**
    Edit the `prisma/schema.prisma` file locally.

3.  **Create Migration Files:**
    Run the `migrate dev` command **locally**. Make sure your local `.env` file points to the Docker database (`DATABASE_URL="postgresql://<username>:<password>@localhost:<port>/<db-name>"`).
    ```bash
    npx prisma migrate dev --name your_migration_name
    ```
    This creates the necessary SQL migration files in `prisma/migrations/` locally, which are automatically reflected inside the container due to the volume mount.

4.  **Apply Migrations Inside Container:**
    Execute the `migrate deploy` command inside the running `nestjs` container:
    ```bash
    docker-compose exec nestjs npx prisma migrate deploy
    ```
    This applies the SQL from the newly created migration file to the database running in the `db` container.

5.  **Restart Application (if needed):**
    If your application isn't running with hot-reloading, you might need to restart it:
    ```bash
    docker-compose restart nestjs
    # Or restart the manual process if using `docker-compose exec ... npm run start:dev`
    ```

## API Usage

-   **Get All Invoices:** `GET http://localhost:3333/invoices`
    -   Optional query parameters: `account_id` (string), `with_fraud` (boolean)
-   **Get Single Invoice:** `GET http://localhost:3333/invoices/:id`

Refer to the `api.http` file for example requests (if available). The primary mechanism for triggering fraud checks (via Kafka message) will be handled by another part of the system, invoking the `FraudService.processInvoice` method.
