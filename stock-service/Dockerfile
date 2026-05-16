# Используем легкий образ Node.js
FROM node:20-alpine

# Создаем рабочую директорию
WORKDIR /app

# Копируем файлы зависимостей
COPY package*.json ./

COPY prisma ./prisma

# Устанавливаем зависимости
RUN npm install

# Копируем остальной код
COPY . .

# Собираем проект
RUN npm run build

# Запускаем
CMD ["npm", "run", "start:prod"]
