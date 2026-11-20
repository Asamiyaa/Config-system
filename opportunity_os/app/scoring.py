"""Explainable heuristic ranking. Popularity proxies are NOT verified paying customers."""
import math
from datetime import datetime, timezone

WEIGHTS = {'demand':30,'speed':20,'channel':20,'margin':15,'repeat':10,'safety':5}
CATEGORIES = ['AI Agent','开发效率','企业自动化','多模态','API / Token','信息雷达','其他']
PLAYBOOKS = {
  'AI Agent': ('开发团队 / 有重复性任务的小企业','Agent 工作流配置与部署、知识库接入、质量验收',699,180,6,'用真实客户的一个工作流测试成功率与节省工时'),
  '开发效率': ('Java / Python 开发者与小团队','开发环境一键安装、旧项目代码索引、MCP 配置与验收',299,70,3,'完成真实项目的安装、索引和测试报告'),
  '企业自动化': ('电商商家 / 小微企业运营','订单/报表/邮件自动化脚本及维护',999,220,8,'让目标客户提供一份脱敏样例数据验证节省工时'),
  '多模态': ('内容制作团队 / 商品卖家','多模态内容工作流、可复用视频/3D 演示模板',599,160,7,'制作一个原创样片并询问真实购买意愿'),
  'API / Token': ('维护 AI 应用的开发团队','多模型接入、成本看板、缓存和故障切换',799,170,6,'对客户真实 API 日志试算节省金额'),
  '信息雷达': ('分析师 / 垂直领域企业','资讯监测、去重聚合、证据化日常简报',399,90,5,'请三个目标用户评价信噪比并试订阅'),
  '其他': ('待明确的细分用户','按需求交付的可验证小型工具或技术服务',299,90,5,'与至少三名潜在付费用户确认痛点')
}
KEYWORDS = {
  'AI Agent': ('agent','agents','mcp','langgraph','multi-agent','claude code','codex','skills'),
  '开发效率': ('developer','coding','codebase','repository','repo','ide','test','devtool','cli','java','python','typescript'),
  '企业自动化': ('automation','workflow','n8n','zapier','batch','crm','process'),
  '多模态': ('video','3d','three.js','webgl','image generation','multimodal','render'),
  'API / Token': ('api gateway','token usage','tokens','inference','routing','llm cost','api pricing','cache'),
  '信息雷达': ('monitor','intelligence','rss','research','search','crawler','news','signal')
}

def categorize(title, summary):
    text = f'{title} {summary}'.lower()
    scores = {k:sum(1 for word in v if word in text) for k,v in KEYWORDS.items()}
    key = max(scores, key=scores.get)
    return key if scores[key]>0 else '其他'

def license_risk(license_spdx):
    s = (license_spdx or '').upper()
    if s in ('MIT','APACHE-2.0','BSD-2-CLAUSE','BSD-3-CLAUSE','ISC','UNLICENSE'):
        return 4, '许可证较清晰；仍需核查依赖、商标和再分发条款'
    if any(x in s for x in ('GPL','AGPL','LGPL','MPL')):
        return 2, '存在开源/网络服务等许可证义务，商业化前需要单独核查'
    return 1, '许可证或服务条款未知；不能假设可商业转售'

def score_item(item):
    category = categorize(item['title'],item.get('summary',''))
    stars = max(0,int(item.get('stars') or 0))
    comments = max(0,int(item.get('comments') or 0))
    source = item['source']
    if source in ('github','github_trending'):
        demand = max(1,min(5,1+math.log10(stars+1)*1.2))
        evidence = (f'GitHub Trending 入榜；累计 {stars} stars（热度代理，并非成交）' if source=='github_trending' else f'GitHub {stars} stars（关注度代理，不代表付费需求）')
    elif source=='hn':
        demand=max(1,min(5,1 + math.log10(comments+1)*1.8))
        evidence=f'HN {comments} 条评论（讨论热度；非成交证据）'
    elif source in ('xianyu','xiaohongshu','1688'):
        demand=2.4
        evidence=f'{source} 来源条目（需核验成交、需求量、销量及价格；不保证套利空间）'
    elif source=='x':
        demand=2.2
        evidence='X 公开帖子（早期信号；需独立验证用户需求）'
    else:
        demand=2
        evidence='公开资讯发布（技术信号；未证实付费需求）'
    speed={'开发效率':4.6,'AI Agent':4.1,'企业自动化':4.0,'API / Token':3.8,'信息雷达':4.3,'多模态':3.2,'其他':2.6}[category]
    channel={'开发效率':4.2,'企业自动化':3.7,'AI Agent':3.7,'多模态':3.4,'API / Token':3.1,'信息雷达':3.2,'其他':2.5}[category]
    margin={'开发效率':4.0,'企业自动化':3.8,'AI Agent':3.7,'API / Token':3.6,'信息雷达':3.8,'多模态':2.8,'其他':2.8}[category]
    repeat={'开发效率':3.5,'企业自动化':4.3,'AI Agent':4,'API / Token':4.2,'信息雷达':4.7,'多模态':3.3,'其他':2.5}[category]
    safe,risk=license_risk(item.get('license')) if source in ('github','github_trending') else (2,'须核查原始内容、数据许可、平台 API / 商标条款')
    s={'demand':round(demand,1),'speed':speed,'channel':channel,'margin':margin,'repeat':repeat,'safety':safe}
    total=round(sum(s[k]*WEIGHTS[k]/5 for k in WEIGHTS))
    customer,offer,price,cost,hours,test=PLAYBOOKS[category]
    return {'category':category,'scores':s,'score':total,'evidence_notes':evidence,'risk':risk,
      'target_customer':customer,'offer':offer,'estimated_price':price,'estimated_cost':cost,
      'estimated_hours':hours,'next_test':test}

def economics(price,cost,hours,conversion=0):
    price=max(0,float(price));cost=max(0,float(cost));hours=max(0,float(hours))
    return {'gross_profit':round(price-cost,2),'gross_margin':round((price-cost)/price*100,1) if price else 0,
      'hourly_contribution':round((price-cost)/hours,1) if hours else 0}
