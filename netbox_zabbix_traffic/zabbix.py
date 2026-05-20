from dataclasses import dataclass
from datetime import datetime

import requests
from django.utils import timezone


class ZabbixError(RuntimeError):
    pass


@dataclass
class ZabbixItemValue:
    item_id: str
    name: str
    key: str
    value: int | None
    clock: datetime | None


class ZabbixClient:
    def __init__(
        self,
        url,
        token="",
        username="",
        password="",
        token_auth_mode="auth_field",
        verify_ssl=True,
        timeout=20,
    ):
        self.url = url
        self.token = token
        self.username = username
        self.password = password
        self.token_auth_mode = token_auth_mode
        self.verify_ssl = verify_ssl
        self.timeout = timeout
        self._request_id = 0
        self._auth = token if token and token_auth_mode == "auth_field" else None

    def call(self, method, params=None):
        self._request_id += 1
        payload = {
            "jsonrpc": "2.0",
            "method": method,
            "params": params or {},
            "id": self._request_id,
        }
        if self._auth:
            payload["auth"] = self._auth

        headers = {}
        if self.token and self.token_auth_mode == "bearer":
            headers["Authorization"] = f"Bearer {self.token}"

        response = requests.post(
            self.url,
            json=payload,
            headers=headers,
            timeout=self.timeout,
            verify=self.verify_ssl,
        )
        response.raise_for_status()
        body = response.json()
        if "error" in body:
            error = body["error"]
            raise ZabbixError(f"{method}: {error.get('message')} - {error.get('data')}")
        return body.get("result")

    def login(self):
        if self._auth or (self.token and self.token_auth_mode == "bearer"):
            return self._auth
        if not self.username or not self.password:
            raise ZabbixError("Zabbix token or username/password is required")

        self._auth = self.call(
            "user.login",
            {
                "username": self.username,
                "password": self.password,
            },
        )
        return self._auth

    def find_host(self, host_name):
        self.login()
        hosts = self.call(
            "host.get",
            {
                "output": ["hostid", "host", "name"],
                "filter": {"host": [host_name]},
            },
        )
        if not hosts:
            hosts = self.call(
                "host.get",
                {
                    "output": ["hostid", "host", "name"],
                    "search": {"name": host_name},
                    "searchByAny": True,
                },
            )
        return hosts[0] if hosts else None

    def get_item_by_key(self, host_id, key):
        self.login()
        items = self.call(
            "item.get",
            {
                "hostids": host_id,
                "output": ["itemid", "name", "key_", "lastvalue", "lastclock"],
                "filter": {"key_": key},
                "sortfield": "name",
            },
        )
        return _item_to_value(items[0]) if items else None

    def find_interface_item(self, host_id, interface_search, direction_terms):
        self.login()
        items = self.call(
            "item.get",
            {
                "hostids": host_id,
                "output": ["itemid", "name", "key_", "lastvalue", "lastclock"],
                "search": {"name": interface_search},
                "searchByAny": True,
                "sortfield": "name",
            },
        )
        direction_terms = [term.lower() for term in direction_terms]
        for item in items:
            haystack = f"{item.get('name', '')} {item.get('key_', '')}".lower()
            if any(term in haystack for term in direction_terms):
                return _item_to_value(item)
        return None

    def get_history(self, item_id, history_type=3, time_from=None, limit=240):
        self.login()
        params = {
            "output": "extend",
            "history": int(history_type),
            "itemids": [item_id],
            "sortfield": "clock",
            "sortorder": "ASC",
            "limit": int(limit),
        }
        if time_from:
            params["time_from"] = int(time_from)

        points = self.call("history.get", params)
        return [_history_to_point(point) for point in points]


def _item_to_value(item):
    value = item.get("lastvalue")
    clock = item.get("lastclock")
    return ZabbixItemValue(
        item_id=item.get("itemid", ""),
        name=item.get("name", ""),
        key=item.get("key_", ""),
        value=_safe_int(value),
        clock=datetime.fromtimestamp(int(clock), tz=timezone.get_current_timezone()) if clock else None,
    )


def _safe_int(value):
    if value in (None, ""):
        return None
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


def _history_to_point(point):
    clock = point.get("clock")
    value = _safe_int(point.get("value"))
    return {
        "clock": int(clock) if clock else None,
        "value": value,
    }
