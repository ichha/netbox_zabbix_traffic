from django.urls import path

from .views import InterfaceGraphView

urlpatterns = [
    path("interface/<int:interface_id>/graph/", InterfaceGraphView.as_view(), name="interface_graph"),
]
