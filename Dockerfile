FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Copy runner script
COPY runner.py /app/runner.py

# No additional dependencies needed for the sandbox
# The runner.py uses only standard library modules

# Set the entrypoint
CMD ["python", "runner.py"]
