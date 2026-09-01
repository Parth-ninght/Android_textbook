import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createClient } from "webdav";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API routes
  app.post("/api/webdav/upload", async (req, res) => {
    try {
      const { url, username, password, files } = req.body;
      const cleanUrl = url.replace(/\/+$/, '');
      const client = createClient(cleanUrl, { username, password });
      
      const exists = await client.exists("/WriterSync");
      if (!exists) {
        await client.createDirectory("/WriterSync");
      }
      
      for (const file of files) {
        const { remotePath, content, isBase64 } = file;
        
        // Ensure subdirectories exist
        const dirs = remotePath.split('/').slice(0, -1);
        let currentPath = "/WriterSync";
        for (const dir of dirs) {
          if (!dir) continue;
          currentPath += `/${dir}`;
          const dirExists = await client.exists(currentPath);
          if (!dirExists) {
            await client.createDirectory(currentPath);
          }
        }
        
        let putContent: any = content;
        if (isBase64) {
           putContent = Buffer.from(content, 'base64');
        }
        
        await client.putFileContents(`/WriterSync/${remotePath}`, putContent);
      }
      
      res.json({ success: true });
    } catch (e: any) {
      console.error(e);
      let msg = e.message || "Upload failed";
      if (msg.includes("401")) msg = "401认证失败：账号或密码错误。请注意必须使用坚果云的【第三方应用密码】，而非登录密码。";
      res.status(500).json({ error: msg });
    }
  });

  app.post("/api/webdav/download", async (req, res) => {
    try {
      const { url, username, password, remotePaths } = req.body;
      const cleanUrl = url.replace(/\/+$/, '');
      const client = createClient(cleanUrl, { username, password });
      
      const results: Record<string, any> = {};
      
      for (const remotePath of remotePaths) {
        const exists = await client.exists(`/WriterSync/${remotePath}`);
        if (exists) {
          if (remotePath.endsWith('.zip')) {
            const buffer = await client.getFileContents(`/WriterSync/${remotePath}`, { format: "binary" }) as ArrayBuffer;
            results[remotePath] = Buffer.from(buffer).toString('base64');
          } else {
            const content = await client.getFileContents(`/WriterSync/${remotePath}`, { format: "text" });
            results[remotePath] = content;
          }
        } else {
          results[remotePath] = null;
        }
      }
      
      res.json({ success: true, results });
    } catch (e: any) {
      console.error(e);
      let msg = e.message || "Download failed";
      if (msg.includes("401")) msg = "401认证失败：账号或密码错误。请注意必须使用坚果云的【第三方应用密码】，而非登录密码。";
      res.status(500).json({ error: msg });
    }
  });

  app.post("/api/webdav/list", async (req, res) => {
     try {
        const { url, username, password, remotePath } = req.body;
        const cleanUrl = url.replace(/\/+$/, '');
        const client = createClient(cleanUrl, { username, password });
        const exists = await client.exists(`/WriterSync/${remotePath}`);
        if (exists) {
           const items = await client.getDirectoryContents(`/WriterSync/${remotePath}`);
           res.json({ success: true, items });
        } else {
           res.json({ success: true, items: [] });
        }
     } catch (e: any) {
        console.error(e);
        let msg = e.message || "List failed";
        if (msg.includes("401")) msg = "401认证失败：账号或密码错误。请注意必须使用坚果云的【第三方应用密码】，而非登录密码。";
        res.status(500).json({ error: msg });
     }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
