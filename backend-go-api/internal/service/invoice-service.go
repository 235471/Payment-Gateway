package service

import (
	"context"

	"github.com/devfullcycle/imersao22/go-gateway/internal/domain"
	"github.com/devfullcycle/imersao22/go-gateway/internal/domain/events"
	"github.com/devfullcycle/imersao22/go-gateway/internal/dto"
)

type InvoiceService struct {
	invoiceRepository domain.InvoiceRepository
	accountService    AccountService
	kafkaProducer     KafkaProducerInterface
}

func NewInvoiceService(
	invoiceRepository domain.InvoiceRepository,
	accountService AccountService,
	kafkaProducer KafkaProducerInterface,
) *InvoiceService {
	return &InvoiceService{
		invoiceRepository: invoiceRepository,
		accountService:    accountService,
		kafkaProducer:     kafkaProducer,
	}
}

func (s *InvoiceService) CreateInvoice(input dto.CreateInvoiceInput) (*dto.InvoiceResponse, error) {
	account, err := s.accountService.GetAccountByKey(input.APIKey)
	if err != nil {
		return nil, err
	}

	invoice, err := dto.ToInvoice(&input, account.ID)
	if err != nil {
		return nil, err
	}

	if err := invoice.Process(); err != nil {
		return nil, err
	}
	// If status is pending needs to be processed in the fraud micro service
	if invoice.Status == domain.StatusPending {
		// Publish pending transaction event
		pendingTransaction := events.NewPendingTransaction(
			invoice.AccountID,
			invoice.ID,
			invoice.Amount,
		)
		if err := s.kafkaProducer.SendingPendingTransaction(context.Background(), *pendingTransaction); err != nil {
			return nil, err
		}
	}

	if invoice.Status == domain.StatusApproved {
		_, err = s.accountService.UpdateBalance(input.APIKey, invoice.Amount)
		if err != nil {
			return nil, err
		}
	}

	err = s.invoiceRepository.CreateInvoice(invoice)
	if err != nil {
		return nil, err
	}

	return dto.FromInvoice(invoice), nil
}

func (s *InvoiceService) GetInvoiceByID(id, apiKey string) (*dto.InvoiceResponse, error) {
	invoice, err := s.invoiceRepository.FindByID(id)
	if err != nil {
		return nil, err
	}

	account, err := s.accountService.GetAccountByKey(apiKey)
	if err != nil {
		return nil, err
	}

	if invoice.AccountID != account.ID {
		return nil, domain.ErrUnauthorizedAccess
	}

	return dto.FromInvoice(invoice), nil
}

func (s *InvoiceService) ListInvoicesByAccount(accountID string) ([]*dto.InvoiceResponse, error) {
	invoices, err := s.invoiceRepository.FindByAccountID(accountID)
	if err != nil {
		return nil, err
	}

	response := make([]*dto.InvoiceResponse, len(invoices))
	for i, invoice := range invoices {
		response[i] = dto.FromInvoice(invoice)
	}

	return response, nil
}

func (s *InvoiceService) ListByAccountAPIKey(apiKey string) ([]*dto.InvoiceResponse, error) {
	account, err := s.accountService.GetAccountByKey(apiKey)
	if err != nil {
		return nil, err
	}

	return s.ListInvoicesByAccount(account.ID)
}

// ProcessTransactionResult process transaction result after fraud analysis
func (s *InvoiceService) ProcessTransactionResult(invoiceID string, status domain.Status) error {
	invoice, err := s.invoiceRepository.FindByID(invoiceID)
	if err != nil {
		return err
	}

	switch status {
	case domain.StatusApproved:
		if err := invoice.Approve(); err != nil {
			return err
		}
	case domain.StatusRejected:
		if err := invoice.Reject(); err != nil {
			return err
		}
	default:
		return domain.ErrInvalidStatus
	}

	if err := s.invoiceRepository.UpdateStatus(invoice); err != nil {
		return err
	}
	if status == domain.StatusApproved {
		account, err := s.accountService.GetAccountByID(invoice.AccountID)
		if err != nil {
			return err
		}
		if _, err := s.accountService.UpdateBalance(account.APIKey, invoice.Amount); err != nil {
			return err
		}
	}
	return nil
}
