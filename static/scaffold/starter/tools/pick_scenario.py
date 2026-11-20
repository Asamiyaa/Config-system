#!/usr/bin/env python3
"""Find precise interaction recipes in an installed Creative Frontend Starter project.

Only Python stdlib. No network, no project changes unless --output is given.
"""
from __future__ import annotations
import argparse
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
CATALOG = HERE.parent / '.agents' / 'scenarios' / 'catalog.json'
ALIASES = {
    'morph': ['13', '01', '04'], '弹窗': ['13', '15', '14'], '按钮生长': ['13'],
    '共享元素': ['01', '13'], '列表详情': ['01', '07'], '页面切换': ['01', '04'],
    '导航收缩': ['02'], '滚动导航': ['02'], 'sticky': ['02'],
    '按钮': ['03', '13'], '按压': ['03'], '手感': ['03'],
    '拖拽排序': ['33', '34', '40'], '拖动排序': ['33', '40'], '看板拖动': ['34'],
    '拖拽': ['33', '34', '35'], '列宽': ['42'],
    '图表数据过渡': ['44', '45', '48'], '折线图': ['44'], '柱状图': ['45'],
    'k线': ['52', '51'], '股票': ['52', '47'], '实时行情': ['47', '81'],
    '时间轴': ['55', '56', '62'], '历史回放': ['62'], '进度拖拽': ['55'],
    '3d镜头': ['65', '64'], '镜头运动': ['65', '73'], '镜头': ['65', '64'],
    '户型': ['66', '65'], '沙盘': ['66', '64'], '光照': ['69'],
    '命令面板': ['86', '87'], 'command palette': ['86'], 'ctrl+k': ['86'],
    '侧栏': ['12', '08'], '侧边栏': ['12', '08'], 'sidebar': ['12'],
    'toast': ['78'], '上传': ['29', '39'], '加载': ['76', '80'],
    '交互反馈': ['03', '76', '79'], '可访问': ['101', '102'],
}

def score_recipe(query: str, recipe: dict) -> float:
    """CJK-aware phrase matching; no bogus semantic embedding or network dependency."""
    q = query.casefold().strip()
    title = recipe['title'].casefold()
    goal = recipe['goal'].casefold()
    s = 0.0
    if q and (q == title or q == recipe['id']): s += 30
    if title in q: s += 15
    if q in title and len(q) >= 2: s += 8
    for k in recipe['keywords']:
        k = k.casefold()
        if len(k) >= 2 and k in q: s += 8 + min(len(k), 6) * 0.2
    for alias, ids in ALIASES.items():
        if alias in q and recipe['id'] in ids:
            s += max(0, 13 - ids.index(recipe['id']) * 4)
    # user may use space-delimited English keywords; Chinese bigrams are intentionally not semantic claims
    words = [w for w in re.split(r'[^\w\u4e00-\u9fff]+', q) if len(w)>1]
    for word in words:
        if word in title: s += 2.5
        if word in goal: s += 1.2
    return s

def pick(catalog: dict, query: str, top: int=5, category: str|None=None):
    candidates=[x for x in catalog['scenarios'] if not category or category in x['category']]
    ranking = sorted(((score_recipe(query, x), x) for x in candidates), key=lambda pair:(-pair[0],int(pair[1]['id'])))
    return [dict(score=round(score,1),**rec) for score,rec in ranking if score>0][:top]

def generate_prompt(candidates: list, root: Path, intent: str):
    if not candidates:
        return f'交互需求：{intent}\n未找到足够明确的配方；请先阅读 .agents/design/SCENARIO_PROMPT_SCHEMA.md 并分析实际业务。\n'
    primary = candidates[0]
    docs=[primary]
    out=['# Codex 交互实现任务',f'\n原始需求：{intent}\n', '不要直接复制孤立 Demo；检查当前仓库并保留实际业务状态。','\n## 主场景', f"{primary['id']} {primary['title']} | `.agents/scenarios/{primary['filename']}`"]
    for rec in docs:
        path=root/'.agents/scenarios'/rec['filename']
        if path.exists():
            out+=['\n## 场景详细规范（原文）\n',path.read_text(encoding='utf-8')]
        else:
            out+=['\n## 未找到场景文件',f'检查是否安装到目标项目：{path}']
    out+=['\n## 必须输出', '实际修改的文件、按帧/状态的效果证据、键盘/触摸/减少动态效果测试、失败项和安全降级；不得虚报浏览器验收。']
    return '\n'.join(out)+'\n'

def main(argv=None):
    parser=argparse.ArgumentParser(description='检索 104 份精准动效规范并生成 Codex 提示词（不联网）')
    parser.add_argument('query',nargs='?',default='',help='例如：列表卡片点击变成详情弹窗')
    parser.add_argument('--top',type=int,default=5)
    parser.add_argument('--category',type=str)
    parser.add_argument('--list', action='store_true',help='展示所有分类及场景')
    parser.add_argument('--json', action='store_true')
    parser.add_argument('--prompt', action='store_true',help='输出主场景完整 Codex prompt')
    parser.add_argument('--output', type=Path,help='将 --prompt 内容写入指定文件，默认仅输出不修改')
    parser.add_argument('--catalog', type=Path,default=CATALOG)
    args=parser.parse_args(argv)
    if not args.catalog.is_file():
        parser.error(f'找不到场景目录：{args.catalog}；请在安装后的项目根目录运行 tools/pick_scenario.py')
    catalog=json.loads(args.catalog.read_text(encoding='utf-8'))
    if args.list:
        for cat in catalog['categories']:
            print(f'\n[{cat}]')
            for rec in catalog['scenarios']:
                if rec['category']==cat: print(f"  {rec['id']} {rec['title']} · {rec['filename']}")
        return 0
    if not args.query:
        parser.error('请提供交互需求关键词，或使用 --list')
    result=pick(catalog,args.query,max(1,args.top),args.category)
    if args.prompt or args.output:
        content=generate_prompt(result, args.catalog.parent.parent.parent, args.query)
        if args.output:
            args.output.parent.mkdir(parents=True,exist_ok=True)
            args.output.write_text(content,encoding='utf-8')
            print(f'已生成：{args.output}（仅输出文本，未修改业务项目）')
        else:
            print(content)
        return 0
    if args.json:
        print(json.dumps([dict(id=x['id'],title=x['title'],category=x['category'],score=x['score'],file=f".agents/scenarios/{x['filename']}") for x in result],ensure_ascii=False,indent=2))
    else:
        if not result: print('暂无明确匹配，请使用 --list，或增加业务行为/操作关键词。')
        for i,rec in enumerate(result,1):
            print(f"{i}. [{rec['id']}] {rec['title']} | score={rec['score']}\n   .agents/scenarios/{rec['filename']}\n   {rec['goal']}")
        if result:print('\n最佳用法：python tools/pick_scenario.py "'+args.query+'" --prompt --output CODEX_SCENE_TASK.md')
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
