"""openGym 动作库原生接入模块。

目标：不启动 E:\\health\\openGym（不需要 Node / Docker / 额外端口），
由 Wealth OS 自身的 FastAPI 进程直接读取 openGym 的 catalogue 目录：

  catalogue/exercises/<id>.json   动作元数据（英文）
  catalogue/i18n/zh.json          中文名称 / 说明 / 步骤
  catalogue/media/still/<id>.webp 动作静图（仅在原目录读取，不复制、不再分发）
  catalogue/media/clip/<id>.mp4   动作动画（仅在原目录读取，不复制、不再分发）

对外只暴露三类能力：
  1. 动作检索：关键词、身体部位、器械、目标肌群、分类、收藏 id
  2. 动作详情 + 本地媒体流（/api/gym/media/...）
  3. 周训练计划生成（目标 / 每周天数 / 可用器械 / 单次时长）

设计边界：
- 只读 openGym 目录，不修改该目录中的任何文件。
- 媒体按 openGym 的许可约束使用：留在原目录，由本进程按需读取，不打包进本仓库。
- 找不到目录时所有函数返回可解释的“不可用”状态，不影响其余健康管理功能。
"""

from __future__ import annotations

import json
import os
import re
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

BASE = Path(__file__).resolve().parent

EXERCISE_ID_RE = re.compile(r"^\d{4,5}$")

# 身体部位：保留 openGym 原始英文值，同时给出中文标签，并映射到现有健康管理
# 训练记录使用的五个 zone（胸部 / 上肢 / 核心 / 下肢 / 全身），保证旧统计不分裂。
BODY_PARTS: dict[str, tuple[str, str]] = {
    "chest": ("胸部", "胸部"),
    "back": ("背部", "上肢"),
    "shoulders": ("肩部", "上肢"),
    "upper arms": ("上臂", "上肢"),
    "lower arms": ("前臂", "上肢"),
    "neck": ("颈部", "上肢"),
    "waist": ("腰腹", "核心"),
    "upper legs": ("大腿", "下肢"),
    "lower legs": ("小腿", "下肢"),
    "cardio": ("有氧", "全身"),
    "full body": ("全身", "全身"),
}

EQUIPMENT_ZH = {
    "body weight": "自重",
    "band": "弹力带",
    "cable": "绳索/龙门架",
    "leverage machine": "杠杆器械",
    "assisted": "辅助器械",
    "medicine ball": "药球",
    "stability ball": "瑜伽球",
    "barbell": "杠铃",
    "rope": "战绳",
    "dumbbell": "哑铃",
    "ez barbell": "曲杆杠铃",
    "kettlebell": "壶铃",
    "olympic barbell": "奥林匹克杠铃",
    "weighted": "负重",
    "bosu ball": "波速球",
    "sled machine": "雪橇机",
    "smith machine": "史密斯机",
    "wheel roller": "健腹轮",
    "trap bar": "六角杠铃",
    "resistance band": "阻力带",
    "landmine": "地雷管",
    "weight plate": "杠铃片",
    "sandbag": "沙袋",
    "macebell": "锤铃",
    "suspension trainer": "悬挂训练带",
    "roller": "泡沫轴",
    "hammer": "锤",
    "stationary bike": "固定单车",
    "upper body ergometer": "上肢功率车",
    "elliptical machine": "椭圆机",
    "skierg machine": "滑雪机",
    "stepmill machine": "台阶机",
    "tire": "轮胎",
}

TARGET_ZH = {
    "abductors": "外展肌",
    "abs": "腹肌",
    "adductors": "内收肌",
    "biceps": "肱二头肌",
    "calves": "小腿",
    "cardiovascular system": "心肺",
    "delts": "三角肌",
    "forearms": "前臂",
    "glutes": "臀肌",
    "hamstrings": "腘绳肌",
    "lats": "背阔肌",
    "levator scapulae": "肩胛提肌",
    "pectorals": "胸大肌",
    "quads": "股四头肌",
    "serratus anterior": "前锯肌",
    "spine": "竖脊肌",
    "traps": "斜方肌",
    "triceps": "肱三头肌",
    "upper back": "上背",
}

