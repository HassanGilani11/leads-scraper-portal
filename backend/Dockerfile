# Use official Playwright Python image with Chromium and OS dependencies pre-installed
FROM mcr.microsoft.com/playwright/python:v1.49.1-jammy

WORKDIR /app

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright browser
RUN playwright install chromium

# Copy application code
COPY . .

# Set default port
ENV PORT=8000
EXPOSE 8000

# Start FastAPI server using dynamic Railway PORT
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
