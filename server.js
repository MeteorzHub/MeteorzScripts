const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const uploadFolder = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadFolder)) fs.mkdirSync(uploadFolder);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadFolder),
  filename: (req, file, cb) => cb(null, file.originalname)
});
const upload = multer({ storage });

// Serve frontend page from root
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Meteorz Scripts</title>
<style>
  body { background: #000; color: #fff; font-family: Arial, sans-serif; margin: 20px; }
  button { background: #fff; color: #000; border: none; padding: 10px 20px; cursor: pointer; margin-top: 10px; }
  input[type="file"] { margin-top: 10px; }
  ul { list-style: none; padding-left: 0; }
  li { margin: 8px 0; }
  a { color: #0f0; text-decoration: none; }
  a:hover { text-decoration: underline; }
</style>
</head>
<body>

<h1>Meteorz Script Library</h1>

<h2>Upload a Script</h2>
<input type="file" id="scriptFile" />
<br />
<button onclick="uploadScript()">Upload Script</button>
<p id="uploadStatus"></p>

<h2>Available Scripts</h2>
<ul id="scriptsList">Loading...</ul>

<script>
  async function fetchScripts() {
    const res = await fetch('/scripts');
    const data = await res.json();
    const list = document.getElementById('scriptsList');
    list.innerHTML = '';
    if (data.scripts.length === 0) {
      list.innerHTML = '<li>No scripts uploaded yet.</li>';
      return;
    }
    data.scripts.forEach(filename => {
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.href = \`/scripts/\${filename}\`;
      link.target = '_blank';
      link.textContent = filename;
      li.appendChild(link);
      list.appendChild(li);
    });
  }

  async function uploadScript() {
    const fileInput = document.getElementById('scriptFile');
    const status = document.getElementById('uploadStatus');
    if (fileInput.files.length === 0) {
      status.textContent = 'Please select a file first.';
      return;
    }
    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('scriptFile', file);

    status.textContent = 'Uploading...';

    try {
      const res = await fetch('/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        status.textContent = \`Uploaded "\${data.filename}" successfully!\`;
        fetchScripts();
      } else {
        status.textContent = \`Error: \${data.error || 'Upload failed'}\`;
      }
    } catch (e) {
      status.textContent = 'Upload failed: ' + e.message;
    }
  }

  fetchScripts();
</script>

</body>
</html>
  `);
});

// Upload endpoint
app.post('/upload', upload.single('scriptFile'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ message: 'Script uploaded', filename: req.file.filename });
});

// List scripts
app.get('/scripts', (req, res) => {
  fs.readdir(uploadFolder, (err, files) => {
    if (err) return res.status(500).json({ error: 'Cannot read scripts folder' });
    res.json({ scripts: files });
  });
});

// Serve scripts
app.get('/scripts/:filename', (req, res) => {
  const filepath = path.join(uploadFolder, req.params.filename);
  if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'Script not found' });
  res.sendFile(filepath);
});

app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});
