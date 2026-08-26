# Create a Dockerized API server
#

#IMAGE BUILD COMMANDS
FROM ubuntu:24.04
MAINTAINER Chris Troutner <chris.troutner@gmail.com>

#Update the OS and install any OS packages needed.
RUN apt-get update
RUN apt-get install -y sudo git curl nano gnupg wget zip unzip python3

#Install Node and NPM
RUN curl -sL https://deb.nodesource.com/setup_22.x -o nodesource_setup.sh
RUN bash nodesource_setup.sh
RUN apt-get install -y nodejs build-essential

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

# Clone the psf-memo-db repository
WORKDIR /home/safeuser
RUN git clone https://github.com/Permissionless-Software-Foundation/psf-memo-db

# Switch to the desired branch. `master` is usually stable,
# and `stage` has the most up-to-date changes.
WORKDIR /home/safeuser/psf-memo-db

# For development: switch to unstable branch
#RUN git checkout <branch-name>

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
