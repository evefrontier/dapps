# syntax=docker/dockerfile:1
# Static build of the assembly dapp served by Caddy on a patched BCI Micro root.
# Build context is the repository root:
#   docker build -f packages/apps/assembly/Dockerfile \
#     --secret id=github_token,env=GITHUB_TOKEN \
#     --build-arg VITE_EVE_WORLD_PACKAGE_ID=@evefrontier/world-uat .

# The bundle is architecture-independent: build it once on the build platform.
FROM --platform=$BUILDPLATFORM node:25.8.1-slim AS build
RUN npm install -g bun@1.3.13
WORKDIR /src
COPY . .
# @evefrontier packages come from GitHub Packages (bunfig.toml reads $GITHUB_TOKEN).
RUN --mount=type=secret,id=github_token,env=GITHUB_TOKEN \
    bun install --frozen-lockfile --ignore-scripts
ARG VITE_EVE_WORLD_PACKAGE_ID
ARG VITE_DAPP_INDEX_URL
ARG VITE_LOG_LEVEL
ARG VITE_SHOW_FLAG_PANEL
# vite.config.ts uses base './'; root-absolute assets keep deep links such as
# /client/networknode/monitor working behind the index.html fallback.
RUN test -n "$VITE_EVE_WORLD_PACKAGE_ID" \
    && CI=true bun nx run assembly:ci:build -- --base=/

# Caddy is built as a dependency of a wrapper module (as xcaddy does), so
# vulnerable transitive modules can be bumped ahead of a Caddy release while
# grype still sees Caddy's own version.
FROM --platform=$BUILDPLATFORM registry.suse.com/bci/golang:1.27 AS caddy
ARG TARGETARCH
ARG CADDY_VERSION=v2.11.7
# Caddy v2.11.7 ships x/net v0.59.0 (GO-2026-6612, Critical). Drop once Caddy has >= v0.60.0.
ARG CADDY_DEP_OVERRIDES="golang.org/x/net@v0.60.0"
RUN zypper --non-interactive update -y
WORKDIR /src
RUN printf '%s\n' \
        'package main' \
        'import (' \
        '	caddycmd "github.com/caddyserver/caddy/v2/cmd"' \
        '	_ "github.com/caddyserver/caddy/v2/modules/standard"' \
        ')' \
        'func main() { caddycmd.Main() }' > main.go \
    && go mod init dapps-caddy \
    && go get github.com/caddyserver/caddy/v2@${CADDY_VERSION} ${CADDY_DEP_OVERRIDES} \
    && go mod tidy \
    && CGO_ENABLED=0 GOARCH=$TARGETARCH go build -buildvcs=false -trimpath -ldflags="-s -w" -o /out/caddy .

FROM registry.suse.com/bci/bci-micro:16.0 AS micro

FROM registry.suse.com/bci/bci-base:16.0 AS root
RUN zypper --non-interactive update -y
COPY --from=micro / /target/
RUN zypper --non-interactive --installroot /target --gpg-auto-import-keys update -y \
    && zypper --non-interactive --installroot /target clean --all \
    && rm -rf /target/var/log/zypp* /target/var/cache/zypp

FROM scratch
COPY --from=root /target/ /
COPY --from=caddy /out/caddy /usr/local/bin/caddy
COPY packages/apps/assembly/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /src/build_outputs/smart-assembly-base/dist/ /srv/
ENV XDG_CONFIG_HOME=/tmp XDG_DATA_HOME=/tmp
USER 65534:65534
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
