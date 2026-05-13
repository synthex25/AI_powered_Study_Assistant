# Deep Content Generator — Single-Call Architecture
# Generates notes, flashcards, quizzes, and summary in ONE API call.
import hashlib
import json
import re
from collections import Counter
from typing import Any, Dict, List, Optional

from app.config import settings
from app.providers.base import LLMMessage
from app.providers.factory import get_llm_provider

# ---------------------------------------------------------------------------
# Simple in-process cache (keyed by SHA-256 of input text + language)
# Avoids re-calling the API for identical content within the same process.
# ---------------------------------------------------------------------------
_cache: Dict[str, Dict[str, Any]] = {}
_MAX_CACHE = 50  # keep last 50 results
QUIZ_COUNT = 15
FLASHCARD_COUNT = 15


def _cache_key(text: str, language: str) -> str:
    return hashlib.sha256(f"{language}:{text[:8000]}".encode()).hexdigest()


# ---------------------------------------------------------------------------
# Master prompt — everything in one shot
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT = (
    "You are an expert educator and study-material creator. "
    "You always respond with valid, complete JSON — no markdown fences, "
    "no extra commentary, just the JSON object."
)

_USER_PROMPT_TEMPLATE = """Analyse the SOURCE TEXT below and produce a complete study package.
Respond with ONLY a single JSON object that matches this exact schema:

{{
  "title": "Short descriptive title (with 1 relevant emoji)",
  "summary": "3-5 sentence executive summary of the content",
  "key_concepts": ["concept1", "concept2", "concept3", "concept4", "concept5"],
  "notes": "<article>...</article>  (rich HTML — see rules below)",
  "flashcards": [
    {{"front": "Key term or concept", "back": "Clear definition or explanation"}},
    ...15 items...
  ],
  "quizzes": [
    {{
      "question": "Question text",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correctAnswer": "A",
      "explanation": "One-sentence explanation of the correct answer"
    }},
    ...15 items...
  ]
}}

NOTES HTML RULES:
- Wrap everything in <article class="research-notes">
- Use <h2> for main sections, <h3> for subsections
- Use <ul>/<ol> for lists, <strong> for key terms
- Include 3-5 logical sections that cover the material thoroughly
- Keep it educational and clear — write for a student learning this topic
- Language: {language}

FLASHCARD RULES:
- front = a key term, concept, or short phrase (NOT a question)
- back = a clear definition or explanation (2-3 sentences max)
- Cover the most important vocabulary and ideas
- Return exactly 15 flashcards (no fewer)

QUIZ RULES:
- 15 multiple-choice questions testing understanding (not just recall)
- 4 options each (A, B, C, D)
- correctAnswer must be exactly "A", "B", "C", or "D"
- Make distractors plausible

SOURCE TEXT (first 25000 chars):
{text}

Respond with ONLY the JSON object. No markdown. No explanation."""


