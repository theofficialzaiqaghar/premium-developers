const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const os = require('node:os');

const execFileAsync = promisify(execFile);

async function runPowerShell(script) {
  if (process.platform !== 'win32') {
    return '';
  }
  const { stdout } = await execFileAsync(
    'powershell.exe',
    ['-NoProfile', '-Command', script],
    { timeout: 20000, windowsHide: true, maxBuffer: 2 * 1024 * 1024 }
  );
  return stdout.trim();
}

async function detectWindowsHardware() {
  const cpuScript =
    "Get-CimInstance Win32_Processor | Select-Object -First 1 Name,NumberOfCores,NumberOfLogicalProcessors | ConvertTo-Json -Compress";
  const gpuScript =
    'Get-CimInstance Win32_VideoController | Select-Object Name,AdapterRAM | ConvertTo-Json -Compress';
  const diskScript =
    "Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' | Select-Object DeviceID,FreeSpace,Size | ConvertTo-Json -Compress";
  const memScript =
    'Get-CimInstance Win32_OperatingSystem | Select-Object TotalVisibleMemorySize,FreePhysicalMemory | ConvertTo-Json -Compress';

  let cpu = {};
  let gpus = [];
  let disks = [];
  let mem = {};

  try {
    cpu = JSON.parse(await runPowerShell(cpuScript));
  } catch {
    cpu = { Name: os.cpus()[0]?.model || 'Unknown', NumberOfCores: os.cpus().length };
  }
  try {
    const gpuRaw = JSON.parse(await runPowerShell(gpuScript));
    gpus = Array.isArray(gpuRaw) ? gpuRaw : gpuRaw ? [gpuRaw] : [];
  } catch {
    gpus = [];
  }
  try {
    const diskRaw = JSON.parse(await runPowerShell(diskScript));
    disks = Array.isArray(diskRaw) ? diskRaw : diskRaw ? [diskRaw] : [];
  } catch {
    disks = [];
  }
  try {
    mem = JSON.parse(await runPowerShell(memScript));
  } catch {
    mem = {};
  }

  const totalRamMb = mem.TotalVisibleMemorySize
    ? Math.round(Number(mem.TotalVisibleMemorySize) / 1024)
    : Math.round(os.totalmem() / (1024 * 1024));
  const freeRamMb = mem.FreePhysicalMemory
    ? Math.round(Number(mem.FreePhysicalMemory) / 1024)
    : Math.round(os.freemem() / (1024 * 1024));

  return {
    platform: process.platform,
    cpu: {
      name: cpu.Name || 'Unknown',
      cores: Number(cpu.NumberOfCores) || os.cpus().length,
      threads: Number(cpu.NumberOfLogicalProcessors) || os.cpus().length
    },
    memory: {
      totalMb: totalRamMb,
      freeMb: freeRamMb
    },
    gpus: gpus.map((g) => ({
      name: g.Name || 'Unknown',
      vramBytes: Number(g.AdapterRAM) > 0 ? Number(g.AdapterRAM) : null,
      vramMb: Number(g.AdapterRAM) > 0 ? Math.round(Number(g.AdapterRAM) / (1024 * 1024)) : null
    })),
    disks: disks.map((d) => ({
      drive: d.DeviceID,
      freeGb: Math.round(Number(d.FreeSpace) / (1024 * 1024 * 1024) * 100) / 100,
      sizeGb: Math.round(Number(d.Size) / (1024 * 1024 * 1024) * 100) / 100
    })),
    detectedAt: new Date().toISOString()
  };
}

async function detectHardware() {
  if (process.platform === 'win32') {
    return detectWindowsHardware();
  }
  return {
    platform: process.platform,
    cpu: { name: os.cpus()[0]?.model || 'Unknown', cores: os.cpus().length, threads: os.cpus().length },
    memory: {
      totalMb: Math.round(os.totalmem() / (1024 * 1024)),
      freeMb: Math.round(os.freemem() / (1024 * 1024))
    },
    gpus: [],
    disks: [],
    detectedAt: new Date().toISOString()
  };
}

module.exports = { detectHardware };
