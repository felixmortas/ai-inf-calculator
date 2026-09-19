#!/usr/bin/env python3
"""Extract the public information exposed by a ChatGPT share page.

This program deliberately uses no credentials and only follows links found in
the public conversation it has just downloaded.
"""
from __future__ import annotations

import argparse
import html
import ipaddress
import json
import math
import re
import socket
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable
from urllib.error import HTTPError, URLError
from urllib.parse import unquote, urlparse
from urllib.request import HTTPRedirectHandler, Request, build_opener

USER_AGENT = "chatgpt-share-extractor/1.0 (public, unauthenticated)"
MAX_DOWNLOAD_BYTES = 20 * 1024 * 1024
MAX_RESOURCES = 25
MAX_TOTAL_DOWNLOAD_BYTES = 50 * 1024 * 1024
TEXT_EXTENSIONS = {".txt", ".md", ".markdown", ".json", ".csv", ".log", ".py", ".js", ".ts", ".html", ".xml", ".yaml", ".yml"}
URL_RE = re.compile(r"https?://[^\s<>\"')\]}]+")
FILE_CITATION_RE = re.compile(r"filecite([^]+)L\d+(?:-L\d+)?")


@dataclass
class Response:
    url: str
    status: int
    headers: dict[str, str]
    body: bytes


class NoRedirectHandler(HTTPRedirectHandler):
    """Return a 3xx response to the caller rather than following it."""
    def redirect_request(self, request, fp, code, msg, headers, newurl):
        return None


def _assert_safe_network_target(url: str) -> None:
    """Reject local/reserved targets before an HTTP connection is opened."""
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError("URL de ressource publique invalide")
    host = parsed.hostname.rstrip(".").lower()
    if host == "localhost" or host.endswith(".localhost"):
        raise ValueError("hôte local interdit")
    try:
        addresses = [item[4][0] for item in socket.getaddrinfo(host, parsed.port or (443 if parsed.scheme == "https" else 80), type=socket.SOCK_STREAM)]
    except socket.gaierror as exc:
        raise ValueError(f"résolution DNS impossible: {exc}") from exc
    if not addresses:
        raise ValueError("hôte sans adresse réseau")
    for address in addresses:
        ip = ipaddress.ip_address(address)
        if not ip.is_global or ip.is_multicast:
            raise ValueError("adresse privée, loopback, link-local ou réservée interdite")


class PublicHttpClient:
    """Small, injectable HTTP boundary with a fixed timeout and byte limit."""
    def __init__(self, timeout: float = 20, max_bytes: int = MAX_DOWNLOAD_BYTES):
        self.timeout, self.max_bytes = timeout, max_bytes
        self.opener = build_opener(NoRedirectHandler())

    def get(self, url: str) -> Response:
        _assert_safe_network_target(url)
        request = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "text/html,application/json,text/plain,application/pdf,*/*;q=0.5"})
        try:
            with self.opener.open(request, timeout=self.timeout) as result:
                body = result.read(self.max_bytes + 1)
                if len(body) > self.max_bytes:
                    raise ValueError("réponse trop volumineuse")
                return Response(result.geturl(), result.status, dict(result.headers.items()), body)
        except HTTPError as exc:
            return Response(exc.geturl() or url, exc.code, dict(exc.headers.items()) if exc.headers else {}, exc.read(self.max_bytes))
        except URLError as exc:
            raise RuntimeError(f"erreur réseau: {exc.reason}") from exc


def validate_share_url(value: str) -> str:
    parsed = urlparse(value)
    if (parsed.scheme, parsed.hostname, parsed.username, parsed.password, parsed.port) != ("https", "chatgpt.com", None, None, None):
        raise ValueError("l’URL doit être https://chatgpt.com/share/<id>")
    if not re.fullmatch(r"/share/[A-Za-z0-9-]+/?", parsed.path) or parsed.query or parsed.fragment:
        raise ValueError("l’URL doit être https://chatgpt.com/share/<id>")
    return value


def clean_text(value: str) -> str:
    # JSON message parts are text already.  Do not mistake operators, examples,
    # or angle-bracket literals for application markup.
    return html.unescape(value).strip()


