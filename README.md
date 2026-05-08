
# The-Box

## ТЗ: разработать два микросервиса на базе NestJs,  Product-service(карта товара) и Stock-service(склад)  с исползованием такоих инструментов как: Redis, RabbitMQ, Saga, Prisma, PostgresQL, GraphQL, WebSockets, gRPC.

### Возможное доплнительно использование таких инстурментов как: Loki, Prometheus, Grafana, ClickHouse. 

Нужно реализовать два микросервиса **Product-Service (витрина) и Stock-Service (склад)** отвечающие за карточку товара и резервирование его на складе через **Saga Pattern**, взаимодействующих через брокер сообщений RabbitMQ. Producer (Sender) Service отправляет сообщения в RabbitMQ. 

**UUID и Идемпотентность:** Напишсать Middleware/Interceptor, который будет проверять наличие UUID в каждом входящем событии. 
Нет UUID — ошибка 400.

**Publisher Confirms (Подтверждение отправки):** Настроить amqp-connection-manager так, чтобы Продюсер ждал ответа от Кролика.Отработать  «рукопожатие».

**Manual Ack (Ручное подтверждение):**  В Консьюмере  явно выключить autoAck. Написать channel.ack(msg) только ПОСЛЕ успешного await prisma.product.create(...). 

**Ретраи и DLX (Очередь мертвых писем):** Настроить Кролика так, чтобы при ошибке сообщение не исчезало, а уходило на «второй круг» (retry) или в «отстойник» (dead-letter-queue) для анализа.