CATEGORY_ZH = {
    "calisthenics": "自重训练",
    "strength": "力量",
    "mobility": "灵活性",
    "olympic": "举重",
    "plyometrics": "爆发力",
    "cardio": "有氧",
    "isometric": "等长训练",
    "yoga": "瑜伽",
    "stretching": "拉伸",
    "pilates": "普拉提",
    "rehab": "康复",
    "combat": "格斗",
}

MEDIA_KINDS = {
    "still": ("still", ".webp", "image/webp"),
    "clip": ("clip", ".mp4", "video/mp4"),
}

WEEKDAY_LABELS = {1: "周一", 2: "周二", 3: "周三", 4: "周四", 5: "周五", 6: "周六", 0: "周日"}

# 每周训练天数 -> [(weekday, focus)]；focus 决定当天从哪些身体部位取动作。
SCHEDULES: dict[int, list[tuple[int, str]]] = {
    1: [(3, "full")],
    2: [(1, "upper"), (4, "lower")],
    3: [(1, "push"), (3, "pull"), (5, "legs")],
    4: [(1, "upper"), (2, "lower"), (4, "upper"), (5, "lower")],
    5: [(1, "push"), (2, "pull"), (3, "legs"), (5, "upper"), (6, "full")],
    6: [(1, "push"), (2, "pull"), (3, "legs"), (4, "push"), (5, "pull"), (6, "legs")],
    7: [(1, "push"), (2, "pull"), (3, "legs"), (4, "upper"), (5, "lower"), (6, "full"), (0, "core_cardio")],
}

FOCUS: dict[str, tuple[str, list[str] | None]] = {
    "full": ("全身", None),
    "upper": ("上肢", ["chest", "back", "shoulders", "upper arms", "lower arms"]),
    "lower": ("下肢", ["upper legs", "lower legs", "waist"]),
    "push": ("推 · 胸肩三头", ["chest", "shoulders", "upper arms"]),
    "pull": ("拉 · 背二头", ["back", "upper arms", "lower arms"]),
    "legs": ("腿 · 臀腿小腿", ["upper legs", "lower legs"]),
    "core_cardio": ("核心与有氧", ["waist", "cardio"]),
}

GOALS: dict[str, dict[str, Any]] = {
    "hypertrophy": {
        "label": "增肌",
        "categories": ["strength", "calisthenics", "isometric"],
        "compound_sets": 4,
        "sets": 3,
        "reps": 10,
        "rep_range": "8–12",
        "rest": 90,
        "step": 2.5,
    },
    "strength": {
        "label": "力量",
        "categories": ["strength", "olympic", "calisthenics"],
        "compound_sets": 5,
        "sets": 3,
        "reps": 5,
        "rep_range": "3–5",
        "rest": 150,
        "step": 5.0,
    },
    "fatloss": {
        "label": "减脂",
        "categories": ["cardio", "calisthenics", "plyometrics", "strength"],
        "compound_sets": 3,
        "sets": 3,
        "reps": 15,
        "rep_range": "12–20",
        "rest": 45,
        "step": 2.5,
    },
    "general": {
        "label": "体能",
        "categories": ["strength", "calisthenics", "cardio", "mobility"],
        "compound_sets": 3,
        "sets": 3,
        "reps": 12,
        "rep_range": "10–15",
        "rest": 60,
        "step": 2.5,
    },
    "mobility": {
        "label": "灵活性",
        "categories": ["mobility", "stretching", "yoga", "rehab"],
        "compound_sets": 2,
        "sets": 2,
        "reps": 10,
        "rep_range": "30–45 秒",
        "rest": 30,
        "step": 0,
    },
}

COMPOUND_EQUIPMENT = {
    "barbell",
    "dumbbell",
    "body weight",
    "cable",
    "kettlebell",
    "smith machine",
    "trap bar",
    "leverage machine",
    "sled machine",
    "suspension trainer",
}
BIG_TARGETS = {"pectorals", "lats", "upper back", "quads", "hamstrings", "glutes", "delts", "abs"}

_cache_lock = threading.Lock()
_cache: "OpenGymCatalogue | None" = None
_cache_checked = False
_cache_error = ""


class CatalogueUnavailable(RuntimeError):
    """openGym 目录不存在或无法读取。"""