def text_from_content(value: Any) -> str:
    if isinstance(value, str):
        return clean_text(value)
    if isinstance(value, list):
        return "\n".join(part for item in value if (part := text_from_content(item))).strip()
    if isinstance(value, dict):
        for key in ("text", "content", "parts", "value"):
            if key in value:
                text = text_from_content(value[key])
                if text:
                    return text
    return ""


def _walk(value: Any) -> Iterable[Any]:
    yield value
    if isinstance(value, dict):
        for child in value.values():
            yield from _walk(child)
    elif isinstance(value, list):
        for child in value:
            yield from _walk(child)


def _message_from_node(node: dict[str, Any]) -> dict[str, Any] | None:
    message = node.get("message") if isinstance(node.get("message"), dict) else node
    author = message.get("author") if isinstance(message.get("author"), dict) else {}
    role = author.get("role", message.get("role"))
    content = message.get("content", message.get("parts"))
    if not isinstance(role, str) or content is None:
        return None
    text = text_from_content(content)
    if not text:
        return None
    return {"id": str(message.get("id") or node.get("id") or ""), "role": role, "content": text,
            "create_time": message.get("create_time", node.get("create_time")), "metadata": message.get("metadata", {})}


def _script_json(html_source: str) -> list[tuple[str, Any]]:
    found: list[tuple[str, Any]] = []
    for index, match in enumerate(re.finditer(r"<script\b([^>]*)>(.*?)</script\s*>", html_source, re.I | re.S)):
        attrs, payload = match.groups()
        if "json" not in attrs.lower() and "__next" not in attrs.lower():
            continue
        payload = html.unescape(payload.strip())
        try:
            found.append((f"script[{index}]", json.loads(payload)))
        except json.JSONDecodeError:
            # Next.js frequently serializes JSON as a quoted argument.
            for quoted in re.findall(r"(?:JSON\.parse\()?(['\"])(.*?)(?<!\\)\1", payload, re.S):
                try:
                    found.append((f"script[{index}]:chaîne", json.loads(quoted[1])))
                except json.JSONDecodeError:
                    pass
    # Current share pages may embed the route loader state as a JSON string in
    # React Router's stream controller.  Its compact, indexed form is public
    # page data, not an internal endpoint; resolve it before the normal walker.
    marker = "streamController.enqueue("
    decoder = json.JSONDecoder()
    position = 0
    index = 0
    while (start := html_source.find(marker, position)) != -1:
        try:
            encoded, end = decoder.raw_decode(html_source, start + len(marker))
            stream = json.loads(encoded)
            if isinstance(stream, list):
                found.append((f"react-router[{index}]", _resolve_indexed_stream(stream)))
        except (json.JSONDecodeError, TypeError, ValueError):
            end = start + len(marker)
        position = end
        index += 1
    return found


def _resolve_indexed_stream(values: list[Any]) -> Any:
    """Expand React Router's public table-based serializer conservatively."""
    resolving: set[int] = set()
    cache: dict[int, Any] = {}

    def resolve_index(index: int) -> Any:
        if index < 0 or index >= len(values) or index in resolving:
            return None
        if index in cache:
            return cache[index]
        resolving.add(index)
        result = resolve_value(values[index])
        resolving.remove(index)
        cache[index] = result
        return result

    def resolve_value(value: Any) -> Any:
        if isinstance(value, int):
            return resolve_index(value)
        if isinstance(value, list):
            return [resolve_value(item) for item in value]
        if isinstance(value, dict):
            result: dict[str, Any] = {}
            for key, item in value.items():
                decoded_key = resolve_index(int(key[1:])) if re.fullmatch(r"_\d+", key) else key
                if isinstance(decoded_key, str):
                    result[decoded_key] = resolve_value(item)
            return result
        return value

    return resolve_index(0)


