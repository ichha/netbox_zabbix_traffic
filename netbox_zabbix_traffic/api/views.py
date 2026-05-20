import time

from dcim.models import Interface
from django.shortcuts import get_object_or_404
from netbox.plugins import get_plugin_config
from rest_framework.exceptions import APIException
from rest_framework.response import Response
from rest_framework.views import APIView

from netbox_zabbix_traffic.zabbix import ZabbixClient, ZabbixError


PLUGIN = "netbox_zabbix_traffic"


class InterfaceGraphView(APIView):
    queryset = Interface.objects.all()

    def get_queryset(self):
        return self.queryset

    def get(self, request, interface_id):
        interface = get_object_or_404(
            Interface.objects.select_related(
                "device",
                "device__primary_ip4",
                "device__primary_ip6",
            ),
            pk=interface_id,
        )

        try:
            return Response(build_graph_payload(interface, request))
        except ZabbixError as exc:
            raise APIException(str(exc)) from exc


def build_graph_payload(interface, request):
    client = build_client()
    host_name = resolve_host_name(interface.device)
    if not host_name:
        raise ZabbixError("Unable to resolve Zabbix host name for this device")

    host = client.find_host(host_name)
    if not host:
        raise ZabbixError(f"Zabbix host not found: {host_name}")

    interface_search = plugin_config("interface_name_template").format(
        device=interface.device.name,
        interface=interface.name,
    )

    in_item = get_direction_item(
        client=client,
        host_id=host["hostid"],
        interface_search=interface_search,
        key_template=plugin_config("in_item_key_template"),
        search_template=plugin_config("in_item_search"),
        terms=plugin_config("in_direction_terms"),
        interface=interface,
    )
    out_item = get_direction_item(
        client=client,
        host_id=host["hostid"],
        interface_search=interface_search,
        key_template=plugin_config("out_item_key_template"),
        search_template=plugin_config("out_item_search"),
        terms=plugin_config("out_direction_terms"),
        interface=interface,
    )

    hours = int(request.query_params.get("hours") or plugin_config("graph_hours"))
    limit = int(request.query_params.get("limit") or plugin_config("graph_points_limit"))
    time_from = int(time.time()) - (hours * 3600)
    history_type = int(plugin_config("zabbix_history_type"))

    return {
        "device": interface.device.name,
        "interface_id": interface.pk,
        "interface": interface.name,
        "host": host.get("host") or host.get("name"),
        "hours": hours,
        "in_item": serialize_item(in_item),
        "out_item": serialize_item(out_item),
        "in": client.get_history(in_item.item_id, history_type, time_from, limit) if in_item else [],
        "out": client.get_history(out_item.item_id, history_type, time_from, limit) if out_item else [],
    }


def build_client():
    return ZabbixClient(
        url=plugin_config("zabbix_url"),
        token=plugin_config("zabbix_token"),
        username=plugin_config("zabbix_username"),
        password=plugin_config("zabbix_password"),
        token_auth_mode=plugin_config("zabbix_token_auth_mode"),
        verify_ssl=plugin_config("verify_ssl"),
        timeout=plugin_config("timeout"),
    )


def get_direction_item(client, host_id, interface_search, key_template, search_template, terms, interface):
    if key_template:
        key = key_template.format(device=interface.device.name, interface=interface.name)
        item = client.get_item_by_key(host_id, key)
        if item:
            return item

    search = search_template.format(
        device=interface.device.name,
        interface=interface_search,
    )
    return client.find_interface_item(host_id, search, terms)


def resolve_host_name(device):
    host_field = plugin_config("host_field")
    if host_field == "display":
        return str(device)
    if host_field == "primary_ip":
        address = device.primary_ip4 or device.primary_ip6
        return str(address.address.ip) if address else ""
    return device.name


def serialize_item(item):
    if not item:
        return None
    return {
        "item_id": item.item_id,
        "name": item.name,
        "key": item.key,
    }


def plugin_config(key):
    return get_plugin_config(PLUGIN, key)
    if key_template:
        key = key_template.format(device=interface.device.name, interface=interface.name)
        item = client.get_item_by_key(host_id, key)
        if item:
            return item

    search = search_template.format(
        device=interface.device.name,
        interface=interface_search,
    )
    return client.find_interface_item(host_id, search, terms)


def resolve_host_name(device):
    host_field = plugin_config("host_field")
    if host_field == "display":
        return str(device)
    if host_field == "primary_ip":
        address = device.primary_ip4 or device.primary_ip6
        return str(address.address.ip) if address else ""
    return device.name


def serialize_item(item):
    if not item:
        return None
    return {
        "item_id": item.item_id,
        "name": item.name,
        "key": item.key,
    }


def plugin_config(key):
    return get_plugin_config(PLUGIN, key)
