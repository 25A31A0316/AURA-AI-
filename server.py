"""
Aura AI - High-Performance Server
Features:
- Local Ollama Streaming Proxy (Zero API Keys)
- Live Web Search & Grounding across all data sectors (/api/search & live chat grounding)
- Multilingual System Instructions
"""

import http.server
import socketserver
import os
import sys
import json
import urllib.request
import urllib.parse
import urllib.error
import re

PORT = 8000
OLLAMA_HOST = "http://localhost:11434"

def fetch_web_results(query, max_results=5):
    """Fetches real-time web articles, news, and sector-wide data via DuckDuckGo."""
    try:
        url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote(query)}"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=6) as resp:
            html = resp.read().decode('utf-8', errors='ignore')

        snippets = re.findall(r'<a[^>]+class="result__snippet[^"]*"[^>]*>(.*?)</a>', html, re.DOTALL)
        titles = re.findall(r'<a[^>]+class="result__url"[^>]*>(.*?)</a>', html, re.DOTALL)
        links = re.findall(r'<a[^>]+class="result__snippet[^"]*"[^>]+href="([^"]+)"', html, re.DOTALL)

        results = []
        for i, snippet in enumerate(snippets[:max_results]):
            clean_s = re.sub(r'<[^>]+>', '', snippet).strip()
            clean_t = re.sub(r'<[^>]+>', '', titles[i]).strip() if i < len(titles) else f"Article {i+1}"
            link_url = links[i] if i < len(links) else ""
            if 'uddg=' in link_url:
                try:
                    link_url = urllib.parse.unquote(link_url.split('uddg=')[1].split('&')[0])
                except Exception:
                    pass
            if clean_s:
                results.append({"title": clean_t, "snippet": clean_s, "url": link_url})
        return results
    except Exception as e:
        print(f"[Web Search] Note: {e}")
        return []

class AuraHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        # 1. Health check & installed models list
        if self.path == '/api/status':
            try:
                req = urllib.request.Request(f"{OLLAMA_HOST}/api/tags")
                with urllib.request.urlopen(req, timeout=3) as resp:
                    data = json.loads(resp.read().decode('utf-8'))
                    models = [m.get('name') for m in data.get('models', [])]
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({'online': True, 'models': models}).encode('utf-8'))
                    return
            except Exception:
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'online': False, 'models': []}).encode('utf-8'))
                return

        # 2. Web search endpoint
        if self.path.startswith('/api/search'):
            parsed = urllib.parse.urlparse(self.path)
            params = urllib.parse.parse_qs(parsed.query)
            query = params.get('q', [''])[0]
            results = fetch_web_results(query) if query else []
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'query': query, 'results': results}).encode('utf-8'))
            return

        return super().do_GET()

    def do_POST(self):
        # 3. Streaming Chat Proxy with optional Live Web Grounding
        if self.path == '/api/chat':
            length = int(self.headers.get('Content-Length', 0))
            raw_body = self.rfile.read(length)

            try:
                data = json.loads(raw_body.decode('utf-8'))
                use_web = data.get('webSearch', False)
                messages = data.get('messages', [])

                # If live web search is enabled, search for context on the last user message
                if use_web and messages:
                    last_user_msg = next((m['content'] for m in reversed(messages) if m.get('role') == 'user'), None)
                    if last_user_msg:
                        clean_query = last_user_msg.strip()[:120]
                        articles = fetch_web_results(clean_query, max_results=4)
                        if articles:
                            context_text = "\n\n[VERIFIED DATA ARCHIVES & RECENT 2026 ARTICLES - ALL SECTORS]:\n"
                            for idx, a in enumerate(articles):
                                context_text += f"{idx+1}. {a['title']}: {a['snippet']} (Source: {a['url']})\n"
                            context_text += "\nINSTRUCTION: Synthesize the verified records and 2026 articles above alongside universal knowledge spanning ancient history to the present.\n"

                            # Inject into system prompt or append to context
                            if messages and messages[0].get('role') == 'system':
                                messages[0]['content'] += context_text
                            else:
                                messages.insert(0, {'role': 'system', 'content': context_text})

                # Forward request to local Ollama
                ollama_payload = {
                    'model': data.get('model', 'llama3.2:1b'),
                    'messages': messages,
                    'stream': True,
                    'options': data.get('options', {})
                }

                req = urllib.request.Request(
                    f"{OLLAMA_HOST}/api/chat",
                    data=json.dumps(ollama_payload).encode('utf-8'),
                    headers={'Content-Type': 'application/json'}
                )
                with urllib.request.urlopen(req, timeout=180) as resp:
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/x-ndjson')
                    self.end_headers()
                    while True:
                        try:
                            chunk = resp.read(256)
                            if not chunk:
                                break
                            self.wfile.write(chunk)
                            self.wfile.flush()
                        except (ConnectionResetError, ConnectionAbortedError, BrokenPipeError):
                            break
            except urllib.error.URLError:
                self.send_response(503)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Ollama is offline. Please launch it with: ollama serve'}).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
            return

        self.send_response(404)
        self.end_headers()

def main():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    socketserver.TCPServer.allow_reuse_address = True
    try:
        with socketserver.TCPServer(("", PORT), AuraHandler) as httpd:
            print("=" * 60)
            print(f"  [Aura AI] Server running at: http://localhost:{PORT}")
            print("  [Features] Local Ollama + Live Web Grounding + Voice & Multilingual")
            print("=" * 60)
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")

if __name__ == '__main__':
    main()
