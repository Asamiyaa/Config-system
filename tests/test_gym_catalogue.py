"""openGym 动作库原生接入的单元测试。

这些测试不启动 FastAPI，也不需要 Node 或 openGym 服务：
直接验证 catalogue 索引、检索、媒体路径与周计划生成逻辑。
"""

from __future__ import annotations

import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import gym_catalogue


def _write_exercise(root: Path, exercise_id: str, **overrides) -> None:
    payload = {
        "id": exercise_id,
        "name": overrides.pop("name", f"exercise {exercise_id}"),
        "bodyPart": overrides.pop("bodyPart", "chest"),
        "equipment": overrides.pop("equipment", "barbell"),
        "target": overrides.pop("target", "pectorals"),
        "secondaryMuscles": overrides.pop("secondaryMuscles", ["triceps"]),
        "category": overrides.pop("category", "strength"),
        "description": overrides.pop("description", "Test description"),
        "instructions": overrides.pop("instructions", ["Step one", "Step two"]),
        **overrides,
    }
    (root / "exercises" / f"{exercise_id}.json").write_text(
        json.dumps(payload, ensure_ascii=False), encoding="utf-8"
    )


def _make_catalogue(root: Path) -> Path:
    (root / "exercises").mkdir(parents=True)
    (root / "i18n").mkdir()
    (root / "media" / "still").mkdir(parents=True)
    (root / "media" / "clip").mkdir()
    _write_exercise(root, "0001", name="barbell bench press", bodyPart="chest", target="pectorals")
    _write_exercise(root, "0002", name="dumbbell curl", bodyPart="upper arms", equipment="dumbbell", target="biceps")
    _write_exercise(root, "0003", name="bodyweight squat", bodyPart="upper legs", equipment="body weight", target="quads")
    _write_exercise(root, "0004", name="treadmill run", bodyPart="cardio", equipment="leverage machine", target="cardiovascular system", category="cardio")
    _write_exercise(root, "0005", name="dumbbell row", bodyPart="back", equipment="dumbbell", target="upper back")
    # 变体条目只有 variantOf，没有名称，不应进入检索列表。
    (root / "exercises" / "0006.json").write_text(json.dumps({"id": "0006", "variantOf": "0001"}), encoding="utf-8")
    (root / "media" / "still" / "0001.webp").write_bytes(b"RIFF0000WEBP")
    (root / "media" / "clip" / "0001.mp4").write_bytes(b"\x00\x00\x00\x20ftyp")
    translations = {
        "0001": {"name": "杠铃卧推", "description": "胸部基础动作。", "instructions": ["躺下", "推起"]},
        "0002": {"name": "哑铃弯举"},
    }
    (root / "i18n" / "zh.json").write_text(json.dumps(translations, ensure_ascii=False), encoding="utf-8")
    return root


class GymCatalogueUnitTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.root = _make_catalogue(Path(self.tmp.name) / "openGym" / "catalogue")
        self.cat = gym_catalogue.OpenGymCatalogue(self.root)

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def test_index_skips_variants_and_translates(self) -> None:
        self.assertEqual(len(self.cat.items), 5)
        self.assertEqual(self.cat.variants, 1)
        self.assertEqual(self.cat.translated, 2)
        self.assertEqual(self.cat.by_id["0001"]["name"], "杠铃卧推")
        self.assertEqual(self.cat.by_id["0001"]["zone"], "胸部")
        self.assertEqual(self.cat.by_id["0002"]["name"], "哑铃弯举")
        self.assertEqual(self.cat.by_id["0003"]["name"], "Bodyweight squat")

    def test_search_exact_name_first_and_filters(self) -> None:
        result = self.cat.search(q="卧推")
        self.assertEqual(result["items"][0]["name"], "杠铃卧推")
        self.assertEqual(result["total"], 1)

        result = self.cat.search(q="squat")
        self.assertEqual(result["items"][0]["id"], "0003")

        result = self.cat.search(equipment="dumbbell")
        self.assertEqual({x["id"] for x in result["items"]}, {"0002", "0005"})

        result = self.cat.search(body_part="upper arms")
        self.assertEqual([x["id"] for x in result["items"]], ["0002"])

        result = self.cat.search(category="cardio")
        self.assertEqual([x["id"] for x in result["items"]], ["0004"])

        result = self.cat.search(zone="上肢")
        self.assertEqual({x["id"] for x in result["items"]}, {"0002", "0005"})

    def test_search_ids_and_pagination(self) -> None:
        result = self.cat.search(ids="0001,0003,9999")
        self.assertEqual({x["id"] for x in result["items"]}, {"0001", "0003"})
        page = self.cat.search(limit=2, offset=1)
        self.assertEqual(len(page["items"]), 2)
        self.assertEqual(page["total"], 5)

    def test_detail_includes_steps_and_translation_flags(self) -> None:
        detail = self.cat.detail("0001")
        self.assertIsNotNone(detail)
        self.assertEqual(detail["instructions"], ["躺下", "推起"])
        self.assertTrue(detail["instructionsTranslated"])
        self.assertTrue(detail["descriptionTranslated"])
        self.assertEqual(detail["media"]["clip"], "/api/gym/media/0001/clip")

        detail2 = self.cat.detail("0002")
        self.assertFalse(detail2["instructionsTranslated"])
        self.assertEqual(detail2["instructions"], ["Step one", "Step two"])
        self.assertIsNone(self.cat.detail("9999"))

    def test_media_paths_and_traversal(self) -> None:
        found = self.cat.media("0001", "still")
        self.assertIsNotNone(found)
        self.assertEqual(found[0].suffix, ".webp")
        self.assertEqual(found[1], "image/webp")
        self.assertIsNotNone(self.cat.media("0001", "clip"))
        self.assertIsNone(self.cat.media("0001", "exe"))
        self.assertIsNone(self.cat.media("../0001", "still"))
        self.assertIsNone(self.cat.media("0002", "still"))
        self.assertIsNone(self.cat.media("0001", "../../server.py"))

    def test_facets(self) -> None:
        facets = self.cat.facets()
        self.assertEqual(facets["total"], 5)
        self.assertEqual(len(facets["bodyParts"]), 5)
        self.assertTrue(any(x["value"] == "dumbbell" and x["count"] == 2 for x in facets["equipment"]))
        self.assertEqual(sum(x["count"] for x in facets["categories"]), 5)

    def test_plan_generation(self) -> None:
        plan, meta = self.cat.generate_plan(
            goal="strength",
            days_per_week=3,
            equipment=["barbell", "dumbbell", "body weight"],
            session_minutes=60,
        )
        self.assertEqual(len(plan), 3)
        self.assertEqual(meta["goal"], "strength")
        self.assertEqual(meta["daysPerWeek"], 3)
        self.assertEqual(meta["repRange"], "3–5")
        self.assertEqual(set(plan), {"1", "3", "5"})
        self.assertFalse(meta["equipmentRelaxed"])
        exercises = [e for day in plan.values() for e in day["exercises"]]
        self.assertTrue(exercises)
        self.assertTrue(all(e["exerciseId"] for e in exercises))
        self.assertTrue(all(e["equipment"] in {"barbell", "dumbbell", "body weight"} for e in exercises))
        for day in plan.values():
            ids = [e["exerciseId"] for e in day["exercises"]]
            self.assertEqual(len(ids), len(set(ids)), "单日计划不应重复动作")
            self.assertGreaterEqual(len(ids), 1)
        self.assertEqual(len(meta["restDays"]), 4)

    def test_plan_days_and_mobility_goal(self) -> None:
        plan, meta = self.cat.generate_plan(goal="mobility", days_per_week=2, session_minutes=40)
        self.assertEqual(set(plan), {"1", "4"})
        self.assertEqual(meta["goalLabel"], "灵活性")
        self.assertEqual(meta["repRange"], "30–45 秒")

    def test_plan_unknown_goal_falls_back(self) -> None:
        plan, meta = self.cat.generate_plan(goal="not-a-goal", days_per_week=1)
        self.assertEqual(meta["goal"], "hypertrophy")
        self.assertEqual(set(plan), {"3"})

    def test_status(self) -> None:
        status = self.cat.status()
        self.assertTrue(status["available"])
        self.assertEqual(status["total"], 5)
        self.assertEqual(status["media"]["still"], 1)
        self.assertEqual(status["media"]["clip"], 1)


