import json
import tempfile
import unittest
from pathlib import Path

from extract_chatgpt_share import Response, classify, discover_file_references, discover_urls, extract_messages, fetch_resources, run, validate_share_url


class FakeClient:
    def __init__(self, responses): self.responses, self.calls = responses, []
    def get(self, url):
        self.calls.append(url)
        value = self.responses[url]
        if isinstance(value, Exception): raise value
        return value


def response(url, body, status=200, content_type="text/html"):
    return Response(url, status, {"Content-Type": content_type}, body)


class ExtractorTests(unittest.TestCase):
    def test_roles_order_multipart_and_links(self):
        data = {"mapping": {"a": {"message": {"id": "a", "author": {"role": "user"}, "create_time": 2, "content": {"parts": ["Bonjour ", "<b>monde</b>"]}}}, "b": {"message": {"id": "b", "author": {"role": "assistant"}, "create_time": 3, "content": {"parts": ["Voir https://example.test/artifact.txt"]}}}}}
        messages, path, warnings = extract_messages('<script type="application/json">' + json.dumps(data) + '</script>')
        self.assertEqual(path, "script[0]"); self.assertEqual([m["role"] for m in messages], ["user", "assistant"])
        self.assertEqual(messages[0]["content"], "Bonjour\n<b>monde</b>")
        self.assertEqual(messages[1]["source_links"], ["https://example.test/artifact.txt"]); self.assertFalse(warnings)

    def test_unknown_role_is_not_misattributed(self):
        data = {"author": {"role": "tool"}, "content": {"parts": ["x"]}}
        messages, _, warnings = extract_messages('<script type="application/json">' + json.dumps(data) + '</script>')
        self.assertEqual(messages[0]["role"], "tool"); self.assertTrue(warnings)

    def test_angle_bracket_literals_are_preserved(self):
        data = {"author": {"role": "user"}, "content": {"parts": ["a < b && c > d"]}}
        messages, _, _ = extract_messages('<script type="application/json">' + json.dumps(data) + '</script>')
        self.assertEqual(messages[0]["content"], "a < b && c > d")

    def test_mixed_create_times_do_not_crash_or_misorder_known_times(self):
        messages = []
        for ident, time in (("late", "20"), ("unknown", "not-a-time"), ("early", 10)):
            messages.append({"message": {"id": ident, "author": {"role": "assistant"}, "create_time": time, "content": {"parts": [ident]}}})
        parsed, _, _ = extract_messages('<script type="application/json">' + json.dumps({"mapping": messages}) + '</script>')
        self.assertEqual([message["content"] for message in parsed], ["early", "late", "unknown"])

    def test_selects_a_valid_structure_among_multiple_scripted_states(self):
        data = {"messages": [{"author": {"role": "user"}, "content": {"parts": ["présent"]}}]}
        source = '<script type="application/json">pas du JSON</script><script type="application/json">' + json.dumps(data) + '</script>'
        messages, path, _ = extract_messages(source)
        self.assertEqual(path, "script[1]"); self.assertEqual(messages[0]["content"], "présent")

    def test_decodes_public_react_router_indexed_stream(self):
        # The actual share route uses an indexed value table in an enqueue call.
        stream = [{"_1": 2}, "message", {"_3": 4, "_7": 8}, "author", {"_5": 6}, "role", "assistant", "content", {"_9": 10}, "parts", [11], "visible"]
        source = '<script>window.__reactRouterContext.streamController.enqueue(' + json.dumps(json.dumps(stream)) + ');</script>'
        messages, path, warnings = extract_messages(source)
        self.assertEqual(path, "react-router[0]")
        self.assertEqual(messages[0]["role"], "assistant")
        self.assertEqual(messages[0]["content"], "visible")
        self.assertFalse(warnings)

    def test_react_router_stream_accepts_message_with_closing_call_text(self):
        stream = [{"_1": 2}, "message", {"_3": 4, "_7": 8}, "author", {"_5": 6}, "role", "user", "content", {"_9": 10}, "parts", [11], "un exemple ); littéral"]
        source = '<script>window.__reactRouterContext.streamController.enqueue(' + json.dumps(json.dumps(stream)) + ');</script>'
        messages, path, _ = extract_messages(source)
        self.assertEqual(path, "react-router[0]")
        self.assertEqual(messages[0]["content"], "un exemple ); littéral")

    def test_rejects_non_share_url_before_request(self):
        for url in ("http://chatgpt.com/share/x", "https://chatgpt.com/c/x", "https://evil.test/share/x"):
            with self.assertRaises(ValueError): validate_share_url(url)

    def test_no_data_writes_diagnostic_report(self):
        url = "https://chatgpt.com/share/abc-123"
        with tempfile.TemporaryDirectory() as temp:
            result = run(url, Path(temp), FakeClient({url: response(url, b"<html>empty</html>")}))
            self.assertIn("error", result); self.assertTrue((Path(temp) / "conversation.json").exists())

    def test_private_and_unsupported_resources_continue(self):
        with tempfile.TemporaryDirectory() as temp:
            records = fetch_resources(["https://8.8.8.8/private", "https://8.8.8.8/image.png"], Path(temp), FakeClient({
                "https://8.8.8.8/private": response("https://8.8.8.8/private", b"", 403),
                "https://8.8.8.8/image.png": response("https://8.8.8.8/image.png", b"png", content_type="image/png"),
            }))
            self.assertEqual(records[0]["status"], "non accessible"); self.assertEqual(records[1]["status"], "non pris en charge")

    def test_text_resource_is_downloaded_and_transcribed(self):
        with tempfile.TemporaryDirectory() as temp:
            records = fetch_resources(["https://8.8.8.8/file.md"], Path(temp), FakeClient({"https://8.8.8.8/file.md": response("https://8.8.8.8/file.md", "éà".encode(), content_type="text/markdown")}))
            self.assertEqual(records[0]["status"], "téléchargé"); self.assertTrue((Path(temp) / records[0]["transcription"]).exists())

    def test_linked_public_artifact_is_listed_by_the_full_run(self):
        url, artifact = "https://chatgpt.com/share/abc-123", "https://8.8.8.8/artifact.json"
        data = {"author": {"role": "assistant"}, "content": {"parts": [artifact]}}
        page = ('<script type="application/json">' + json.dumps(data) + '</script>').encode()
        with tempfile.TemporaryDirectory() as temp:
            result = run(url, Path(temp), FakeClient({url: response(url, page), artifact: response(artifact, b'{"ok": true}', content_type="application/json")}))
            self.assertEqual(result["resources"][0]["status"], "téléchargé")
            self.assertEqual(result["resources"][0]["url"], artifact)

    def test_pdf_without_optional_reader_is_explicit(self):
        # Invalid PDF is a portable way to exercise the explicit degradation path.
        with tempfile.TemporaryDirectory() as temp:
            records = fetch_resources(["https://8.8.8.8/file.pdf"], Path(temp), FakeClient({"https://8.8.8.8/file.pdf": response("https://8.8.8.8/file.pdf", b"not a pdf", content_type="application/pdf")}))
            self.assertEqual(records[0]["status"], "téléchargé"); self.assertIn("transcription_error", records[0])

    def test_file_citation_without_public_url_is_inventoried(self):
        references = discover_file_references([{"content": "Voir fileciteturn0file0L12-L18."}])
        self.assertEqual(references[0]["reference"], "turn0file0")
        self.assertEqual(references[0]["status"], "non accessible")

    def test_private_or_reserved_url_is_inventoried_without_a_request(self):
        client = FakeClient({"http://127.0.0.1/secret": response("http://127.0.0.1/secret", b"secret"), "http://224.0.0.1/secret": response("http://224.0.0.1/secret", b"secret")})
        with tempfile.TemporaryDirectory() as temp:
            records = fetch_resources(["http://127.0.0.1/secret", "http://224.0.0.1/secret"], Path(temp), client)
        self.assertTrue(all(record["status"] == "échec" for record in records))
        self.assertTrue(all("interdite" in record["reason"] for record in records))
        self.assertEqual(client.calls, [])

    def test_redirect_is_inventoried_without_download(self):
        url = "https://8.8.8.8/redirect"
        with tempfile.TemporaryDirectory() as temp:
            records = fetch_resources([url], Path(temp), FakeClient({url: response(url, b"", 302)}))
        self.assertEqual(records[0]["status"], "non accessible")
        self.assertIn("redirection", records[0]["reason"])

    def test_limits_are_inventoried(self):
        one, two, three = "https://8.8.8.8/one.txt", "https://8.8.8.8/two.txt", "https://8.8.8.8/three.txt"
        with tempfile.TemporaryDirectory() as temp:
            records = fetch_resources([one, two, three], Path(temp), FakeClient({
                one: response(one, b"12", content_type="text/plain"), two: response(two, b"345", content_type="text/plain"), three: response(three, b"6", content_type="text/plain"),
            }), max_resources=2, max_total_bytes=4)
        self.assertEqual(records[0]["status"], "téléchargé")
        self.assertEqual(records[1]["status"], "ignoré par limite")
        self.assertEqual(records[2]["status"], "ignoré par limite")

    def test_html_content_type_is_case_insensitive_and_not_text(self):
        self.assertEqual(classify(Response("https://8.8.8.8/page", 200, {"content-TYPE": "TEXT/HTML; charset=utf-8"}, b"<p>x</p>"), "https://8.8.8.8/page"), "html")

    def test_only_message_links_are_discovered(self):
        messages = [{"source_links": ["https://8.8.8.8/mentioned.txt"]}]
        self.assertEqual(discover_urls(messages), ["https://8.8.8.8/mentioned.txt"])
