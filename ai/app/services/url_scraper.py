# URL Scraper Service with API Documentation Crawler
import httpx
from bs4 import BeautifulSoup
from typing import List, Dict, Any, Optional, Set
from urllib.parse import urljoin, urlparse, parse_qs, unquote
import re
from app.config import settings
from app.services.document_processor import chunk_text


class URLScraper:
    """
    Service for scraping URL content with special handling for API documentation.
    Detects documentation sites and crawls child pages.
    """
    
    # Patterns that indicate API documentation
    DOC_PATTERNS = [
        r'/docs',
        r'/api',
        r'/reference',
        r'/documentation',
        r'swagger',
        r'redoc',
        r'openapi',
        r'readme\.io',
        r'gitbook',
        r'/guide',
        r'/tutorial'
    ]
    
    def __init__(self, vector_store=None):
        from app.core.vector_store import vector_store as default_store
        self.vector_store = vector_store or default_store

    @staticmethod
    def _clean_text(text: str) -> str:
        """Normalize whitespace and remove tiny junk lines."""
        lines = [
            re.sub(r"\s+", " ", line).strip()
            for line in text.splitlines()
        ]
        lines = [line for line in lines if line]
        return "\n".join(lines)

    @staticmethod
    def _headers(content_type: str = "html") -> Dict[str, str]:
        """
        Use a descriptive user agent so Wikimedia-style sites are more likely
        to accept the request.
        """
        base_headers = {
            "User-Agent": (
                "AI-Powered-Study-Assistant/1.0 "
                "(contact: support@ai-powered-study-assistant.local)"
            ),
            "Accept-Language": "en-US,en;q=0.9",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
        }

        if content_type == "json":
            base_headers["Accept"] = "application/json,text/plain,*/*"
        else:
            base_headers["Accept"] = (
                "text/html,application/xhtml+xml,application/xml;q=0.9,"
                "image/avif,image/webp,*/*;q=0.8"
            )

        return base_headers

    @staticmethod
    def _is_wikipedia_url(url: str) -> bool:
        parsed = urlparse(url)
        return parsed.netloc.lower().endswith("wikipedia.org")

    @staticmethod
    def _extract_wikipedia_title(url: str) -> Optional[str]:
        parsed = urlparse(url)
        path = parsed.path or ""

        if path.startswith("/wiki/"):
            title = path[len("/wiki/") :]
        elif path.startswith("/w/index.php"):
            title = parse_qs(parsed.query).get("title", [None])[0]
        else:
            title = None

        if not title:
            return None

        title = unquote(title).replace("_", " ").strip()
        return title or None

    async def fetch_wikipedia_content(self, url: str) -> str:
        """
        Fetch article text from Wikipedia's API as a fallback when the HTML
        page blocks scraping with 403 responses.
        """
        title = self._extract_wikipedia_title(url)
        if not title:
            return ""

        parsed = urlparse(url)
        lang = parsed.netloc.split(".")[0] if parsed.netloc else "en"
        encoded_title = title.replace(" ", "_")

        attempts = [
            (
                f"https://{lang}.wikipedia.org/api/rest_v1/page/summary/{encoded_title}",
                "summary",
            ),
            (
                f"https://{lang}.wikipedia.org/w/api.php",
                "mediawiki",
            ),
        ]

        async with httpx.AsyncClient(follow_redirects=True) as client:
            for api_url, api_type in attempts:
                try:
                    if api_type == "summary":
                        response = await client.get(
                            api_url,
                            headers=self._headers("json"),
                            timeout=30.0,
                        )
                        response.raise_for_status()
                        payload = response.json()
                        extract = (
                            payload.get("extract")
                            or payload.get("description")
                            or ""
                        )
                        extract = self._clean_text(extract)
                        if extract:
                            title_text = payload.get("title", title)
                            if title_text and not extract.startswith(title_text):
                                return f"{title_text}\n\n{extract}"
                            return extract
                    else:
                        params = {
                            "action": "query",
                            "prop": "extracts|info",
                            "explaintext": 1,
                            "exintro": 0,
                            "redirects": 1,
                            "titles": title,
                            "format": "json",
                            "formatversion": 2,
                            "inprop": "url",
                        }
                        response = await client.get(
                            api_url,
                            params=params,
                            headers=self._headers("json"),
                            timeout=30.0,
                        )
                        response.raise_for_status()
                        payload = response.json()

                        pages = payload.get("query", {}).get("pages", [])
                        if not pages:
                            continue

                        page = pages[0]
                        extract = page.get("extract", "") or ""
                        extract = self._clean_text(extract)

                        if extract:
                            title_text = page.get("title", title)
                            if title_text and not extract.startswith(title_text):
                                return f"{title_text}\n\n{extract}"
                            return extract
                except Exception as exc:
                    print(f"Wikipedia fallback failed via {api_type} for {url}: {exc}")
                    continue

        return ""
    
    def is_api_documentation(self, url: str, html: str) -> bool:
        """Detect if URL is an API documentation page."""
        url_lower = url.lower()
        
        # Check URL patterns
        for pattern in self.DOC_PATTERNS:
            if re.search(pattern, url_lower):
                return True
        
        # Check page content
        soup = BeautifulSoup(html, 'html.parser')
        
        # Look for common doc site indicators
        indicators = [
            soup.find('div', class_=re.compile(r'(swagger|redoc|api-doc)', re.I)),
            soup.find('nav', class_=re.compile(r'(sidebar|toc|nav-docs)', re.I)),
            soup.find('code', class_=re.compile(r'(endpoint|method|route)', re.I)),
        ]
        
        return any(indicators)
    
    async def fetch_url(self, url: str) -> str:
        async with httpx.AsyncClient(follow_redirects=True) as client:
            response = await client.get(url, headers=self._headers("html"), timeout=30.0)
            response.raise_for_status()
            return response.text
    
    def extract_text_from_html(self, html: str) -> str:
        """Extract clean text from HTML."""
        soup = BeautifulSoup(html, 'html.parser')
        
        # Remove non-content elements, but leave the main document structure intact.
        for element in soup(['script', 'style', 'noscript', 'svg', 'canvas', 'iframe']):
            element.decompose()

        # Prefer common content containers first.
        selectors = [
            'article',
            'main',
            '[role="main"]',
            '.content',
            '#content',
            '.post-content',
            '.article-content',
            '.entry-content',
            '.markdown-body',
            '.prose',
        ]

        candidates = []
        for selector in selectors:
            for node in soup.select(selector):
                text = node.get_text(separator='\n', strip=True)
                if text:
                    candidates.append(text)

        # Fallback: collect title and meta descriptions if page text is sparse.
        title = ''
        if soup.title and soup.title.string:
            title = soup.title.string.strip()

        meta_description = ''
        for meta_name in ('description', 'og:description', 'twitter:description'):
            meta = soup.find('meta', attrs={'name': meta_name}) or soup.find('meta', attrs={'property': meta_name})
            if meta and meta.get('content'):
                meta_description = meta['content'].strip()
                if meta_description:
                    break

        # Use the longest meaningful candidate from the main content areas.
        text = max(candidates, key=len, default='')

        if not text.strip():
            # Final fallback: use the whole body after stripping common chrome.
            body = soup.body or soup
            for element in body(['nav', 'header', 'footer', 'aside', 'script', 'style', 'noscript']):
                element.decompose()
            text = body.get_text(separator='\n', strip=True)

        if not text or len(text.strip()) < 200:
            text = '\n\n'.join(part for part in [title, meta_description, text] if part)

        # Last resort: extract everything visible in the document.
        if not text.strip():
            text = soup.get_text(separator='\n', strip=True)

        return self._clean_text(text)
    
    def extract_links(self, url: str, html: str) -> List[str]:
        """Extract links from HTML that are part of the same documentation."""
        soup = BeautifulSoup(html, 'html.parser')
        parsed_base = urlparse(url)
        base_domain = f"{parsed_base.scheme}://{parsed_base.netloc}"
        
        links = set()
        
        for a in soup.find_all('a', href=True):
            href = a['href']
            
            # Convert relative URLs to absolute
            if href.startswith('/'):
                full_url = urljoin(base_domain, href)
            elif href.startswith('http'):
                full_url = href
            else:
                full_url = urljoin(url, href)
            
            # Only include same-domain links
            parsed_link = urlparse(full_url)
            if parsed_link.netloc == parsed_base.netloc:
                # Clean URL (remove fragments)
                clean_url = f"{parsed_link.scheme}://{parsed_link.netloc}{parsed_link.path}"
                links.add(clean_url)
        
        return list(links)
    
    async def crawl_documentation(
        self,
        start_url: str,
        max_depth: int = None,
        max_pages: int = None
    ) -> List[Dict[str, str]]:
        """
        Crawl an API documentation site.
        
        Args:
            start_url: Starting URL
            max_depth: Maximum crawl depth
            max_pages: Maximum number of pages to crawl
            
        Returns:
            List of dicts with url and text content
        """
        max_depth = max_depth or settings.MAX_CRAWL_DEPTH
        max_pages = max_pages or settings.MAX_PAGES_PER_SITE
        
        visited: Set[str] = set()
        to_visit = [(start_url, 0)]  # (url, depth)
        pages = []
        
        while to_visit and len(pages) < max_pages:
            url, depth = to_visit.pop(0)
            
            if url in visited:
                continue
            
            visited.add(url)
            
            try:
                html = await self.fetch_url(url)
                text = self.extract_text_from_html(html)
                
                if text:
                    pages.append({
                        "url": url,
                        "text": text
                    })
                
                # Extract more links if under max depth
                if depth < max_depth:
                    links = self.extract_links(url, html)
                    for link in links:
                        if link not in visited:
                            to_visit.append((link, depth + 1))
                            
            except Exception as e:
                print(f"Error crawling {url}: {e}")
                continue
        
        return pages
    
    async def process_url(
        self,
        url: str,
        doc_id: str,
        crawl_if_docs: bool = True
    ) -> Dict[str, Any]:
        """
        Process a URL: fetch content, detect if docs, optionally crawl.
        
        Args:
            url: URL to process
            doc_id: Document identifier
            crawl_if_docs: Whether to crawl child pages if API docs detected
            
        Returns:
            Processing result with content and metadata
        """
        html = ""
        wiki_fallback = ""

        if self._is_wikipedia_url(url):
            try:
                wiki_fallback = await self.fetch_wikipedia_content(url)
            except Exception as wiki_exc:
                print(f"Wikipedia fallback failed for {url}: {wiki_exc}")
                wiki_fallback = ""

        if not wiki_fallback:
            try:
                html = await self.fetch_url(url)
            except Exception as exc:
                if self._is_wikipedia_url(url):
                    print(f"Primary HTML fetch failed for Wikipedia URL {url}: {exc}")
                    html = ""
                else:
                    raise

        is_docs = bool(html) and self.is_api_documentation(url, html)
        
        all_texts = []
        pages_processed = 0
        
        if wiki_fallback:
            all_texts.append(wiki_fallback)
            pages_processed = 1
        elif is_docs and crawl_if_docs:
            # Crawl the documentation site
            pages = await self.crawl_documentation(url)
            for page in pages:
                if page.get("text", "").strip():
                    all_texts.append(f"## {page['url']}\n\n{page['text']}")
            pages_processed = len(pages)

            # Fallback: if crawling found no usable pages, use the original page.
            if not all_texts:
                fallback_text = self.extract_text_from_html(html)
                if fallback_text.strip():
                    all_texts.append(fallback_text)
                    pages_processed = 1
        else:
            # Just process single page
            text = self.extract_text_from_html(html)
            if text.strip():
                all_texts.append(text)
                pages_processed = 1
            else:
                pages_processed = 0
        
        combined_text = "\n\n---\n\n".join(all_texts)
        chunks = chunk_text(combined_text) if combined_text.strip() else []

        if not chunks and combined_text.strip():
            chunks = [combined_text.strip()]
        
        # Store in vector DB
        if chunks:
            self.vector_store.add_documents(
                doc_id=doc_id,
                chunks=chunks,
                metadatas=[{"source": url, "type": "url", "is_docs": is_docs} for _ in chunks]
            )

        return {
            "doc_id": doc_id,
            "url": url,
            "is_api_docs": is_docs,
            "pages_crawled": pages_processed,
            "total_chunks": len(chunks),
            "text_length": len(combined_text),
            "raw_text": combined_text
        }


# Default scraper instance
url_scraper = URLScraper()
