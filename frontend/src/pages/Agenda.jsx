import React, { useEffect, useState } from "react";
import api, { formatApiErrorDetail } from "@/lib/api";
import { Plus, Calendar, Check, Trash2, Gavel } from "lucide-react";
import { toast } from "sonner";

const empty = { titulo: "", tipo: "prazo", data: "", processo_id: "", descricao: "", concluido: false };

const TIPO_LABEL = { prazo: "Prazo", audiencia: "Audiência", reuniao: "Reunião" };
const TIPO_COLOR = {
  prazo: "bg-red-50 text-red-700 border-red-200",
  audiencia: "bg-[#0A192F] text-[#C5A059] border-[#0A192F]",
  reuniao: "bg-blue-50 text-blue-700 border-blue-200",
};

export default function Agenda() {
  const [items, setItems] = useState([]);
  const [processos, setProcessos] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);

  const load = async () => {
    const [a, p] = await Promise.all([api.get("/prazos"), api.get("/processos")]);
    setItems(a.data.sort((x, y) => x.data.localeCompare(y.data)));
    setProcessos(p.data);
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/prazos", { ...form, processo_id: form.processo_id || null });
      toast.success("Compromisso adicionado");
      setOpen(false); setForm(empty); load();
    } catch (err) { toast.error(formatApiErrorDetail(err.response?.data?.detail)); }
  };

  const toggleConcluido = async (item) => {
    await api.put(`/prazos/${item.id}`, { ...item, concluido: !item.concluido });
    load();
  };

  const remove = async (id) => {
    if (!window.confirm("Excluir?")) return;
    await api.delete(`/prazos/${id}`); toast.success("Excluído"); load();
  };

  const now = new Date();
  const groups = { atrasados: [], hoje: [], proximos: [], futuros: [], concluidos: [] };
  items.forEach((it) => {
    if (it.concluido) return groups.concluidos.push(it);
    const d = new Date(it.data);
    const diff = (d - now) / (1000 * 60 * 60 * 24);
    if (diff < 0) groups.atrasados.push(it);
    else if (diff < 1) groups.hoje.push(it);
    else if (diff < 7) groups.proximos.push(it);
    else groups.futuros.push(it);
  });

  return (
    <div className="space-y-8" data-testid="agenda-page">
      <header className="flex items-end justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.28em] text-[#C5A059] font-semibold">Compromissos</div>
          <h1 className="font-serif-gj text-4xl text-[#0A192F] mt-2">Agenda</h1>
          <p className="text-[#475569] mt-1 text-sm">Prazos, audiências e reuniões.</p>
        </div>
        <button onClick={() => { setForm(empty); setOpen(true); }} data-testid="add-prazo-button"
          className="bg-[#0A192F] hover:bg-[#112240] text-white rounded-md px-4 py-2.5 text-sm font-medium inline-flex items-center gap-2">
          <Plus className="h-4 w-4" /> Novo Compromisso
        </button>
      </header>

      {[
        ["atrasados", "Atrasados", "text-red-600"],
        ["hoje", "Hoje", "text-[#C5A059]"],
        ["proximos", "Próximos 7 dias", "text-[#0A192F]"],
        ["futuros", "Futuros", "text-[#475569]"],
        ["concluidos", "Concluídos", "text-emerald-600"],
      ].map(([key, label, colorClass]) => (
        groups[key].length > 0 && (
          <section key={key} data-testid={`agenda-group-${key}`}>
            <h3 className={`text-xs uppercase tracking-[0.2em] font-semibold mb-3 ${colorClass}`}>
              {label} ({groups[key].length})
            </h3>
            <div className="bg-white border border-[#E2E8F0] rounded-lg divide-y divide-[#E2E8F0]">
              {groups[key].map((it) => (
                <div key={it.id} className="p-4 flex items-center gap-4">
                  <button onClick={() => toggleConcluido(it)} data-testid={`toggle-prazo-${it.id}`}
                    className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                      it.concluido ? "bg-emerald-500 border-emerald-500 text-white" : "border-[#E2E8F0] hover:border-[#C5A059]"
                    }`}>
                    {it.concluido && <Check className="h-3 w-3" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border font-semibold ${TIPO_COLOR[it.tipo]}`}>
                        {TIPO_LABEL[it.tipo]}
                      </span>
                      <span className={`font-medium ${it.concluido ? "line-through text-[#475569]" : "text-[#0A192F]"}`}>{it.titulo}</span>
                    </div>
                    {it.descricao && <div className="text-xs text-[#475569] mt-1">{it.descricao}</div>}
                  </div>
                  <div className="text-sm text-[#475569] whitespace-nowrap">
                    <Calendar className="inline h-4 w-4 mr-1 text-[#C5A059]" />
                    {new Date(it.data).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <button onClick={() => remove(it.id)} className="p-2 rounded hover:bg-red-50 text-red-600" data-testid={`delete-prazo-${it.id}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )
      ))}

      {items.length === 0 && (
        <div className="bg-white border border-[#E2E8F0] rounded-lg py-16 text-center text-[#475569]">
          <Gavel className="h-8 w-8 mx-auto mb-2 opacity-40" />
          Nenhum compromisso cadastrado.
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg w-full max-w-xl p-8">
            <div className="text-xs uppercase tracking-[0.2em] text-[#C5A059] font-semibold">Novo compromisso</div>
            <h2 className="font-serif-gj text-2xl text-[#0A192F] mt-1">Adicionar à agenda</h2>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#475569] mb-1">Título</label>
                <input required value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  data-testid="prazo-input-titulo"
                  className="w-full border border-[#E2E8F0] rounded-md px-3 py-2 focus:ring-2 focus:ring-[#C5A059] outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#475569] mb-1">Tipo</label>
                  <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                    data-testid="prazo-input-tipo"
                    className="w-full border border-[#E2E8F0] rounded-md px-3 py-2 outline-none bg-white">
                    <option value="prazo">Prazo</option>
                    <option value="audiencia">Audiência</option>
                    <option value="reuniao">Reunião</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#475569] mb-1">Data e hora</label>
                  <input required type="datetime-local" value={form.data}
                    onChange={(e) => setForm({ ...form, data: e.target.value })}
                    data-testid="prazo-input-data"
                    className="w-full border border-[#E2E8F0] rounded-md px-3 py-2 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#475569] mb-1">Processo (opcional)</label>
                <select value={form.processo_id}
                  onChange={(e) => setForm({ ...form, processo_id: e.target.value })}
                  data-testid="prazo-input-processo"
                  className="w-full border border-[#E2E8F0] rounded-md px-3 py-2 outline-none bg-white">
                  <option value="">—</option>
                  {processos.map((p) => <option key={p.id} value={p.id}>{p.numero_cnj} · {p.cliente_nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#475569] mb-1">Descrição</label>
                <textarea rows={3} value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  data-testid="prazo-input-descricao"
                  className="w-full border border-[#E2E8F0] rounded-md px-3 py-2 outline-none" />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setOpen(false)}
                  className="px-4 py-2 rounded-md border border-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFC]">Cancelar</button>
                <button type="submit" data-testid="prazo-save-button"
                  className="px-4 py-2 rounded-md bg-[#C5A059] hover:bg-[#D4AF37] text-[#0A192F] font-semibold">Adicionar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
