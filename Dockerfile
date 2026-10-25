# Minimal static server for the FFS Face Planner site.
# The app is a no-build-step static site (plain ES modules + import maps),
# so the container only needs to serve the repo root over HTTP.
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY . /usr/share/nginx/html

EXPOSE 8080
