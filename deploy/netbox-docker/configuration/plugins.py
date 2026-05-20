# Add your plugins and plugin settings here.
# For NetBox Docker, keep secrets out of Git when possible and load them from
# environment variables or a private override file.

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
        "verify_ssl": os.getenv("ZABBIX_VERIFY_SSL", "true").lower() == "true",
        "timeout": int(os.getenv("ZABBIX_TIMEOUT", "20")),
        "host_field": "name",
        "interface_name_template": "{interface}",
        "in_item_search": "{interface}",
        "out_item_search": "{interface}",
        "in_direction_terms": ["in", "receive", "received", "rx", "download"],
        "out_direction_terms": ["out", "send", "sent", "tx", "upload"],
        "zabbix_history_type": 3,
        "graph_hours": 24,
        "graph_points_limit": 720,
    },
}
