FROM mcr.microsoft.com/playwright/python:v1.49.1-jammy

WORKDIR /app

# Install dependencies
COPY backend/requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright browser
RUN playwright install chromium

# Copy backend code and entrypoint
COPY backend/ .
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

ENV PORT=8000
EXPOSE 8000

CMD ["sh", "entrypoint.sh"]
