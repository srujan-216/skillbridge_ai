"""Quick Gemini sanity check. Run: python test_gemini.py"""
from __future__ import annotations
import sys

from app.config import get_settings
from app.services import gemini_service


def main() -> int:
    settings = get_settings()
    print(f"Model: {settings.gemini_model}")
    print(f"API key present: {bool(settings.gemini_api_key)}")

    if not settings.gemini_api_key:
        print("❗ Set GEMINI_API_KEY in .env before running this test.")
        return 1

    ok = gemini_service.health_check()
    print(f"health_check(): {ok}")
    if not ok:
        print("\n--- Models available to your key (generateContent-capable) ---")
        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.gemini_api_key)
            for m in genai.list_models():
                if "generateContent" in m.supported_generation_methods:
                    print(f"  {m.name}")
        except Exception as e:  # noqa: BLE001
            print(f"  (couldn't list models: {e})")
        return 2

    try:
        reply = gemini_service.ask_text(
            "Return a single friendly sentence that mentions the word 'SkillBridge'.",
            cache_key="_diag",
        )
        print("Sample reply:", reply.strip()[:160])
    except Exception as e:  # noqa: BLE001
        print("Sample call failed:", e)
        return 3
    return 0


if __name__ == "__main__":
    sys.exit(main())
