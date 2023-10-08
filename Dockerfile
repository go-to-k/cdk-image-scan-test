FROM arm64v8/ubuntu:20.04

WORKDIR /

ENTRYPOINT ["tail", "-F", "/dev/null"]