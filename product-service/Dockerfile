# FROM node:24-alpine
# WORKDIR /app

# # 1. Копируем конфиги зависимостей и схему Призмы
# COPY package*.json ./
# COPY prisma ./prisma/

# # 2. Устанавливаем ВСЕ зависимости (включая nest CLI и typescript)
# RUN npm install

# # 3. Копируем весь остальной исходный код приложения
# COPY . .

# # 4. Принудительно генерируем клиент Prisma внутрь node_modules
# # RUN npx prisma generate
# # Вместо RUN npx prisma generate, жестко зашиваем фейковый URL на этап билда:
# RUN DATABASE_URL="postgresql://fake:fake@localhost:5432/fake" npx prisma generate


# # 5. Собираем проект NestJS (генерируется папка dist)
# RUN npm run build

# EXPOSE 3000

# # Наш проверенный точный путь запуска
# CMD ["node", "dist/src/main.js"]


# # # --- ЭТАП 1: Сборка приложения (Builder) ---
# # 	FROM node:24-alpine AS builder
# # 	WORKDIR /app
	
# # 	# 1. Копируем конфиги зависимостей
# # 	COPY package*.json ./
	
# # 	# 2. Копируем схему Призмы
# # 	COPY prisma ./prisma/
	
# # 	# 3. Устанавливаем ВСЕ зависимости и генерируем клиент Prisma
# # 	RUN npm ci
	
# # 	# 4. Копируем остальной исходный код приложения
# # 	COPY . .
	
# # 	# 5. Компилируем TypeScript в JS (создается папка dist)
# # 	RUN npm run build
	
	
# # 	# --- ЭТАП 2: Финальный чистый образ (Runner) ---
# # 	FROM node:24-alpine AS runner
# # 	WORKDIR /app
	
# # 	ENV NODE_ENV=production
	
# # 	# 1. Копируем package.json и папку prisma (чтобы postinstall на проде не падал)
# # 	COPY package*.json ./
# # 	COPY prisma ./prisma/
	
# # 	# 2. Ставим только прод-зависимости (вырезаем devDependencies)
# # 	RUN npm ci --omit=dev
	
# # 	# 3. Копируем скомпилированный код NestJS из этапа сборки
# # 	COPY --from=builder /app/dist ./dist
	
# # 	# --- ВОТ ОН, НАШ ГРАНИТНЫЙ СПАСАТЕЛЬНЫЙ КРУГ! ---
# # 	# Если Prisma сгенерировала клиент в корне (папка client), переносим её:
# # 	# COPY --from=builder /app/client ./client
# # 	# Если она сгенерировала её внутри папки prisma/client, переносим её (на всякий случай переносим обе):
# # 	COPY --from=builder /app/prisma/client ./prisma/client
	
# # 	EXPOSE 3000
	
# # 	# Запускаем скомпилированный код через node
# # 	CMD ["node", "dist/src/main.js"]
	

FROM node:20-alpine
WORKDIR /app

ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

# Копируем и устанавливаем зависимости
COPY package*.json ./
RUN npm ci

# Копируем prisma schema и генерируем клиент ДО копирования всего проекта
# Это закэширует слой, если schema.prisma не меняется
COPY prisma ./prisma
RUN npx prisma generate

# Теперь копируем остальной код
COPY . .

# Собираем TypeScript
RUN npm run build

# Копируем prisma в dist для относительных импортов
RUN cp -r prisma dist/

CMD ["node", "dist/src/main.js"]