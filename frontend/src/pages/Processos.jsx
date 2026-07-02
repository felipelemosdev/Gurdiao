import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { formatApiErrorDetail } from "@/lib/api";
import { Plus, Scale, ChevronRight, Trash2 } from "lucide-react";
import { toast } from "sonner";

const STATUS_COLORS = {
  ativo: "bg-emerald-50 text-emerald-700 border-emerald-200",
  arquivado: "bg-slate-100 text-slate-600 border-slate-200",
  concluido: "bg-blue-50 text-blue-700 border-blue-200",
  suspenso: "bg-amber-50 text-amber-700 border-amber-200",
};
const STATUS_LABEL = { ativo: "Ativo", arquivado: "Arquivado", concluido: "Concluído", suspenso: "Suspenso" };

const empty = { numero_cnj: "", cliente_id: "", tribunal: "", vara: "", tipo_acao: "", status: "ativo", descricao: "" };

export default function Processos() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);

  const load = async () => {
    const [p, c] = await Promise.all([api.get("/processos"), api.get("/clientes")]);
    setItems(p.data); setClientes(c.data);
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/processos", form);
      toast.success("Processo cadastrado");
      setOpen(false); setForm(empty); load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Excluir processo?")) return;
    try {
      await api.delete(`/processos/${id}`);
      toast.success("Processo excluído");
      load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    }
  };

  return (
    <div className="space-y-8" data-testid="processos-page">
      <header className="flex items-end justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.28em] text-[#C5A059] font-semibold">Contencioso</div>
          <h1 className="font-serif-gj text-4xl text-[#0A192F] mt-2">Processos</h1>
          <p className="text-[#475569] mt-1 text-sm">Acompanhe os processos judiciais em andamento.</p>
        </div>
        <button onClick={() => { setForm(empty); setOpen(true); }} data-testid="add-processo-button"
          className="bg-[#0A192F] hover:bg-[#112240] text-white rounded-md px-4 py-2.5 text-sm font-medium inline-flex items-center gap-2">
          <Plus className="h-4 w-4" /> Novo Processo
        </button>
      </header>

      <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-left">
            <tr className="text-xs uppercase tracking-[0.16em] text-[#475569]">
              <th className="px-6 py-4">Nº CNJ</th>
              <th className="px-6 py-4">Cliente</th>
              <th className="px-6 py-4">Tribunal / Vara</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-[#475569]">
                <Scale className="h-6 w-6 mx-auto mb-2 opacity-40" />
                Nenhum processo cadastrado.
              </td></tr>
            )}
            {items.map((p) => (
              <tr key={p.id} onClick={() => navigate(`/processos/${p.id}`)}
                data-testid={`processo-row-${p.id}`}
                className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC]/60 cursor-pointer">
                <td className="px-6 py-4 font-mono text-[#0A192F] font-medium">{p.numero_cnj}</td>
                <td className="px-6 py-4 text-[#0F172A]">{p.cliente_nome}</td>
                <td className="px-6 py-4 text-[#475569]">{p.tribunal}{p.vara ? ` · ${p.vara}` : ""}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_COLORS[p.status] || STATUS_COLORS.ativo}`}>
                    {STATUS_LABEL[p.status] || p.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={(e) => handleDelete(e, p.id)} data-testid={`delete-processo-${p.id}`}
                    className="p-2 rounded hover:bg-red-50 text-red-600"><Trash2 className="h-4 w-4" /></button>
                  <ChevronRight className="inline h-4 w-4 text-[#C5A059] ml-1" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl p-8 max-h-[90vh] overflow-y-auto">
            <div className="text-xs uppercase tracking-[0.2em] text-[#C5A059] font-semibold">Novo cadastro</div>
            <h2 className="font-serif-gj text-2xl text-[#0A192F] mt-1">Novo Processo</h2>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#475569] mb-1">Nº do Processo (CNJ)</label>
                <input required value={form.numero_cnj}
                  onChange={(e) => setForm({ ...form, numero_cnj: e.target.value })}
                  placeholder="0000000-00.0000.0.00.0000"
                  data-testid="processo-input-cnj"
                  className="w-full border border-[#E2E8F0] rounded-md px-3 py-2 focus:ring-2 focus:ring-[#C5A059] outline-none font-mono" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#475569] mb-1">Cliente</label>
                <select required value={form.cliente_id}
                  onChange={(e) => setForm({ ...form, cliente_id: e.target.value })}
                  data-testid="processo-input-cliente"
                  className="w-full border border-[#E2E8F0] rounded-md px-3 py-2 focus:ring-2 focus:ring-[#C5A059] outline-none bg-white">
                  <option value="">Selecione…</option>
                  {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#475569] mb-1">Tribunal</label>
                  <input required value={form.tribunal}
                    onChange={(e) => setForm({ ...form, tribunal: e.target.value })}
                    data-testid="processo-input-tribunal"
                    className="w-full border border-[#E2E8F0] rounded-md px-3 py-2 focus:ring-2 focus:ring-[#C5A059] outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#475569] mb-1">Vara</label>
                  <input value={form.vara}
                    onChange={(e) => setForm({ ...form, vara: e.target.value })}
                    data-testid="processo-input-vara"
                    className="w-full border border-[#E2E8F0] rounded-md px-3 py-2 focus:ring-2 focus:ring-[#C5A059] outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#475569] mb-1">Tipo de Ação</label>
                  <input value={form.tipo_acao}
                    onChange={(e) => setForm({ ...form, tipo_acao: e.target.value })}
                    data-testid="processo-input-tipo"
                    className="w-full border border-[#E2E8F0] rounded-md px-3 py-2 focus:ring-2 focus:ring-[#C5A059] outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#475569] mb-1">Status</label>
                  <select value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    data-testid="processo-input-status"
                    className="w-full border border-[#E2E8F0] rounded-md px-3 py-2 focus:ring-2 focus:ring-[#C5A059] outline-none bg-white">
                    <option value="ativo">Ativo</option>
                    <option value="suspenso">Suspenso</option>
                    <option value="arquivado">Arquivado</option>
                    <option value="concluido">Concluído</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#475569] mb-1">Descrição</label>
                <textarea rows={3} value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  data-testid="processo-input-descricao"
                  className="w-full border border-[#E2E8F0] rounded-md px-3 py-2 focus:ring-2 focus:ring-[#C5A059] outline-none" />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setOpen(false)}
                  className="px-4 py-2 rounded-md border border-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFC]">Cancelar</button>
                <button type="submit" data-testid="processo-save-button"
                  className="px-4 py-2 rounded-md bg-[#C5A059] hover:bg-[#D4AF37] text-[#0A192F] font-semibold">Cadastrar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
