# Start from a base Ubuntu image
FROM python:3.9-slim

# Copy the entire project into the container
COPY . /app

# Change working directory
WORKDIR /app

# Install dependencies
RUN pip3 install -U pip
RUN pip3 install --no-cache-dir .

# Set the command to run your application
ENTRYPOINT ["python3", "-m", "cargo.standalone", "-i", "/input/", "-o", "/output/"]
