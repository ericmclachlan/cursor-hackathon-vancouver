"""
Fetch brands/organizations from Wikidata and save results to data/brands.json.

Two passes are run and merged into a single output file:
  Pass A — Global top 10,000 by sitelinks (popularity proxy).
  Pass B — All Canadian businesses (P17=Canada OR HQ country=Canada),
            regardless of global popularity.

Items appearing in both passes are deduplicated by Wikidata ID.

Each pass uses three phases to stay within Wikidata's 60-second query timeout:
  Phase 1 — ID fetch: get item URIs (fast, no JOINs).
  Phase 2 — Scalar enrichment: singleton fields per item.
  Phase 3 — Multi-value enrichment: founders, stock exchanges, industries.

Usage:
    pip install requests
    python scripts/fetch_brands.py

Or via Docker (no local Python needed):
    docker run --rm -v "${PWD}:/app" -w /app python:3.12-slim \\
        sh -c "pip install -q requests && python scripts/fetch_brands.py"
"""

import json
import pathlib
import time

import requests

SPARQL_ENDPOINT = "https://query.wikidata.org/sparql"
OUTPUT_FILE = pathlib.Path("data/brands.json")

GLOBAL_LIMIT = 10_000
BATCH_SIZE = 50
RETRY_DELAY = 10
MAX_RETRIES = 3
INTER_BATCH_SLEEP = 1.0

CANADA_QID = "Q16"
TSX_QIDS = {"Q169452", "Q1456208"}   # Toronto Stock Exchange, TSX Venture Exchange

HEADERS = {
    "User-Agent": "cursor-hackathon-vancouver/1.0 (https://github.com/ericmclachlan)",
    "Accept": "application/sparql-results+json",
    "Content-Type": "application/x-www-form-urlencoded",
}

# ── SPARQL templates ──────────────────────────────────────────────────────────

# Pass A: top N businesses by sitelinks
GLOBAL_RANKING_QUERY = """
SELECT ?item (MAX(?sl) AS ?sitelinks) WHERE {
  ?item wdt:P31 wd:Q4830453 .
  ?item wikibase:sitelinks ?sl .
}
GROUP BY ?item
ORDER BY DESC(?sitelinks)
LIMIT %(limit)d
"""

# Pass B: all Canadian businesses (country=Canada OR HQ country=Canada)
CANADIAN_IDS_QUERY = """
SELECT DISTINCT ?item WHERE {
  ?item wdt:P31 wd:Q4830453 .
  { ?item wdt:P17 wd:Q16 . }
  UNION
  { ?item wdt:P159 ?hq . ?hq wdt:P17 wd:Q16 . }
}
"""

# Scalar fields — plain SELECT (no GROUP BY/SAMPLE) to avoid Blazegraph ClassCastException.
# Multiple rows per item are possible; Python deduplicates using first non-null value.
SCALAR_QUERY = """
SELECT DISTINCT ?item ?itemLabel ?country ?countryLabel
  ?hqLocation ?hqLocationLabel ?foundedLocation ?foundedLocationLabel
  ?inceptionDate ?website
WHERE {
  VALUES ?item { %(ids)s }
  OPTIONAL { ?item wdt:P17 ?country . }
  OPTIONAL { ?item wdt:P159 ?hqLocation . }
  OPTIONAL { ?item wdt:P740 ?foundedLocation . }
  OPTIONAL { ?item wdt:P571 ?inceptionDate . }
  OPTIONAL { ?item wdt:P856 ?website . }
  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "en" .
    ?item rdfs:label ?itemLabel .
    ?country rdfs:label ?countryLabel .
    ?hqLocation rdfs:label ?hqLocationLabel .
    ?foundedLocation rdfs:label ?foundedLocationLabel .
  }
}
"""

# Multi-valued fields — one row per (item, value) combination.
MULTI_QUERY = """
SELECT DISTINCT ?item ?founderLabel ?stockExchange ?stockExchangeLabel ?industryLabel
WHERE {
  VALUES ?item { %(ids)s }
  OPTIONAL { ?item wdt:P112 ?founder . }
  OPTIONAL { ?item wdt:P414 ?stockExchange . }
  OPTIONAL { ?item wdt:P452 ?industry . }
  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "en" .
    ?founder rdfs:label ?founderLabel .
    ?stockExchange rdfs:label ?stockExchangeLabel .
    ?industry rdfs:label ?industryLabel .
  }
}
"""

