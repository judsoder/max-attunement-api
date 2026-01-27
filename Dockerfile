FROM node:20-slim

# Install poppler-utils for pdftoppm (PDF to image conversion for OCR)
RUN apt-get update && apt-get install -y poppler-utils && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source and build
COPY tsconfig.json ./
COPY src ./src
COPY data ./data
COPY syllabi ./syllabi
RUN npm install typescript && npm run build && npm uninstall typescript

# tesseract.js downloads traineddata automatically, but we can pre-bundle it
COPY eng.traineddata ./eng.traineddata

EXPOSE 3000

CMD ["npm", "start"]
