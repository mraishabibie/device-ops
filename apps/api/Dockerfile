FROM python:3.13-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_SYSTEM_PYTHON=1

# Install system dependencies required for compilation and postgres adapter
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install uv dependency manager
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /workspace

# Copy dependencies configuration
COPY pyproject.toml uv.lock ./

# Install python dependencies using uv system sync
RUN uv pip install --system -r pyproject.toml

# Copy application sources
COPY app/ ./app
COPY alembic/ ./alembic
COPY alembic.ini ./
COPY pyproject.toml ./

# Expose API port
EXPOSE 8000

# Run migrations and start FastAPI using uvicorn server
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
