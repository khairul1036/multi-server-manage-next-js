require('dotenv').config();
const express = require('express');
const { exec, spawn } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

const PORT = process.env.AGENT_PORT || 4000;
const AGENT_API_KEY = process.env.AGENT_API_KEY || 'agent_secret_key_change_me_123';
const MASTER_IP = process.env.MASTER_IP || '';
const META_FILE = path.join(__dirname, 'users_meta.json');

// Helper to manage metadata on agent node
function loadMeta() {
  if (fs.existsSync(META_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(META_FILE, 'utf8'));
    } catch (e) {
      return {};
    }
  }
  return {};
}

function saveMeta(meta) {
  fs.writeFileSync(META_FILE, JSON.stringify(meta, null, 2), 'utf8');
}

// Auto-assign next port starting from 8081 up to 8150
function getNextAvailablePort() {
  const meta = loadMeta();
  const usedPorts = Object.values(meta).map((v) => v.port).filter(Boolean);
  let port = 8081;
  while (usedPorts.includes(port) && port <= 8150) {
    port++;
  }
  return port;
}

// Generate random safe password
function generatePassword(length = 10) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
  let pass = '';
  for (let i = 0; i < length; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

// Authentication Middleware
const authenticate = (req, res, next) => {
  const apiKey = req.headers['x-agent-api-key'];
  if (!apiKey || apiKey !== AGENT_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid Agent API Key' });
  }

  if (MASTER_IP && req.ip && !req.ip.includes(MASTER_IP) && !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.ip)) {
    return res.status(403).json({ error: 'Forbidden: IP address not authorized' });
  }

  next();
};

// 1. Health & Detailed Telemetry Endpoint (Overall RAM, CPU, Disk)
app.get('/health', authenticate, (req, res) => {
  const totalMem = Math.round(os.totalmem() / (1024 * 1024));
  const freeMem = Math.round(os.freemem() / (1024 * 1024));
  const usedMem = totalMem - freeMem;
  const usedMemPercent = parseFloat(((usedMem / totalMem) * 100).toFixed(1));

  const cpus = os.cpus();
  const loadAvg = os.loadavg()[0];
  const cpuPercent = parseFloat(Math.min(100, Math.max(0, (loadAvg / (cpus.length || 1)) * 100)).toFixed(1));

  // Default disk estimation (can query df on Linux)
  let diskTotalGB = 20.0;
  let diskUsedGB = 4.2;
  let diskFreeGB = 15.8;
  let diskPercent = 21.0;

  if (process.platform !== 'win32') {
    try {
      const dfOutput = require('child_process').execSync("df -k / | tail -1").toString();
      const parts = dfOutput.trim().split(/\s+/);
      if (parts.length >= 4) {
        diskTotalGB = parseFloat((parseInt(parts[1], 10) / (1024 * 1024)).toFixed(1));
        diskUsedGB = parseFloat((parseInt(parts[2], 10) / (1024 * 1024)).toFixed(1));
        diskFreeGB = parseFloat((parseInt(parts[3], 10) / (1024 * 1024)).toFixed(1));
        diskPercent = parseFloat(((diskUsedGB / diskTotalGB) * 100).toFixed(1));
      }
    } catch (e) {}
  }

  res.json({
    status: 'online',
    uptime: Math.round(os.uptime()),
    cpu: {
      percent: cpuPercent,
      cores: cpus.length,
      model: cpus[0]?.model || 'Intel Xeon / AMD Processor',
    },
    ram: {
      totalMB: totalMem,
      usedMB: usedMem,
      freeMB: freeMem,
      percent: usedMemPercent,
    },
    disk: {
      totalGB: diskTotalGB,
      usedGB: diskUsedGB,
      freeGB: diskFreeGB,
      percent: diskPercent,
    },
    os: `${os.type()} ${os.release()} (${os.arch()})`,
  });
});

