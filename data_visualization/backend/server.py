"""FastAPI backend for AI-powered WeChat public account analysis."""
import json
import os
import asyncio
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import httpx

app = FastAPI(title="WeChat Analysis API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_URL = "https://chat001.medlive.cn/api/v1/chat/completions"
API_KEY = "sk_1saR+WAyzbCQAmU7ooEM3mkrQ0ZIV3Qydi84WG91YitXTGYvajRYOEZZUVBrbzZZV2xwN0FsOENFMUk9"
MODEL_NAME = "DeepSeek-V3.2-251201"


class AnalysisRequest(BaseModel):
    mode: str  # "all" or "single"
    accounts: list[dict]  # list of account summaries
    top_articles: list[dict]  # top articles across accounts
    monthly_trends: Optional[list[dict]] = None
    all_articles: Optional[list[dict]] = None


def build_all_accounts_prompt(data: AnalysisRequest) -> str:
    """Build prompt for comparing all accounts."""
    accounts_json = json.dumps(data.accounts, ensure_ascii=False, indent=2)
    top_articles_json = json.dumps(data.top_articles[:30], ensure_ascii=False, indent=2)
    trends_json = json.dumps(data.monthly_trends or [], ensure_ascii=False, indent=2)
    all_json = json.dumps(data.all_articles or [], ensure_ascii=False, indent=2)

    return f"""你是一位拥有10年经验的微信公众号内容策略分析师。请根据以下数据对三个公众号进行全面对比分析。

## 各账号核心数据
{accounts_json}

## 月度趋势数据
{trends_json}

## 各账号TOP文章（按阅读量排序，含互动数据）
{top_articles_json}

## 全部文章列表（含标题、互动数据，用于查找特定文章）
{all_json}

---

请严格按照下方格式输出，共5段，每段以【】内的指定标题开头，段间空行分隔。段落内对关键数据、结论性词语用**加粗**标注，使重点突出。禁止使用列表符号（-/*），用自然语言成段叙述。
 
【综合实力对比】
从文章数、总阅读量、篇均阅读、互动率、原创率五个维度逐一对比三个账号，**明确点出综合最强和最弱的账号**，并用具体数字说明差距，分析造成差距的核心原因。
 
【头条效应对比】
对比各账号头条与非头条文章的篇均阅读量和互动率差距，用具体倍数说明，**指出哪个账号头条效应最显著**。若数据中无法区分头条与非头条，需明确说明数据局限，不得凭空推断。
 
【内容主题分析】
基于TOP文章的主题领域，分别总结每个账号的**核心优势内容方向**，再归纳三个账号共性的高互动话题类型，并说明这些话题受欢迎的用户心理原因。
 
【互动趋势分析】
根据月度趋势数据，描述各账号互动率的整体走势。**重点处理所有出现明显峰值的月份**：对于每一个峰值月，必须在全部文章列表中找到该账号该月互动量（点赞+在看+分享）绝对值最高的那篇文章，以如下格式展示：
「标题：《xxx》 | 阅读：xx | 点赞：xx | 在看：xx | 分享：xx | 互动率：xx%」
然后基于该文章数据，明确判断此次峰值是**单篇爆款拉动的偶然波动**还是**内容策略整体奏效的可持续趋势**，并说明判断依据。
 
【爆款规律与创作建议】
从标题写法、内容主题、发布时机、原创性四个角度，提炼TOP文章的共性规律，**每个角度给出1条可直接落地的具体操作建议**，语言简洁直接，避免泛泛而谈。"""


def build_single_account_prompt(data: AnalysisRequest) -> str:
    """Build prompt for analyzing a single account."""
    accounts_json = json.dumps(data.accounts, ensure_ascii=False, indent=2)
    top_articles_json = json.dumps(data.top_articles[:20], ensure_ascii=False, indent=2)
    trends_json = json.dumps(data.monthly_trends or [], ensure_ascii=False, indent=2)
    all_json = json.dumps(data.all_articles or [], ensure_ascii=False, indent=2)

    return f"""你是一位拥有10年经验的微信公众号内容策略分析师。请根据以下数据对该公众号进行深度分析。

## 账号核心数据
{accounts_json}

## 月度趋势数据
{trends_json}

## TOP文章（按阅读量排序，含互动数据）
{top_articles_json}

## 全部文章列表（含标题、互动数据，用于查找特定文章）
{all_json}

---

请严格按照下方格式输出，共4段，每段以【】内的指定标题开头，段间空行分隔。段落内对关键数据、结论性词语用**加粗**标注，使重点突出。禁止使用列表符号（-/*），用自然语言成段叙述。
 
【头条效应分析】
对比头条与非头条文章的篇均阅读量和互动率差距，用**具体倍数**说明头条效应是否显著。若数据中无法区分头条与非头条，需明确说明数据局限，不得凭空推断。
 
【内容主题分析】
基于TOP文章的主题领域，总结**最受欢迎的内容方向**和高互动话题，并说明这些话题与目标用户核心需求的关联。
 
【互动趋势分析】
根据月度趋势数据，描述互动率的整体走势。**重点处理所有出现明显峰值的月份**：对于每一个峰值月，必须在全部文章列表中找到该月互动量（点赞+在看+分享）绝对值最高的那篇文章，以如下格式展示：
「标题：《xxx》 | 阅读：xx | 点赞：xx | 在看：xx | 分享：xx | 互动率：xx%」
然后基于该文章数据，明确判断此次峰值是**单篇爆款拉动的偶然波动**还是**内容策略整体奏效的可持续趋势**，并说明判断依据。
 
【爆款规律与创作建议】
从标题写法、内容主题、发布时机、原创性四个角度，提炼TOP文章的共性规律，**每个角度给出1条可直接落地的具体操作建议**，语言简洁直接，避免泛泛而谈。"""


async def stream_llm_response(prompt: str):
    """Stream LLM response character by character."""
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}",
    }
    payload = {
        "model": MODEL_NAME,
        "messages": [
            {"role": "system", "content": "你是专业的公众号数据分析师。每段开头必须用【小标题】作为段落标题，关键数据用**加粗**。段间空行分隔。禁止使用#、-、*等markdown列表格式。"},
            {"role": "user", "content": prompt},
        ],
        "max_tokens": 3000,
        "temperature": 0.7,
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(API_URL, headers=headers, json=payload)
        if response.status_code != 200:
            yield f"data: {json.dumps({'error': f'API error: {response.status_code} - {response.text[:200]}'})}\n\n"
            yield "data: [DONE]\n\n"
            return
        result = response.json()
        content = result["choices"][0]["message"]["content"]
        # Send progress updates then the content
        yield f"data: {json.dumps({'progress': 50, 'message': '分析中...'})}\n\n"
        await asyncio.sleep(0.1)
        yield f"data: {json.dumps({'progress': 100, 'message': '分析完成', 'content': content})}\n\n"
        yield "data: [DONE]\n\n"


@app.post("/api/analyze")
async def analyze(req: AnalysisRequest):
    """Analyze WeChat public account data using LLM."""
    if not req.accounts:
        raise HTTPException(status_code=400, detail="No account data provided")

    if req.mode == "all":
        prompt = build_all_accounts_prompt(req)
    else:
        prompt = build_single_account_prompt(req)

    return StreamingResponse(
        stream_llm_response(prompt),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ── Data Update (KD API) ────────────────────────────────────────────
KD_PROJECT_ID = 9
KD_TOKEN = "40ded274543d5796f275de0632d0f373"
KD_BASE_URL = "https://kdc.meddb.cn/api/article/getData"

ACCOUNT_FILES = {
    "Greenlore": "articles_greenlore.json",
    "medlive-xy": "articles_xy.json",
    "yyck-medlive": "articles_yyck.json",
}

TAG_CATEGORIES_OFFLINE = [
    "肺癌", "乳腺癌", "胃癌", "肝癌", "结直肠癌", "食管癌",
    "甲状腺癌", "前列腺癌", "宫颈癌", "卵巢癌", "白血病", "淋巴瘤",
    "糖尿病", "高血压", "高血脂", "冠心病", "脑卒中",
    "减重/肥胖", "痛风", "骨质疏松", "慢性肾病", "COPD", "哮喘",
    "抑郁症", "焦虑症", "阿尔茨海默", "帕金森",
    "免疫治疗", "靶向治疗", "化疗", "放疗",
    "临床试验", "新药资讯", "指南共识", "病例分享", "医学科普", "患者故事",
    "饮食营养", "运动康复", "心理健康", "睡眠健康",
]


async def fetch_kd_articles(account: str, start_date: str, end_date: str) -> list[dict]:
    """Fetch articles from KD API for a given account and time range."""
    all_articles = []
    page = 1
    async with httpx.AsyncClient(timeout=30.0) as client:
        while True:
            params = {
                "projectId": KD_PROJECT_ID,
                "page": page,
                "size": 20,
                "token": KD_TOKEN,
                "account": account,
                "startDate": start_date,
                "endDate": end_date,
                "html": 0,
            }
            resp = await client.get(KD_BASE_URL, params=params)
            resp.raise_for_status()
            data = resp.json()
            if not data.get("success"):
                break
            articles = data.get("data", [])
            all_articles.extend(articles)
            total_pages = data.get("pages", 0)
            if page >= total_pages:
                break
            page += 1
    return all_articles


async def tag_single_article(article: dict) -> list[str]:
    """Use LLM to tag a single new article."""
    title = article.get("title", "")
    content = (article.get("content_text", "") or "")[:1500]
    categories = "、".join(TAG_CATEGORIES_OFFLINE)

    prompt = f"""为以下文章打1-3个标签，优先从预定义列表选择，无法覆盖可补充新标签（2-6字），与医学无关返回["其他"]。仅输出JSON。

预定义标签：{categories}

文章标题：{title}
文章内容：{content}

输出格式：{{"tags": ["标签1", "标签2"]}}"""

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}",
    }
    payload = {
        "model": MODEL_NAME,
        "messages": [
            {"role": "system", "content": "你是医学内容分类专家。返回纯JSON。"},
            {"role": "user", "content": prompt},
        ],
        "max_tokens": 500,
        "temperature": 0.3,
    }
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(API_URL, headers=headers, json=payload)
        if resp.status_code != 200:
            return ["其他"]
        result = resp.json()
        content_text = result["choices"][0]["message"]["content"].strip()
    try:
        parsed = json.loads(content_text)
        return parsed.get("tags", ["其他"])
    except json.JSONDecodeError:
        return ["其他"]


