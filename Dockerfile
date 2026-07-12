# Stage 1: Build the React Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Build the FastAPI Backend
FROM python:3.11-slim
WORKDIR /app

# Set environment variables for production
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DISABLE_RELOAD=true
ENV PORT=8000
ENV HOST=0.0.0.0

# Define data paths to be persisted in production
ENV UPLOADS_PATH=/app/data/uploads
ENV CHROMA_PATH=/app/data/chroma_db
ENV DATABASE_PATH=/app/data/dcpi.db

# Install required system dependencies (if any)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY server/requirements.txt ./server/
RUN pip install --no-cache-dir -r server/requirements.txt

# Copy server code
COPY server/ ./server/

# Copy built frontend from Stage 1
COPY --from=frontend-builder /app/client/dist ./client/dist

# Create the data directory for persistence
RUN mkdir -p /app/data
VOLUME ["/app/data"]

EXPOSE 8000

# Run the FastAPI server
WORKDIR /app/server
CMD ["python", "main.py"]
