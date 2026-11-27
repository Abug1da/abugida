# The nightly backup job. pg_dump must be the same major version as the server (Railway's
# postgres-ssl:18) or newer.
FROM postgres:18-alpine
RUN apk add --no-cache curl
COPY backup/backup.sh /usr/local/bin/backup.sh
CMD ["backup.sh"]