def candidate_roots() -> list[Path]:
    """按优先级列出可能包含 catalogue/ 的 openGym 目录。"""
    roots: list[Path] = []
    env = os.getenv("OPEN_GYM_DIR", "").strip().strip('"')
    if env:
        roots.append(Path(env).expanduser())
    roots.extend(
        [
            BASE.parent / "health" / "openGym",
            BASE.parent / "openGym",
            BASE / "integrations" / "openGym",
            BASE / "openGym",
        ]
    )
    seen: set[str] = set()
    unique: list[Path] = []
    for root in roots:
        key = str(root).lower()
        if key in seen:
            continue
        seen.add(key)
        unique.append(root)
    return unique


def find_catalogue_dir() -> Path | None:
    """返回真正的 catalogue 目录（包含 exercises/ 与 i18n/）。

    OPEN_GYM_DIR 一旦显式设置，就只检查它，避免路径写错时悄悄使用别的目录。
    """
    env = os.getenv("OPEN_GYM_DIR", "").strip().strip('"')
    if env:
        roots = [Path(env).expanduser()]
        for root in (roots[0], roots[0] / "catalogue"):
            try:
                if (root / "exercises").is_dir() and (root / "i18n").is_dir():
                    return root
            except OSError:
                continue
        return None
    for candidate in candidate_roots():
        for root in (candidate, candidate / "catalogue"):
            try:
                if (root / "exercises").is_dir() and (root / "i18n").is_dir():
                    return root
            except OSError:
                continue
    return None


def _translate(value: Any, table: dict[str, str], fallback: str = "") -> str:
    text = str(value or "").strip()
    if not text:
        return fallback
    return table.get(text.lower(), text)


def _as_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(x).strip() for x in value if str(x).strip()]
    if isinstance(value, str) and value.strip():
        return [value.strip()]
    return []


