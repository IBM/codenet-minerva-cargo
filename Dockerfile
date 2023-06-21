# Start from a base Ubuntu image
FROM python:3.9-slim

# Set a directory for the application
WORKDIR /app

RUN pip3 install --upgrade pip

# Copy the entire project into the container
COPY . /app

# Install Python dependencies
RUN pip3 install --no-cache-dir .

RUN echo $(ls /usr/bin)

# Set the command to run your application
ENTRYPOINT ["/usr/bin/codenet-minerva", "-i", "/input", "-o", "/output"]
