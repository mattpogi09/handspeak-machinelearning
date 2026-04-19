import logging
import os


def configure_logging() -> None:
    level_name = os.getenv("HANDSPEAK_LOG_LEVEL", "INFO").upper()
    level = getattr(logging, level_name, logging.INFO)

    logging.basicConfig(
        level=level,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
        force=True,
    )

    # Keep noisy third-party modules from drowning inference logs.
    logging.getLogger("uvicorn.access").setLevel(logging.INFO)
    logging.getLogger("urllib3").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
