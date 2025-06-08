    FROM node:24-alpine AS builder

    WORKDIR /app
    
    COPY package.json package-lock.json ./
    RUN npm ci
    
    COPY . .
    
    # Build the SvelteKit app
    RUN npm run build
    
    # --- Production Stage ---
    FROM node:24-alpine
    
    WORKDIR /app
    
    # Copy only the built app and package files
    COPY --from=builder /app/build /app/build
    COPY --from=builder /app/package.json /app/package-lock.json ./
    
    # Install only production dependencies
    RUN npm ci --omit=dev
    
    # Expose the port SvelteKit will run on
    EXPOSE 8000
    
    # Start the server
    CMD ["node", "build"]
    