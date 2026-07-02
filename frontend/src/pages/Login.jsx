import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { formatApiErrorDetail } from "@/lib/api";
import { Scale, Loader2 } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@guardianjuri.com.br");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-[#F8FAFC]">
      {/* Left brand panel */}
      <div className="hidden md:block relative overflow-hidden gj-gradient-navy">
        <img
          src="https://images.unsplash.com/photo-1775144657566-e5b093073baf?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzh8MHwxfHNlYXJjaHwxfHxsYXclMjBvZmZpY2UlMjBkZXNrfGVufDB8fHx8MTc4MzExOTMxMHww&ixlib=rb-4.1.0&q=85"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A192F]/95 via-[#0A192F]/80 to-[#0A192F]/60" />
        <div className="relative h-full flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-md bg-[#C5A059]/10 border border-[#C5A059]/40 flex items-center justify-center">
              <Scale className="h-6 w-6 text-[#C5A059]" />
            </div>
            <div>
              <div className="font-serif-gj text-2xl leading-none">Guardian Juri</div>
              <div className="text-[10px] uppercase tracking-[0.28em] text-[#C5A059] mt-1">
                Advocacia · Gestão
              </div>
            </div>
          </div>

          <div className="max-w-md">
            <h1 className="font-serif-gj text-5xl leading-tight">
              A gestão do seu escritório,{" "}
              <span className="gj-shine">com a elegância que a advocacia merece.</span>
            </h1>
            <p className="mt-6 text-slate-300 leading-relaxed">
              Controle processos, prazos, clientes e financeiro em um único lugar.
              Feito por advogados, para advogados brasileiros.
            </p>
          </div>

          <div className="text-xs text-slate-400 uppercase tracking-wider">
            © {new Date().getFullYear()} Guardian Juri
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="md:hidden mb-8 flex items-center gap-3">
            <div className="h-11 w-11 rounded-md bg-[#0A192F] flex items-center justify-center">
              <Scale className="h-5 w-5 text-[#C5A059]" />
            </div>
            <div className="font-serif-gj text-2xl text-[#0A192F]">Guardian Juri</div>
          </div>

          <div className="text-[10px] uppercase tracking-[0.28em] text-[#C5A059] font-semibold">
            Acesso Restrito
          </div>
          <h2 className="font-serif-gj text-4xl text-[#0A192F] mt-2">Bem-vindo de volta</h2>
          <p className="text-[#475569] mt-2 text-sm">
            Faça login para acessar o painel do escritório.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5" data-testid="login-form">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#475569] mb-2">
                E-mail
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="login-email-input"
                className="w-full border border-[#E2E8F0] bg-white rounded-md px-4 py-3 text-[#0F172A] focus:ring-2 focus:ring-[#C5A059] focus:border-transparent outline-none transition-all"
                placeholder="voce@escritorio.com.br"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#475569] mb-2">
                Senha
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="login-password-input"
                className="w-full border border-[#E2E8F0] bg-white rounded-md px-4 py-3 text-[#0F172A] focus:ring-2 focus:ring-[#C5A059] focus:border-transparent outline-none transition-all"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div
                data-testid="login-error-message"
                className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              data-testid="login-submit-button"
              className="w-full bg-[#C5A059] hover:bg-[#D4AF37] text-[#0A192F] font-semibold rounded-md py-3 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Entrar
            </button>
          </form>

          <div className="mt-8 text-xs text-[#475569] bg-white border border-[#E2E8F0] rounded-md p-4">
            <div className="font-semibold uppercase tracking-wider text-[10px] text-[#0A192F] mb-1">
              Acesso de demonstração
            </div>
            admin@guardianjuri.com.br · admin123
          </div>
        </div>
      </div>
    </div>
  );
}
