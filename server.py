"""
Aura AI - Universal Assistant Server
Features:
- Real-Time Live Web Grounding across all data sectors
- Verified Real-Time Sources Streaming
- Local Ollama Streaming Proxy (Zero API Keys)
- Multilingual Support
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

def fetch_web_results(query, max_results=4):
    """Fetches real-time web articles, news, and sector-wide data via DuckDuckGo."""
    try:
        clean_q = re.sub(r'[^\w\s-]', ' ', query).strip()
        url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote(clean_q)}"
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
            clean_t = re.sub(r'<[^>]+>', '', titles[i]).strip() if i < len(titles) else f"Source {i+1}"
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
        # 3. Streaming Chat Proxy with Real-Time Web Grounding & Sources
        if self.path == '/api/chat':
            length = int(self.headers.get('Content-Length', 0))
            raw_body = self.rfile.read(length)

            try:
                data = json.loads(raw_body.decode('utf-8'))
                use_web = data.get('webSearch', True)
                messages = data.get('messages', [])
                sources_footer = ""

                # Real-Time Live Grounding (only for factual, current, or news lookups)
                if use_web and messages:
                    last_user_msg = next((m['content'] for m in reversed(messages) if m.get('role') == 'user'), None)
                    if last_user_msg:
                        clean_text = last_user_msg.strip().lower()
                        # Skip web search for casual conversation, greetings, and creative writing
                        is_simple_chat = bool(re.search(r'\b(hi|hello|hey|yo|howdy|sup|how are you|who are you|what is your name|joke|poem|story|email|write|code|thank|thanks|bye)\b', clean_text)) and not any(k in clean_text for k in ['news', 'latest', 'today', 'current', '2026', 'price', 'weather', 'stock', 'happened', 'score'])
                        
                        if not is_simple_chat:
                            clean_query = last_user_msg.strip()[:140]
                            articles = fetch_web_results(clean_query, max_results=4)
                            if articles:
                                web_context = "\n".join([f"[{i+1}] {a['title']}: {a['snippet']}" for i, a in enumerate(articles)])
                                grounded_prompt = f"""[VERIFIED WEB DATA & KNOWLEDGE]:
{web_context}

[USER QUESTION]:
{last_user_msg}

INSTRUCTION: You are Aura AI, a knowledgeable, accurate, and comprehensive assistant.
Answer the user's question thoroughly using the facts above and your knowledge.
Provide all requested data, steps, facts, and explanations with depth and precision.
Use organized Markdown formatting (bullet points, clear headings, numbered steps) to present the data clearly."""
                                
                                for m in reversed(messages):
                                    if m.get('role') == 'user':
                                        m['content'] = grounded_prompt
                                        break

                                source_links = [f"- [{a['title']}]({a['url']})" for a in articles if a.get('url')]
                                if source_links:
                                    sources_footer = "\n\n**🌐 Sources:**\n" + "\n".join(source_links)

                merged_options = {
                    'num_predict': 2048,
                    'temperature': float(data.get('options', {}).get('temperature', 0.7))
                }

                ollama_payload = {
                    'model': data.get('model', 'llama3.2:1b'),
                    'messages': messages,
                    'stream': True,
                    'options': merged_options
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
                            chunk = resp.read(128)
                            if not chunk:
                                break
                            self.wfile.write(chunk)
                            self.wfile.flush()
                        except (ConnectionResetError, ConnectionAbortedError, BrokenPipeError):
                            break

                    # Append verified real-time sources footer as final chunk
                    if sources_footer:
                        final_chunk = json.dumps({'message': {'content': sources_footer}, 'done': False}) + "\n"
                        try:
                            self.wfile.write(final_chunk.encode('utf-8'))
                            self.wfile.flush()
                        except Exception:
                            pass

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
            print("  [Features] Real-Time Web Grounding • Voice Talk Mode • Multilingual")
            print("=" * 60)
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")

if __name__ == '__main__':
    main()
