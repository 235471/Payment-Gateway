package service

import (
	"github.com/devfullcycle/imersao22/go-gateway/internal/domain"
	"github.com/devfullcycle/imersao22/go-gateway/internal/dto"
)

type InvoiceService struct {
	invoiceRepository domain.InvoiceRepository
	accountService    AccountService
}

func NewInvoiceService(invoiceRepository domain.InvoiceRepository, accountService AccountService) *InvoiceService {
	return &InvoiceService{invoiceRepository: invoiceRepository, accountService: accountService}
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
