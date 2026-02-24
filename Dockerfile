# نستخدم نسخة Node.js الرسمية
FROM node:18-slim

# إنشاء مجلد العمل داخل السيرفر
WORKDIR /app

# نسخ ملفات التعريف
COPY package*.json ./

# تثبيت المكتبات
RUN npm install

# نسخ بقية الملفات
COPY . .

# أمر التشغيل
CMD ["node", "index.js"]
