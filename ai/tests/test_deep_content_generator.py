import pytest

from app.services.deep_content_generator import DeepContentGenerator


@pytest.mark.asyncio
async def test_offline_generator_produces_structured_study_guide():
    generator = DeepContentGenerator(llm_provider="ollama")
    generator.llm = None

    text = (
        "Climate change refers to long-term shifts in temperatures and weather patterns. "
        "Human activities, especially burning fossil fuels, increase greenhouse gas concentrations. "
        "This leads to global warming, sea level rise, and more extreme weather events."
    )

    result = await generator.generate_research_content(text=text, title="Climate Change")

    assert result["title"] == "Climate Change"
    assert "research-notes" in result["notes"]
    assert "temporarily unavailable" not in result["notes"].lower()
    assert len(result["flashcards"]) >= 5
    assert len(result["quizzes"]) == 5
    assert result["summary"]
    assert result["key_concepts"]
