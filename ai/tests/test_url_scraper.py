import pytest
from unittest.mock import AsyncMock, MagicMock

from app.services.url_scraper import URLScraper


class TestURLScraperExtraction:
    def test_extract_text_prefers_main_content_and_meta(self):
        html = """
        <html>
          <head>
            <title>Sample Article</title>
            <meta name="description" content="A short summary of the article." />
          </head>
          <body>
            <header>Navigation</header>
            <main>
              <article>
                <h1>How URL content is processed</h1>
                <p>This article explains how text extraction should work.</p>
                <p>It should prefer the meaningful content area.</p>
              </article>
            </main>
          </body>
        </html>
        """

        scraper = URLScraper(vector_store=MagicMock())
        text = scraper.extract_text_from_html(html)

        assert "How URL content is processed" in text
        assert "This article explains how text extraction should work." in text
        assert "A short summary of the article." in text
        assert "Navigation" not in text

    @pytest.mark.asyncio
    async def test_process_url_uses_fallback_page_text(self):
        html = """
        <html>
          <head>
            <title>Docs Home</title>
            <meta property="og:description" content="Documentation summary." />
          </head>
          <body>
            <div id="content">
              <h1>Docs Home</h1>
              <p>These are the important instructions for the site.</p>
            </div>
          </body>
        </html>
        """

        vector_store = MagicMock()
        vector_store.add_documents = MagicMock()
        scraper = URLScraper(vector_store=vector_store)
        scraper.fetch_url = AsyncMock(return_value=html)

        result = await scraper.process_url(
            url="https://example.com/docs",
            doc_id="workspace-1",
            crawl_if_docs=True,
        )

        assert result["raw_text"]
        assert result["text_length"] > 0
        assert result["total_chunks"] > 0
        vector_store.add_documents.assert_called()

    @pytest.mark.asyncio
    async def test_process_url_uses_wikipedia_fallback_when_html_fetch_fails(self):
        vector_store = MagicMock()
        vector_store.add_documents = MagicMock()
        scraper = URLScraper(vector_store=vector_store)
        scraper.fetch_url = AsyncMock(side_effect=Exception("403 Forbidden"))
        scraper.fetch_wikipedia_content = AsyncMock(
            return_value="Climate change is a long-term shift in temperatures and weather patterns."
        )

        result = await scraper.process_url(
            url="https://en.wikipedia.org/wiki/Climate_change",
            doc_id="workspace-2",
            crawl_if_docs=True,
        )

        assert "Climate change is a long-term shift" in result["raw_text"]
        assert result["text_length"] > 0
        assert result["total_chunks"] > 0
        assert result["pages_crawled"] == 1
        vector_store.add_documents.assert_called()
