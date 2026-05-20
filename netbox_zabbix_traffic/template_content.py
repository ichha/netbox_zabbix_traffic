from netbox.plugins import PluginTemplateExtension
from netbox.plugins import get_plugin_config

PLUGIN = "netbox_zabbix_traffic"


class InterfaceTrafficPanel(PluginTemplateExtension):
    models = ["dcim.interface"]

    def alerts(self):
        interface = self.context["object"]
        return self.render(
            "netbox_zabbix_traffic/inc/interface_traffic_panel.html",
            extra_context={
                "interface": interface,
                "graph_hours": get_plugin_config(PLUGIN, "graph_hours"),
            },
        )


template_extensions = [InterfaceTrafficPanel]
