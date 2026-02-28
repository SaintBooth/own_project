# HashiCorp Vault — dev конфигурация
# Production: используй HA кластер с Auto-Unseal (§11.4, §27.1)

ui = true

listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_disable = true  # В dev TLS отключён. В production: tls_cert_file + tls_key_file
}

# Dev storage — только для локальной разработки
# Production: storage "raft" с HA кластером (3 узла)
storage "inmem" {}

api_addr     = "http://0.0.0.0:8200"
cluster_addr = "http://0.0.0.0:8201"

# Audit log — обязателен в production
# audit "file" {
#   path = "/vault/logs/audit.log"
# }
