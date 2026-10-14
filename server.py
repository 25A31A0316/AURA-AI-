"""
Aura AI - Clean Local Server
Zero API Keys • Local Ollama Streaming Proxy
"""

import http.server
import socketserver
import os
import sys
import json
import urllib.request
import urllib.error

PORT = 8000
OLLAMA_HOST = "http://localhost:11434"

class CleanAuraHandler(http.server.SimpleHTTPRequestHandler):
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

        return super().do_GET()

    def do_POST(self):
        if self.path == '/api/chat':
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length)

            try:
                req = urllib.request.Request(
                    f"{OLLAMA_HOST}/api/chat",
                    data=body,
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
        with socketserver.TCPServer(("", PORT), CleanAuraHandler) as httpd:
            print("=" * 60)
            print(f"  [Aura AI] Local Server: http://localhost:{PORT}")
            print("  100% Private - Local Ollama - Zero API Keys")
            print("=" * 60)
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")

if __name__ == '__main__':
    main()