class GymCatalogueDiscoveryTests(unittest.TestCase):
    def test_env_override_points_to_open_gym_root(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = _make_catalogue(Path(tmp) / "openGym" / "catalogue")
            with patch.dict(os.environ, {"OPEN_GYM_DIR": str(root.parent)}, clear=False):
                gym_catalogue.reset_cache()
                try:
                    found = gym_catalogue.find_catalogue_dir()
                    self.assertEqual(found, root)
                    cat = gym_catalogue.get_catalogue(force=True)
                    self.assertIsNotNone(cat)
                    self.assertEqual(cat.status()["total"], 5)
                finally:
                    gym_catalogue.reset_cache()

    def test_missing_directory_is_reported_not_raised(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            with patch.dict(os.environ, {"OPEN_GYM_DIR": str(Path(tmp) / "missing")}, clear=False):
                gym_catalogue.reset_cache()
                try:
                    self.assertIsNone(gym_catalogue.get_catalogue(force=True))
                    status = gym_catalogue.unavailable_status()
                    self.assertFalse(status["available"])
                    self.assertTrue(status["searched"])
                    self.assertIn("OPEN_GYM_DIR", status["hint"])
                finally:
                    gym_catalogue.reset_cache()


class RealCatalogueSmokeTest(unittest.TestCase):
    """如果本机存在真实 openGym catalogue，做一次只读冒烟检查。"""

    @classmethod
    def setUpClass(cls) -> None:
        gym_catalogue.reset_cache()
        cls.cat = gym_catalogue.get_catalogue(force=True)
        if cls.cat is None:
            raise unittest.SkipTest("本机没有 openGym catalogue")

    @classmethod
    def tearDownClass(cls) -> None:
        gym_catalogue.reset_cache()

    def test_real_catalogue_has_media_and_chinese(self) -> None:
        status = self.cat.status()
        self.assertGreater(status["total"], 5000)
        self.assertGreater(status["translated"], 5000)
        self.assertGreater(status["media"]["clip"], 5000)
        result = self.cat.search(q="深蹲", limit=3)
        self.assertGreater(result["total"], 0)
        self.assertTrue(any("深蹲" in x["name"] for x in result["items"]))
        detail = self.cat.detail(result["items"][0]["id"])
        self.assertTrue(detail["instructions"])
        self.assertIsNotNone(self.cat.media(detail["id"], "clip"))

    def test_real_plan_has_no_week_duplicates(self) -> None:
        plan, meta = self.cat.generate_plan(goal="hypertrophy", days_per_week=3, session_minutes=60)
        ids = [e["exerciseId"] for day in plan.values() for e in day["exercises"]]
        self.assertGreaterEqual(len(ids), 9)
        self.assertEqual(len(ids), len(set(ids)))
        self.assertTrue(all(day["exercises"] for day in plan.values()))
        self.assertEqual(meta["catalogueTotal"], self.cat.status()["total"])


if __name__ == "__main__":
    unittest.main()
