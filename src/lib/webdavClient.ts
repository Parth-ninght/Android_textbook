import { Capacitor, CapacitorHttp } from '@capacitor/core';

export async function checkWebDavExists(url: string, username: string, password: string, remotePath: string): Promise<boolean> {
  const isNative = Capacitor.isNativePlatform();
  const fullUrl = `${url.replace(/\/+$/, '')}/${remotePath.replace(/^\/+/, '')}`;
  
  if (isNative) {
    try {
      const res = await CapacitorHttp.request({
        method: 'GET',
        url: fullUrl,
        headers: {
          'Authorization': 'Basic ' + btoa(`${username}:${password}`)
        }
      });
      if (res.status === 401) return false;
      return true;
    } catch (e) {
      return false;
    }
  } else {
    const res = await fetch('/api/webdav/list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, username, password, remotePath })
    });
    const data = await res.json();
    if (res.status === 401 || (data.error && data.error.includes("401"))) throw new Error("401认证失败：账号或密码错误。");
    if (!res.ok) throw new Error(data.error || "WebDAV Request Failed");
    return true;
  }
}

export async function uploadToWebDav(url: string, username: string, password: string, files: { remotePath: string, content: string }[]): Promise<void> {
  const isNative = Capacitor.isNativePlatform();
  const cleanUrl = url.replace(/\/+$/, '');

  if (isNative) {
    // Try to create WriterSync folder (MKCOL)
    try {
      await CapacitorHttp.request({
        method: 'MKCOL',
        url: `${cleanUrl}/WriterSync`,
        headers: { 'Authorization': 'Basic ' + btoa(`${username}:${password}`) }
      });
    } catch (e) {}

    for (const file of files) {
      const fileUrl = `${cleanUrl}/WriterSync/${file.remotePath}`;
      try {
         const putRes = await CapacitorHttp.request({
            method: 'PUT',
            url: fileUrl,
            headers: { 
               'Authorization': 'Basic ' + btoa(`${username}:${password}`),
               'Content-Type': 'application/json'
            },
            data: file.content
         });
         
         if (putRes.status === 401) throw new Error("401认证失败：账号或密码错误。");
         if (putRes.status === 409) throw new Error("HTTP 409: 父文件夹创建失败，请在坚果云手动创建 WriterSync 文件夹。");
         if (putRes.status >= 400) throw new Error(`上传失败: HTTP ${putRes.status}`);
      } catch (e: any) {
         if (e.message && e.message.includes('401')) throw new Error("401认证失败：账号或密码错误。");
         throw e;
      }
    }
  } else {
    // Web Proxy mode
    const res = await fetch('/api/webdav/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: cleanUrl, username, password, files })
    });
    const data = await res.json();
    if (res.status === 401 || (data.error && data.error.includes("401"))) throw new Error("401认证失败：账号或密码错误。请注意必须使用坚果云的【第三方应用密码】。");
    if (!res.ok) throw new Error(data.error || "Upload failed");
  }
}

export async function downloadFromWebDav(url: string, username: string, password: string, remotePaths: string[]): Promise<Record<string, string | null>> {
  const isNative = Capacitor.isNativePlatform();
  const cleanUrl = url.replace(/\/+$/, '');
  const results: Record<string, string | null> = {};

  if (isNative) {
    for (const path of remotePaths) {
       try {
         const fileUrl = `${cleanUrl}/WriterSync/${path}`;
         
         const res = await CapacitorHttp.request({
            method: 'GET',
            url: fileUrl,
            headers: { 'Authorization': 'Basic ' + btoa(`${username}:${password}`) },
            responseType: 'text'
         });
         
         if (res.status === 404) {
            results[path] = null;
            continue;
         }
         if (res.status === 401) throw new Error("401");
         if (res.status >= 400) {
            results[path] = null;
            continue;
         }
         
         // CapacitorHttp might parse JSON into an object automatically if Content-Type is json
         if (typeof res.data === 'object') {
             results[path] = JSON.stringify(res.data);
         } else {
             results[path] = String(res.data || '');
         }
       } catch (e: any) {
         if (e.message && (e.message.includes('401') || e.message === '401')) throw new Error("401认证失败：账号或密码错误。");
         results[path] = null;
       }
    }
    return results;
  } else {
    const res = await fetch('/api/webdav/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: cleanUrl, username, password, remotePaths })
    });
    const data = await res.json();
    if (res.status === 401 || (data.error && data.error.includes("401"))) throw new Error("401认证失败：账号或密码错误。请注意必须使用坚果云的【第三方应用密码】。");
    if (!res.ok) throw new Error(data.error || "Download failed");
    return data.results;
  }
}
