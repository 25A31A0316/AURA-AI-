"""
AuraChat Local Server with Live Web & Article Search Engine
Serves static assets and provides a lightweight /api/search endpoint
to access live articles, news, social media trends, and historical archives up to 2026.
"""

import http.server
import socketserver
import webbrowser
import os
import sys
import json
import urllib.request
import urllib.parse
import re

PORT = 8000

def fetch_web_results(query, max_results=6):
    """Fetches real-time web articles, news, and social media discussions."""
    try:
        url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote(query)}"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=7) as resp:
            html = resp.read().decode('utf-8', errors='ignore')

        results = []
        snippets = re.findall(r'<a[^>]+class="result__snippet[^"]*"[^>]*>(.*?)</a>', html, re.DOTALL)
        titles = re.findall(r'<a[^>]+class="result__url"[^>]*>(.*?)</a>', html, re.DOTALL)
        links = re.findall(r'<a[^>]+class="result__snippet[^"]*"[^>]+href="([^"]+)"', html, re.DOTALL)

        for i, snippet in enumerate(snippets[:max_results]):
            clean_snippet = re.sub(r'<[^>]+>', '', snippet).strip()
            clean_title = re.sub(r'<[^>]+>', '', titles[i]).strip() if i < len(titles) else f"Article {i+1}"
            link_url = links[i] if i < len(links) else ""
            
            # Clean DuckDuckGo redirect url if present
            if 'uddg=' in link_url:
                try:
                    link_url = urllib.parse.unquote(link_url.split('uddg=')[1].split('&')[0])
                except Exception:
                    pass

            if clean_snippet:
                results.append({
                    "title": clean_title,
                    "snippet": clean_snippet,
                    "url": link_url
                })
        return results
    except Exception as e:
        print(f"[Search Engine] Warning: {e}")
        return []

class AuraChatHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS and disable caching
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        # Handle Live Search API
        if self.path.startswith('/api/search'):
            parsed = urllib.parse.urlparse(self.path)
            params = urllib.parse.parse_qs(parsed.query)
            query = params.get('q', [''])[0]

            if not query:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Missing query'}).encode('utf-8'))
                return

            print(f"[Search API] Fetching live web & 2026 data for: '{query}'")
            results = fetch_web_results(query)

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            response_data = {
                'query': query,
                'count': len(results),
                'results': results
            }
            self.wfile.write(json.dumps(response_data).encode('utf-8'))
            return

        # Default static file serving
        return super().do_GET()

def main():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    port = PORT
    for attempt in range(5):
        try:
            with socketserver.TCPServer(("", port), AuraChatHandler) as httpd:
                url = f"http://localhost:{port}"
                print("=" * 65)
                print(f"[AuraChat] Server with Live 2026 Web Search active at: {url}")
                print("=" * 65)
                httpd.serve_forever()
                break
        except OSError:
            port += 1

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\nServer stopped.")
        sys.exit(0)
