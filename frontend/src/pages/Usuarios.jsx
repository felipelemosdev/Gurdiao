import React, { useEffect, useState } from "react";
import api, { formatApiErrorDetail } from "@/lib/api";
import { Plus, Trash2, UserCog } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const ROLE_LABEL = { advogado: "Advogado (Admin)", estagiario: "Estagiário", secretaria: "Secretaria" };
const ROLE_BADGE = {
  advogado: "bg-[#0A192F] text-[#C5A059]",
  estagiario: "bg-blue-50 text-blue-700 border border-blue-200",
  secretaria: "bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/40",
};

const empty = { email: "", password: "", name: "", role: "estagiario" };

export default function Usuarios() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);

  const load = () => api.get("/users").then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/users", form);
      toast.success("Usuário criado");
      setOpen(false); setForm(empty); load();
    } catch (err) { toast.error(formatApiErrorDetail(err.response?.data?.detail)); }
  };

  const remove = async (id) => {
    if (!window.confirm("Excluir usuário?")) return;
    try { await api.delete(`/users/${id}`); toast.success("Excluído"); load(); }
    catch (err) { toast.error(formatApiErrorDetail(err.response?.data?.detail)); }
  };

  return (
    <div className="space-y-8" data-testid="usuarios-page">
      <header className="flex items-end justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.28em] text-[#C5A059] font-semibold">Administração</div>
          <h1 className="font-serif-gj text-4xl text-[#0A192F] mt-2">Usuários</h1>
          <p className="text-[#475569] mt-1 text-sm">Gerencie a equipe do escritório.</p>
        </div>
        <button onClick={() => { setForm(empty); setOpen(true); }} data-testid="add-user-button"
          className="bg-[#0A192F] hover:bg-[#112240] text-white rounded-md px-4 py-2.5 text-sm font-medium inline-flex items-center gap-2">
          <Plus className="h-4 w-4" /> Novo Usuário
        </button>
      </header>

      <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-left">
            <tr className="text-xs uppercase tracking-[0.16em] text-[#475569]">
              <th className="px-6 py-4">Nome</th>
              <th className="px-6 py-4">E-mail</th>
              <th className="px-6 py-4">Papel</th>
              <th className="px-6 py-4">Criado em</th>
              <th className="px-6 py-4 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-[#475569]">
                <UserCog className="h-6 w-6 mx-auto mb-2 opacity-40" />Nenhum usuário.
              </td></tr>
            )}
            {items.map((u) => (
              <tr key={u.id} className="border-b border-[#E2E8F0]" data-testid={`user-row-${u.id}`}>
                <td className="px-6 py-4 font-medium text-[#0F172A]">{u.name}</td>
                <td className="px-6 py-4 text-[#475569]">{u.email}</td>
                <td className="px-6 py-4">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ROLE_BADGE[u.role]}`}>
                    {ROLE_LABEL[u.role]}
                  </span>
                </td>
                <td className="px-6 py-4 text-[#475569]">{new Date(u.created_at).toLocaleDateString("pt-BR")}</td>
                <td className="px-6 py-4 text-right">
                  {u.id !== user.id && (
                    <button onClick={() => remove(u.id)} data-testid={`delete-user-${u.id}`}
                      className="p-2 rounded hover:bg-red-50 text-red-600"><Trash2 className="h-4 w-4" /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg w-full max-w-lg p-8">
            <div className="text-xs uppercase tracking-[0.2em] text-[#C5A059] font-semibold">Cadastro</div>
            <h2 className="font-serif-gj text-2xl text-[#0A192F] mt-1">Novo Usuário</h2>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#475569] mb-1">Nome</label>
                <input required value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  data-testid="user-input-name"
                  className="w-full border border-[#E2E8F0] rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-[#C5A059]" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#475569] mb-1">E-mail</label>
                <input required type="email" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  data-testid="user-input-email"
                  className="w-full border border-[#E2E8F0] rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-[#C5A059]" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#475569] mb-1">Senha</label>
                <input required type="password" value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  data-testid="user-input-password"
                  className="w-full border border-[#E2E8F0] rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-[#C5A059]" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#475569] mb-1">Papel</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                  data-testid="user-input-role"
                  className="w-full border border-[#E2E8F0] rounded-md px-3 py-2 outline-none bg-white">
                  <option value="advogado">Advogado (Admin)</option>
                  <option value="estagiario">Estagiário</option>
                  <option value="secretaria">Secretaria</option>
                </select>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setOpen(false)}
                  className="px-4 py-2 rounded-md border border-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFC]">Cancelar</button>
                <button type="submit" data-testid="user-save-button"
                  className="px-4 py-2 rounded-md bg-[#C5A059] hover:bg-[#D4AF37] text-[#0A192F] font-semibold">Criar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