# ── Helpers ───────────────────────────────────────────────────────────────────

def sparql_post(query: str) -> list[dict]:
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = requests.post(
                SPARQL_ENDPOINT,
                data={"query": query},
                headers=HEADERS,
                timeout=90,
            )
            resp.raise_for_status()
            return resp.json()["results"]["bindings"]
        except Exception as exc:
            if attempt == MAX_RETRIES:
                raise
            print(f"  Attempt {attempt} failed ({exc}), retrying in {RETRY_DELAY}s…")
            time.sleep(RETRY_DELAY)
    return []


def val(row: dict, key: str) -> str | None:
    binding = row.get(key)
    return binding["value"] if binding else None


def qid(uri: str | None) -> str | None:
    if uri and uri.startswith("http://www.wikidata.org/entity/"):
        return uri.rsplit("/", 1)[-1]
    return uri


def ids_clause(uris: list[str]) -> str:
    return " ".join(f"wd:{qid(u)}" for u in uris if qid(u))


# ── ID fetching ───────────────────────────────────────────────────────────────

def fetch_global_ids(limit: int) -> list[tuple[str, int]]:
    """Return (uri, sitelinks) for the top N businesses by sitelinks."""
    print(f"Pass A — fetching top {limit} global item IDs by sitelinks…")
    rows = sparql_post(GLOBAL_RANKING_QUERY % {"limit": limit})
    result = [(val(r, "item"), int(val(r, "sitelinks") or 0)) for r in rows]
    print(f"  Got {len(result)} items.")
    return result


def fetch_canadian_ids() -> list[str]:
    """Return URIs for all businesses with country=Canada or HQ in Canada."""
    print("Pass B — fetching all Canadian business IDs…")
    rows = sparql_post(CANADIAN_IDS_QUERY)
    result = [val(r, "item") for r in rows if val(r, "item")]
    print(f"  Got {len(result)} items.")
    return result


# ── Enrichment ────────────────────────────────────────────────────────────────

def run_batches(uris: list[str], query_template: str, phase_name: str) -> list[dict]:
    total_batches = (len(uris) + BATCH_SIZE - 1) // BATCH_SIZE
    all_rows: list[dict] = []
    for i in range(0, len(uris), BATCH_SIZE):
        batch_num = i // BATCH_SIZE + 1
        batch = uris[i : i + BATCH_SIZE]
        print(f"  [{phase_name}] Batch {batch_num}/{total_batches} ({len(batch)} items)…", end=" ", flush=True)
        t = time.time()
        rows = sparql_post(query_template % {"ids": ids_clause(batch)})
        print(f"{len(rows)} rows in {time.time()-t:.1f}s")
        all_rows.extend(rows)
        time.sleep(INTER_BATCH_SLEEP)
    return all_rows


def enrich(uris: list[str], label: str) -> dict[str, dict]:
    """Run scalar + multi-value enrichment for a list of URIs, return records by URI."""
    print(f"\n  Scalar enrichment ({len(uris)} items)…")
    scalar_rows = run_batches(uris, SCALAR_QUERY, f"{label}/scalar")

    print(f"\n  Multi-value enrichment ({len(uris)} items)…")
    multi_rows = run_batches(uris, MULTI_QUERY, f"{label}/multi")

    records: dict[str, dict] = {}

    for row in scalar_rows:
        uri = val(row, "item")
        if not uri:
            continue
        if uri not in records:
            records[uri] = {
                "name": None,
                "country": None, "country_name": None,
                "hq_location": None, "hq_location_name": None,
                "founded_location": None, "founded_location_name": None,
                "inception_date": None, "website": None,
                "founders": set(), "stock_exchange_qids": set(),
                "stock_exchanges": set(), "industries": set(),
            }
        rec = records[uri]
        for field, key in [
            ("name", "itemLabel"),
            ("country", "country"), ("country_name", "countryLabel"),
            ("hq_location", "hqLocation"), ("hq_location_name", "hqLocationLabel"),
            ("founded_location", "foundedLocation"), ("founded_location_name", "foundedLocationLabel"),
            ("inception_date", "inceptionDate"),
            ("website", "website"),
        ]:
            if rec[field] is None:
                rec[field] = val(row, key)

    for row in multi_rows:
        uri = val(row, "item")
        if not uri or uri not in records:
            continue
        rec = records[uri]
        founder = val(row, "founderLabel")
        if founder:
            rec["founders"].add(founder)
        exch_uri = val(row, "stockExchange")
        exch_label = val(row, "stockExchangeLabel")
        if exch_uri:
            rec["stock_exchange_qids"].add(qid(exch_uri) or "")
        if exch_label:
            rec["stock_exchanges"].add(exch_label)
        industry = val(row, "industryLabel")
        if industry:
            rec["industries"].add(industry)

    return records


