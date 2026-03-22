"""
Generate extention/config.json from data/brands.json.

Produces a two-element array:
  [0] Canadian group   — brands with any canadian_signals flag = true
  [1] Non-Canadian group — all other brands

Each group uses an inline SVG maple leaf as its annotation:
  - Canadian:     red fill  (#D52B1E), light red background  (#FFE8E8)
  - Non-Canadian: grey fill (#999999), light grey background (#F0F0F0)

Usage:
    python scripts/generate_config.py
    # or via Docker:
    docker run --rm -v "${PWD}:/app" -w /app python:3.12-slim python scripts/generate_config.py
"""

import json
import pathlib
import re

INPUT_FILE = pathlib.Path("data/brands.json")
OUTPUT_FILE = pathlib.Path("extention/config.json")

# ── SVG maple leaf ────────────────────────────────────────────────────────────
# Path data sourced directly from the official Wikimedia Commons Maple_Leaf.svg
# (https://commons.wikimedia.org/wiki/File:Maple_Leaf.svg), which is in the
# public domain. The path uses arcs to produce the authentic curved-lobe shape.
# ViewBox: -2015 -2000 4030 4030  (centred at origin in the source file).
# Only the fill attribute differs between the two annotation groups.

MAPLE_LEAF_PATH = (
    "m-90 2030 45-863a95 95 0 0 0-111-98l-859 151 116-320a65 65 0 0 0-20-73"
    "l-941-762 212-99a65 65 0 0 0 34-79l-186-572 542 115a65 65 0 0 0 73-38"
    "l105-247 423 454a65 65 0 0 0 111-57l-204-1052 327 189a65 65 0 0 0 91-27"
    "l332-652 332 652a65 65 0 0 0 91 27l327-189-204 1052a65 65 0 0 0 111 57"
    "l423-454 105 247a65 65 0 0 0 73 38l542-115-186 572a65 65 0 0 0 34 79"
    "l212 99-941 762a65 65 0 0 0-20 73l116 320-859-151a95 95 0 0 0-111 98"
    "l45 863z"
)

def maple_leaf_svg(fill: str) -> str:
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" '
        f'viewBox="-2015 -2000 4030 4030" '
        f'style="vertical-align:middle;margin-left:2px;display:inline-block" '
        f'aria-hidden="true">'
        f'<path fill="{fill}" d="{MAPLE_LEAF_PATH}"/>'
        f'</svg>'
    )

CANADIAN_SVG = maple_leaf_svg("#D52B1E")
NON_CANADIAN_SVG = maple_leaf_svg("#999999")

# ── Load data ─────────────────────────────────────────────────────────────────

def is_canadian(brand: dict) -> bool:
    signals = brand.get("canadian_signals", {})
    return any(signals.values())

def clean_name(name: str) -> str:
    """Strip any trailing parenthetical disambiguator, e.g. '(Canada)', '(company)'."""
    return re.sub(r'\s*\([^)]*\)\s*$', '', name).strip()

def valid_name(name: str | None) -> bool:
    return name is not None and len(name.strip()) > 2

# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    data = json.loads(INPUT_FILE.read_text(encoding="utf-8"))
    brands = data["brands"]

    canadian_words: set[str] = set()
    non_canadian_words: set[str] = set()

    for brand in brands:
        name = brand.get("name")
        if not valid_name(name):
            continue
        name = clean_name(name.strip())
        if is_canadian(brand):
            canadian_words.add(name)
        else:
            non_canadian_words.add(name)

    # A name in both sets (e.g. acquired by a Canadian company) belongs to Canadian
    non_canadian_words -= canadian_words

    config = [
        {
            "label": "Canadian",
            "color": "#FFE8E8",
            "annotation": CANADIAN_SVG,
            "words": sorted(canadian_words),
        },
        {
            "label": "Not Canadian",
            "color": "#F0F0F0",
            "annotation": NON_CANADIAN_SVG,
            "words": sorted(non_canadian_words),
        },
    ]

    OUTPUT_FILE.write_text(
        json.dumps(config, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    print(f"Written to {OUTPUT_FILE}")
    print(f"  Canadian brands:     {len(canadian_words)}")
    print(f"  Non-Canadian brands: {len(non_canadian_words)}")


if __name__ == "__main__":
    main()
