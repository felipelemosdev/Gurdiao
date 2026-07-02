from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, status
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict
import httpx
from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone


# ---------- Mongo ----------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# ---------- App ----------
app = FastAPI(title="Guardian Juri API")
api_router = APIRouter(prefix="/api")

# ---------- Auth Helpers ----------
JWT_ALGORITHM = "HS256"
ROLES = ("advogado", "estagiario", "secretaria")


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=12),
        "type": "access",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


async def get_current_user(request: Request) -> dict:
    token = None
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    if not token:
        token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Não autenticado")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Token inválido")
        user = await db.users.find_one({"id": payload["sub"]})
        if not user:
            raise HTTPException(status_code=401, detail="Usuário não encontrado")
        user.pop("_id", None)
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")


def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "advogado":
        raise HTTPException(status_code=403, detail="Acesso restrito ao Advogado (Admin)")
    return user


# ---------- Models ----------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str  # advogado | estagiario | secretaria


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    role: str
    created_at: str


class ClienteIn(BaseModel):
    nome: str
    cpf_cnpj: str
    email: Optional[str] = ""
    telefone: Optional[str] = ""
    endereco: Optional[str] = ""
    observacoes: Optional[str] = ""


class ProcessoIn(BaseModel):
    numero_cnj: str
    cliente_id: str
    tribunal: str
    vara: Optional[str] = ""
    tipo_acao: Optional[str] = ""
    status: str = "ativo"  # ativo, arquivado, concluido, suspenso
    descricao: Optional[str] = ""


class PrazoIn(BaseModel):
    processo_id: Optional[str] = None
    titulo: str
    tipo: str  # prazo | audiencia | reuniao
    data: str  # ISO date
    descricao: Optional[str] = ""
    concluido: bool = False


class FinanceiroIn(BaseModel):
    processo_id: Optional[str] = None
    cliente_id: Optional[str] = None
    tipo: str  # honorario | despesa
    descricao: str
    valor: float
    data: str
    status: str = "pendente"  # pago | pendente


class DocumentoIn(BaseModel):
    processo_id: str
    nome: str
    conteudo_base64: str  # data URL or raw base64


class ChatIn(BaseModel):
    processo_id: Optional[str] = None
    message: str
    history: List[dict] = []  # [{role, content}]


class CNJConsultaIn(BaseModel):
    numero_cnj: str
    tribunal: str  # e.g. "tjsp", "tjrj", "trt2"


# ---------- Auth Endpoints ----------
@api_router.post("/auth/login")
async def login(body: LoginIn, response: Response):
    user = await db.users.find_one({"email": body.email.lower()})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="E-mail ou senha inválidos")
    token = create_access_token(user["id"], user["email"], user["role"])
    response.set_cookie(
        key="access_token", value=token, httponly=True,
        secure=False, samesite="lax", max_age=43200, path="/"
    )
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
        },
    }


@api_router.post("/auth/logout")
async def logout(response: Response, user: dict = Depends(get_current_user)):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


# ---------- Users (Admin) ----------
@api_router.get("/users", response_model=List[UserOut])
async def list_users(_: dict = Depends(require_admin)):
    docs = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return docs


@api_router.post("/users", response_model=UserOut)
async def create_user(body: UserCreate, _: dict = Depends(require_admin)):
    if body.role not in ROLES:
        raise HTTPException(status_code=400, detail="Papel inválido")
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="E-mail já cadastrado")
    doc = {
        "id": str(uuid.uuid4()),
        "email": email,
        "name": body.name,
        "role": body.role,
        "password_hash": hash_password(body.password),
        "created_at": now_iso(),
    }
    await db.users.insert_one(doc)
    doc.pop("password_hash", None)
    doc.pop("_id", None)
    return doc


@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(require_admin)):
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="Não é possível excluir a si mesmo")
    res = await db.users.delete_one({"id": user_id})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return {"ok": True}


# ---------- Clientes ----------
@api_router.get("/clientes")
async def list_clientes(_: dict = Depends(get_current_user)):
    docs = await db.clientes.find({}, {"_id": 0}).to_list(2000)
    return docs


@api_router.post("/clientes")
async def create_cliente(body: ClienteIn, _: dict = Depends(get_current_user)):
    doc = body.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = now_iso()
    await db.clientes.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.put("/clientes/{cliente_id}")
async def update_cliente(cliente_id: str, body: ClienteIn, _: dict = Depends(get_current_user)):
    res = await db.clientes.update_one({"id": cliente_id}, {"$set": body.model_dump()})
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    doc = await db.clientes.find_one({"id": cliente_id}, {"_id": 0})
    return doc


