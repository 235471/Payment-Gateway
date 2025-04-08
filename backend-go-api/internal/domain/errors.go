package domain

import "errors"

var (
	ErrAccountNotFound    = errors.New("account not found")
	ErrDuplicateAPIKey    = errors.New("api key already exists")
	ErrInvoiceNotFound    = errors.New("invoice not found")
	ErrUnauthorizedAccess = errors.New("unauthorized access")
	ErrInvalidAmount      = errors.New("invalid amount, must be greater than 0")
	ErrInvalidStatus      = errors.New("invalid status")
)