def load_json_file(filepath: str) -> list[dict]:
    path = os.path.join(os.path.dirname(__file__), "..", "public", "datas", filepath)
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def save_json_file(filepath: str, data: list[dict]):
    path = os.path.join(os.path.dirname(__file__), "..", "public", "datas", filepath)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)


@app.post("/api/update-data")
async def update_data():
    """Fetch latest 10-day data, update existing articles, tag and add new ones."""
    from datetime import datetime, timedelta

    now = datetime.now()
    ten_days_ago = now - timedelta(days=10)
    start_date = ten_days_ago.strftime("%Y%m%d%H%M%S")
    end_date = now.strftime("%Y%m%d%H%M%S")

    results = {}

    for account, filename in ACCOUNT_FILES.items():
        print(f"Fetching {account} ({start_date} ~ {end_date})...")
        try:
            fetched = await fetch_kd_articles(account, start_date, end_date)
        except Exception as e:
            results[account] = {"error": str(e), "updated": 0, "added": 0}
            continue

        if not fetched:
            results[account] = {"fetched": 0, "updated": 0, "added": 0}
            continue

        # Load current data
        current = load_json_file(filename)
        current_by_id = {str(a.get("id", "")): a for a in current}

        updated_count = 0
        added_count = 0

        for art in fetched:
            aid = str(art.get("id", ""))
            if aid in current_by_id:
                # Update interaction metrics
                existing = current_by_id[aid]
                existing["read_num"] = art.get("read_num", existing.get("read_num", 0))
                existing["like_num"] = art.get("like_num", existing.get("like_num", 0))
                existing["old_like_num"] = art.get("old_like_num", existing.get("old_like_num", 0))
                existing["share_num"] = art.get("share_num", existing.get("share_num", 0))
                existing["sync_date"] = art.get("sync_date", existing.get("sync_date", ""))
                updated_count += 1
            else:
                # New article — tag it
                try:
                    tags = await tag_single_article(art)
                except Exception:
                    tags = ["其他"]
                art["tags"] = tags
                current.append(art)
                current_by_id[aid] = art
                added_count += 1

        # Save
        save_json_file(filename, current)
        results[account] = {
            "fetched": len(fetched),
            "updated": updated_count,
            "added": added_count,
            "total": len(current),
        }
        print(f"  {account}: fetched={len(fetched)}, updated={updated_count}, added={added_count}, total={len(current)}")

    return {"success": True, "results": results, "range": f"{start_date} ~ {end_date}"}


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.get("/api/test-llm")
async def test_llm():
    """Test direct LLM API connectivity."""
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}",
    }
    payload = {
        "model": MODEL_NAME,
        "messages": [{"role": "user", "content": "回复'OK'即可"}],
        "max_tokens": 10,
        "temperature": 0.0,
    }
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(API_URL, headers=headers, json=payload)
            return {
                "api_status": response.status_code,
                "api_response": response.text[:500],
                "model": MODEL_NAME,
            }
    except Exception as e:
        return {"error": str(e), "model": MODEL_NAME}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