class OpenGymCatalogue:
    """openGym catalogue 的只读内存索引。"""

    def __init__(self, root: Path, lang: str = "zh") -> None:
        self.root = Path(root)
        self.lang = lang
        self.items: list[dict[str, Any]] = []
        self.by_id: dict[str, dict[str, Any]] = {}
        self.translated = 0
        self.variants = 0
        self.skipped = 0
        self.still_ids: set[str] = set()
        self.clip_ids: set[str] = set()
        self._build()

    # ---- 构建 ---------------------------------------------------------
    def _build(self) -> None:
        translations: dict[str, Any] = {}
        i18n_path = self.root / "i18n" / f"{self.lang}.json"
        if i18n_path.is_file():
            try:
                loaded = json.loads(i18n_path.read_text(encoding="utf-8"))
                if isinstance(loaded, dict):
                    translations = loaded
            except (OSError, json.JSONDecodeError):
                translations = {}

        self.still_ids = self._media_ids("still")
        self.clip_ids = self._media_ids("clip")

        items: list[dict[str, Any]] = []
        for file in sorted((self.root / "exercises").glob("*.json")):
            try:
                raw = json.loads(file.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                self.skipped += 1
                continue
            if not isinstance(raw, dict):
                self.skipped += 1
                continue

            exercise_id = str(raw.get("id") or file.stem).strip()
            if not EXERCISE_ID_RE.fullmatch(exercise_id):
                self.skipped += 1
                continue
            if raw.get("variantOf"):
                # 变体只借用了另一条动作的动画，本身没有完整名称/步骤；不进入检索列表。
                self.variants += 1
                continue

            name_en = str(raw.get("name") or "").strip()
            name_en_display = name_en[:1].upper() + name_en[1:] if name_en else name_en
            translation = translations.get(exercise_id)
            if not isinstance(translation, dict):
                translation = {}
            name = str(translation.get("name") or name_en_display).strip()
            if not name:
                self.skipped += 1
                continue
            if translation.get("name"):
                self.translated += 1

            body_part = str(raw.get("bodyPart") or "").strip().lower()
            body_zh, zone = BODY_PARTS.get(body_part, (body_part or "全身", "全身"))
            equipment = str(raw.get("equipment") or "").strip().lower()
            target = str(raw.get("target") or "").strip().lower()
            category = str(raw.get("category") or "").strip().lower()

            secondary = _as_list(raw.get("secondaryMuscles"))
            secondary_zh = [_translate(x, TARGET_ZH) for x in secondary]
            instructions_raw = translation.get("instructions")
            instructions = _as_list(instructions_raw) or _as_list(raw.get("instructions"))
            description = str(translation.get("description") or raw.get("description") or "").strip()
            description_zh = bool(str(translation.get("description") or "").strip())
            instructions_zh = bool(_as_list(instructions_raw))

            item: dict[str, Any] = {
                "id": exercise_id,
                "name": name,
                "name_en": name_en_display,
                "body_part": body_part,
                "body_part_zh": body_zh,
                "zone": zone,
                "equipment": equipment,
                "equipment_zh": _translate(equipment, EQUIPMENT_ZH, "未分类器械"),
                "target": target,
                "target_zh": _translate(target, TARGET_ZH, "综合"),
                "category": category,
                "category_zh": _translate(category, CATEGORY_ZH, "综合"),
                "secondary_muscles": secondary,
                "secondary_muscles_zh": secondary_zh,
                "description": description,
                "instructions": instructions,
                "description_translated": description_zh,
                "instructions_translated": instructions_zh,
                "has_still": exercise_id in self.still_ids,
                "has_clip": exercise_id in self.clip_ids,
                "translated": bool(translation.get("name")),
            }
            item["_search"] = " ".join(
                [
                    item["name"],
                    item["name_en"],
                    item["body_part"],
                    item["body_part_zh"],
                    item["equipment"],
                    item["equipment_zh"],
                    item["target"],
                    item["target_zh"],
                    item["category"],
                    item["category_zh"],
                    *item["secondary_muscles"],
                    *item["secondary_muscles_zh"],
                ]
            ).lower()

            items.append(item)
            self.by_id[exercise_id] = item

        items.sort(key=lambda e: (e["zone"], e["name_en"].lower()))
        self.items = items

    def _media_ids(self, kind: str) -> set[str]:
        folder_name, ext, _ = MEDIA_KINDS[kind]
        folder = self.root / "media" / folder_name
        result: set[str] = set()
        if not folder.is_dir():
            return result
        try:
            with os.scandir(folder) as entries:
                for entry in entries:
                    if not entry.is_file():
                        continue
                    stem, suffix = os.path.splitext(entry.name)
                    if suffix.lower() == ext and EXERCISE_ID_RE.fullmatch(stem):
                        result.add(stem)
        except OSError:
            return set()
        return result

    # ---- 序列化 -------------------------------------------------------
    @staticmethod
    def _public_item(item: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": item["id"],
            "name": item["name"],
            "nameEn": item["name_en"],
            "bodyPart": item["body_part"],
            "bodyPartZh": item["body_part_zh"],
            "zone": item["zone"],
            "equipment": item["equipment"],
            "equipmentZh": item["equipment_zh"],
            "target": item["target"],
            "targetZh": item["target_zh"],
            "category": item["category"],
            "categoryZh": item["category_zh"],
            "secondaryMusclesZh": item["secondary_muscles_zh"],
            "hasStill": item["has_still"],
            "hasClip": item["has_clip"],
        }

    def detail(self, exercise_id: str) -> dict[str, Any] | None:
        item = self.by_id.get(str(exercise_id))
        if not item:
            return None
        payload = self._public_item(item)
        payload.update(
            {
                "description": item["description"],
                "instructions": item["instructions"],
                "descriptionTranslated": item["description_translated"],
                "instructionsTranslated": item["instructions_translated"],
                "secondaryMuscles": item["secondary_muscles"],
                "translated": item["translated"],
                "media": {
                    "still": f"/api/gym/media/{item['id']}/still",
                    "clip": f"/api/gym/media/{item['id']}/clip",
                },
            }
        )
        return payload

    # ---- 检索 ---------------------------------------------------------
    @staticmethod
    def _values(raw: str) -> list[str]:
        return [x.strip().lower() for x in str(raw or "").split(",") if x.strip()]

    def search(
        self,
        *,
        q: str = "",
        body_part: str = "",
        equipment: str = "",
        target: str = "",
        category: str = "",
        zone: str = "",
        ids: str = "",
        limit: int = 48,
        offset: int = 0,
    ) -> dict[str, Any]:
        limit = max(1, min(120, int(limit or 48)))
        offset = max(0, int(offset or 0))
        body_parts = self._values(body_part)
        equipments = self._values(equipment)
        targets = self._values(target)
        categories = self._values(category)
        zones = self._values(zone)
        id_filter = [x for x in self._values(ids) if EXERCISE_ID_RE.fullmatch(x)]
        tokens = [t for t in str(q or "").lower().split() if t]

        pool: Iterable[dict[str, Any]] = self.items
        if id_filter:
            id_set = set(id_filter)
            pool = [e for e in pool if e["id"] in id_set]
        else:
            if body_parts:
                pool = [e for e in pool if e["body_part"] in body_parts]
            if equipments:
                pool = [e for e in pool if e["equipment"] in equipments]
            if targets:
                pool = [e for e in pool if e["target"] in targets or e["target_zh"] in targets]
            if categories:
                pool = [e for e in pool if e["category"] in categories]
            if zones:
                pool = [e for e in pool if e["zone"] in zones]

        scored: list[tuple[float, str, dict[str, Any]]] = []
        for item in pool:
            if tokens:
                haystack = item["_search"]
                if not all(token in haystack for token in tokens):
                    continue
                score = 0.0
                name = item["name"].lower()
                name_en = item["name_en"].lower()
                for token in tokens:
                    if name == token or name_en == token:
                        position = 0
                        score -= 3
                    elif name.startswith(token) or name_en.startswith(token):
                        position = 0
                    elif token in name or token in name_en:
                        position = 1
                    elif token in item["target_zh"].lower() or token in item["equipment_zh"].lower():
                        position = 2
                    else:
                        position = 4
                    # 位置权重 + 名称长度：短名称、包含关键词的正式动作名优先于
                    # “硬拉背部(动作检查)”这类同前缀长名称。
                    score += position * 0.8 + min(len(item["name"]), 80) * 0.2
                scored.append((score, item["name_en"].lower(), item))
            else:
                scored.append((0.0, item["name_en"].lower(), item))

        scored.sort(key=lambda row: (row[0], row[1]))
        total = len(scored)
        page = scored[offset : offset + limit]
        return {
            "total": total,
            "offset": offset,
            "limit": limit,
            "items": [self._public_item(row[2]) for row in page],
        }

    def facets(self) -> dict[str, Any]:
        body_counts: dict[str, int] = {}
        equipment_counts: dict[str, int] = {}
        target_counts: dict[str, int] = {}
        category_counts: dict[str, int] = {}
        for item in self.items:
            body_counts[item["body_part"]] = body_counts.get(item["body_part"], 0) + 1
            equipment_counts[item["equipment"]] = equipment_counts.get(item["equipment"], 0) + 1
            target_counts[item["target"]] = target_counts.get(item["target"], 0) + 1
            category_counts[item["category"]] = category_counts.get(item["category"], 0) + 1

        body_parts = [
            {
                "value": raw,
                "label": label,
                "zone": zone,
                "count": body_counts.get(raw, 0),
            }
            for raw, (label, zone) in BODY_PARTS.items()
            if body_counts.get(raw)
        ]
        equipments = [
            {"value": raw, "label": EQUIPMENT_ZH.get(raw, raw), "count": count}
            for raw, count in sorted(equipment_counts.items(), key=lambda kv: (-kv[1], kv[0]))
        ]
        targets = [
            {"value": raw, "label": TARGET_ZH.get(raw, raw), "count": count}
            for raw, count in sorted(target_counts.items(), key=lambda kv: (-kv[1], kv[0]))
        ]
        categories = [
            {"value": raw, "label": CATEGORY_ZH.get(raw, raw), "count": count}
            for raw, count in sorted(category_counts.items(), key=lambda kv: (-kv[1], kv[0]))
        ]
        return {
            "total": len(self.items),
            "bodyParts": body_parts,
            "equipment": equipments,
            "targets": targets,
            "categories": categories,
        }

    # ---- 媒体 ---------------------------------------------------------
    def media(self, exercise_id: str, kind: str) -> tuple[Path, str] | None:
        if not EXERCISE_ID_RE.fullmatch(str(exercise_id or "")):
            return None
        spec = MEDIA_KINDS.get(str(kind or "").lower())
        if not spec:
            return None
        folder_name, ext, mime = spec
        path = self.root / "media" / folder_name / f"{exercise_id}{ext}"
        try:
            resolved = path.resolve()
            media_root = (self.root / "media" / folder_name).resolve()
            if media_root not in resolved.parents:
                return None
            if not resolved.is_file():
                return None
        except OSError:
            return None
        return resolved, mime

    # ---- 状态 ---------------------------------------------------------
    def status(self) -> dict[str, Any]:
        return {
            "available": True,
            "source": "openGym catalogue",
            "directory": str(self.root),
            "lang": self.lang,
            "total": len(self.items),
            "translated": self.translated,
            "variants": self.variants,
            "skipped": self.skipped,
            "media": {
                "still": sum(1 for e in self.items if e["has_still"]),
                "clip": sum(1 for e in self.items if e["has_clip"]),
            },
            "loadedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        }

    # ---- 周计划生成 ---------------------------------------------------
    def _pool(
        self,
        parts: list[str] | None,
        categories: set[str],
        equipment: set[str],
    ) -> list[dict[str, Any]]:
        pool = []
        for item in self.items:
            if parts is not None and item["body_part"] not in parts:
                continue
            if categories and item["category"] not in categories:
                continue
            if equipment and item["equipment"] not in equipment:
                continue
            pool.append(item)

        def rank(item: dict[str, Any]) -> tuple[int, int, int, str]:
            compound_target = item["target"] in BIG_TARGETS
            compound_equipment = item["equipment"] in COMPOUND_EQUIPMENT
            return (
                0 if compound_target else 1,
                0 if compound_equipment else 1,
                len(item["name_en"]),
                item["name_en"].lower(),
            )

        pool.sort(key=rank)
        return pool

    @staticmethod
    def _pick(pool: list[dict[str, Any]], count: int, offset: int) -> list[dict[str, Any]]:
        """在高质量候选中轮转，并尽量让可用器械都出现，避免一套计划全是自重。"""
        if not pool or count <= 0:
            return []
        window = pool[:120] if len(pool) > 120 else pool
        groups: dict[str, list[dict[str, Any]]] = {}
        for item in window:
            groups.setdefault(item["equipment"], []).append(item)
        keys = sorted(groups)
        if keys:
            shift = offset % len(keys)
            keys = keys[shift:] + keys[:shift]
        picked: list[dict[str, Any]] = []
        while len(picked) < count:
            progressed = False
            for key in keys:
                bucket = groups[key]
                if bucket:
                    picked.append(bucket.pop(0))
                    progressed = True
                if len(picked) >= count:
                    break
            if not progressed:
                break
        return picked

    def generate_plan(
        self,
        *,
        goal: str = "hypertrophy",
        days_per_week: int = 3,
        equipment: list[str] | None = None,
        session_minutes: int = 60,
    ) -> tuple[dict[str, Any], dict[str, Any]]:
        goal_key = goal if goal in GOALS else "hypertrophy"
        config = GOALS[goal_key]
        days = max(1, min(7, int(days_per_week or 3)))
        minutes = max(20, min(150, int(session_minutes or 60)))
        equipment_set = {
            str(x).strip().lower()
            for x in (equipment or [])
            if str(x).strip().lower() in EQUIPMENT_ZH
        }
        categories = set(config["categories"])
        per_day = max(3, min(6, round(minutes / 12)))
        schedule = SCHEDULES[days]

        plan: dict[str, Any] = {}
        used: set[str] = set()
        relaxed_any = False
        for index, (weekday, focus_key) in enumerate(schedule):
            focus_label, parts = FOCUS[focus_key]
            pool = self._pool(parts, categories, equipment_set)
            if len(pool) < per_day:
                # 器械过滤过严时退回全部器械，避免生成空计划。
                relaxed = self._pool(parts, categories, set())
                if len(relaxed) > len(pool):
                    relaxed_any = True
                pool = relaxed if relaxed else pool
            fresh = [e for e in pool if e["id"] not in used]
            if len(fresh) < per_day:
                fresh = pool

            compound = [e for e in fresh if e["target"] in BIG_TARGETS and e["equipment"] in COMPOUND_EQUIPMENT]
            accessory = [e for e in fresh if e not in compound]
            compound_count = min(len(compound), max(1, per_day // 2 + 1))
            chosen = self._pick(compound, compound_count, index * 7)
            chosen += self._pick(
                [e for e in accessory if e not in chosen],
                per_day - len(chosen),
                index * 5 + 2,
            )
            if len(chosen) < min(3, len(pool)):
                chosen += self._pick(
                    [e for e in fresh if e not in chosen],
                    min(3, len(pool)) - len(chosen),
                    index * 3 + 1,
                )

            exercises: list[dict[str, Any]] = []
            for offset, item in enumerate(chosen):
                is_compound = item["target"] in BIG_TARGETS and item["equipment"] in COMPOUND_EQUIPMENT
                exercises.append(
                    {
                        "exerciseId": item["id"],
                        "name": item["name"],
                        "nameEn": item["name_en"],
                        "zone": item["zone"],
                        "bodyPart": item["body_part"],
                        "bodyPartZh": item["body_part_zh"],
                        "equipment": item["equipment"],
                        "equipmentZh": item["equipment_zh"],
                        "target": item["target"],
                        "targetZh": item["target_zh"],
                        "category": item["category"],
                        "targetSets": config["compound_sets"] if is_compound else config["sets"],
                        "targetReps": config["reps"],
                        "restSeconds": config["rest"],
                        "loadStep": config["step"],
                        "order": offset + 1,
                    }
                )
                used.add(item["id"])

            plan[str(weekday)] = {
                "weekday": weekday,
                "label": WEEKDAY_LABELS[weekday],
                "name": f"{WEEKDAY_LABELS[weekday]} · {focus_label}",
                "focus": focus_key,
                "focusLabel": focus_label,
                "exerciseCount": len(exercises),
                "exercises": exercises,
            }

        rest_days = [WEEKDAY_LABELS[d] for d in (1, 2, 3, 4, 5, 6, 0) if str(d) not in plan]
        meta = {
            "goal": goal_key,
            "goalLabel": config["label"],
            "daysPerWeek": days,
            "sessionMinutes": minutes,
            "repRange": config["rep_range"],
            "restSeconds": config["rest"],
            "equipment": sorted(equipment_set),
            "equipmentRelaxed": relaxed_any,
            "restDays": rest_days,
            "catalogueTotal": len(self.items),
            "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        }
        return plan, meta


# ---- 模块级缓存 -------------------------------------------------------
def get_catalogue(force: bool = False) -> OpenGymCatalogue | None:
    """返回进程内共享的动作库索引；目录不存在时返回 None。"""
    global _cache, _cache_checked, _cache_error
    with _cache_lock:
        if _cache is not None and not force:
            return _cache
        if _cache_checked and not force:
            return None
        root = find_catalogue_dir()
        if root is None:
            _cache = None
            _cache_checked = True
            _cache_error = "未找到 openGym catalogue 目录"
            return None
        try:
            _cache = OpenGymCatalogue(root)
            _cache_checked = True
            _cache_error = ""
            return _cache
        except Exception as exc:  # 目录结构异常不应让整个服务不可用
            _cache = None
            _cache_checked = True
            _cache_error = f"{type(exc).__name__}: {exc}"
            return None


def unavailable_status() -> dict[str, Any]:
    """catalogue 不可用时的可解释状态。"""
    return {
        "available": False,
        "source": "openGym catalogue",
        "reason": _cache_error or "未找到 openGym catalogue 目录",
        "hint": "将 OPEN_GYM_DIR 指向 openGym 根目录（包含 catalogue/exercises）即可启用；"
        "默认会自动查找与本项目同级的 health/openGym。",
        "searched": [str(p) for p in candidate_roots()],
    }


def reset_cache() -> None:
    """测试或手动刷新时清空缓存。"""
    global _cache, _cache_checked, _cache_error
    with _cache_lock:
        _cache = None
        _cache_checked = False
        _cache_error = ""