class DeepContentGenerator:
    """
    Single-call content generator.
    One Gemini API call produces notes + flashcards + quizzes + summary.
    """

    def __init__(self, llm_provider: str = None, llm_model: str = None):
        self.provider_name = (llm_provider or settings.LLM_PROVIDER).lower()
        try:
            self.llm = get_llm_provider(provider=llm_provider, model=llm_model)
        except Exception as exc:
            print(f"[DeepGenerator] LLM provider init failed; using offline fallback: {exc}")
            self.llm = None

    # ------------------------------------------------------------------
    # JSON helpers
    # ------------------------------------------------------------------

    def _parse_json(self, raw: str) -> Dict[str, Any]:
        """Extract and parse JSON from LLM response, with basic repair."""
        # Strip markdown fences if present
        cleaned = re.sub(r"^```(?:json)?\s*", "", raw.strip(), flags=re.MULTILINE)
        cleaned = re.sub(r"\s*```$", "", cleaned.strip(), flags=re.MULTILINE)
        cleaned = cleaned.strip()

        # Remove control characters
        cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", cleaned)

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            pass

        # Repair: remove trailing commas before } or ]
        repaired = re.sub(r",\s*([}\]])", r"\1", cleaned)
        # Repair: close unclosed braces/brackets
        open_b = repaired.count("{") - repaired.count("}")
        open_k = repaired.count("[") - repaired.count("]")
        repaired += "]" * max(open_k, 0) + "}" * max(open_b, 0)

        try:
            return json.loads(repaired)
        except json.JSONDecodeError as exc:
            raise ValueError(f"Could not parse LLM JSON response: {exc}\n\nRaw (first 500):\n{raw[:500]}")

    # ------------------------------------------------------------------
    # Fallback when the API is unavailable
    # ------------------------------------------------------------------

    def _fallback(self, text: str, title: str) -> Dict[str, Any]:
        return self._offline_generate(text=text, title=title)

    def _clean_source_text(self, text: str) -> str:
        lines: List[str] = []
        for line in text.splitlines():
            clean = re.sub(r"\s+", " ", line).strip()
            if not clean:
                continue
            if re.match(r"^https?://", clean):
                continue
            if clean.startswith("## Source:"):
                continue
            if clean.startswith("## "):
                continue
            if clean.startswith("===") or clean.startswith("----"):
                continue
            if clean.lower() in {
                "toggle the table of contents",
                "read",
                "view source",
                "view history",
                "tools",
                "print/export",
                "download as pdf",
                "languages",
            }:
                continue
            # Wikipedia pages often include giant language/navigation bars with
            # many words but no sentence punctuation. Drop those lines so they
            # do not dominate the fallback notes.
            if len(clean.split()) > 14 and not re.search(r"[.!?]", clean):
                continue
            lines.append(clean)
        return "\n".join(lines)

    def _split_sentences(self, text: str) -> List[str]:
        cleaned = self._clean_source_text(text)
        sentences = [
            s.strip()
            for s in re.split(r"(?<=[.!?])\s+", cleaned)
            if s.strip()
        ]
        # Keep only substantive sentences that look like actual prose.
        substantive = [
            s for s in sentences
            if len(s) >= 40 and len(re.findall(r"\w+", s)) >= 6
        ]
        return substantive or sentences

    def _extract_key_terms(self, text: str, title: str, limit: int = 5) -> List[str]:
        stopwords = {
            "the", "and", "for", "with", "that", "this", "from", "into", "their",
            "about", "they", "them", "when", "your", "will", "been", "were", "have",
            "has", "had", "are", "was", "but", "not", "you", "our", "can", "also",
            "more", "than", "such", "which", "there", "these", "those", "its", "his",
            "her", "may", "some", "most", "many", "much", "over", "under", "within",
            "during", "between", "change", "climate", "climate change",
        }

        words = re.findall(r"[A-Za-z][A-Za-z\-']{2,}", text.lower())
        counts = Counter(
            word for word in words
            if word not in stopwords and len(word) > 3
        )

        terms: List[str] = []
        for phrase in [title, "greenhouse effect", "global warming"]:
            cleaned = phrase.strip()
            if cleaned and cleaned.lower() not in {t.lower() for t in terms}:
                terms.append(cleaned)

        for word, _ in counts.most_common():
            candidate = word.replace("-", " ").strip()
            if candidate and candidate.lower() not in {t.lower() for t in terms}:
                terms.append(candidate.title())
            if len(terms) >= limit:
                break

        return terms[:limit]

    def _offline_notes_html(self, title: str, summary: str, concepts: List[str], sentences: List[str]) -> str:
        sections = []
        if sentences:
            overview = " ".join(sentences[:2])
        else:
            overview = summary

        sections.append(
            f"<section><h2>Overview</h2><p>{overview}</p></section>"
        )

        if concepts:
            sections.append(
                "<section><h2>Key Ideas</h2><ul>"
                + "".join(f"<li><strong>{c}</strong></li>" for c in concepts)
                + "</ul></section>"
            )

        body_sentences = sentences[2:7] if len(sentences) > 2 else sentences[:5]
        if body_sentences:
            body_items = "".join(f"<li>{s}</li>" for s in body_sentences)
            sections.append(
                "<section><h2>Important Points</h2><ol>"
                + body_items
                + "</ol></section>"
            )

        sections.append(
            "<section><h2>Study Takeaway</h2><p>"
            "Focus on the main causes, effects, and supporting evidence, then test yourself with the flashcards and quiz."
            "</p></section>"
        )

        return (
            '<article class="research-notes">'
            f"<h1>{title}</h1>"
            + "".join(sections)
            + "</article>"
        )

    def _offline_flashcards(self, concepts: List[str], summary: str) -> List[Dict[str, str]]:
        cards: List[Dict[str, str]] = []
        summary_bits = [s.strip() for s in re.split(r"(?<=[.!?])\s+", summary) if s.strip()]
        for idx, concept in enumerate(concepts[:FLASHCARD_COUNT]):
            back = summary_bits[idx % len(summary_bits)] if summary_bits else summary
            cards.append({
                "front": concept,
                "back": back[:240] if back else f"Key idea related to {concept}.",
            })
        while len(cards) < FLASHCARD_COUNT:
            cards.append({
                "front": f"Core idea {len(cards) + 1}",
                "back": summary[:240] if summary else "Review the main ideas from the notes.",
            })
        return cards[:FLASHCARD_COUNT]

    def _ensure_flashcard_count(
        self,
        flashcards: List[Dict[str, str]],
        key_concepts: List[str],
        summary: str,
    ) -> List[Dict[str, str]]:
        normalized: List[Dict[str, str]] = []
        seen_front: set[str] = set()

        for card in (flashcards or []):
            if not isinstance(card, dict):
                continue
            front = str(card.get("front") or "").strip()
            back = str(card.get("back") or "").strip()
            if not front or not back:
                continue
            key = front.lower()
            if key in seen_front:
                continue
            seen_front.add(key)
            normalized.append({"front": front, "back": back})
            if len(normalized) >= FLASHCARD_COUNT:
                return normalized[:FLASHCARD_COUNT]

        for card in self._offline_flashcards(key_concepts or [], summary or ""):
            front = str(card.get("front") or "").strip()
            back = str(card.get("back") or "").strip()
            if not front or not back:
                continue
            key = front.lower()
            if key in seen_front:
                continue
            seen_front.add(key)
            normalized.append({"front": front, "back": back})
            if len(normalized) >= FLASHCARD_COUNT:
                return normalized[:FLASHCARD_COUNT]

        while len(normalized) < FLASHCARD_COUNT:
            normalized.append({
                "front": f"Core idea {len(normalized) + 1}",
                "back": (summary or "Review the main ideas from the notes.")[:240],
            })

        return normalized[:FLASHCARD_COUNT]

    def _offline_quizzes(self, concepts: List[str], summary: str) -> List[Dict[str, Any]]:
        quizzes: List[Dict[str, Any]] = []
        base = concepts[:4] or ["the topic"]
        for idx, concept in enumerate(base):
            other = [c for c in base if c != concept]
            distractors = (other + ["a minor detail", "an unrelated process", "a random fact"])[:3]
            options = [
                f"A) {concept} is a major idea in the topic",
                f"B) {distractors[0]}",
                f"C) {distractors[1]}",
                f"D) {distractors[2]}",
            ]
            quizzes.append({
                "question": f"Which statement best describes {concept}?",
                "options": options,
                "correctAnswer": "A",
                "explanation": f"{concept} is one of the central ideas highlighted in the source text.",
            })

        while len(quizzes) < QUIZ_COUNT:
            quizzes.append({
                "question": "What should you focus on when reviewing this topic?",
                "options": [
                    "A) The central ideas and relationships",
                    "B) Only the page layout",
                    "C) Random dates with no context",
                    "D) Ignoring the notes entirely",
                ],
                "correctAnswer": "A",
                "explanation": "Good study notes should emphasize the key ideas and how they connect.",
            })

        return quizzes[:QUIZ_COUNT]

    def _offline_generate(self, text: str, title: str) -> Dict[str, Any]:
        cleaned = self._clean_source_text(text)
        sentences = self._split_sentences(cleaned)
        summary = " ".join(sentences[:3]) or cleaned[:500] or title
        concepts = self._extract_key_terms(cleaned, title, limit=5)
        if not concepts:
            concepts = [title, "main idea", "supporting evidence"]
        notes_html = self._offline_notes_html(title, summary, concepts, sentences)
        flashcards = self._offline_flashcards(concepts, summary)
        quizzes = self._offline_quizzes(concepts, summary)
        youtube, websites = self._build_resource_links(title, concepts)
        recommendations = self._build_recommendations(concepts, len(flashcards), len(quizzes))

        return {
            "title": title,
            "summary": summary,
            "key_concepts": concepts,
            "notes": notes_html,
            "content": notes_html,
            "flashcards": flashcards,
            "quizzes": quizzes,
            "recommendations": recommendations,
            "youtube_links": youtube,
            "website_links": websites,
            "diagrams": {"concept_map": "", "flowchart": ""},
        }

    # ------------------------------------------------------------------
    # Resource links (no API call needed)
    # ------------------------------------------------------------------

    def _build_resource_links(
        self, main_topic: str, key_concepts: List[str]
    ) -> tuple[List[Dict], List[Dict]]:
        enc = main_topic.replace(" ", "+")
        wiki = main_topic.replace(" ", "_")
        themes = key_concepts[:2]

        youtube = [
            {
                "title": f"📺 {main_topic} — Full Tutorial",
                "url": f"https://www.youtube.com/results?search_query={enc}+tutorial",
            },
            {
                "title": f"📺 {themes[0] if themes else main_topic} — Explained",
                "url": f"https://www.youtube.com/results?search_query={(themes[0] if themes else main_topic).replace(' ', '+')}+explained",
            },
            {
                "title": f"📺 {main_topic} — Crash Course",
                "url": f"https://www.youtube.com/results?search_query={enc}+crash+course",
            },
        ]

        websites = [
            {"title": f"📖 Wikipedia: {main_topic}", "url": f"https://en.wikipedia.org/wiki/{wiki}"},
            {"title": "🎓 Khan Academy", "url": f"https://www.khanacademy.org/search?page_search_query={enc}"},
            {"title": "🎓 Coursera", "url": f"https://www.coursera.org/search?query={enc}"},
            {"title": "🔬 Google Scholar", "url": f"https://scholar.google.com/scholar?q={enc}"},
        ]
        return youtube, websites

    # ------------------------------------------------------------------
    # Recommendations HTML (no API call)
    # ------------------------------------------------------------------

    def _build_recommendations(
        self,
        key_concepts: List[str],
        flashcard_count: int,
        quiz_count: int,
    ) -> str:
        concepts_html = "".join(
            f"<li><strong>{c}</strong></li>" for c in key_concepts[:6]
        ) or "<li>Review the generated notes</li>"
        return f"""<div class="recommendations-content">
  <h4>🎯 Key Concepts to Master</h4>
  <ul>{concepts_html}</ul>
  <h4>🚀 Recommended Study Path</h4>
  <ol>
    <li><strong>Read</strong> the AI Notes to understand the material</li>
    <li><strong>Recall</strong> — test yourself with the {flashcard_count} flashcards</li>
    <li><strong>Assess</strong> — complete the {quiz_count} quiz questions</li>
    <li><strong>Ask</strong> — use the AI Tutor for anything unclear</li>
    <li><strong>Explore</strong> — watch the recommended YouTube videos</li>
  </ol>
  <h4>💡 Study Tips</h4>
  <ul>
    <li>Space your sessions over multiple days for better retention</li>
    <li>Explain concepts aloud — teaching reinforces learning</li>
    <li>Focus on understanding relationships, not just memorising facts</li>
  </ul>
</div>"""

    # ------------------------------------------------------------------
    # Main entry point
    # ------------------------------------------------------------------

    async def generate_research_content(
        self,
        text: str,
        title: Optional[str] = None,
        language: str = "en",
        progress_callback=None,
    ) -> Dict[str, Any]:
        """
        Generate all study content in a SINGLE API call.
        Returns notes, flashcards, quizzes, summary, and resource links.
        """

        async def emit(stage: str, pct: int, msg: str):
            if progress_callback:
                try:
                    await progress_callback(stage, pct, msg)
                except Exception:
                    pass

        fallback_title = title or "Study Guide"

        # ── Cache check ──────────────────────────────────────────────
        key = _cache_key(text, language)
        if key in _cache:
            print("[DeepGenerator] Cache hit — returning cached result")
            return _cache[key]

        # ── Re-sync provider if settings changed ─────────────────────
        configured = settings.LLM_PROVIDER.lower()
        if self.provider_name != configured:
            self.provider_name = configured
            try:
                self.llm = get_llm_provider(provider=configured)
            except Exception as exc:
                print(f"[DeepGenerator] Failed to load configured provider; using offline fallback: {exc}")
                self.llm = None

        if self.llm is None:
            await emit("notes", 98, "Building offline study guide...")
            print("[DeepGenerator] No LLM available; using offline generator")
            return self._offline_generate(text, fallback_title)

        await emit("notes", 35, "Generating study content with AI (single call)...")
        print(f"[DeepGenerator] Single-call generation started (text: {len(text)} chars)")

        prompt = _USER_PROMPT_TEMPLATE.format(
            language=language,
            text=text[:25000],
        )

        messages = [
            LLMMessage(role="system", content=_SYSTEM_PROMPT),
            LLMMessage(role="user", content=prompt),
        ]

        try:
            await emit("notes", 40, "Waiting for AI response...")
            response = await self.llm.generate(messages, max_tokens=8192, temperature=0.5)
            raw = response.content

            await emit("flashcards", 75, "Parsing AI response...")
            data = self._parse_json(raw)
            print("[DeepGenerator] Single-call generation complete ✓")

        except Exception as exc:
            msg = str(exc).lower()
            is_rate_limit = "429" in msg or "quota" in msg or "rate limit" in msg or "exhausted" in msg
            if is_rate_limit:
                print(f"[DeepGenerator] Rate limited — returning fallback: {exc}")
            else:
                print(f"[DeepGenerator] Generation failed — returning fallback: {exc}")
            await emit("notes", 98, "Using fallback content...")
            return self._fallback(text, fallback_title)

        # ── Extract fields with safe defaults ────────────────────────
        doc_title   = data.get("title") or fallback_title
        summary     = data.get("summary") or ""
        key_concepts = data.get("key_concepts") or []
        notes_html  = data.get("notes") or self._fallback(text, doc_title)["notes"]
        flashcards  = data.get("flashcards") or []
        quizzes     = data.get("quizzes") or []

        # Normalise quiz correctAnswer field name
        for q in quizzes:
            if "correct_answer" in q and "correctAnswer" not in q:
                q["correctAnswer"] = q.pop("correct_answer")

        await emit("recommendations", 90, "Building resource links...")

        flashcards = self._ensure_flashcard_count(flashcards, key_concepts, summary)

        youtube, websites = self._build_resource_links(doc_title, key_concepts)
        recommendations   = self._build_recommendations(key_concepts, len(flashcards), len(quizzes))

        print(
            f"[DeepGenerator] Done — {len(flashcards)} flashcards, "
            f"{len(quizzes)} quizzes, {len(youtube)} YT links"
        )

        result = {
            "title":        doc_title,
            "summary":      summary,
            "key_concepts": key_concepts,
            "content":      notes_html,
            "notes":        notes_html,
            "flashcards":   flashcards,
            "quizzes":      quizzes,
            "recommendations": recommendations,
            "youtube_links":   youtube,
            "website_links":   websites,
            "diagrams": {"concept_map": "", "flowchart": ""},
        }

        # ── Store in cache ────────────────────────────────────────────
        if len(_cache) >= _MAX_CACHE:
            _cache.pop(next(iter(_cache)))
        _cache[key] = result

        return result


# Singleton used by workspace.py
deep_content_generator = DeepContentGenerator()