# ── Build output record ───────────────────────────────────────────────────────

def build_brand(uri: str, sitelinks: int, rec: dict) -> dict:
    country_uri = rec["country"]
    founded_loc_uri = rec["founded_location"]
    stock_exchange_qids = rec["stock_exchange_qids"]
    inception_raw = rec["inception_date"]

    canadian_signals = {
        "country_is_canada": qid(country_uri) == CANADA_QID,
        "founded_in_canada": qid(founded_loc_uri) == CANADA_QID,
        "listed_on_tsx": bool(stock_exchange_qids & TSX_QIDS),
    }

    return {
        "wikidata_id": qid(uri),
        "wikidata_uri": uri,
        "name": rec["name"],
        "sitelinks": sitelinks,
        "country": qid(country_uri),
        "country_name": rec["country_name"],
        "hq_location": qid(rec["hq_location"]),
        "hq_location_name": rec["hq_location_name"],
        "founded_location": qid(founded_loc_uri),
        "founded_location_name": rec["founded_location_name"],
        "inception_date": inception_raw[:10] if inception_raw else None,
        "founders": sorted(rec["founders"]),
        "stock_exchanges": sorted(rec["stock_exchanges"]),
        "industries": sorted(rec["industries"]),
        "website": rec["website"],
        "canadian_signals": canadian_signals,
    }


def empty_rec() -> dict:
    return {
        "name": None, "country": None, "country_name": None,
        "hq_location": None, "hq_location_name": None,
        "founded_location": None, "founded_location_name": None,
        "inception_date": None, "website": None,
        "founders": set(), "stock_exchange_qids": set(),
        "stock_exchanges": set(), "industries": set(),
    }


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    overall_start = time.time()

    # ── Pass A: global top 10k ────────────────────────────────────────────────
    print("=" * 60)
    print("PASS A: Global top 10,000 brands by popularity")
    print("=" * 60)
    global_ranked = fetch_global_ids(GLOBAL_LIMIT)
    global_uris = [uri for uri, _ in global_ranked]
    global_sitelinks = {uri: sl for uri, sl in global_ranked}

    global_records = enrich(global_uris, "A")

    # ── Pass B: all Canadian businesses ──────────────────────────────────────
    print("\n" + "=" * 60)
    print("PASS B: All Canadian businesses")
    print("=" * 60)
    canadian_uris_all = fetch_canadian_ids()

    # Only enrich items not already covered by Pass A
    already_fetched = set(global_uris)
    canadian_new_uris = [u for u in canadian_uris_all if u not in already_fetched]
    print(f"  {len(canadian_uris_all) - len(canadian_new_uris)} already in Pass A, "
          f"enriching {len(canadian_new_uris)} new items…")

    canadian_records = enrich(canadian_new_uris, "B") if canadian_new_uris else {}

    # ── Merge ─────────────────────────────────────────────────────────────────
    print("\nMerging passes…")

    # Pass A items in ranked order
    brands: list[dict] = [
        build_brand(uri, global_sitelinks[uri], global_records.get(uri) or empty_rec())
        for uri, _ in global_ranked
    ]

    # Pass B new Canadian items (sitelinks=0 if not in global ranking)
    for uri in canadian_new_uris:
        rec = canadian_records.get(uri) or empty_rec()
        brands.append(build_brand(uri, 0, rec))

    elapsed = time.time() - overall_start
    canadian_count = sum(
        1 for b in brands
        if b["canadian_signals"]["country_is_canada"]
        or b["canadian_signals"]["founded_in_canada"]
        or b["canadian_signals"]["listed_on_tsx"]
    )

    output = {
        "fetched_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "sparql_endpoint": SPARQL_ENDPOINT,
        "query_elapsed_seconds": round(elapsed, 1),
        "count": len(brands),
        "canadian_count": canadian_count,
        "brands": brands,
    }

    OUTPUT_FILE.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nDone. {len(brands)} total brands ({canadian_count} Canadian) → {OUTPUT_FILE}  ({elapsed:.0f}s total)")


if __name__ == "__main__":
    main()
