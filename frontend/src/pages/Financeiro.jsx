import React, { useEffect, useMemo, useState } from "react";
import api, { formatApiErrorDetail } from "@/lib/api";
import { Plus, Wallet, Trash2 } from "lucide-react";
import { toast } from "sonner";

const brl = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const empty = { tipo: "honorario", descricao: "", valor: "", data: "", status: "pendente", processo_id: "", cliente_id: "" };

export default function Financeiro() {
  const [items, setItems] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [processos, setProcessos] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);

  const load = async () => {
    const [f, c, p] = await Promise.all([
      api.get("/financeiro"), api.get("/clientes"), api.get("/processos"),
    ]);
    setItems(f.data); setClientes(c.data); setProcessos(p.data);
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/financeiro", {
        ...form,
        valor: parseFloat(form.valor),
        cliente_id: form.cliente_id || null,
        processo_id: form.processo_id || null,
      });
      toast.success("Lançamento criado");
      setOpen(false); setForm(empty); load();
    } catch (err) { toast.error(formatApiErrorDetail(err.response?.data?.detail)); }
  };

  const toggleStatus = async (item) => {
    await api.put(`/financeiro/${item.id}`, { ...item, status: item.status === "pago" ? "pendente" : "pago" });
    load();
  };

  const remove = async (id) => {
    if (!window.confirm("Excluir lançamento?")) return;
    await api.delete(`/financeiro/${id}`); toast.success("Excluído"); load();
  };

  const totals = useMemo(() => {
    const t = { recebido: 0, aReceber: 0, despesas: 0 };
    items.forEach((i) => {
      if (i.tipo === "honorario" && i.status === "pago") t.recebido += i.valor;
      else if (i.tipo === "honorario") t.aReceber += i.valor;
      else if (i.tipo === "despesa") t.despesas += i.valor;
    });
    return t;
  }, [items]);

  return (
    <div className="space-y-8" data-testid="financeiro-page">
      <header className="flex items-end justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.28em] text-[#C5A059] font-semibold">Contabilidade</div>
          <h1 className="font-serif-gj text-4xl text-[#0A192F] mt-2">Financeiro</h1>
          <p className="text-[#475569] mt-1 text-sm">Honorários, despesas e recebimentos.</p>
        </div>
        <button onClick={() => { setForm(empty); setOpen(true); }} data-testid="add-financeiro-button"
          className="bg-[#0A192F] hover:bg-[#112240] text-white rounded-md px-4 py-2.5 text-sm font-medium inline-flex items-center gap-2">
          <Plus className="h-4 w-4" /> Novo Lançamento
        </button>
      </header>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-6" data-testid="fin-total-recebido">
          <div className="text-xs uppercase tracking-[0.2em] text-[#475569] font-semibold">Recebido</div>
          <div className="mt-2 font-serif-gj text-2xl text-emerald-600">{brl(totals.recebido)}</div>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-6" data-testid="fin-total-a-receber">
          <div className="text-xs uppercase tracking-[0.2em] text-[#475569] font-semibold">A receber</div>
          <div className="mt-2 font-serif-gj text-2xl text-[#C5A059]">{brl(totals.aReceber)}</div>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-6" data-testid="fin-total-despesas">
          <div className="text-xs uppercase tracking-[0.2em] text-[#475569] font-semibold">Despesas</div>
          <div className="mt-2 font-serif-gj text-2xl text-red-600">{brl(totals.despesas)}</div>
        </div>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-left">
            <tr className="text-xs uppercase tracking-[0.16em] text-[#475569]">
              <th className="px-6 py-4">Tipo</th>
              <th className="px-6 py-4">Descrição</th>
              <th className="px-6 py-4">Data</th>
              <th className="px-6 py-4 text-right">Valor</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-[#475569]">
                <Wallet className="h-6 w-6 mx-auto mb-2 opacity-40" />
                Nenhum lançamento.
              </td></tr>
            )}
            {items.map((f) => (
              <tr key={f.id} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC]/60" data-testid={`fin-row-${f.id}`}>
                <td className="px-6 py-4">
                  <span className={`text-xs font-semibold uppercase px-2 py-1 rounded border ${
                    f.tipo === "honorario" ? "border-[#C5A059] text-[#C5A059] bg-[#C5A059]/10" : "border-red-200 text-red-700 bg-red-50"
                  }`}>
                    {f.tipo === "honorario" ? "Honorário" : "Despesa"}
                  </span>
                </td>
                <td className="px-6 py-4 text-[#0F172A]">{f.descricao}</td>
                <td className="px-6 py-4 text-[#475569]">{new Date(f.data).toLocaleDateString("pt-BR")}</td>
                <td className="px-6 py-4 text-right font-medium text-[#0A192F]">{brl(f.valor)}</td>
                <td className="px-6 py-4">
                  <button onClick={() => toggleStatus(f)} data-testid={`toggle-status-${f.id}`}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                      f.status === "pago"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                        : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                    }`}>
                    {f.status === "pago" ? "Pago" : "Pendente"}
                  </button>
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => remove(f.id)} data-testid={`delete-fin-${f.id}`}
                    className="p-2 rounded hover:bg-red-50 text-red-600"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg w-full max-w-xl p-8">
            <div className="text-xs uppercase tracking-[0.2em] text-[#C5A059] font-semibold">Novo lançamento</div>
            <h2 className="font-serif-gj text-2xl text-[#0A192F] mt-1">Financeiro</h2>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#475569] mb-1">Tipo</label>
                  <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                    data-testid="fin-input-tipo"
                    className="w-full border border-[#E2E8F0] rounded-md px-3 py-2 outline-none bg-white">
                    <option value="honorario">Honorário</option>
                    <option value="despesa">Despesa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#475569] mb-1">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                    data-testid="fin-input-status"
                    className="w-full border border-[#E2E8F0] rounded-md px-3 py-2 outline-none bg-white">
                    <option value="pendente">Pendente</option>
                    <option value="pago">Pago</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#475569] mb-1">Descrição</label>
                <input required value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  data-testid="fin-input-descricao"
                  className="w-full border border-[#E2E8F0] rounded-md px-3 py-2 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#475569] mb-1">Valor (R$)</label>
                  <input required type="number" step="0.01" value={form.valor}
                    onChange={(e) => setForm({ ...form, valor: e.target.value })}
                    data-testid="fin-input-valor"
                    className="w-full border border-[#E2E8F0] rounded-md px-3 py-2 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#475569] mb-1">Data</label>
                  <input required type="date" value={form.data}
                    onChange={(e) => setForm({ ...form, data: e.target.value })}
                    data-testid="fin-input-data"
                    className="w-full border border-[#E2E8F0] rounded-md px-3 py-2 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#475569] mb-1">Cliente (opcional)</label>
                <select value={form.cliente_id}
                  onChange={(e) => setForm({ ...form, cliente_id: e.target.value })}
                  data-testid="fin-input-cliente"
                  className="w-full border border-[#E2E8F0] rounded-md px-3 py-2 outline-none bg-white">
                  <option value="">—</option>
                  {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setOpen(false)}
                  className="px-4 py-2 rounded-md border border-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFC]">Cancelar</button>
                <button type="submit" data-testid="fin-save-button"
                  className="px-4 py-2 rounded-md bg-[#C5A059] hover:bg-[#D4AF37] text-[#0A192F] font-semibold">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
