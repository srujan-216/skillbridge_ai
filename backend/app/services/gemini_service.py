"""Gemini wrapper with retries, JSON parsing, and in-memory cache."""
from __future__ import annotations
import hashlib
import json
import logging
import re
from typing import Any, Optional

import google.generativeai as genai
from tenacity import (
    retry, stop_after_attempt, wait_exponential, retry_if_exception_type,
)

from ..config import get_settings

logger = logging.getLogger("skillbridge.gemini")

_settings = get_settings()
_configured = False
_cache: dict[str, Any] = {}


class GeminiError(Exception):
    pass


def _configure() -> None:
    global _configured
    if _configured:
        return
    if not _settings.gemini_api_key:
        logger.warning("GEMINI_API_KEY not set — running in offline stub mode.")
        _configured = True
        return
    genai.configure(api_key=_settings.gemini_api_key)
    _configured = True
    logger.info("Gemini configured with model %s", _settings.gemini_model)


def _hash(*parts: str) -> str:
    h = hashlib.sha256()
    for p in parts:
        h.update(p.encode("utf-8", "ignore"))
        h.update(b"|")
    return h.hexdigest()[:24]


def _extract_json(text: str) -> Any:
    """Strip markdown fences and parse JSON."""
    cleaned = text.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    # find first {...} or [...]
    m = re.search(r"(\{.*\}|\[.*\])", cleaned, re.DOTALL)
    candidate = m.group(1) if m else cleaned
    return json.loads(candidate)


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=0.6, min=0.6, max=4),
    retry=retry_if_exception_type(Exception),
    reraise=True,
)
def _call(prompt: str, *, temperature: float = 0.4, json_mode: bool = False) -> str:
    _configure()
    if not _settings.gemini_api_key:
        raise GeminiError("no_api_key")
    model = genai.GenerativeModel(_settings.gemini_model)
    gen_cfg: dict[str, object] = {
        "temperature": temperature,
        "top_p": 0.95,
        # 2.5-flash uses "thinking" tokens that count here — keep it generous.
        "max_output_tokens": 8192,
    }
    if json_mode:
        # Native JSON output — Gemini will return parseable JSON without fences.
        gen_cfg["response_mime_type"] = "application/json"
    resp = model.generate_content(prompt, generation_config=gen_cfg)
    text = ""
    try:
        text = (resp.text or "").strip()
    except Exception:  # noqa: BLE001
        for c in getattr(resp, "candidates", []) or []:
            for p in getattr(getattr(c, "content", None), "parts", []) or []:
                if getattr(p, "text", None):
                    text += p.text
        text = text.strip()
    if not text:
        raise GeminiError("empty_response")
    return text


def ask_json(prompt: str, *, cache_key: Optional[str] = None, temperature: float = 0.4) -> Any:
    key = cache_key or _hash(prompt, _settings.gemini_model, str(temperature))
    if key in _cache:
        logger.debug("cache hit %s", key)
        return _cache[key]
    try:
        # json_mode=True asks Gemini for raw JSON; we still defensively strip.
        raw = _call(prompt, temperature=temperature, json_mode=True)
        data = _extract_json(raw)
        _cache[key] = data
        return data
    except Exception as e:
        logger.warning("gemini failure: %s", e)
        raise GeminiError(str(e)) from e


def ask_text(prompt: str, *, cache_key: Optional[str] = None, temperature: float = 0.4) -> str:
    key = cache_key or _hash(prompt, "text", str(temperature))
    if key in _cache:
        return _cache[key]
    try:
        raw = _call(prompt, temperature=temperature)
        _cache[key] = raw
        return raw
    except Exception as e:
        logger.warning("gemini failure: %s", e)
        raise GeminiError(str(e)) from e


def health_check() -> bool:
    """Fast connectivity probe used by /api/health.

    NOTE: 2.5-flash uses thinking tokens that count toward max_output_tokens,
    so we give it enough headroom to finish.
    """
    _configure()
    if not _settings.gemini_api_key:
        return False
    try:
        model = genai.GenerativeModel(_settings.gemini_model)
        r = model.generate_content(
            "Reply with the single word: OK",
            generation_config={"temperature": 0, "max_output_tokens": 256},
        )
        # Accept any non-empty response (some models wrap "OK" with punctuation)
        candidates = getattr(r, "candidates", None) or []
        if not candidates:
            return False
        # If we got a finish_reason of STOP (1), we're good even if .text is trimmed
        text = ""
        try:
            text = (r.text or "").strip()
        except Exception:  # noqa: BLE001
            # 2.5 may occasionally return thinking-only parts; fall back
            for c in candidates:
                parts = getattr(getattr(c, "content", None), "parts", []) or []
                for p in parts:
                    if getattr(p, "text", None):
                        text += p.text
        return bool(text)
    except Exception as e:
        logger.warning("gemini health failed: %s", e)
        return False
