package middleware

import (
	"net/http"
	"strings"

	"github.com/devfullcycle/imersao22/go-gateway/internal/domain"
	"github.com/devfullcycle/imersao22/go-gateway/internal/service"
)

type AuthMiddleware struct {
	accountService *service.AccountService
}

func NewAuthMiddleware(accountService *service.AccountService) *AuthMiddleware {
	return &AuthMiddleware{accountService: accountService}
}

func (m *AuthMiddleware) Authenticate(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		apiKey := strings.TrimSpace(r.Header.Get("X-API-KEY"))

		if apiKey == "" {
			http.Error(w, "API-KEY is required", http.StatusUnauthorized)
			return
		}

		_, err := m.accountService.GetAccountByKey(apiKey)
		if err != nil {
			if err == domain.ErrAccountNotFound {
				http.Error(w, "Account not found", http.StatusUnauthorized)
				return
			}
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		next.ServeHTTP(w, r)
	})
}