// 2. Automated User Creation with Auto-assigned Port & Quota & Background Web Server
app.post('/api/users/create', authenticate, (req, res) => {
  const { username, quotaMB = 1024, initialPassword } = req.body;

  if (!username || !/^[a-z_][a-z0-9_-]{2,31}$/.test(username)) {
    return res.status(400).json({ error: 'Invalid username format. Must be safe Linux username.' });
  }

  const meta = loadMeta();
  const password = initialPassword || generatePassword();
  const assignedPort = meta[username]?.port || getNextAvailablePort();

  if (process.platform === 'win32') {
    // Windows simulation
    const mockDir = path.join(os.tmpdir(), 'vps_mock_users', username);
    fs.mkdirSync(mockDir, { recursive: true });
    fs.writeFileSync(
      path.join(mockDir, 'index.html'),
      `<h1>Welcome to ${username}'s Website!</h1><p>Running on Port ${assignedPort}</p>`
    );

    meta[username] = {
      password,
      port: assignedPort,
      quotaMB: Number(quotaMB) || 1024,
      usedMB: 0.05,
    };
    saveMeta(meta);

    return res.json({
      success: true,
      username,
      port: assignedPort,
      password,
      usedMB: 0.05,
      totalMB: Number(quotaMB) || 1024,
      message: `User ${username} configured on port ${assignedPort}`,
    });
  }

  // Linux command execution
  try {
    // Create user if not exists
    execSync(`id -u ${username} >/dev/null 2>&1 || sudo useradd -m -s /bin/bash ${username}`);
    
    // Set password via chpasswd
    const chpass = spawn('sudo', ['chpasswd']);
    chpass.stdin.write(`${username}:${password}\n`);
    chpass.stdin.end();

    const homeDir = `/home/${username}`;
    execSync(`sudo chmod 700 ${homeDir}`);

    // Create starter index.html in user home
    const indexHtml = path.join(homeDir, 'index.html');
    if (!fs.existsSync(indexHtml)) {
      const htmlContent = `<!DOCTYPE html>
<html>
<head><title>Welcome to ${username}</title></head>
<body style="font-family:sans-serif; background:#0f172a; color:#fff; text-align:center; padding:50px;">
  <h1 style="color:#38bdf8;">🚀 Welcome to ${username}'s Web Server!</h1>
  <p>Hosted on Port <strong>${assignedPort}</strong></p>
  <p>Upload your website files to <code>${homeDir}</code></p>
</body>
</html>`;
      fs.writeFileSync(indexHtml, htmlContent, 'utf8');
      execSync(`sudo chown ${username}:${username} ${indexHtml}`);
    }

    // Kill existing python server on that port if any
    try {
      execSync(`pkill -f "http.server ${assignedPort}" || true`);
    } catch (e) {}

    // Start background Python HTTP server under user on assigned port
    exec(`su - ${username} -c "nohup python3 -m http.server ${assignedPort} > ${homeDir}/server.log 2>&1 &"`);

    meta[username] = {
      password,
      port: assignedPort,
      quotaMB: Number(quotaMB) || 1024,
    };
    saveMeta(meta);

    res.json({
      success: true,
      username,
      port: assignedPort,
      password,
      usedMB: 0.05,
      totalMB: Number(quotaMB) || 1024,
      message: `User ${username} created with automated hosting port ${assignedPort}`,
    });
  } catch (err) {
    console.error('User setup error:', err);
    res.status(500).json({ error: `User setup failed: ${err.message}` });
  }
});

// 3. Regenerate Password
app.post('/api/users/regenerate-password', authenticate, (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'Username required' });

  const newPassword = generatePassword(10);
  const meta = loadMeta();

  if (process.platform === 'win32') {
    if (meta[username]) {
      meta[username].password = newPassword;
      saveMeta(meta);
    }
    return res.json({ success: true, password: newPassword });
  }

  try {
    const chpass = spawn('sudo', ['chpasswd']);
    chpass.stdin.write(`${username}:${newPassword}\n`);
    chpass.stdin.end();

    if (meta[username]) {
      meta[username].password = newPassword;
      saveMeta(meta);
    }

    res.json({ success: true, password: newPassword });
  } catch (err) {
    res.status(500).json({ error: `Failed to regenerate password: ${err.message}` });
  }
});

// 4. Delete User & Files & Free Port
app.post('/api/users/delete', authenticate, (req, res) => {
  const { username } = req.body;
  if (!username || ['root', 'ec2-user', 'ubuntu'].includes(username)) {
    return res.status(400).json({ error: 'System users cannot be deleted' });
  }

  const meta = loadMeta();
  const userPort = meta[username]?.port;

  if (userPort) {
    try {
      exec(`pkill -f "http.server ${userPort}" || true`);
    } catch (e) {}
  }

  if (process.platform !== 'win32') {
    try {
      execSync(`sudo userdel -r ${username} || true`);
    } catch (e) {}
  }

  delete meta[username];
  saveMeta(meta);

  res.json({ success: true, message: `User ${username} and hosting port deleted` });
});

