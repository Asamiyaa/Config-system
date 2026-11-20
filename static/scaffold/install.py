#!/usr/bin/env python3
"""Safe, standard-library-only Codex creative frontend scaffold installer."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
TEMPLATE = HERE / "template"
OLD_HASHES_PATH = HERE / "previous_template_hashes_v1.0.json"
OLD_HASHES = json.loads(OLD_HASHES_PATH.read_text(encoding="utf-8"))
V12_HASHES_PATH = HERE / "previous_template_hashes_v1.2.json"
V12_HASHES = json.loads(V12_HASHES_PATH.read_text(encoding="utf-8"))
V20_HASHES = json.loads((HERE / "previous_template_hashes_v2.0.json").read_text(encoding="utf-8"))

def pristine_predecessor(file: Path, key: str | None) -> bool:
    if not key or not file.is_file():
        return False
    digest = hashlib.sha256(file.read_bytes()).hexdigest()
    return digest in {mapping.get(key) for mapping in (OLD_HASHES, V12_HASHES, V20_HASHES)}
IGNORE = {"node_modules", ".git", ".venv", "venv", "build", "dist", "target", "coverage", ".next", "__pycache__"}
AGENT_MARKER_START = "<!-- creative-frontend-starter:start -->"
AGENT_MARKER_END = "<!-- creative-frontend-starter:end -->"


def inspect_project(root: Path) -> dict:
    """Detect common UI stacks even if a Java/Python backend owns the root."""
    evidence: list[str] = []
    frameworks: set[str] = set()
    frontend_roots: list[str] = []
    candidates: list[Path] = [root]
    for directory in ("frontend", "client", "web", "ui", "app", "src/frontend", "src/main/frontend", "apps", "packages"):
        candidate = root / directory
        if candidate.is_dir():
            candidates.append(candidate)
            if directory in {"apps", "packages"}:
                candidates += [p for p in candidate.iterdir() if p.is_dir() and p.name not in IGNORE][:30]
    seen = set()
    for base in candidates:
        if base in seen:
            continue
        seen.add(base)
        rel = "." if base == root else base.relative_to(root).as_posix()
        pkg = base / "package.json"
        if pkg.exists():
            try:
                obj = json.loads(pkg.read_text(encoding="utf-8"))
                all_deps = {**obj.get("dependencies", {}), **obj.get("devDependencies", {})}
                lookup = {"next": "Next.js", "nuxt": "Nuxt", "react": "React", "vue": "Vue", "svelte": "Svelte", "@angular/core": "Angular", "vite": "Vite", "three": "Three.js", "@react-three/fiber": "React Three Fiber", "gsap": "GSAP", "motion": "Motion", "framer-motion": "Framer Motion", "playwright": "Playwright", "@playwright/test": "Playwright"}
                found = [v for k, v in lookup.items() if k in all_deps]
                frameworks.update(found)
                frontend_roots.append(rel)
                evidence.append(f"{rel}/package.json → {', '.join(found) if found else 'Node.js/package scripts'}")
            except (UnicodeError, ValueError, OSError, TypeError) as exc:
                evidence.append(f"{rel}/package.json 读取失败: {exc}")
        if (base / "vite.config.ts").exists() or (base / "vite.config.js").exists():
            frameworks.add("Vite")
        if (base / "angular.json").exists():
            frameworks.add("Angular")
    for name, framework in [("pom.xml", "Java/Maven"), ("build.gradle", "Java/Gradle"), ("build.gradle.kts", "Java/Gradle"), ("pyproject.toml", "Python"), ("requirements.txt", "Python")]:
        if (root / name).exists():
            frameworks.add(framework)
            evidence.append(f"{name} detected")
    if (root / "manage.py").exists():
        frameworks.add("Django")
    static = root / "src/main/resources/static"
    if static.is_dir():
        evidence.append("Spring static assets detected at src/main/resources/static")
        if not frontend_roots:
            frontend_roots.append("src/main/resources/static")
    if not frameworks:
        evidence.append("No known manifest at root/common frontend locations; do not assume a framework")
    return {"frameworks": sorted(frameworks), "frontend_roots": sorted(set(frontend_roots)), "evidence": evidence}


def choose_profile(requested: str, target: Path, detection: dict) -> str:
    if requested != "auto":
        return requested
    clues = target.name.lower()
    if any(k in clues for k in ("stock", "trade", "wealth", "finance", "quant", "dashboard", "market")):
        return "data"
    if any(k in clues for k in ("3d", "spatial", "cinematic", "architect", "floorplan", "scene")) or "Three.js" in detection["frameworks"]:
        return "cinematic"
    return "editorial"


def copy_safe(src: Path, dest: Path, dry_run: bool, logs: list[str],
              upgrade_managed: bool = False, old_key: str | None = None) -> None:
    if dest.exists():
        # Only opt-in upgrade pristine v1.0/v1.2/v2.0 rules. Never clobber user's edits.
        if upgrade_managed and pristine_predecessor(dest, old_key):
            logs.append(f"UPGRADE      {dest} (unmodified predecessor rule)")
            if not dry_run:
                shutil.copy2(src, dest)
            return
        logs.append(f"SKIP (exists / possibly customized) {dest}")
        return
    logs.append(f"ADD          {dest}")
    if dry_run:
        return
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dest)


def write_safe(dest: Path, content: str, dry_run: bool, logs: list[str]) -> None:
    if dest.exists():
        logs.append(f"SKIP (exists) {dest}")
        return
    logs.append(f"ADD          {dest}")
    if dry_run:
        return
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(content, encoding="utf-8")


def legacy_agent_block() -> str:
    """Exact v1.0 appended region, used to avoid overwriting customized blocks."""
    return (AGENT_MARKER_START + "\n"
            "## Creative Frontend design and motion rules\n"
            "For all frontend/UI tasks, read `.agents/PROJECT_ADAPTATION.md` and "
            "`.agents/design/DESIGN_SYSTEM.md`, `MOTION_SPEC.md`, "
            "`INTERACTION_BLUEPRINT.md`, `TECH_PLAYBOOK.md`, `VISUAL_QA.md`. "
            "Use `.agents/prompts/` for task prompts and "
            "`.agents/design/SCENARIO_PROMPT_SCHEMA.md` and applicable `.agents/scenarios/` "
            "provide detailed reusable execution contracts. Use "
            "`.agents/checklists/RELEASE_CHECKLIST.md` for verification. "
            "Preserve existing features, APIs and data authenticity; browser-test changes.\n"
            + AGENT_MARKER_END)


def v12_agent_block() -> str:
    return (AGENT_MARKER_START + "\n"
            "## Creative Frontend v1.2 — UI + UX + Motion + Scenarios\n"
            "For every frontend/UI change, read `.agents/PROJECT_ADAPTATION.md`, "
            "`.agents/design/UX_FOUNDATIONS.md`, `DESIGN_SYSTEM.md`, `MOTION_SPEC.md`, "
            "`INTERACTION_BLUEPRINT.md`, `TECH_PLAYBOOK.md` and `VISUAL_QA.md`. "
            "Do not pile features on the homepage, overload information, or mix UI styles. "
            "Core tasks should usually be discoverable in 2–3 actions with meaningful feedback. "
            "Animate only explicit user interaction; preserve shared-element continuity, physical easing, "
            "parent-before-child timing, symmetric reverse path/duration/easing and precise micro feedback. "
            "Use `.agents/prompts/` for task prompts, "
            + "`.agents/design/SCENARIO_PROMPT_SCHEMA.md` and applicable `.agents/scenarios/` "
            "provide detailed reusable execution contracts. Use "
            "`.agents/checklists/RELEASE_CHECKLIST.md` for verification. "
            "Preserve existing features, APIs and real data. Test in a browser and report evidence.\n"
            + AGENT_MARKER_END)


def v20_agent_block() -> str:
    return (AGENT_MARKER_START + "\n"
            "## Creative Frontend v2.0 — Full Interaction Recipes\n"
            "Before every frontend task, read `.agents/PROJECT_ADAPTATION.md`, "
            "`.agents/design/UX_FOUNDATIONS.md`, `DESIGN_SYSTEM.md`, `MOTION_SPEC.md`, "
            "`INTERACTION_BLUEPRINT.md`, `TECH_PLAYBOOK.md`, `SCENARIO_PROMPT_SCHEMA.md` and `VISUAL_QA.md`. "
            "**Select** the primary detailed contract with `python tools/pick_scenario.py \"需求\"` "
            "or `.agents/scenarios/INDEX.md`, then read its full Markdown; use up to two compatible aids. "
            "Preserve data/auth/API/routes. No UI pile-up, unsolicited motion, fake progress, "
            "layout-jumping or double animation; use continuity, restrained easing, "
            "layered timing, precise feedback and symmetric reversible progress. "
            "Test forward, reverse, interruption, keyboard/touch, reduced-motion "
            "and mobile in an actual browser; disclose untested parts.\n"
            + AGENT_MARKER_END)


def new_agent_block() -> str:
    return (AGENT_MARKER_START + "\n"
            "## Creative Frontend v3 — AI Learn Studio + Codex Skills\n"
            "For frontend or visual tasks use `$creative-frontend-director`; "
            "for precise interactions use `$interaction-recipe-executor`; "
            "for knowledge collection and reusable skill authoring use `$ailearn-knowledge-curator`. "
            "Read `.agents/design/UX_FOUNDATIONS.md`, `DESIGN_SYSTEM.md`, `MOTION_SPEC.md`, "
            "`AI_LEARN_KNOWLEDGE_ARCHITECTURE.md`, `VISUAL_QA.md`, and the relevant scenario. "
            "Use `python tools/pick_scenario.py \"需求\"` to select contracts; "
            "the interactive knowledge catalog is in `ai-learn-studio/index.html` when installed. "
            "Treat the user-provided `aiLearn.rar` as reference material, keep its 5-field screenshot analysis honest, "
            "do not invent interaction from still images, preserve product functionality and real data, "
            "and only mark demos/QA as verified when tested.\n"
            + AGENT_MARKER_END)


def install_agents(root: Path, dry_run: bool, logs: list[str], no_agent_append: bool, upgrade_managed: bool = False) -> None:
    agent_file = root / "AGENTS.md"
    if not agent_file.exists():
        copy_safe(TEMPLATE / "AGENTS.md", agent_file, dry_run, logs)
        return
    original = agent_file.read_text(encoding="utf-8")
    if upgrade_managed and pristine_predecessor(agent_file, "AGENTS.md"):
        copy_safe(TEMPLATE / "AGENTS.md", agent_file, dry_run, logs, True, "AGENTS.md")
        return
    if AGENT_MARKER_START in original:
        if upgrade_managed and not no_agent_append and AGENT_MARKER_END in original:
            start = original.index(AGENT_MARKER_START)
            end = original.index(AGENT_MARKER_END, start) + len(AGENT_MARKER_END)
            current = original[start:end]
            if current in (legacy_agent_block(), v12_agent_block(), v20_agent_block()):
                logs.append(f"UPGRADE      {agent_file} (pristine predecessor appended block only)")
                if not dry_run:
                    agent_file.write_text(original[:start] + new_agent_block() + original[end:], encoding="utf-8")
                return
        logs.append(f"SKIP (already integrated or customized) {agent_file}")
        return
    if no_agent_append:
        logs.append(f"SKIP (--no-agent-append) {agent_file}")
        return
    snippet = "\n\n" + new_agent_block() + "\n"
    logs.append(f"APPEND       {agent_file} (existing content preserved)")
    if not dry_run:
        agent_file.write_text(original.rstrip("\n") + snippet, encoding="utf-8")


def install(target: Path, mode: str = "auto", profile: str = "auto", dry_run: bool = False,
            scaffold_demo: bool = False, no_agent_append: bool = False, upgrade_managed: bool = False, with_learning_site: bool = False) -> dict:
    target = target.expanduser().resolve()
    if mode == "existing" and not target.is_dir():
        raise ValueError(f"Existing project not found: {target}")
    if target.exists() and not target.is_dir():
        raise ValueError(f"Target must be a folder: {target}")
    resolved_mode = "existing" if target.is_dir() else "new"
    if mode == "new" and target.exists() and any(target.iterdir()):
        raise ValueError("--mode new requires a missing or empty target directory")
    detection = inspect_project(target) if target.is_dir() else {"frameworks": [], "frontend_roots": [], "evidence": ["New project; no existing frontend inspected"]}
    selected_profile = choose_profile(profile, target, detection)
    logs: list[str] = []
    if not target.exists():
        logs.append(f"MKDIR        {target}")
        if not dry_run:
            target.mkdir(parents=True)
    for file in sorted(TEMPLATE.rglob("*")):
        if file.is_file() and file.name != "AGENTS.md":
            copy_safe(file, target / file.relative_to(TEMPLATE), dry_run, logs, upgrade_managed, file.relative_to(TEMPLATE).as_posix())
    install_agents(target, dry_run, logs, no_agent_append, upgrade_managed)
    if scaffold_demo:
        for file in sorted((HERE / "demo").rglob("*")):
            if file.is_file():
                copy_safe(file, target / "creative-demo" / file.relative_to(HERE / "demo"), dry_run, logs)
    if with_learning_site:
        for file in sorted((HERE / "learn-studio").rglob("*")):
            if file.is_file():
                copy_safe(file, target / "ai-learn-studio" / file.relative_to(HERE / "learn-studio"), dry_run, logs)
    
    config = {
        "$schema_note": "Local scaffold configuration, not an official Codex schema",
        "template_version": "3.0.0",
        "profile": selected_profile,
        "installation_mode": resolved_mode,
        "frameworks_detected": detection["frameworks"],
        "frontend_roots_detected": detection["frontend_roots"],
        "visual_qa": {"desktop": {"width": 1440, "height": 900}, "mobile": {"width": 390, "height": 844}, "reduced_motion": True},
    }
    write_safe(target / "creative.config.json", json.dumps(config, ensure_ascii=False, indent=2) + "\n", dry_run, logs)
    adaptation = (
        "# Project Adaptation — auto-generated at install time\n\n"
        f"- Mode: **{resolved_mode}**\n- Selected design profile: **{selected_profile}**\n"
        f"- Detected frameworks: **{', '.join(detection['frameworks']) or 'unknown / not detected'}**\n"
        f"- Possible frontend roots: **{', '.join(detection['frontend_roots']) or 'not detected'}**\n\n"
        "## Detection evidence\n" + "\n".join("- " + x for x in detection["evidence"]) + "\n\n"
        "## Integration safety\n"
        "- Framework detection is heuristic: **verify actual source and package scripts before editing**.\n"
        "- Do not automatically replace existing UI library, routing, data or service logic.\n"
        "- Check this project's scripts/ports/entrypoints; no assumed dev server is provisioned.\n"
        "- To customize visual direction, start with `.agents/design/DESIGN_SYSTEM.md`.\n"
        "- Existing customized files are skipped by the installer; never assume a skipped file was updated.\n"
        "- Choose relevant interactions with `python tools/pick_scenario.py \"需求\"`; see `.agents/scenarios/INDEX.md`.\n"
    )
    write_safe(target / ".agents/PROJECT_ADAPTATION.md", adaptation, dry_run, logs)
    return {"target": str(target), "mode": resolved_mode, "profile": selected_profile,
            "detection": detection, "logs": logs, "dry_run": dry_run}


def main() -> int:
    ap = argparse.ArgumentParser(description="Install safe Codex creative frontend rules into new or existing project")
    ap.add_argument("--target", type=Path, required=True, help="Target project folder")
    ap.add_argument("--mode", choices=["auto", "new", "existing"], default="auto")
    ap.add_argument("--profile", choices=["auto", "editorial", "data", "cinematic"], default="auto")
    ap.add_argument("--dry-run", action="store_true", help="Preview filesystem operations only")
    ap.add_argument("--scaffold-demo", action="store_true", help="Copy standalone demo to target/creative-demo")
    ap.add_argument("--no-agent-append", action="store_true", help="Do not append to an existing AGENTS.md")
    ap.add_argument("--upgrade-managed", action="store_true", help="Upgrade only byte-identical previous template rules; preserve customized files")
    ap.add_argument("--with-learning-site", action="store_true", help="Install searchable knowledge website into target/ai-learn-studio")
    args = ap.parse_args()
    try:
        result = install(args.target, args.mode, args.profile, args.dry_run, args.scaffold_demo, args.no_agent_append, args.upgrade_managed, args.with_learning_site)
    except (OSError, ValueError) as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return 2
    print(f"\nCreative Frontend Starter | mode={result['mode']} profile={result['profile']}")
    print("Detected:", ", ".join(result["detection"]["frameworks"]) or "none")
    print("\n".join(result["logs"]))
    print("\nNext: open the target with Codex, read AGENTS.md and run prompt 01_DESIGN_BRIEF.md")
    if args.scaffold_demo:
        print("Demo: open creative-demo/studio.html (or serve the folder over localhost)")
    if args.with_learning_site:
        print("Knowledge site: open ai-learn-studio/index.html (offline supported)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
