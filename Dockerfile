# اختيار نسخة Node.js
FROM node:18

# إنشاء مجلد العمل
WORKDIR /app

# نسخ ملفات التعريف وتثبيت المكتبات
COPY package*.json ./
RUN npm install

# نسخ بقية ملفات البوت
COPY . .

# تشغيل البوت
CMD ["node", "index.js"]
