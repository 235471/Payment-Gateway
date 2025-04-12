package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/devfullcycle/imersao22/go-gateway/internal/domain"
	"github.com/devfullcycle/imersao22/go-gateway/internal/dto"
	"github.com/devfullcycle/imersao22/go-gateway/internal/service"
	"github.com/go-chi/chi/v5"
)

type InvoiceHandler struct {
	invoiceService *service.InvoiceService
}

func NewInvoiceHandler(invoiceService *service.InvoiceService) *InvoiceHandler {
	return &InvoiceHandler{invoiceService: invoiceService}
}

func (h *InvoiceHandler) Create(w http.ResponseWriter, r *http.Request) {
	var input dto.CreateInvoiceInput
	err := json.NewDecoder(r.Body).Decode(&input)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	input.APIKey = r.Header.Get("X-API-KEY")
	if input.APIKey == "" {
		http.Error(w, "API-KEY is required", http.StatusUnauthorized)
		return
	}

	response, err := h.invoiceService.CreateInvoice(input)
	if err != nil {
		switch {
		case errors.Is(err, domain.ErrAccountNotFound):
			http.Error(w, "Internal server error during processing", http.StatusInternalServerError)
		case errors.Is(err, domain.ErrInvalidAmount), errors.Is(err, domain.ErrInvalidStatus):
			http.Error(w, err.Error(), http.StatusBadRequest)
		default:
			http.Error(w, "Internal server error", http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

func (h *InvoiceHandler) Get(w http.ResponseWriter, r *http.Request) {
	apiKey := r.Header.Get("X-API-KEY")
	if apiKey == "" {
		http.Error(w, "API-KEY is required", http.StatusUnauthorized)
		return
	}

	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "ID is required", http.StatusBadRequest)
		return
	}

	response, err := h.invoiceService.GetInvoiceByID(id, apiKey)
	if err != nil {
		switch {
		case errors.Is(err, domain.ErrInvoiceNotFound), errors.Is(err, domain.ErrAccountNotFound):
			http.Error(w, "Invoice not found or invalid API key", http.StatusNotFound)
		case errors.Is(err, domain.ErrUnauthorizedAccess):
			http.Error(w, "Forbidden: Invoice does not belong to this account", http.StatusForbidden)
		default:
			http.Error(w, "Internal server error", http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (h *InvoiceHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	apiKey := r.Header.Get("X-API-KEY")
	if apiKey == "" {
		http.Error(w, "API-KEY is required", http.StatusUnauthorized)
		return
	}

	response, err := h.invoiceService.GetInvoiceByID(id, apiKey)
	if err != nil {
		switch {
		case errors.Is(err, domain.ErrInvoiceNotFound), errors.Is(err, domain.ErrAccountNotFound):
			http.Error(w, "Invoice not found or invalid API key", http.StatusNotFound)
		case errors.Is(err, domain.ErrUnauthorizedAccess):
			http.Error(w, "Forbidden: Invoice does not belong to this account", http.StatusForbidden)
		default:
			http.Error(w, "Internal server error", http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func (h *InvoiceHandler) Router() http.Handler {
	router := chi.NewRouter()
	router.Post("/invoices", h.Create)
	router.Get("/invoices", h.Get)
	router.Get("/invoices/{id}", h.GetByID)
	return router
}

func (h *InvoiceHandler) ListByAccount(w http.ResponseWriter, r *http.Request) {
	apiKey := r.Header.Get("X-API-KEY")
	if isInvalidAPIKey(apiKey) {
		http.Error(w, "Valid API-KEY is required", http.StatusUnauthorized)
		return
	}

	response, err := h.invoiceService.ListByAccountAPIKey(apiKey)
	if err != nil {
		switch {
		case errors.Is(err, domain.ErrAccountNotFound):
			http.Error(w, "Account not found for API key", http.StatusNotFound)
		default:
			http.Error(w, "Internal server error", http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func isInvalidAPIKey(key string) bool {
	key = strings.TrimSpace(key)
	return key == "" || key == "undefined" || key == "null"
}
