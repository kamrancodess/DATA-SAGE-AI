import { execFile } from "node:child_process";
import os from "node:os";
import { promisify } from "node:util";

import { NextResponse } from "next/server";

const execFileAsync = promisify(execFile);

type ResourceMetric = {
  name: "CPU" | "Memory" | "Storage" | "Network";
  value: number;
  color: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function snapshotCpuTimes() {
  return os.cpus().map((cpu) => ({ ...cpu.times }));
}

async function getCpuUsagePercent() {
  const start = snapshotCpuTimes();
  await sleep(250);
  const end = snapshotCpuTimes();

  let idle = 0;
  let total = 0;

  for (let i = 0; i < start.length; i += 1) {
    const startTimes = start[i];
    const endTimes = end[i];

    const idleDelta = endTimes.idle - startTimes.idle;
    const totalDelta =
      endTimes.user -
      startTimes.user +
      (endTimes.nice - startTimes.nice) +
      (endTimes.sys - startTimes.sys) +
      (endTimes.idle - startTimes.idle) +
      (endTimes.irq - startTimes.irq);

    idle += idleDelta;
    total += totalDelta;
  }

  if (total <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round((1 - idle / total) * 100)));
}

function getMemoryUsagePercent() {
  const total = os.totalmem();
  const free = os.freemem();

  if (total <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(((total - free) / total) * 100)));
}

async function getStorageUsagePercent() {
  if (process.platform === "win32") {
    const command = [
      "$drives = Get-CimInstance Win32_LogicalDisk | Where-Object { $_.DriveType -eq 3 };",
      "if (-not $drives) { Write-Output '{\"usedPercent\":0}'; exit 0 }",
      "$total = ($drives | Measure-Object -Property Size -Sum).Sum;",
      "$free = ($drives | Measure-Object -Property FreeSpace -Sum).Sum;",
      "$usedPercent = if ($total -gt 0) { [math]::Round((($total - $free) / $total) * 100) } else { 0 };",
      'Write-Output (@{ usedPercent = $usedPercent } | ConvertTo-Json -Compress)',
    ].join(" ");

    const { stdout } = await execFileAsync("powershell", [
      "-NoProfile",
      "-Command",
      command,
    ]);

    const parsed = JSON.parse(stdout.trim()) as { usedPercent?: number };
    return Math.max(0, Math.min(100, Math.round(parsed.usedPercent ?? 0)));
  }

  const { stdout } = await execFileAsync("df", ["-kP", "/"]);
  const lines = stdout.trim().split("\n");
  const fields = lines.at(-1)?.trim().split(/\s+/) ?? [];
  const usage = Number(fields[4]?.replace("%", "") ?? "0");
  return Math.max(0, Math.min(100, Math.round(usage)));
}

async function getNetworkUsagePercent() {
  if (process.platform === "win32") {
    const command = [
      "$stats1 = Get-NetAdapterStatistics | Where-Object { $_.ReceivedBytes -ne $null };",
      "$adapters = Get-NetAdapter | Where-Object { $_.Status -eq 'Up' -and $_.LinkSpeed -ne $null };",
      "Start-Sleep -Milliseconds 1000;",
      "$stats2 = Get-NetAdapterStatistics | Where-Object { $_.ReceivedBytes -ne $null };",
      "$rx1 = ($stats1 | Measure-Object -Property ReceivedBytes -Sum).Sum;",
      "$tx1 = ($stats1 | Measure-Object -Property SentBytes -Sum).Sum;",
      "$rx2 = ($stats2 | Measure-Object -Property ReceivedBytes -Sum).Sum;",
      "$tx2 = ($stats2 | Measure-Object -Property SentBytes -Sum).Sum;",
      "$totalBitsPerSecond = (($rx2 - $rx1) + ($tx2 - $tx1)) * 8;",
      "$linkSpeedBits = 0;",
      "foreach ($adapter in $adapters) {",
      "  $speed = $adapter.LinkSpeed.ToString().ToLower();",
      "  if ($speed -match '([0-9.]+)\\s*gbps') { $linkSpeedBits += [double]$matches[1] * 1000000000 }",
      "  elseif ($speed -match '([0-9.]+)\\s*mbps') { $linkSpeedBits += [double]$matches[1] * 1000000 }",
      "  elseif ($speed -match '([0-9.]+)\\s*kbps') { $linkSpeedBits += [double]$matches[1] * 1000 }",
      "}",
      "$usedPercent = if ($linkSpeedBits -gt 0) { [math]::Round(($totalBitsPerSecond / $linkSpeedBits) * 100, 0) } else { 0 };",
      'Write-Output (@{ usedPercent = $usedPercent } | ConvertTo-Json -Compress)',
    ].join(" ");

    const { stdout } = await execFileAsync("powershell", [
      "-NoProfile",
      "-Command",
      command,
    ]);

    const parsed = JSON.parse(stdout.trim()) as { usedPercent?: number };
    return Math.max(0, Math.min(100, Math.round(parsed.usedPercent ?? 0)));
  }

  const readBytes = async () => {
    const { stdout } = await execFileAsync("cat", ["/proc/net/dev"]);
    return stdout
      .trim()
      .split("\n")
      .slice(2)
      .reduce(
        (sum, line) => {
          const parts = line.trim().split(/[:\s]+/).filter(Boolean);
          const rx = Number(parts[1] ?? 0);
          const tx = Number(parts[9] ?? 0);
          return sum + rx + tx;
        },
        0,
      );
  };

  const first = await readBytes();
  await sleep(1000);
  const second = await readBytes();
  const bytesPerSecond = Math.max(0, second - first);
  const assumedCapacity = 125_000_000;
  return Math.max(
    0,
    Math.min(100, Math.round((bytesPerSecond / assumedCapacity) * 100)),
  );
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [cpu, memory, storage, network] = await Promise.all([
      getCpuUsagePercent(),
      Promise.resolve(getMemoryUsagePercent()),
      getStorageUsagePercent().catch(() => 0),
      getNetworkUsagePercent().catch(() => 0),
    ]);

    const data: ResourceMetric[] = [
      { name: "CPU", value: cpu, color: "#ec4899" },
      { name: "Memory", value: memory, color: "#a855f7" },
      { name: "Storage", value: storage, color: "#f97316" },
      { name: "Network", value: network, color: "#06b6d4" },
    ];

    return NextResponse.json({ success: true, data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load resource metrics";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
