# Full Cycle Payment Gateway

A payment gateway API developed in Go as part of the Full Cycle Imersão course. This project handles accounts and invoices.

## Requirements

*   Go 1.22+
*   Docker & Docker Compose
*   [golang-migrate](https://github.com/golang-migrate/migrate) CLI tool
*   Kafka (running via Docker Compose)

## Environment Variables

The application requires the following environment variables. You can create a `.env` file in the project root to store them:

```dotenv
# Database Configuration
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gateway_db
DB_SSLMODE=disable # or 'require', 'verify-full', etc. depending on your setup

# Server Configuration
HTTP_PORT=8080

# Kafka Configuration (used by the Go app)
KAFKA_BROKERS=localhost:9092 # Comma-separated list of Kafka brokers
KAFKA_PENDING_TRANSACTIONS_TOPIC=pending_transactions
KAFKA_TRANSACTIONS_RESULT_TOPIC=transaction_results
KAFKA_CONSUMER_GROUP_ID=payment-gateway-group # Consumer group ID
```

## Setup and Running

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd full-cycle-payment-gateway
    ```

2.  **Create `.env` file:**
    Copy the environment variables listed above into a `.env` file in the project root and fill in your database credentials.

3.  **Start services:**
    This command starts the PostgreSQL database and Kafka services defined in `docker-compose.yml`.
    ```bash
    docker-compose up -d
    ```

4.  **Apply database migrations:**
    Make sure you have the `migrate` CLI installed. Run the following command, replacing the placeholders with your actual environment variable values (or ensure they are exported in your shell):
    ```bash
    migrate -source file://migrations -database "postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=${DB_SSLMODE}" up
    ```
    *   You can also run `down` to revert migrations or `version` to check the current migration version.

5.  **Run the application:**
    ```bash
    go run cmd/app/main.go
    ```
    The server will start on the port specified by `HTTP_PORT` (default: 8080).

## API Endpoints

### Authentication

Endpoints related to invoices (`/invoices`) require authentication via an API key. Provide the key associated with an account in the `X-API-KEY` HTTP header.

### Accounts

*   **Create Account**
    *   `POST /accounts`
    *   **Body:**
        ```json
        {
          "name": "Account Name",
          "email": "user@example.com"
        }
        ```
    *   **Response:** `201 Created` with account details including `id`, `name`, `email`, `balance`, `api_key`, `created_at`, `updated_at`.

*   **Get Account Details**
    *   `GET /accounts`
    *   **Headers:** `X-API-KEY: <your_account_api_key>`
    *   **Response:** `200 OK` with account details including `id`, `name`, `email`, `balance`, `api_key`, `created_at`, `updated_at`.


### Invoices

*(Requires `X-API-KEY` header for all endpoints)*

*   **Create Invoice**
    *   `POST /invoices`
    *   **Headers:** `X-API-KEY: <your_account_api_key>`
    *   **Body:** (Based on `dto.CreateInvoiceInput`)
        ```json
        {
          "amount": 100.50,
          "description": "Service Provided",
          "payment_type": "credit_card", // Example value
          "card_number": "************1234", // Example value
          "card_cvv": "123", // Example value
          "expiry_month": 12,
          "expiry_year": 2028,
          "cardholder_name": "John Doe"
        }
        ```
    *   **Response:** `201 Created` with invoice details including `id`, `account_id`, `amount`, `status`, `description`, `payment_type`, `card_last_digits`, `created_at`, `updated_at`.

*   **List Invoices by Account**
    *   `GET /invoices`
    *   **Headers:** `X-API-KEY: <your_account_api_key>`
    *   **Response:** `200 OK` with an array of invoice objects (matching the structure above).

*   **Get Invoice by ID**
    *   `GET /invoices/{id}`
    *   **Headers:** `X-API-KEY: <your_account_api_key>`
    *   **Response:** `200 OK` with the details of the specified invoice (matching the structure above), if found and associated with the account. Returns `404 Not Found` or `403 Forbidden` otherwise.

## Project Structure

*   `cmd/app/main.go`: Main application entry point.
*   `internal/`: Contains the core application logic.
    *   `domain/`: Core business entities and repository interfaces.
    *   `domain/events`: Defines domain events (e.g., for Kafka).
    *   `repository/`: Database interaction logic (implementations of domain repositories).
    *   `service/`: Business logic orchestration (including Kafka interaction).
    *   `web/`: HTTP server, handlers, routes, and middleware.
*   `migrations/`: Database migration files (`.up.sql` and `.down.sql`).
*   `docker-compose.yml`: Defines the PostgreSQL and Kafka services.
*   `.golangci.yml`: Linter configuration.
*   `go.mod`, `go.sum`: Go module files.

## Development Guide

To add new features:

1.  Add new models/entities in `internal/domain`.
2.  Implement corresponding repositories in `internal/repository`.
3.  Create services in `internal/service` to handle business logic.
4.  Add HTTP handlers in `internal/web/handlers`.
5.  Configure new routes in `internal/web/server/server.go`.
