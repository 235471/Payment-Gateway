package server

import (
	"fmt"
	"net/http"

	"github.com/devfullcycle/imersao22/go-gateway/internal/service"
	"github.com/devfullcycle/imersao22/go-gateway/internal/web/handlers"
	"github.com/devfullcycle/imersao22/go-gateway/internal/web/middleware"
	"github.com/go-chi/chi/v5"
)

type Server struct {
	router         *chi.Mux
	server         *http.Server
	accountService *service.AccountService
	invoiceService *service.InvoiceService
	port           string
}

func NewServer(accountService *service.AccountService, invoiceService *service.InvoiceService, port string) *Server {
	return &Server{
		router:         chi.NewRouter(),
		accountService: accountService,
		invoiceService: invoiceService,
		port:           port,
	}
}

func (s *Server) Start() error {
	s.ConfigureRoutes()

	s.server = &http.Server{
		Addr:    fmt.Sprintf(":%s", s.port),
		Handler: s.router,
	}

	println("Server started on port", s.port)

	return s.server.ListenAndServe()
}

func (s *Server) ConfigureRoutes() {
	accountHandler :=
		handlers.NewAccountHandler(s.accountService)
	invoiceHandler := handlers.NewInvoiceHandler(s.invoiceService)
	authMiddleware := middleware.NewAuthMiddleware(s.accountService)

	s.router.Route("/accounts", func(r chi.Router) {
		r.Post("/", accountHandler.Create)
		r.Get("/", accountHandler.Get)
	})

	s.router.Route("/invoices", func(r chi.Router) {
		r.Use(authMiddleware.Authenticate)
		r.Post("/", invoiceHandler.Create)
		r.Get("/", invoiceHandler.ListByAccount)
		r.Get("/{id}", invoiceHandler.GetByID)
	})
}
