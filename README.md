# NetBox Zabbix Traffic

NetBox plugin for fetching interface traffic statistics from Zabbix and showing a live traffic graph on NetBox interface pages.

Target NetBox version: `4.5.x` and `4.6.x`.

## What this plugin does

- Calls the Zabbix JSON-RPC API using an API key.
- Resolves a NetBox device to a Zabbix host.
- Resolves a NetBox interface to inbound and outbound Zabbix items.
- Shows a live 24-hour traffic graph on the NetBox interface detail page.
- Provides a small graph API endpoint for the interface page JavaScript.

## Installation in NetBox Docker

If you upload this plugin to a Git repository, add it to your NetBox Docker `plugin_requirements.txt`:

```text
netbox_topology_views
netbox_ipcalculator
https://github.com/netbox-community/netbox-floorplan-plugin.git
git+https://github.com/YOUR-ORG/netbox-zabbix-traffic.git
```

Enable the plugin in `configuration/plugins.py`:

```python
import os

PLUGINS = [
    "netbox_topology_views",
    "netbox_ipcalculator",
    "netbox_floorplan",
    "netbox_zabbix_traffic",
]

PLUGINS_CONFIG = {
    "netbox_topology_views": {
        "static_image_directory": "netbox_topology_views/img",
        "allow_coordinates_saving": True,
        "always_save_coordinates": True,
    },
    "netbox_zabbix_traffic": {
        "zabbix_url": os.getenv("ZABBIX_URL", "https://zabbix.example.com/api_jsonrpc.php"),
        "zabbix_token": os.getenv("ZABBIX_API_TOKEN", ""),
        "zabbix_token_auth_mode": os.getenv("ZABBIX_TOKEN_AUTH_MODE", "auth_field"),
        "verify_ssl": True,
        "timeout": 20,
        "host_field": "name",
        "interface_name_template": "{interface}",
        "in_item_search": "{interface}",
        "out_item_search": "{interface}",
        "in_direction_terms": ["in", "receive", "received", "rx", "download"],
        "out_direction_terms": ["out", "send", "sent", "tx", "upload"],
        "zabbix_history_type": 3,
        "graph_hours": 24,
        "graph_points_limit": 720,
    }
}
```

Example files are included under `deploy/netbox-docker/`.

Then rebuild/restart your NetBox Docker image/container following your normal NetBox Docker plugin workflow.

If installing manually inside a container, run:

```bash
python manage.py collectstatic --no-input
supervisorctl restart netbox
```

## Zabbix matching logic

The sync job matches NetBox devices to Zabbix hosts using `host_field`:

- `name`: use `device.name`
- `display`: use `str(device)`
- `primary_ip`: use the device primary IP address without prefix length

For each NetBox interface, the job searches Zabbix items on the matched host. The item name/key must contain the interface search string and one of the configured direction terms. If your Zabbix item names are exact and predictable, set `in_item_key_template` and `out_item_key_template` in `PLUGINS_CONFIG`.

Example:

```python
"in_item_key_template": "net.if.in[{interface}]",
"out_item_key_template": "net.if.out[{interface}]",
```

Use `"zabbix_token_auth_mode": "bearer"` if your Zabbix API expects API tokens in the `Authorization: Bearer ...` header instead of the JSON-RPC `auth` field.

## Interface graph API

The interface page calls this endpoint automatically:

```text
/api/plugins/zabbix-traffic/interface/<interface_id>/graph/?hours=24
```

It returns:

- matched Zabbix host
- matched inbound item
- matched outbound item
- inbound history points
- outbound history points

## Topology views

This plugin already includes the interface graph. Topology view integration should come after the graph is confirmed working, because the exact injection point depends on the topology plugin template/API.

## Notes

Zabbix environments differ significantly in interface item names. Expect to tune `in_item_search`, `out_item_search`, direction terms, or exact item key templates after checking your Zabbix item names for one device.