@api_router.delete("/clientes/{cliente_id}")
async def delete_cliente(cliente_id: str, _: dict = Depends(require_admin)):
    await db.clientes.delete_one({"id": cliente_id})
    return {"ok": True}


# ---------- Processos ----------
@api_router.get("/processos")
async def list_processos(_: dict = Depends(get_current_user)):
    docs = await db.processos.find({}, {"_id": 0}).to_list(2000)
    # attach cliente name
    clientes = {c["id"]: c["nome"] for c in await db.clientes.find({}, {"_id": 0, "id": 1, "nome": 1}).to_list(2000)}
    for d in docs:
        d["cliente_nome"] = clientes.get(d.get("cliente_id"), "—")
    return docs


@api_router.get("/processos/{processo_id}")
async def get_processo(processo_id: str, _: dict = Depends(get_current_user)):
    doc = await db.processos.find_one({"id": processo_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Processo não encontrado")
    cliente = await db.clientes.find_one({"id": doc.get("cliente_id")}, {"_id": 0})
    doc["cliente"] = cliente
    return doc


@api_router.post("/processos")
async def create_processo(body: ProcessoIn, _: dict = Depends(get_current_user)):
    doc = body.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = now_iso()
    await db.processos.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.put("/processos/{processo_id}")
async def update_processo(processo_id: str, body: ProcessoIn, _: dict = Depends(get_current_user)):
    res = await db.processos.update_one({"id": processo_id}, {"$set": body.model_dump()})
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Processo não encontrado")
    doc = await db.processos.find_one({"id": processo_id}, {"_id": 0})
    return doc


@api_router.delete("/processos/{processo_id}")
async def delete_processo(processo_id: str, _: dict = Depends(require_admin)):
    await db.processos.delete_one({"id": processo_id})
    await db.documentos.delete_many({"processo_id": processo_id})
    return {"ok": True}


# ---------- Documentos (PDFs) ----------
@api_router.get("/processos/{processo_id}/documentos")
async def list_documentos(processo_id: str, _: dict = Depends(get_current_user)):
    docs = await db.documentos.find(
        {"processo_id": processo_id}, {"_id": 0, "conteudo_base64": 0}
    ).to_list(1000)
    return docs


@api_router.get("/documentos/{doc_id}")
async def get_documento(doc_id: str, _: dict = Depends(get_current_user)):
    doc = await db.documentos.find_one({"id": doc_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Documento não encontrado")
    return doc


@api_router.post("/documentos")
async def create_documento(body: DocumentoIn, _: dict = Depends(get_current_user)):
    doc = body.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = now_iso()
    await db.documentos.insert_one(doc)
    return {"id": doc["id"], "nome": doc["nome"], "created_at": doc["created_at"], "processo_id": doc["processo_id"]}


@api_router.delete("/documentos/{doc_id}")
async def delete_documento(doc_id: str, _: dict = Depends(get_current_user)):
    await db.documentos.delete_one({"id": doc_id})
    return {"ok": True}


# ---------- Agenda / Prazos ----------
@api_router.get("/prazos")
async def list_prazos(_: dict = Depends(get_current_user)):
    docs = await db.prazos.find({}, {"_id": 0}).to_list(2000)
    return docs


@api_router.post("/prazos")
async def create_prazo(body: PrazoIn, _: dict = Depends(get_current_user)):
    doc = body.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = now_iso()
    await db.prazos.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.put("/prazos/{prazo_id}")
async def update_prazo(prazo_id: str, body: PrazoIn, _: dict = Depends(get_current_user)):
    res = await db.prazos.update_one({"id": prazo_id}, {"$set": body.model_dump()})
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Prazo não encontrado")
    doc = await db.prazos.find_one({"id": prazo_id}, {"_id": 0})
    return doc


@api_router.delete("/prazos/{prazo_id}")
async def delete_prazo(prazo_id: str, _: dict = Depends(get_current_user)):
    await db.prazos.delete_one({"id": prazo_id})
    return {"ok": True}


# ---------- Financeiro ----------
@api_router.get("/financeiro")
async def list_financeiro(_: dict = Depends(get_current_user)):
    docs = await db.financeiro.find({}, {"_id": 0}).to_list(2000)
    return docs


@api_router.post("/financeiro")
async def create_financeiro(body: FinanceiroIn, _: dict = Depends(get_current_user)):
    doc = body.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = now_iso()
    await db.financeiro.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.put("/financeiro/{fin_id}")
async def update_financeiro(fin_id: str, body: FinanceiroIn, _: dict = Depends(get_current_user)):
    res = await db.financeiro.update_one({"id": fin_id}, {"$set": body.model_dump()})
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Registro não encontrado")
    doc = await db.financeiro.find_one({"id": fin_id}, {"_id": 0})
    return doc


@api_router.delete("/financeiro/{fin_id}")
async def delete_financeiro(fin_id: str, _: dict = Depends(require_admin)):
    await db.financeiro.delete_one({"id": fin_id})
    return {"ok": True}


# ---------- CNJ DataJud ----------
CNJ_TRIBUNAIS = {
    "tjsp": "TJSP", "tjrj": "TJRJ", "tjmg": "TJMG", "tjrs": "TJRS", "tjpr": "TJPR",
    "tjba": "TJBA", "tjsc": "TJSC", "tjdft": "TJDFT", "tjgo": "TJGO", "tjpe": "TJPE",
    "tjce": "TJCE", "tjam": "TJAM", "tjpa": "TJPA", "tjes": "TJES", "tjms": "TJMS",
    "tjmt": "TJMT", "tjrn": "TJRN", "tjse": "TJSE", "tjal": "TJAL", "tjpi": "TJPI",
    "tjma": "TJMA", "tjto": "TJTO", "tjac": "TJAC", "tjro": "TJRO", "tjap": "TJAP",
    "tjrr": "TJRR", "stf": "STF", "stj": "STJ", "tst": "TST",
    "trf1": "TRF1", "trf2": "TRF2", "trf3": "TRF3", "trf4": "TRF4", "trf5": "TRF5", "trf6": "TRF6",
    "trt1": "TRT1", "trt2": "TRT2", "trt3": "TRT3", "trt4": "TRT4", "trt5": "TRT5",
    "trt6": "TRT6", "trt15": "TRT15",
}


@api_router.get("/cnj/tribunais")
async def cnj_tribunais(_: dict = Depends(get_current_user)):
    return [{"code": k, "label": v} for k, v in CNJ_TRIBUNAIS.items()]


@api_router.post("/cnj/consulta")
async def cnj_consulta(body: CNJConsultaIn, _: dict = Depends(get_current_user)):
    trib = body.tribunal.lower().strip()
    if trib not in CNJ_TRIBUNAIS:
        raise HTTPException(status_code=400, detail="Tribunal inválido")
    api_key = os.environ.get("CNJ_API_KEY", "")
    url = f"https://api-publica.datajud.cnj.jus.br/api_publica_{trib}/_search"
    payload = {"query": {"match": {"numeroProcesso": body.numero_cnj}}}
    headers = {
        "Authorization": f"APIKey {api_key}",
        "Content-Type": "application/json",
    }
    try:
        async with httpx.AsyncClient(timeout=20.0) as cli:
            resp = await cli.post(url, json=payload, headers=headers)
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=f"CNJ: {resp.text[:200]}")
        data = resp.json()
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Falha ao consultar CNJ: {e}")

    hits = data.get("hits", {}).get("hits", [])
    if not hits:
        return {"encontrado": False, "processo": None, "movimentacoes": []}
    src = hits[0].get("_source", {})
    movs = src.get("movimentos", []) or []
    movs_sorted = sorted(movs, key=lambda m: m.get("dataHora", ""), reverse=True)
    return {
        "encontrado": True,
        "processo": {
            "numero": src.get("numeroProcesso"),
            "classe": (src.get("classe") or {}).get("nome"),
            "tribunal": src.get("tribunal"),
            "orgao_julgador": (src.get("orgaoJulgador") or {}).get("nome"),
            "grau": src.get("grau"),
            "data_ajuizamento": src.get("dataAjuizamento"),
            "assuntos": [a.get("nome") for a in (src.get("assuntos") or [])],
            "sistema": (src.get("sistema") or {}).get("nome"),
        },
        "movimentacoes": [
            {
                "nome": m.get("nome"),
                "data": m.get("dataHora"),
                "complemento": ", ".join(
                    [c.get("descricao", "") for c in (m.get("complementosTabelados") or [])]
                ),
            }
            for m in movs_sorted[:40]
        ],
    }


# ---------- AI Assistant ----------
async def _build_ai_context(processo_id: Optional[str]) -> str:
    if not processo_id:
        return ""
    p = await db.processos.find_one({"id": processo_id}, {"_id": 0})
    if not p:
        return ""
    cliente = await db.clientes.find_one({"id": p.get("cliente_id")}, {"_id": 0}) or {}
    return (
        f"Processo Nº CNJ: {p.get('numero_cnj')}\n"
        f"Tribunal: {p.get('tribunal')} · Vara: {p.get('vara') or '-'}\n"
        f"Tipo de ação: {p.get('tipo_acao') or '-'}\n"
        f"Status: {p.get('status')}\n"
        f"Cliente: {cliente.get('nome', '-')} (CPF/CNPJ: {cliente.get('cpf_cnpj', '-')})\n"
        f"Descrição: {p.get('descricao') or '-'}\n"
    )


@api_router.post("/ai/chat")
async def ai_chat(body: ChatIn, user: dict = Depends(get_current_user)):
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY não configurada")

    ctx = await _build_ai_context(body.processo_id)
    system_msg = (
        "Você é o assistente jurídico do Guardian Juri, um sistema para escritórios de "
        "advocacia brasileiros. Responda SEMPRE em português brasileiro, com tom "
        "profissional, técnico-jurídico e conciso. Cite artigos de lei quando pertinente, "
        "mas deixe claro que suas respostas não substituem análise humana. Se houver "
        "contexto do processo abaixo, use-o como base principal.\n\n"
        f"---\nCONTEXTO DO PROCESSO:\n{ctx or '(sem processo selecionado)'}\n---"
    )

    session_id = f"{user['id']}-{body.processo_id or 'geral'}"
    chat = LlmChat(
        api_key=api_key,
        session_id=session_id,
        system_message=system_msg,
    ).with_model("anthropic", "claude-sonnet-4-6")

    # Prepend history as part of user message context (library manages its own history per session).
    history_text = ""
    for h in body.history[-6:]:
        role = "Usuário" if h.get("role") == "user" else "Assistente"
        history_text += f"\n{role}: {h.get('content', '')}"
    prompt = (
        (f"Histórico recente:{history_text}\n\n" if history_text else "")
        + f"Pergunta atual: {body.message}"
    )

    async def event_generator():
        try:
            async for ev in chat.stream_message(UserMessage(text=prompt)):
                if isinstance(ev, TextDelta):
                    yield f"data: {ev.content}\n\n"
                elif isinstance(ev, StreamDone):
                    yield "event: done\ndata: end\n\n"
                    break
        except Exception as e:
            yield f"event: error\ndata: {str(e)[:300]}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ---------- Dashboard ----------
@api_router.get("/dashboard/stats")
async def dashboard_stats(_: dict = Depends(get_current_user)):
    total_processos = await db.processos.count_documents({})
    ativos = await db.processos.count_documents({"status": "ativo"})
    total_clientes = await db.clientes.count_documents({})
    hoje = datetime.now(timezone.utc)
    limite = hoje + timedelta(days=7)
    prazos = await db.prazos.find({"concluido": False}, {"_id": 0}).to_list(1000)
    proximos = []
    for p in prazos:
        try:
            dt = datetime.fromisoformat(p["data"].replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            if hoje <= dt <= limite:
                proximos.append(p)
        except Exception:
            continue

    fin_docs = await db.financeiro.find({}, {"_id": 0}).to_list(2000)
    receita_recebida = sum(f["valor"] for f in fin_docs if f["tipo"] == "honorario" and f["status"] == "pago")
    receita_pendente = sum(f["valor"] for f in fin_docs if f["tipo"] == "honorario" and f["status"] == "pendente")

    # monthly revenue for chart (last 6 months)
    monthly = {}
    for f in fin_docs:
        if f["tipo"] != "honorario":
            continue
        try:
            dt = datetime.fromisoformat(f["data"])
            key = f"{dt.year}-{dt.month:02d}"
            monthly[key] = monthly.get(key, 0) + float(f["valor"])
        except Exception:
            continue
    chart = [{"mes": k, "valor": v} for k, v in sorted(monthly.items())][-6:]

    return {
        "total_processos": total_processos,
        "processos_ativos": ativos,
        "total_clientes": total_clientes,
        "prazos_proximos": len(proximos),
        "receita_recebida": receita_recebida,
        "receita_pendente": receita_pendente,
        "chart_receita": chart,
    }


# ---------- Startup ----------
async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@guardianjuri.com.br").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "name": "Advogado Administrador",
            "role": "advogado",
            "password_hash": hash_password(admin_password),
            "created_at": now_iso(),
        })
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}}
        )


@app.on_event("startup")
async def startup_event():
    await db.users.create_index("email", unique=True)
    await db.clientes.create_index("id", unique=True)
    await db.processos.create_index("id", unique=True)
    await db.prazos.create_index("id", unique=True)
    await db.financeiro.create_index("id", unique=True)
    await db.documentos.create_index("id", unique=True)
    await seed_admin()


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