// 5. Nginx Domain Configuration (Auto connects to assigned user port)
app.post('/api/domains/setup', authenticate, (req, res) => {
  const { domainName, targetPort } = req.body;

  if (!domainName || !/^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(domainName)) {
    return res.status(400).json({ error: 'Invalid domain name' });
  }

  const port = parseInt(targetPort, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    return res.status(400).json({ error: 'Invalid target port' });
  }

  const nginxConfig = `server {
    listen 80;
    server_name ${domainName};

    location / {
        proxy_pass http://127.0.0.1:${port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
`;

  if (process.platform === 'win32') {
    return res.json({
      success: true,
      message: `[Windows Dev Simulation] Configured Nginx for ${domainName} -> port ${port}`,
      configPath: `/etc/nginx/conf.d/${domainName}.conf`,
    });
  }

  const configPath = `/etc/nginx/conf.d/${domainName}.conf`;

  try {
    fs.writeFileSync(configPath, nginxConfig, 'utf8');

    exec('sudo nginx -t && sudo systemctl reload nginx', (err, stdout, stderr) => {
      if (err) {
        try { fs.unlinkSync(configPath); } catch (e) {}
        return res.status(500).json({ error: `Nginx reload failed: ${stderr}` });
      }

      res.json({
        success: true,
        message: `Domain ${domainName} connected to port ${port}`,
        configPath,
      });
    });
  } catch (err) {
    return res.status(500).json({ error: `Failed to write Nginx config: ${err.message}` });
  }
});

// 6. Remove Nginx Domain
app.post('/api/domains/remove', authenticate, (req, res) => {
  const { domainName } = req.body;
  if (!domainName) return res.status(400).json({ error: 'Domain name required' });

  if (process.platform === 'win32') {
    return res.json({ success: true, message: `Removed domain ${domainName}` });
  }

  const configPath = `/etc/nginx/conf.d/${domainName}.conf`;
  try {
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
      exec('sudo nginx -t && sudo systemctl reload nginx');
    }
    res.json({ success: true, message: `Domain ${domainName} removed` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Isolated Tenant File Explorer (/home/<username> ONLY)
app.post('/api/files/list', authenticate, (req, res) => {
  const { username, subPath = '' } = req.body;

  if (!username || !/^[a-z_][a-z0-9_-]{2,31}$/.test(username)) {
    return res.status(400).json({ error: 'Invalid username' });
  }

  const baseUserDir = process.platform === 'win32'
    ? path.join(os.tmpdir(), 'vps_mock_users', username)
    : `/home/${username}`;

  if (!fs.existsSync(baseUserDir)) {
    fs.mkdirSync(baseUserDir, { recursive: true });
    fs.writeFileSync(path.join(baseUserDir, 'README.txt'), `Welcome to your isolated home directory, ${username}!\nOnly you have access to this folder (chmod 700).\n`);
  }

  const safeSubPath = path.normalize(subPath).replace(/^(\.\.[\/\\])+/, '');
  const targetDir = path.resolve(baseUserDir, safeSubPath);

  if (!targetDir.startsWith(path.resolve(baseUserDir))) {
    return res.status(403).json({ error: 'Access denied: Path traversal detected outside your home directory' });
  }

  try {
    const entries = fs.readdirSync(targetDir, { withFileTypes: true });
    const files = entries.map((entry) => {
      const fullItemPath = path.join(targetDir, entry.name);
      let stats = { size: 0, mtime: new Date() };
      try { stats = fs.statSync(fullItemPath); } catch (e) {}

      return {
        name: entry.name,
        path: path.relative(baseUserDir, fullItemPath).replace(/\\/g, '/'),
        sizeBytes: stats.size,
        isDir: entry.isDirectory(),
        modifiedAt: stats.mtime,
        permissions: '700',
      };
    });

    res.json({
      success: true,
      homePath: `/home/${username}`,
      currentSubPath: safeSubPath,
      files,
    });
  } catch (err) {
    res.status(500).json({ error: `Failed to list directory: ${err.message}` });
  }
});

// 8. Create Isolated File / Folder
app.post('/api/files/create', authenticate, (req, res) => {
  const { username, fileName, isDirectory, content = '' } = req.body;

  if (!username || !/^[a-z_][a-z0-9_-]{2,31}$/.test(username)) {
    return res.status(400).json({ error: 'Invalid username' });
  }
  if (!fileName || /[\/\\]/.test(fileName) || fileName.includes('..')) {
    return res.status(400).json({ error: 'Invalid file or directory name' });
  }

  const baseUserDir = process.platform === 'win32'
    ? path.join(os.tmpdir(), 'vps_mock_users', username)
    : `/home/${username}`;

  if (!fs.existsSync(baseUserDir)) {
    fs.mkdirSync(baseUserDir, { recursive: true });
  }

  const targetPath = path.join(baseUserDir, fileName);

  try {
    if (isDirectory) {
      fs.mkdirSync(targetPath, { recursive: true });
    } else {
      fs.writeFileSync(targetPath, content, 'utf8');
    }

    if (process.platform !== 'win32') {
      exec(`sudo chown -R ${username}:${username} "${targetPath}" && sudo chmod 700 "${targetPath}"`);
    }

    res.json({ success: true, message: `Created ${isDirectory ? 'directory' : 'file'} successfully` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[VPS AGENT] Worker agent running on port ${PORT}`);
});
