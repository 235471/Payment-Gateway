import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  // Create hybrid application (HTTP + Microservice)
  const app = await NestFactory.create(AppModule);

  // Configure Kafka Microservice Client Options
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: [process.env.KAFKA_BROKERS || 'localhost:9092'], // Get brokers from env
      },
      consumer: {
        groupId: process.env.KAFKA_CONSUMER_GROUP_ID || 'anti-fraud-group', // Get group ID from env
      },
    },
  });

  // Start all microservices (Kafka consumer)
  await app.startAllMicroservices();

  // Start the HTTP server
  await app.listen(process.env.PORT || 3000);

  console.log(`Anti-Fraud Microservice is running on: ${await app.getUrl()}`);
  console.log(`Kafka Consumer Group ID: ${process.env.KAFKA_CONSUMER_GROUP_ID || 'anti-fraud-group'}`);
  console.log(`Kafka Brokers: ${process.env.KAFKA_BROKERS || 'localhost:9092'}`);
}
bootstrap();
