"""Uji regresi parser proxy TikTok (stdlib saja, tanpa server).

Jalankan:  python3 tests/test_api.py
"""
import json
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import server

FIX = os.path.join(os.path.dirname(__file__), "fixtures", "video.json")


class TestParser(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with open(FIX, encoding="utf-8") as f:
            cls.item = json.load(f)["itemStruct"]

    def test_find_item_struct(self):
        scope = {"webapp.video-detail": {"itemInfo": {"itemStruct": self.item}}}
        self.assertIs(server._find_item_struct(scope)["id"], self.item["id"])

    def test_normalize_identitas(self):
        v = server._normalize(self.item)
        self.assertEqual(v["username"], "tiktok")
        self.assertEqual(v["nickname"], "TikTok")
        self.assertEqual(v["videoId"], "7692114317151423775")
        self.assertTrue(v["verified"])
        self.assertEqual(v["createTime"], 1790959957)

    def test_normalize_stats_nyata(self):
        st = server._normalize(self.item)["stats"]
        for k in ("views", "likes", "comments", "shares"):
            self.assertIsInstance(st[k], int, k)
            self.assertGreater(st[k], 0, k)

    def test_normalize_tech_nyata(self):
        t = server._normalize(self.item)["tech"]
        self.assertEqual((t["width"], t["height"]), (720, 1280))
        self.assertEqual(t["format"], "mp4")
        g0 = t["gears"][0]
        self.assertEqual(g0["fps"], 24)
        self.assertEqual(g0["codec"], "h264")
        self.assertGreater(g0["sizeBytes"], 0)
        self.assertTrue(g0["playUrl"].startswith("https://"))

    def test_tidak_ada_tebakan(self):
        """Semua nilai harus dari fixture; tidak boleh ada random/estimasi."""
        v = server._normalize(self.item)
        blob = json.dumps(v)
        self.assertNotIn("unknown", blob.lower())
        # collectCount berupa string di sumber -> tetap jadi int, bukan 0 default buta
        self.assertIsInstance(v["stats"]["collects"], int)

    def test_video_re(self):
        m = server.VIDEO_RE.search(
            "https://www.tiktok.com/@some.user_1/video/1234567890123456789?x=1")
        self.assertEqual((m.group(1), m.group(2)),
                         ("some.user_1", "1234567890123456789"))

    def test_to_int_aman(self):
        self.assertIsNone(server._to_int(None))
        self.assertIsNone(server._to_int("abc"))
        self.assertEqual(server._to_int("1,234"), 1234)


if __name__ == "__main__":
    unittest.main(verbosity=2)
