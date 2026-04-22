import os
import urllib.request
import urllib.parse
import json

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/youtube", tags=["youtube"])

_cache: dict[str, dict] = {}

SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"


def _fetch_video(word: str, is_letter: bool) -> dict:
    api_key = os.getenv("YOUTUBE_API_KEY", "")
    if not api_key:
        return {"video_id": None, "title": None}

    if is_letter:
        query = f"ASL letter {word} sign language fingerspelling"
    else:
        query = f"ASL {word} sign language"

    params = urllib.parse.urlencode({
        "part": "snippet",
        "type": "video",
        "maxResults": 1,
        "q": query,
        "key": api_key,
    })

    req = urllib.request.Request(f"{SEARCH_URL}?{params}")
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read())
    except Exception:
        return {"video_id": None, "title": None}

    items = data.get("items", [])
    if not items:
        return {"video_id": None, "title": None}

    item = items[0]
    return {
        "video_id": item["id"].get("videoId"),
        "title": item["snippet"].get("title"),
    }


@router.get("/video")
def get_tutorial_video(
    word: str = Query(..., min_length=1, max_length=64),
    is_letter: bool = Query(False),
):
    cache_key = f"{'letter' if is_letter else 'word'}:{word.lower()}"
    if cache_key not in _cache:
        _cache[cache_key] = _fetch_video(word, is_letter)
    return JSONResponse(_cache[cache_key])
