package repository

import (
	"database/sql"
	"log" // Added for logging
	"time"

	"github.com/devfullcycle/imersao22/go-gateway/internal/domain"
)

type AccountRepository struct {
	db *sql.DB
}

func NewAccountRepository(db *sql.DB) *AccountRepository {
	return &AccountRepository{db: db}
}

func (r *AccountRepository) CreateAccount(account *domain.Account) error {
	stmt, err := r.db.Prepare(`
		INSERT INTO accounts (id, name, email, api_key, balance, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)
	`)

	if err != nil {
		log.Printf("ERROR preparing insert statement: %v", err) // Added log
		return err
	}

	defer stmt.Close()

	_, err = stmt.Exec(
		account.ID,
		account.Name,
		account.Email,
		account.APIKey,
		account.Balance,
		account.CreatedAt,
		account.UpdatedAt,
	)

	if err != nil {
		log.Printf("ERROR executing insert statement: %v", err) // Added log
		return err
	}

	return nil
}

func (r *AccountRepository) FindByAPIKey(apiKey string) (*domain.Account, error) {
	var account domain.Account
	var createdAt, updatedAt time.Time

	err := r.db.QueryRow(`
		SELECT id, name, email, api_key, balance, created_at, updated_at
		FROM accounts
		WHERE api_key = $1
	`, apiKey).Scan(
		&account.ID,
		&account.Name,
		&account.Email,
		&account.APIKey,
		&account.Balance,
		&createdAt,
		&updatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, domain.ErrAccountNotFound
		}
		return nil, err
	}

	account.CreatedAt = createdAt
	account.UpdatedAt = updatedAt

	return &account, nil
}

func (r *AccountRepository) FindByID(id string) (*domain.Account, error) {
	var account domain.Account
	var createdAt, updatedAt time.Time

	err := r.db.QueryRow(`
		SELECT id, name, email, api_key, balance, created_at, updated_at
		FROM accounts 
		WHERE id = $1
	`, id).Scan(
		&account.ID,
		&account.Name,
		&account.Email,
		&account.APIKey,
		&account.Balance,
		&createdAt,
		&updatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, domain.ErrAccountNotFound
		}
		return nil, err
	}

	account.CreatedAt = createdAt
	account.UpdatedAt = updatedAt

	return &account, nil
}

func (r *AccountRepository) UpdateBalance(account *domain.Account) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}

	defer tx.Rollback()

	var currentBalance float64

	err = tx.QueryRow(
		`SELECT balance 
		 FROM accounts 
		 WHERE id = $1 
		 FOR UPDATE
		`, account.ID).Scan(&currentBalance)

	if err != nil {
		if err == sql.ErrNoRows {
			return domain.ErrAccountNotFound
		}
		return err
	}

	account.UpdatedAt = time.Now()

	_, err = tx.Exec(`
		UPDATE accounts 
		SET balance = $1, updated_at = $2 
		WHERE id = $3
	`, account.Balance, account.UpdatedAt, account.ID)

	if err != nil {
		return err
	}

	return tx.Commit()
}
