# Create a Dockerized front-end SPA served by nginx
#

#IMAGE BUILD COMMANDS
FROM ubuntu:24.04 as builder
MAINTAINER Chris Troutner <chris.troutner@gmail.com>

#Update the OS and install any OS packages needed.
RUN apt-get update
RUN apt-get install -y sudo git curl nano gnupg wget

#Install Node and NPM
RUN curl -sL https://deb.nodesource.com/setup_22.x -o nodesource_setup.sh
RUN bash nodesource_setup.sh
RUN apt-get install -y nodejs build-essential

#Set the working directory to be the home directory
WORKDIR /home/safeuser

# Clone the psf-memo-client repository
RUN git clone https://github.com/Permissionless-Software-Foundation/psf-memo-client

# Switch to the desired branch. `master` is usually stable,
# and `stage` / `unstable` have the most up-to-date changes.
WORKDIR /home/safeuser/psf-memo-client

# For development: switch to unstable branch
#RUN git checkout unstable

# Install dependencies
RUN npm install

# Create React App reads REACT_APP_* from this .env at build time.
# Edit production/docker/memo-client/.env before building.
COPY .env .env

# Build the site
RUN npm run build

# Load the NGINX image.
FROM nginx
EXPOSE 80

# Copy the files built in the first container to the new NGINX container.
COPY --from=builder /home/safeuser/psf-memo-client/build /usr/share/nginx/html

# Copy the NGINX configuration file.
COPY default.conf /etc/nginx/conf.d/default.conf
