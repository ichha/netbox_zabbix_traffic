(function () {

  function formatBps(value) {

    if (value === null || value === undefined) {
      return "-";
    }

    const units = ["bps", "Kbps", "Mbps", "Gbps", "Tbps"];

    let number = Number(value);
    let index = 0;

    while (Math.abs(number) >= 1000 && index < units.length - 1) {
      number /= 1000;
      index += 1;
    }

    return index === 0
      ? `${Math.round(number)} ${units[index]}`
      : `${number.toFixed(2)} ${units[index]}`;
  }

  function normalizePoints(points) {

    return points
      .filter(
        (point) =>
          point.clock &&
          point.value !== null &&
          point.value !== undefined
      )
      .map((point) => ({
        x: Number(point.clock) * 1000,
        y: Number(point.value),
      }));
  }

  function niceMax(value) {

    if (value <= 0) {
      return 1;
    }

    const exponent = Math.floor(Math.log10(value));

    const fraction =
      value / Math.pow(10, exponent);

    const niceFraction =
      fraction <= 1 ? 1 :
      fraction <= 2 ? 2 :
      fraction <= 5 ? 5 : 10;

    return niceFraction *
      Math.pow(10, exponent);
  }

  function formatTime(timestamp) {

    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function drawAxes(ctx, width, height, padding) {

    ctx.strokeStyle = "#d0d7de";

    ctx.beginPath();

    ctx.moveTo(padding.left, padding.top);

    ctx.lineTo(
      padding.left,
      height - padding.bottom
    );

    ctx.lineTo(
      width - padding.right,
      height - padding.bottom
    );

    ctx.stroke();
  }

  function drawLegend(ctx, padding) {

    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    ctx.fillStyle = "#0d6efd";
    ctx.fillText(
      "IN",
      padding.left + 10,
      padding.top - 12
    );

    ctx.fillStyle = "#198754";
    ctx.fillText(
      "OUT",
      padding.left + 54,
      padding.top - 12
    );
  }

  function drawGrid(
    ctx,
    width,
    height,
    padding,
    maxY,
    minX,
    maxX,
    x,
    y
  ) {

    drawAxes(ctx, width, height, padding);

    const yTicks = 5;

    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    for (let index = 0; index <= yTicks; index += 1) {

      const value =
        (maxY / yTicks) * index;

      const yy = y(value);

      ctx.strokeStyle =
        index === 0
          ? "#c8ced3"
          : "#e9ecef";

      ctx.beginPath();

      ctx.moveTo(padding.left, yy);

      ctx.lineTo(
        width - padding.right,
        yy
      );

      ctx.stroke();

      ctx.fillStyle = "#495057";

      ctx.fillText(
        formatBps(value),
        padding.left - 10,
        yy
      );
    }

    const xTicks = 6;

    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    for (let index = 0; index <= xTicks; index += 1) {

      const value =
        minX +
        ((maxX - minX) / xTicks) * index;

      const xx = x(value);

      ctx.strokeStyle = "#f1f3f5";

      ctx.beginPath();

      ctx.moveTo(xx, padding.top);

      ctx.lineTo(
        xx,
        height - padding.bottom
      );

      ctx.stroke();

      ctx.fillStyle = "#495057";

      ctx.fillText(
        formatTime(value),
        xx,
        height - padding.bottom + 12
      );
    }
  }

  function drawLine(
    ctx,
    series,
    x,
    y,
    color,
    hoverPoints,
    type
  ) {

    const visible =
      series.filter(
        (point) => x(point) >= 0
      );

    if (!visible.length) {
      return;
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    ctx.beginPath();

    visible.forEach((point, index) => {

      const xx = x(point);
      const yy = y(point);

      if (!hoverPoints[index]) {

        hoverPoints[index] = {
          x: xx,
          timestamp: point.x,
        };
      }

      hoverPoints[index][type] = point.y;
      hoverPoints[index][`${type}Y`] = yy;

      if (index === 0) {
        ctx.moveTo(xx, yy);
      } else {
        ctx.lineTo(xx, yy);
      }
    });

    ctx.stroke();
  }

  function drawGraph(
    canvas,
    payload,
    hoverIndex = null
  ) {

    const ctx = canvas.getContext("2d");

    // IMPORTANT FIX
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const scale =
      window.devicePixelRatio || 1;

    ctx.setTransform(
      scale,
      0,
      0,
      scale,
      0,
      0
    );

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    ctx.clearRect(
      0,
      0,
      width,
      height
    );

    const inPoints =
      normalizePoints(payload.in || []);

    const outPoints =
      normalizePoints(payload.out || []);

    const points =
      inPoints.concat(outPoints);

    const padding = {
      top: 28,
      right: 28,
      bottom: 52,
      left: 78
    };

    ctx.font = "12px sans-serif";

    if (!points.length) {

      drawAxes(
        ctx,
        width,
        height,
        padding
      );

      ctx.fillStyle = "#6c757d";

      ctx.fillText(
        "No Zabbix history returned for this interface.",
        padding.left + 12,
        height / 2
      );

      return [];
    }

    const now = Date.now();

    const hours =
      Number(payload.hours || 24);

    const minX =
      now - hours * 3600 * 1000;

    const maxX = now;

    const maxY = niceMax(
      Math.max(
        ...points.map((point) => point.y),
        1
      )
    );

    const plotWidth =
      width -
      padding.left -
      padding.right;

    const plotHeight =
      height -
      padding.top -
      padding.bottom;

    const hoverPoints = [];

    function x(pointOrTime) {

      const value =
        typeof pointOrTime === "number"
          ? pointOrTime
          : pointOrTime.x;

      return (
        padding.left +
        (
          (value - minX) /
          Math.max(maxX - minX, 1)
        ) * plotWidth
      );
    }

    function y(pointOrValue) {

      const value =
        typeof pointOrValue === "number"
          ? pointOrValue
          : pointOrValue.y;

      return (
        height -
        padding.bottom -
        (value / maxY) * plotHeight
      );
    }

    drawGrid(
      ctx,
      width,
      height,
      padding,
      maxY,
      minX,
      maxX,
      x,
      y
    );

    drawLine(
      ctx,
      inPoints,
      x,
      y,
      "#0d6efd",
      hoverPoints,
      "in"
    );

    drawLine(
      ctx,
      outPoints,
      x,
      y,
      "#198754",
      hoverPoints,
      "out"
    );

    drawLegend(ctx, padding);

    // Hover rendering
    if (
      hoverIndex !== null &&
      hoverPoints[hoverIndex]
    ) {

      const point =
        hoverPoints[hoverIndex];

      ctx.beginPath();

      ctx.moveTo(
        point.x,
        padding.top
      );

      ctx.lineTo(
        point.x,
        height - padding.bottom
      );

      ctx.strokeStyle = "#9ca3af";
      ctx.lineWidth = 1;

      ctx.stroke();

      if (point.inY !== undefined) {

        ctx.beginPath();

        ctx.arc(
          point.x,
          point.inY,
          4,
          0,
          Math.PI * 2
        );

        ctx.fillStyle = "#0d6efd";

        ctx.fill();
      }

      if (point.outY !== undefined) {

        ctx.beginPath();

        ctx.arc(
          point.x,
          point.outY,
          4,
          0,
          Math.PI * 2
        );

        ctx.fillStyle = "#198754";

        ctx.fill();
      }
    }

    return hoverPoints;
  }

  async function loadGraph(container) {

    const interfaceId =
      container.dataset.interfaceId;

    const hours =
      container.dataset.hours || "24";

    const status =
      container.querySelector(
        "[data-zabbix-traffic-status]"
      );

    const canvas =
      container.querySelector("canvas");

    // FIXED CANVAS INIT
    const width =
      canvas.parentElement.clientWidth ||
      canvas.clientWidth ||
      1200;

    const height =
      Number(canvas.getAttribute("height")) ||
      360;

    const scale =
      window.devicePixelRatio || 1;

    canvas.width = width * scale;
    canvas.height = height * scale;

    canvas.style.width = width + "px";
    canvas.style.height = height + "px";

    const ctx =
      canvas.getContext("2d");

    ctx.setTransform(
      scale,
      0,
      0,
      scale,
      0,
      0
    );

    // Tooltip
    const tooltip =
      document.createElement("div");

    tooltip.style.position = "absolute";
    tooltip.style.display = "none";
    tooltip.style.background = "#111827";
    tooltip.style.color = "#ffffff";
    tooltip.style.padding = "6px 10px";
    tooltip.style.borderRadius = "6px";
    tooltip.style.fontSize = "12px";
    tooltip.style.pointerEvents = "none";
    tooltip.style.zIndex = "1000";
    tooltip.style.whiteSpace = "nowrap";
    tooltip.style.boxShadow =
      "0 2px 8px rgba(0,0,0,0.3)";

    container.style.position = "relative";

    container.appendChild(tooltip);

    try {

      const response =
        await fetch(
          `/api/plugins/zabbix-traffic/interface/${interfaceId}/graph/?hours=${hours}`
        );

      if (!response.ok) {

        throw new Error(
          `Zabbix graph API returned HTTP ${response.status}`
        );
      }

      const payload =
        await response.json();

      let hoverPoints =
        drawGraph(canvas, payload);

      canvas.addEventListener(
        "mousemove",
        (event) => {

          const rect =
            canvas.getBoundingClientRect();

          const mouseX =
            event.clientX - rect.left;

          let closestIndex = null;

          let closestDistance =
            Infinity;

          hoverPoints.forEach(
            (point, index) => {

              const distance =
                Math.abs(
                  point.x - mouseX
                );

              if (
                distance <
                closestDistance
              ) {

                closestDistance =
                  distance;

                closestIndex = index;
              }
            }
          );

          if (closestIndex === null) {
            return;
          }

          const point =
            hoverPoints[closestIndex];

          hoverPoints =
            drawGraph(
              canvas,
              payload,
              closestIndex
            );

          tooltip.style.display =
            "block";

          tooltip.style.left =
            `${point.x + 15}px`;

          tooltip.style.top =
            `${event.clientY - rect.top - 60}px`;

          tooltip.innerHTML = `
            <div style="margin-bottom:4px;">
              ${new Date(point.timestamp).toLocaleString()}
            </div>

            <div style="color:#60a5fa;">
              IN: ${formatBps(point.in)}
            </div>

            <div style="color:#34d399;">
              OUT: ${formatBps(point.out)}
            </div>
          `;
        }
      );

      canvas.addEventListener(
        "mouseleave",
        () => {

          tooltip.style.display =
            "none";

          hoverPoints =
            drawGraph(
              canvas,
              payload
            );
        }
      );

      const inText =
        payload.in_item
          ? payload.in_item.name
          : "inbound item not found";

      const outText =
        payload.out_item
          ? payload.out_item.name
          : "outbound item not found";

      status.textContent =
        `${payload.device}: ${inText} / ${outText}`;

    } catch (error) {

      status.textContent =
        error.message;
    }
  }

  function init() {

    document
      .querySelectorAll(
        ".zabbix-traffic-graph"
      )
      .forEach(loadGraph);
  }

  if (
    document.readyState === "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      init
    );

  } else {

    init();
  }

})();
