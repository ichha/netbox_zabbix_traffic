    });
    ctx.stroke();
  }

  function drawLegend(ctx, padding) {
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#0d6efd";
    ctx.fillText("IN", padding.left + 10, padding.top - 12);
    ctx.fillStyle = "#198754";
    ctx.fillText("OUT", padding.left + 54, padding.top - 12);
  }

  function drawTooltip(ctx, width, height, padding, hoverTime, inPoints, outPoints, x, y, minX, maxX) {
    const clampedTime = Math.min(Math.max(hoverTime, minX), maxX);
    const xx = x(clampedTime);
    const inPoint = nearestPoint(inPoints, clampedTime);
    const outPoint = nearestPoint(outPoints, clampedTime);
    const tooltipTime = inPoint?.x || outPoint?.x || clampedTime;

    ctx.strokeStyle = "#6c757d";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(xx, padding.top);
    ctx.lineTo(xx, height - padding.bottom);
    ctx.stroke();
    ctx.setLineDash([]);

    drawPoint(ctx, inPoint, x, y, "#0d6efd");
    drawPoint(ctx, outPoint, x, y, "#198754");

    const lines = [
      formatDateTime(tooltipTime),
      `IN  ${formatBps(inPoint?.y)}`,
      `OUT ${formatBps(outPoint?.y)}`,
    ];
    const boxWidth = 190;
    const boxHeight = 68;
    const boxX = xx + boxWidth + 14 > width ? xx - boxWidth - 14 : xx + 14;
    const boxY = Math.max(padding.top + 4, Math.min(height - padding.bottom - boxHeight - 4, padding.top + 10));

    ctx.fillStyle = "rgba(255, 255, 255, 0.96)";
    ctx.strokeStyle = "#adb5bd";
    ctx.lineWidth = 1;
    roundRect(ctx, boxX, boxY, boxWidth, boxHeight, 6);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#212529";
    ctx.fillText(lines[0], boxX + 10, boxY + 9);
    ctx.fillStyle = "#0d6efd";
    ctx.fillText(lines[1], boxX + 10, boxY + 29);
    ctx.fillStyle = "#198754";
    ctx.fillText(lines[2], boxX + 10, boxY + 49);
  }

  function nearestPoint(points, timestamp) {
    if (!points.length) {
      return null;
    }
    return points.reduce((best, point) => {
      return Math.abs(point.x - timestamp) < Math.abs(best.x - timestamp) ? point : best;
    }, points[0]);
  }

  function drawPoint(ctx, point, x, y, color) {
    if (!point) {
      return;
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x(point), y(point), 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
  }

  function formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatDateTime(timestamp) {
    return new Date(timestamp).toLocaleString([], {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function attachHover(canvas, payload) {
    canvas.addEventListener("mousemove", (event) => {
      const state = chartState.get(canvas);
      if (!state || !state.plotWidth) {
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const relativeX = Math.min(Math.max(mouseX - state.padding.left, 0), state.plotWidth);
      const hoverTime = state.minX + (relativeX / state.plotWidth) * (state.maxX - state.minX);
      drawGraph(canvas, payload, hoverTime);
    });

    canvas.addEventListener("mouseleave", () => {
      drawGraph(canvas, payload);
    });
  }

  async function loadGraph(container) {
    const interfaceId = container.dataset.interfaceId;
    const hours = container.dataset.hours || "24";
    const status = container.querySelector("[data-zabbix-traffic-status]");
    const canvas = container.querySelector("canvas");
    try {
      const response = await fetch(`/api/plugins/zabbix-traffic/interface/${interfaceId}/graph/?hours=${hours}`);
      if (!response.ok) {
        throw new Error(`Zabbix graph API returned HTTP ${response.status}`);
      }
      const payload = await response.json();
      drawGraph(canvas, payload);
      attachHover(canvas, payload);
      const inText = payload.in_item ? payload.in_item.name : "inbound item not found";
      const outText = payload.out_item ? payload.out_item.name : "outbound item not found";
      status.textContent = `${payload.device}: ${inText} / ${outText}`;
    } catch (error) {
      status.textContent = error.message;
    }
  }

  function init() {
    document.querySelectorAll(".zabbix-traffic-graph").forEach(loadGraph);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
