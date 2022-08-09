output "core_id" {
  value = var.core_id
}

output "loadbalancer" {
  description = "The URL for the load balancer of the cluster. Used to access the UI via the browser"
  value       = data.kubernetes_service.ingress.status.0.load_balancer.0.ingress.0.hostname
}

output "api_host" {
  description = "The URL of the API and the UI"
  value       = data.kubernetes_config_map.core_config.data.API_HOST
}

output "version" {
  description = "The URL of the API and the UI"
  value       = data.kubernetes_config_map.core_config.data.API_IMAGE_TAG
}

output "unique_id" {
  description = "Unique ID used for the NGrok public tunnel"
  value       = data.kubernetes_config_map.core_config.data.CORE_ID
}
