TEMPLATES = {
    "react-app": {
        "name": "React App",
        "description": "Modern React app with Vite, routing, and styled components",
        "icon": "react",
        "files": {
            "package.json": '{\n  "name": "react-app",\n  "private": true,\n  "version": "1.0.0",\n  "type": "module",\n  "scripts": {\n    "dev": "vite",\n    "build": "vite build"\n  },\n  "dependencies": {\n    "react": "^18.2.0",\n    "react-dom": "^18.2.0"\n  },\n  "devDependencies": {\n    "@vitejs/plugin-react": "^4.2.0",\n    "vite": "^5.4.0"\n  }\n}',
            "index.html": '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>React App</title>\n</head>\n<body>\n  <div id="root"></div>\n  <script type="module" src="/src/main.jsx"></script>\n</body>\n</html>',
            "src/main.jsx": "import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\nimport './App.css';\n\nReactDOM.createRoot(document.getElementById('root')).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>\n);",
            "src/App.jsx": "import React, { useState } from 'react';\n\nexport default function App() {\n  const [count, setCount] = useState(0);\n\n  return (\n    <div className=\"app\">\n      <h1>React App</h1>\n      <p>Count: {count}</p>\n      <button onClick={() => setCount(c => c + 1)}>Increment</button>\n    </div>\n  );\n}",
            "src/App.css": ".app {\n  max-width: 600px;\n  margin: 0 auto;\n  padding: 40px 20px;\n  text-align: center;\n  font-family: -apple-system, sans-serif;\n}\n\nh1 {\n  color: #61dafb;\n}\n\nbutton {\n  padding: 10px 24px;\n  font-size: 16px;\n  border: none;\n  border-radius: 8px;\n  background: #61dafb;\n  color: #000;\n  cursor: pointer;\n  margin-top: 12px;\n}\n\nbutton:hover {\n  opacity: 0.9;\n}",
            "vite.config.js": "import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\n\nexport default defineConfig({\n  plugins: [react()],\n  server: { host: '0.0.0.0' }\n});",
        },
    },
    "express-api": {
        "name": "Express API",
        "description": "RESTful API with Express, CORS, and structured routes",
        "icon": "server",
        "files": {
            "package.json": '{\n  "name": "express-api",\n  "version": "1.0.0",\n  "type": "module",\n  "scripts": {\n    "start": "node server.js",\n    "dev": "node --watch server.js"\n  },\n  "dependencies": {\n    "express": "^4.18.2",\n    "cors": "^2.8.5"\n  }\n}',
            "server.js": "import express from 'express';\nimport cors from 'cors';\nimport { router as apiRouter } from './routes/api.js';\n\nconst app = express();\nconst PORT = process.env.PORT || 3001;\n\napp.use(cors());\napp.use(express.json());\napp.use('/api', apiRouter);\n\napp.get('/', (req, res) => {\n  res.json({ message: 'Express API is running' });\n});\n\napp.listen(PORT, '0.0.0.0', () => {\n  console.log(`Server running on port ${PORT}`);\n});",
            "routes/api.js": "import { Router } from 'express';\n\nexport const router = Router();\n\nlet items = [\n  { id: 1, name: 'Item 1', description: 'First item' },\n  { id: 2, name: 'Item 2', description: 'Second item' },\n];\n\nrouter.get('/items', (req, res) => {\n  res.json(items);\n});\n\nrouter.get('/items/:id', (req, res) => {\n  const item = items.find(i => i.id === parseInt(req.params.id));\n  if (!item) return res.status(404).json({ error: 'Not found' });\n  res.json(item);\n});\n\nrouter.post('/items', (req, res) => {\n  const item = { id: Date.now(), ...req.body };\n  items.push(item);\n  res.status(201).json(item);\n});\n\nrouter.delete('/items/:id', (req, res) => {\n  items = items.filter(i => i.id !== parseInt(req.params.id));\n  res.json({ success: true });\n});",
        },
    },
    "flask-app": {
        "name": "Flask App",
        "description": "Python Flask web app with templates and static files",
        "icon": "flask",
        "files": {
            "requirements.txt": "flask>=3.0.0",
            "app.py": "from flask import Flask, render_template, jsonify\n\napp = Flask(__name__)\n\n@app.route('/')\ndef index():\n    return render_template('index.html')\n\n@app.route('/api/health')\ndef health():\n    return jsonify({'status': 'ok'})\n\nif __name__ == '__main__':\n    app.run(host='0.0.0.0', port=5001, debug=True)",
            "templates/index.html": '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>Flask App</title>\n  <style>\n    body { font-family: -apple-system, sans-serif; max-width: 600px; margin: 40px auto; padding: 0 20px; }\n    h1 { color: #1a73e8; }\n  </style>\n</head>\n<body>\n  <h1>Flask App</h1>\n  <p>Your Flask application is running.</p>\n</body>\n</html>',
        },
    },
    "static-site": {
        "name": "Static Site",
        "description": "Clean HTML/CSS/JS static website with modern styling",
        "icon": "globe",
        "files": {
            "index.html": '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>My Website</title>\n  <link rel="stylesheet" href="style.css" />\n</head>\n<body>\n  <header>\n    <h1>Welcome</h1>\n    <p>A clean, modern static site</p>\n  </header>\n  <main>\n    <section class="card">\n      <h2>Get Started</h2>\n      <p>Edit the files to build your website.</p>\n    </section>\n  </main>\n  <script src="script.js"></script>\n</body>\n</html>',
            "style.css": "* { box-sizing: border-box; margin: 0; padding: 0; }\n\nbody {\n  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;\n  background: #f5f5f5;\n  color: #333;\n  line-height: 1.6;\n}\n\nheader {\n  background: linear-gradient(135deg, #667eea, #764ba2);\n  color: white;\n  padding: 60px 20px;\n  text-align: center;\n}\n\nheader h1 { font-size: 2.5rem; margin-bottom: 8px; }\nheader p { opacity: 0.9; font-size: 1.1rem; }\n\nmain {\n  max-width: 800px;\n  margin: -30px auto 40px;\n  padding: 0 20px;\n}\n\n.card {\n  background: white;\n  padding: 32px;\n  border-radius: 12px;\n  box-shadow: 0 4px 20px rgba(0,0,0,0.1);\n}\n\n.card h2 { color: #667eea; margin-bottom: 8px; }",
            "script.js": "document.addEventListener('DOMContentLoaded', () => {\n  console.log('Site loaded successfully');\n});",
        },
    },
}


def get_template_list():
    return [
        {"id": tid, "name": t["name"], "description": t["description"], "icon": t["icon"]}
        for tid, t in TEMPLATES.items()
    ]


def create_from_template(template_id):
    if template_id not in TEMPLATES:
        return None
    return TEMPLATES[template_id]
