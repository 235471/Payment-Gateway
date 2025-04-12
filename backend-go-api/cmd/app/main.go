package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"

	"github.com/devfullcycle/imersao22/go-gateway/internal/repository"
	"github.com/devfullcycle/imersao22/go-gateway/internal/service"
	"github.com/devfullcycle/imersao22/go-gateway/internal/web/server"
	// "github.com/joho/godotenv" // Commented out: Env vars provided by Docker Compose
	_ "github.com/lib/pq"
)

func main() {
	// Commented out: Env vars provided by Docker Compose
	// if err := godotenv.Load(); err != nil {
	// 	log.Fatal("Error loading .env file")
	// }

	connStr := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		os.Getenv("DB_HOST"),
		os.Getenv("DB_PORT"),
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_NAME"),
		os.Getenv("DB_SSLMODE"),
	)

	dbConn, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal("Error connecting to database: ", err)
	}

	defer dbConn.Close()

	// Innitialize Kafka
	baseKafkaConfig := service.NewKafkaConfig()
	// Config Kafka producer
	producerTopic := os.Getenv("KAFKA_PENDING_TRANSACTIONS_TOPIC")
	producerConfig := baseKafkaConfig.WithTopic(producerTopic)
	kafkaProducer := service.NewKafkaProducer(producerConfig)
	defer kafkaProducer.Close()

	accountRepository := repository.NewAccountRepository(dbConn)
	accountService := service.NewAccountService(accountRepository)
	invoiceRepository := repository.NewInvoiceRepository(dbConn)
	invoiceService := service.NewInvoiceService(invoiceRepository, *accountService, kafkaProducer)

	// Config Kafka consumer
	consumerTopic := os.Getenv("KAFKA_TRANSACTIONS_RESULT_TOPIC")
	consumerConfig := baseKafkaConfig.WithTopic(consumerTopic)
	groupID := os.Getenv("KAFKA_CONSUMER_GROUP_ID")
	kafkaConsumer := service.NewKafkaConsumer(consumerConfig, groupID, invoiceService)
	defer kafkaConsumer.Close()
	// Start Kafka consumer go routine
	go func() {
		if err := kafkaConsumer.Consume(context.Background()); err != nil {
			log.Printf("Error consuming kafka messages: %v", err)
		}
	}()

	server := server.NewServer(accountService, invoiceService, os.Getenv("HTTP_PORT"))
	err = server.Start()
	if err != nil {
		log.Fatal("Error starting server: ", err)
	}
}
