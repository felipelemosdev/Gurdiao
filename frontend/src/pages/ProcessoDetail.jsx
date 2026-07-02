import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api, { formatApiErrorDetail } from "@/lib/api";
import { ArrowLeft, Upload, FileText, Trash2, Eye, X } from "lucide-react";
import { toast } from "sonner";

export default function ProcessoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [processo, setProcesso] = useState(null);
  const [docs, setDocs] = useState([]);
  const [viewingDoc, setViewingDoc] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const load = async () => {
    const [p, d] = await Promise.all([
      api.get(`/processos/${id}`),
      api.get(`/processos/${id}/documentos`),
    ]);
    setProcesso(p.data); setDocs(d.data);
  };
  useEffect(() => { load(); }, [id]);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const f of files) {
        if (f.type !== "application/pdf") {
          toast.error(`${f.name} não é PDF`);
          continue;
        }
        const base64 = await new Promise((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result);
          r.onerror = reject;
          r.readAsDataURL(f);
        });
        await api.post("/documentos", {
          processo_id: id,
          nome: f.name,
          conteudo_base64: base64,
        });
      }
      toast.success("Documento(s) enviado(s)");
      load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const openDoc = async (docId) => {
    try {
      const { data } = await api.get(`/documentos/${docId}`);
      setViewingDoc(data);
    } catch (err) {
      toast.error("Falha ao abrir documento");
    }
  };

  const deleteDoc = async (docId) => {
    if (!window.confirm("Excluir documento?")) return;
    await api.delete(`/documentos/${docId}`);
    toast.success("Documento excluído");
    load();
  };

  if (!processo) return <div className="text-[#475569]">Carregando…</div>;

  return (
    <div className="space-y-8" data-testid="processo-detail-page">
      <button onClick={() => navigate("/processos")} className="inline-flex items-center gap-2 text-sm text-[#475569] hover:text-[#0A192F]" data-testid="back-to-processos">
        <ArrowLeft className="h-4 w-4" /> Voltar para processos
      </button>

      <header>
        <div className="text-xs uppercase tracking-[0.28em] text-[#C5A059] font-semibold">
          Processo Judicial
        </div>
        <h1 className="font-serif-gj text-3xl text-[#0A192F] mt-2 font-mono">{processo.numero_cnj}</h1>
        <div className="mt-3 text-[#475569] text-sm">
          {processo.tribunal}{processo.vara ? ` · ${processo.vara}` : ""}
        </div>
      </header>

      <section className="grid md:grid-cols-2 gap-6">
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-6">
          <div className="text-xs uppercase tracking-[0.2em] text-[#475569] font-semibold mb-4">Cliente</div>
          {processo.cliente ? (
            <div className="space-y-1">
              <div className="text-lg font-semibold text-[#0A192F] font-serif-gj">{processo.cliente.nome}</div>
              <div className="text-sm text-[#475569]">{processo.cliente.cpf_cnpj}</div>
              <div className="text-sm text-[#475569]">{processo.cliente.email}</div>
              <div className="text-sm text-[#475569]">{processo.cliente.telefone}</div>
            </div>
          ) : <div className="text-sm text-[#475569]">Cliente não encontrado.</div>}
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-6">
          <div className="text-xs uppercase tracking-[0.2em] text-[#475569] font-semibold mb-4">Detalhes</div>
          <dl className="text-sm space-y-2">
            <div className="flex justify-between"><dt className="text-[#475569]">Tipo</dt><dd className="text-[#0A192F]">{processo.tipo_acao || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-[#475569]">Status</dt><dd className="text-[#0A192F] capitalize">{processo.status}</dd></div>
          </dl>
          {processo.descricao && (
            <div className="mt-4 pt-4 border-t border-[#E2E8F0] text-sm text-[#475569] leading-relaxed">
              {processo.descricao}
            </div>
          )}
        </div>
      </section>

      <section className="bg-white border border-[#E2E8F0] rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-[#475569] font-semibold">Anexos</div>
            <h2 className="font-serif-gj text-2xl text-[#0A192F] mt-1">Documentos PDF</h2>
          </div>
          <label className="cursor-pointer bg-[#C5A059] hover:bg-[#D4AF37] text-[#0A192F] rounded-md px-4 py-2 text-sm font-semibold inline-flex items-center gap-2">
            <Upload className="h-4 w-4" />
            {uploading ? "Enviando…" : "Anexar PDF(s)"}
            <input ref={fileRef} type="file" accept="application/pdf" multiple onChange={handleUpload} className="hidden" data-testid="upload-pdf-input" />
          </label>
        </div>

        {docs.length === 0 ? (
          <div className="py-16 text-center text-[#475569]">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
            Nenhum documento anexado.
          </div>
        ) : (
          <ul className="divide-y divide-[#E2E8F0]">
            {docs.map((d) => (
              <li key={d.id} className="py-4 flex items-center justify-between" data-testid={`doc-item-${d.id}`}>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-md bg-[#C5A059]/10 text-[#C5A059] flex items-center justify-center">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium text-[#0A192F]">{d.nome}</div>
                    <div className="text-xs text-[#475569]">
                      {new Date(d.created_at).toLocaleString("pt-BR")}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => openDoc(d.id)} data-testid={`view-doc-${d.id}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border border-[#0A192F] text-[#0A192F] hover:bg-[#0A192F] hover:text-white transition-colors">
                    <Eye className="h-4 w-4" /> Visualizar
                  </button>
                  <button onClick={() => deleteDoc(d.id)} data-testid={`delete-doc-${d.id}`}
                    className="p-2 rounded hover:bg-red-50 text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {viewingDoc && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" data-testid="pdf-viewer-modal">
          <div className="bg-white rounded-lg w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
              <div className="font-serif-gj text-lg text-[#0A192F] truncate">{viewingDoc.nome}</div>
              <button onClick={() => setViewingDoc(null)} data-testid="close-pdf-viewer"
                className="p-2 rounded hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <iframe
              title={viewingDoc.nome}
              src={viewingDoc.conteudo_base64}
              className="flex-1 w-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}
