# Alertmanager Configuration Guide

This guide explains how to configure Alertmanager notifications for email, Slack, and Microsoft Teams.

## Prerequisites

- Kubernetes cluster with monitoring stack deployed
- Appropriate credentials from your notification providers
- Access to `kubectl` with admin permissions

## Email Notifications (SMTP)

### Steps

1. **Prepare SMTP credentials:**
   - SMTP server address and port (e.g., smtp.gmail.com:587)
   - Email address for sending alerts
   - App-specific password (NOT your personal password for Gmail)

2. **Create Kubernetes Secret:**

```bash
kubectl create secret generic alertmanager-smtp \
  -n monitoring \
  --from-literal=username=your-email@gmail.com \
  --from-literal=password=your-app-password
```

3. **Update `monitoring/values.yml`:**

```yaml
alertmanager:
  enabled: true
  config:
    global:
      smtp_smarthost: smtp.gmail.com:587
      smtp_from: alerts@yourcompany.com
      smtp_auth_username: your-email@gmail.com
      # Will be injected from secret
      resolve_timeout: 5m
    
    route:
      receiver: internship-team-email
      group_by:
        - alertname
        - namespace
        - service
      group_wait: 30s
      group_interval: 5m
      repeat_interval: 4h
    
    receivers:
      - name: internship-team-email
        email_configs:
          - to: team@yourcompany.com
            from: alerts@yourcompany.com
            send_resolved: true
            headers:
              Subject: "[{{ .Status | toUpper }}] {{ .GroupLabels.alertname }}"
            html: |
              <h3>{{ .CommonAnnotations.summary }}</h3>
              <p>{{ .CommonAnnotations.description }}</p>
              <ul>
              {{ range .Alerts }}
                <li>{{ .Labels.service }}: {{ .Annotations.description }}</li>
              {{ end }}
              </ul>
```

4. **Inject secret password in Helm values:**

Use `--set-string` or external secret management (Sealed Secrets, External Secrets Operator).

## Slack Notifications

### Steps

1. **Create Slack Webhook:**
   - Go to https://api.slack.com/apps
   - Create new app
   - Enable "Incoming Webhooks"
   - Create webhook for your channel
   - Copy webhook URL

2. **Create Kubernetes Secret:**

```bash
kubectl create secret generic alertmanager-slack \
  -n monitoring \
  --from-literal=webhook_url=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

3. **Update `monitoring/values.yml`:**

```yaml
alertmanager:
  enabled: true
  config:
    global:
      resolve_timeout: 5m
    
    route:
      receiver: slack-notifications
      group_by:
        - alertname
        - namespace
        - service
      group_wait: 30s
      group_interval: 5m
      repeat_interval: 4h
    
    receivers:
      - name: slack-notifications
        slack_configs:
          - api_url: ${SLACK_WEBHOOK_URL}  # Will be injected
            channel: "#alerts"
            title: "{{ .GroupLabels.alertname }}"
            text: |
              Severity: {{ .CommonLabels.severity | toUpper }}
              {{ range .Alerts }}
              • *{{ .Labels.service }}*: {{ .Annotations.description }}
              {{ end }}
            actions:
              - type: button
                text: "View Dashboard"
                url: "http://your-cluster:30300"
```

## Microsoft Teams Notifications

### Steps

1. **Create Teams Webhook:**
   - Go to your Teams channel
   - Click "..." → Connectors → Configure
   - Search for "Incoming Webhook"
   - Create and copy webhook URL

2. **Create Kubernetes Secret:**

```bash
kubectl create secret generic alertmanager-teams \
  -n monitoring \
  --from-literal=webhook_url=https://outlook.webhook.office.com/webhookb2/...
```

3. **Update `monitoring/values.yml`:**

```yaml
alertmanager:
  enabled: true
  config:
    global:
      resolve_timeout: 5m
    
    route:
      receiver: teams-notifications
      group_by:
        - alertname
        - namespace
        - service
    
    receivers:
      - name: teams-notifications
        webhook_configs:
          - url: ${TEAMS_WEBHOOK_URL}  # Will be injected
            send_resolved: true
            http_config:
              tls_config:
                insecure_skip_verify: false
```

For Teams, the JSON payload will be:

```json
{
  "@type": "MessageCard",
  "@context": "https://schema.org/extensions",
  "summary": "{{ .GroupLabels.alertname }}",
  "themeColor": "0078D4",
  "sections": [
    {
      "activityTitle": "{{ .Status | toUpper }}: {{ .GroupLabels.alertname }}",
      "facts": [
        {
          "name": "Severity",
          "value": "{{ .CommonLabels.severity }}"
        },
        {
          "name": "Service",
          "value": "{{ range .Alerts }}{{ .Labels.service }}{{ end }}"
        }
      ],
      "markdown": true
    }
  ]
}
```

## Routing Rules

Configure sophisticated routing to send alerts to appropriate teams:

```yaml
route:
  receiver: default
  group_by: [alertname, namespace, service]
  routes:
    # Critical infrastructure alerts → on-call team
    - match:
        severity: critical
      receiver: on-call-pagerduty
      continue: true
    
    # Backend service alerts → backend team
    - match:
        service: backend
      receiver: backend-team-slack
    
    # Frontend service alerts → frontend team
    - match:
        service: frontend
      receiver: frontend-team-email
    
    # Database alerts → DBA team
    - match:
        service: postgres
      receiver: dba-team-teams
```

## Testing

Send a test alert to verify configuration:

```bash
# Port-forward to Alertmanager
kubectl port-forward -n monitoring svc/monitoring-alertmanager 9093:9093

# Send test alert
curl -XPOST http://localhost:9093/api/v1/alerts \
  -H "Content-Type: application/json" \
  -d '[
    {
      "labels": {
        "alertname": "TestAlert",
        "severity": "warning",
        "service": "backend"
      },
      "annotations": {
        "summary": "This is a test alert",
        "description": "Testing Alertmanager routing and notifications"
      }
    }
  ]'
```

Check Alertmanager UI:

```bash
# Access Alertmanager
http://your-cluster:9093
```

## Best Practices

1. **Use environment-specific receivers**: Production, staging, development
2. **Set appropriate repeat intervals**: Avoid alert fatigue
3. **Include runbooks**: Link to incident response procedures
4. **Test routing rules**: Ensure alerts go to correct teams
5. **Monitor Alertmanager itself**: Add health checks for notification system
6. **Rotate credentials regularly**: Update webhook URLs and SMTP passwords
7. **Log all notifications**: Keep audit trail of who was alerted

## Troubleshooting

### Alerts not being sent

```bash
# Check Alertmanager logs
kubectl logs -n monitoring <alertmanager-pod-name> -f

# Check Alertmanager configuration
kubectl get secret -n monitoring alertmanager-monitoring -o jsonpath='{.data.alertmanager\.yaml}' | base64 -d
```

### Slack/Teams webhook errors

- Verify webhook URL is correct
- Check firewall allows outbound HTTPS to Slack/Teams
- Ensure webhook is still valid (webhooks can expire)

### SMTP connection issues

- Verify SMTP credentials
- Check if firewall allows outbound SMTP (port 587/25/465)
- Test with `telnet smtp.example.com 587` or `nc -zv smtp.example.com 587`

## References

- [Alertmanager Documentation](https://prometheus.io/docs/alerting/latest/configuration/)
- [Slack Webhook API](https://api.slack.com/messaging/webhooks)
- [Teams Webhooks](https://docs.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/webhook-reference)