def extract_messages(html_source: str) -> tuple[list[dict[str, Any]], str | None, list[str]]:
    """Return chronological, deduplicated public messages and parser diagnostics."""
    warnings: list[str] = []
    candidates: list[tuple[str, dict[str, Any]]] = []
    for path, data in _script_json(html_source):
        for node in _walk(data):
            if isinstance(node, dict) and (message := _message_from_node(node)):
                candidates.append((path, message))
    # Some share pages expose JSON directly without a script type declaration.
    if not candidates:
        for match in re.finditer(r"\{\s*\"(?:mapping|messages)\"\s*:", html_source):
            warnings.append(f"JSON sérialisé non décodable près de l’octet {match.start()}")
    unique: dict[str, tuple[str, dict[str, Any]]] = {}
    for path, message in candidates:
        key = message["id"] or f"{message['role']}\0{message['content']}"
        unique.setdefault(key, (path, message))
    ordered = list(unique.values())
    # Time is only a tie-breaker when available; document order is otherwise safest.
    def sort_time(value: Any) -> tuple[int, float]:
        if isinstance(value, bool) or value is None:
            return (1, 0.0)
        try:
            number = float(value)
            return (0, number) if math.isfinite(number) else (1, 0.0)
        except (TypeError, ValueError):
            return (1, 0.0)
    if any(sort_time(item[1]["create_time"])[0] == 0 for item in ordered):
        ordered.sort(key=lambda item: sort_time(item[1]["create_time"]))
    messages = []
    for index, (_, message) in enumerate(ordered, 1):
        role = message["role"]
        if role not in {"user", "assistant"}:
            warnings.append(f"message {index}: rôle inconnu « {role} »")
        messages.append({"order": index, "role": role, "content": message["content"], "source_links": sorted(set(URL_RE.findall(message["content"])))})
    return messages, (ordered[0][0] if ordered else None), warnings


def discover_urls(messages: list[dict[str, Any]]) -> list[str]:
    urls = {url.rstrip(".,;:") for message in messages for url in message["source_links"]}
    return sorted(url for url in urls if _safe_public_url(url))


def discover_file_references(messages: list[dict[str, Any]]) -> list[dict[str, str]]:
    """Inventory file citations which have no public download URL to follow."""
    references = sorted({match.group(1) for message in messages for match in FILE_CITATION_RE.finditer(message["content"])})
    return [{"reference": reference, "status": "non accessible", "reason": "référence de fichier sans URL publique de téléchargement"} for reference in references]


def _safe_public_url(url: str) -> bool:
    parsed = urlparse(url)
    return parsed.scheme in {"http", "https"} and bool(parsed.hostname) and not parsed.username and not parsed.password


def classify(response: Response, original_url: str) -> str:
    content_type = next((value for key, value in response.headers.items() if key.lower() == "content-type"), "").lower().split(";", 1)[0]
    suffix = Path(urlparse(response.url or original_url).path).suffix.lower()
    if content_type == "application/pdf" or suffix == ".pdf": return "pdf"
    if content_type == "text/html" or "html" in content_type: return "html"
    if content_type.startswith("text/") or content_type in {"application/json", "application/xml"} or suffix in TEXT_EXTENSIONS: return "texte"
    return "binaire non pris en charge"


def safe_filename(url: str, index: int) -> str:
    name = Path(unquote(urlparse(url).path)).name or f"ressource-{index}"
    name = re.sub(r"[^A-Za-z0-9._-]+", "_", name).strip("._") or f"ressource-{index}"
    return f"{index:03d}-{name[:120]}"


def transcribe_pdf(data: bytes) -> tuple[str | None, str | None]:
    try:
        from pypdf import PdfReader  # optional dependency
        import io
        text = "\n".join(page.extract_text() or "" for page in PdfReader(io.BytesIO(data)).pages).strip()
        return (text, None) if text else (None, "PDF image-only ou sans texte extractible")
    except ImportError:
        return None, "extraction PDF indisponible (installez pypdf)"
    except Exception as exc:
        return None, f"échec d’extraction PDF: {exc}"


