"""Optional OpenAI-compatible model analysis. Never invent sources or sales signals."""
import json, httpx
from . import config

SYSTEM="""你是严谨的商业机会分析师。仅根据输入的公开材料分析，绝不能编造真实客户、成交金额、下载量或竞品。输出严格 JSON 对象，包含以下中文字符串字段：summary（不超过100字）、why_now、target_customer、pain_evidence、product_offer、differentiation、seven_day_plan、key_risks、unknowns。标记所有仅为推断的商业价值。不要提供非法抓取、盗版、共享 API Key 倒卖策略。"""

def configured():return bool(config.LLM_BASE_URL and config.LLM_API_KEY and config.LLM_MODEL)

def analyze(opp):
    if not configured():raise ValueError('尚未在 .env 中配置 LLM_BASE_URL、LLM_API_KEY、LLM_MODEL')
    endpoint=config.LLM_BASE_URL
    if not endpoint.endswith('/chat/completions'):endpoint+='/chat/completions'
    input_data={k:opp.get(k) for k in ('title','summary','source','source_url','published_at','stars','comments','license','evidence_notes','risk','target_customer','offer','score')}
    with httpx.Client(timeout=45,follow_redirects=False) as client:
        r=client.post(endpoint,headers={'Authorization':f'Bearer {config.LLM_API_KEY}'},json={
          'model':config.LLM_MODEL,'temperature':0.2,'messages':[{'role':'system','content':SYSTEM},
                       {'role':'user','content':json.dumps(input_data,ensure_ascii=False)}]})
        r.raise_for_status()
        data=r.json()
    body=data['choices'][0]['message']['content']
    if not isinstance(body,str):raise ValueError('模型返回了非文本内容')
    body=body.strip()
    if body.startswith('```'):
        body=body.split('\n',1)[-1].rsplit('```',1)[0]
    result=json.loads(body)
    if not isinstance(result,dict):raise ValueError('模型输出不是 JSON 对象')
    return {key:str(result.get(key,''))[:1600] for key in ('summary','why_now','target_customer','pain_evidence','product_offer','differentiation','seven_day_plan','key_risks','unknowns')}
