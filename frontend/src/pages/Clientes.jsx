import React, { useEffect, useState } from "react";
import api, { formatApiErrorDetail } from "@/lib/api";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

const empty = { nome: "", cpf_cnpj: "", email: "", telefone: "", endereco: "", observacoes: "" };

export default function Clientes() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);

  const load = () => api.get("/clientes").then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await api.put(`/clientes/${editId}`, form);
        toast.success("Cliente atualizado");
      } else {
        await api.post("/clientes", form);
        toast.success("Cliente adicionado");
      }
      setOpen(false); setForm(empty); setEditId(null); load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    }
  };

  const handleEdit = (c) => {
    setForm({ ...empty, ...c }); setEditId(c.id); setOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Excluir cliente?")) return;
    try {
      await api.delete(`/clientes/${id}`);
      toast.success("Cliente excluído");
      load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    }
  };

  return (
    <div className="space-y-8" data-testid="clientes-page">
      <header className="flex items-end justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.28em] text-[#C5A059] font-semibold">
            Cadastro
          </div>
          <h1 className="font-serif-gj text-4xl text-[#0A192F] mt-2">Clientes</h1>
          <p className="text-[#475569] mt-1 text-sm">
            Gerencie os clientes do escritório.
          </p>
        </div>
        <button
          onClick={() => { setForm(empty); setEditId(null); setOpen(true); }}
          data-testid="add-cliente-button"
          className="bg-[#0A192F] hover:bg-[#112240] text-white rounded-md px-4 py-2.5 text-sm font-medium inline-flex items-center gap-2 transition-colors"
        >
          <Plus className="h-4 w-4" /> Adicionar Cliente
        </button>
      </header>

      <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-left">
            <tr className="text-xs uppercase tracking-[0.16em] text-[#475569]">
              <th className="px-6 py-4">Nome</th>
              <th className="px-6 py-4">CPF/CNPJ</th>
              <th className="px-6 py-4">E-mail</th>
              <th className="px-6 py-4">Telefone</th>
              <th className="px-6 py-4 w-32 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-[#475569]">
                <Users className="h-6 w-6 mx-auto mb-2 opacity-40" />
                Nenhum cliente cadastrado.
              </td></tr>
            )}
            {items.map((c) => (
              <tr key={c.id} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC]/60" data-testid={`cliente-row-${c.id}`}>
                <td className="px-6 py-4 font-medium text-[#0F172A]">{c.nome}</td>
                <td className="px-6 py-4 text-[#475569]">{c.cpf_cnpj}</td>
                <td className="px-6 py-4 text-[#475569]">{c.email || "—"}</td>
                <td className="px-6 py-4 text-[#475569]">{c.telefone || "—"}</td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => handleEdit(c)} data-testid={`edit-cliente-${c.id}`}
                    className="p-2 rounded hover:bg-[#C5A059]/10 text-[#0A192F]"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => handleDelete(c.id)} data-testid={`delete-cliente-${c.id}`}
                    className="p-2 rounded hover:bg-red-50 text-red-600"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" data-testid="cliente-modal">
          <div className="bg-white rounded-lg w-full max-w-2xl p-8 max-h-[90vh] overflow-y-auto">
            <div className="text-xs uppercase tracking-[0.2em] text-[#C5A059] font-semibold">Cadastro</div>
            <h2 className="font-serif-gj text-2xl text-[#0A192F] mt-1">
              {editId ? "Editar Cliente" : "Novo Cliente"}
            </h2>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {[
                ["nome", "Nome / Razão Social", true],
                ["cpf_cnpj", "CPF / CNPJ", true],
                ["email", "E-mail", false],
                ["telefone", "Telefone", false],
                ["endereco", "Endereço", false],
              ].map(([k, label, req]) => (
                <div key={k}>
                  <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#475569] mb-1">
                    {label}
                  </label>
                  <input
                    required={req}
                    value={form[k]}
                    onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                    data-testid={`cliente-input-${k}`}
                    className="w-full border border-[#E2E8F0] rounded-md px-3 py-2 focus:ring-2 focus:ring-[#C5A059] focus:border-transparent outline-none"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#475569] mb-1">Observações</label>
                <textarea rows={3} value={form.observacoes}
                  onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                  data-testid="cliente-input-observacoes"
                  className="w-full border border-[#E2E8F0] rounded-md px-3 py-2 focus:ring-2 focus:ring-[#C5A059] outline-none" />
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <button type="button" onClick={() => setOpen(false)} data-testid="cliente-cancel-button"
                  className="px-4 py-2 rounded-md border border-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFC]">Cancelar</button>
                <button type="submit" data-testid="cliente-save-button"
                  className="px-4 py-2 rounded-md bg-[#C5A059] hover:bg-[#D4AF37] text-[#0A192F] font-semibold">
                  {editId ? "Salvar" : "Cadastrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