def fetch_resources(urls: list[str], output: Path, client: PublicHttpClient, *, max_resources: int = MAX_RESOURCES, max_total_bytes: int = MAX_TOTAL_DOWNLOAD_BYTES) -> list[dict[str, Any]]:
    directory = output / "resources"; directory.mkdir(exist_ok=True)
    manifest: list[dict[str, Any]] = []
    total_bytes = 0
    for index, url in enumerate(urls, 1):
        record: dict[str, Any] = {"url": url, "status": "inconnu"}
        if index > max_resources:
            record.update(status="ignoré par limite", reason=f"limite de {max_resources} ressources atteinte")
            manifest.append(record)
            continue
        try:
            _assert_safe_network_target(url)
            response = client.get(url)
            record.update(http_status=response.status, final_url=response.url, size=len(response.body))
            if 300 <= response.status < 400:
                record.update(status="non accessible", reason="redirection non suivie par sécurité")
            elif response.status in {401, 403} or "login" in response.url.lower():
                record.update(status="non accessible", reason="authentification ou autorisation requise")
            elif response.status >= 400:
                record.update(status="échec", reason=f"HTTP {response.status}")
            elif len(response.body) > max_total_bytes - total_bytes:
                record.update(status="ignoré par limite", reason="limite de volume total atteinte")
            else:
                kind = classify(response, url); record["type"] = kind
                if kind in {"html", "binaire non pris en charge"}:
                    record.update(status="non pris en charge", reason="page applicative ou type non autorisé")
                else:
                    filename = safe_filename(response.url, index); path = directory / filename
                    path.write_bytes(response.body); total_bytes += len(response.body)
                    record.update(status="téléchargé", file=str(path.relative_to(output)))
                    if kind == "texte":
                        text = response.body.decode("utf-8", errors="replace")
                        transcription = path.with_suffix(path.suffix + ".txt"); transcription.write_text(text, encoding="utf-8")
                        record["transcription"] = str(transcription.relative_to(output))
                    elif kind == "pdf":
                        text, reason = transcribe_pdf(response.body)
                        if text is not None:
                            transcription = path.with_suffix(".txt"); transcription.write_text(text, encoding="utf-8")
                            record["transcription"] = str(transcription.relative_to(output))
                        else: record["transcription_error"] = reason
        except Exception as exc:
            record.update(status="échec", reason=str(exc))
        manifest.append(record)
    return manifest


def render_text(messages: list[dict[str, Any]]) -> str:
    return "\n\n".join(f"[{message['order']}] {message['role'].upper()}\n{message['content']}" for message in messages) + ("\n" if messages else "")


def run(url: str, output_dir: Path, client: PublicHttpClient | None = None) -> dict[str, Any]:
    validate_share_url(url); client = client or PublicHttpClient(); output_dir.mkdir(parents=True, exist_ok=True)
    response = client.get(url)
    if response.status >= 400: raise RuntimeError(f"page de partage inaccessible (HTTP {response.status})")
    source = response.body.decode("utf-8", errors="replace")
    messages, parser_path, warnings = extract_messages(source)
    report: dict[str, Any] = {"share_url": url, "extraction_path": parser_path, "messages": messages, "warnings": warnings}
    if not messages: report["error"] = "aucune structure conversationnelle publique reconnue"
    urls = discover_urls(messages)
    report["resources"] = fetch_resources(urls, output_dir, client)
    report["file_references"] = discover_file_references(messages)
    (output_dir / "conversation.txt").write_text(render_text(messages), encoding="utf-8")
    (output_dir / "conversation.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    manifest = {"resources": report["resources"], "file_references": report["file_references"], "warnings": warnings}
    (output_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return report


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Extrait une conversation ChatGPT publique, sans authentification.")
    parser.add_argument("url", help="https://chatgpt.com/share/<id>")
    parser.add_argument("--output-dir", type=Path, default=Path("chatgpt-share-output"), help="répertoire de sortie")
    parser.add_argument("--timeout", type=float, default=20, help="délai réseau par requête (secondes)")
    args = parser.parse_args(argv)
    try:
        report = run(args.url, args.output_dir, PublicHttpClient(args.timeout))
    except (ValueError, RuntimeError) as exc:
        print(f"Erreur: {exc}", file=sys.stderr); return 2
    print(f"{len(report['messages'])} message(s), résultats dans {args.output_dir}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
