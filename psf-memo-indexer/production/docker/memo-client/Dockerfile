# Create a Dockerized front-end SPA served by nginx
#
# Build context: psf-memo monorepo root
#   docker compose build memo-client

#IMAGE BUILD COMMANDS
FROM ubuntu:24.04 as builder
MAINTAINER Chris Troutner <chris.troutner@gmail.com>

#Update the OS and install any OS packages needed.
RUN apt-get update && apt-get install -y sudo curl nano gnupg wget \
  && rm -rf /var/lib/apt/lists/*

#Install Node and NPM
RUN curl -sL https://deb.nodesource.com/setup_22.x -o nodesource_setup.sh \
  && bash nodesource_setup.sh \
  && apt-get update && apt-get install -y nodejs build-essential \
  && rm -rf /var/lib/apt/lists/*

#Set the working directory to be the home directory
WORKDIR /home/safeuser

# Copy psf-memo-client from the monorepo
COPY psf-memo-client /home/safeuser/psf-memo-client
WORKDIR /home/safeuser/psf-memo-client

# Create React App reads REACT_APP_* from this .env at build time.
# Edit production/docker/memo-client/.env before building.
COPY psf-memo-indexer/production/docker/memo-client/.env .env

# Install dependencies
RUN npm install

# Build the site
RUN npm run build

# Load the NGINX image.
FROM nginx
EXPOSE 80

# Copy the files built in the first container to the new NGINX container.
COPY --from=builder /home/safeuser/psf-memo-client/build /usr/share/nginx/html

# Copy the NGINX configuration file.
COPY psf-memo-indexer/production/docker/memo-client/default.conf /etc/nginx/conf.d/default.conf
