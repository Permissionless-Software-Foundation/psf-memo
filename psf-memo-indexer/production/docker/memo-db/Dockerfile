# Create a Dockerized API server
#
# Build context: psf-memo monorepo root
#   docker compose build memo-db

FROM ubuntu:24.04
MAINTAINER Chris Troutner <chris.troutner@gmail.com>

#Update the OS and install any OS packages needed.
RUN apt-get update && apt-get install -y sudo curl nano gnupg wget zip unzip python3 \
  && rm -rf /var/lib/apt/lists/*

#Install Node and NPM
RUN curl -sL https://deb.nodesource.com/setup_22.x -o nodesource_setup.sh \
  && bash nodesource_setup.sh \
  && apt-get update && apt-get install -y nodejs build-essential \
  && rm -rf /var/lib/apt/lists/*

#Create the user 'safeuser' and add them to the sudo group.
RUN useradd -ms /bin/bash safeuser
RUN adduser safeuser sudo

#Set password to 'password' change value below if you want a different password
RUN echo safeuser:password | chpasswd

#Set the working directory to be the home directory
WORKDIR /home/safeuser

#Setup NPM for non-root global install
RUN mkdir /home/safeuser/.npm-global
RUN chown -R safeuser .npm-global
RUN echo "export PATH=~/.npm-global/bin:$PATH" >> /home/safeuser/.profile
RUN runuser -l safeuser -c "npm config set prefix '~/.npm-global'"

# Copy psf-memo-db from the monorepo
COPY psf-memo-db /home/safeuser/psf-memo-db
WORKDIR /home/safeuser/psf-memo-db

# Install dependencies
RUN npm install

# Generate the API docs
RUN npm run docs

# Expose the port the API will be served on.
EXPOSE 5021

# Start the application.
# start-memo-db.sh is mounted at runtime via docker-compose.
VOLUME start-memo-db.sh
CMD ["./start-memo-db.sh"]
