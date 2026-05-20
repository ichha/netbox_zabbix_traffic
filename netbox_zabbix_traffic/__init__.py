from netbox.plugins import PluginConfig


class ZabbixTrafficConfig(PluginConfig):
    name = "netbox_zabbix_traffic"
    verbose_name = "Zabbix Traffic"
    description = "Sync interface traffic statistics from Zabbix into NetBox."
    version = "0.1.0"
    author = "Nepal Telecom"
    base_url = "zabbix-traffic"
    min_version = "4.5.0"
    max_version = "4.6.99"
    required_settings = []
    default_settings = {
        "zabbix_url": "",
        "zabbix_token": "",
        "zabbix_username": "",
        "zabbix_password": "",
        "zabbix_token_auth_mode": "auth_field",
        "verify_ssl": True,
        "timeout": 20,
        "host_field": "name",
        "interface_name_template": "{interface}",
        "in_item_search": "{interface}",
        "out_item_search": "{interface}",
        "in_item_key_template": "",
        "out_item_key_template": "",
        "in_direction_terms": ["in", "receive", "received", "rx", "download"],
        "out_direction_terms": ["out", "send", "sent", "tx", "upload"],
        "zabbix_history_type": 3,
        "graph_hours": 24,
        "graph_points_limit": 720,
    }


config = ZabbixTrafficConfig
