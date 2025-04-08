# Full Cycle Payment Gateway

A payment gateway API developed in Go as part of the Full Cycle Imersão course. This project handles accounts and invoices.

## Requirements

*   Go 1.22+
*   Docker & Docker Compose
*   [golang-migrate](https://github.com/golang-migrate/migrate) CLI tool

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
```

## Setup and Running

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd full-cycle-payment-gateway
    ```

2.  **Create `.env` file:**
    Copy the environment variables listed above into a `.env` file in the project root and fill in your database credentials.

3.  **Start the database:**
    This command starts the PostgreSQL database service defined in `docker-compose.yml`.
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
    *   *Returns the created account details, including its generated API key.*

*   **Get Account Details**
    *   `GET /accounts`
    *   **Headers:**
        *   `X-API-KEY`: The API key of the account to retrieve.
    *   *Returns the details of the account associated with the provided API key.*
    *(Note: While the middleware isn't explicitly applied here in `server.go`, the handler likely uses the key to fetch the specific account. The original README implied this requirement.)*


### Invoices

*(Requires `X-API-KEY` header for all endpoints)*

*   **Create Invoice**
    *   `POST /invoices`
    *   **Headers:** `X-API-KEY: <your_account_api_key>`
    *   **Body:**
        ```json
        {
          "amount": 100.50,
          "description": "Service Provided"
          // Add other relevant invoice fields based on internal/domain/invoice.go
        }
        ```
    *   *Returns the created invoice details.*

*   **List Invoices by Account**
    *   `GET /invoices`
    *   **Headers:** `X-API-KEY: <your_account_api_key>`
    *   *Returns a list of invoices associated with the account.*

*   **Get Invoice by ID**
    *   `GET /invoices/{id}`
    *   **Headers:** `X-API-KEY: <your_account_api_key>`
    *   *Returns the details of the specified invoice, if it belongs to the account.*

## Project Structure

*   `cmd/app/main.go`: Main application entry point.
*   `internal/`: Contains the core application logic.
    *   `domain/`: Core business entities and repository interfaces.
    *   `repository/`: Database interaction logic (implementations of domain repositories).
    *   `service/`: Business logic orchestration.
    *   `web/`: HTTP server, handlers, routes, and middleware.
*   `migrations/`: Database migration files (`.up.sql` and `.down.sql`).
*   `docker-compose.yml`: Defines the PostgreSQL service.
*   `.golangci.yml`: Linter configuration.
*   `go.mod`, `go.sum`: Go module files.

## Development Guide

To add new features:

1.  Add new models/entities in `internal/domain`.
2.  Implement corresponding repositories in `internal/repository`.
3.  Create services in `internal/service` to handle business logic.
4.  Add HTTP handlers in `internal/web/handlers`.
5.  Configure new routes in `internal/web/server/server.go`.
