# Specify the base Docker image
FROM oven/bun:1.3

# Next, copy the source files using the user set
# in the base image.
COPY . ./

# Install all dependencies.
RUN bun install

# Run the image.
CMD ["bun", "run", "start"]