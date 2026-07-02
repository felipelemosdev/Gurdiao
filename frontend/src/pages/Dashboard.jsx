import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Scale, Users, Clock, Wallet, TrendingUp } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";

const brl = (v) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

function KpiCard({ icon: Icon, label, value, testid, accent }) {
  return (
    <div
      data-testid={testid}
      className="bg-white border border-[#E2E8F0] rounded-lg p-6 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`h-10 w-10 rounded-md flex items-center justify-center ${accent}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="text-xs uppercase tracking-[0.2em] text-[#475569] font-semibold">
        {label}
      </div>
      <div className="mt-2 font-serif-gj text-3xl text-[#0A192F]">{value}</div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/dashboard/stats").then((r) => setStats(r.data));
  }, []);

  return (
    <div className="space-y-10" data-testid="dashboard-page">
      <header>
        <div className="text-xs uppercase tracking-[0.28em] text-[#C5A059] font-semibold">
          Painel Executivo
        </div>
        <h1 className="font-serif-gj text-4xl text-[#0A192F] mt-2">
          Bom dia, {user?.name?.split(" ")[0]}.
        </h1>
        <p className="text-[#475569] mt-2">
          Uma visão geral do seu escritório em tempo real.
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          icon={Scale}
          label="Processos Ativos"
          value={stats?.processos_ativos ?? "—"}
          testid="kpi-processos-ativos"
          accent="bg-[#0A192F] text-[#C5A059]"
        />
        <KpiCard
          icon={Clock}
          label="Prazos Próximos (7 dias)"
          value={stats?.prazos_proximos ?? "—"}
          testid="kpi-prazos-proximos"
          accent="bg-[#C5A059]/10 text-[#C5A059]"
        />
        <KpiCard
          icon={Users}
          label="Total de Clientes"
          value={stats?.total_clientes ?? "—"}
          testid="kpi-total-clientes"
          accent="bg-[#0A192F] text-[#C5A059]"
        />
        <KpiCard
          icon={Wallet}
          label="Receita Recebida"
          value={brl(stats?.receita_recebida)}
          testid="kpi-receita-recebida"
          accent="bg-emerald-50 text-emerald-600"
        />
      </section>

      <section className="bg-white border border-[#E2E8F0] rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-[#475569] font-semibold">
              Receita
            </div>
            <h2 className="font-serif-gj text-2xl text-[#0A192F] mt-1">
              Honorários por mês
            </h2>
          </div>
          <div className="flex items-center gap-2 text-sm text-[#475569]">
            <TrendingUp className="h-4 w-4 text-[#C5A059]" />
            Pendente: <span className="font-semibold text-[#0A192F]">{brl(stats?.receita_pendente)}</span>
          </div>
        </div>
        <div className="h-72" data-testid="dashboard-chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats?.chart_receita || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="mes" stroke="#475569" style={{ fontSize: 12 }} />
              <YAxis stroke="#475569" style={{ fontSize: 12 }} tickFormatter={(v) => `R$${v}`} />
              <Tooltip
                formatter={(v) => brl(v)}
                contentStyle={{ background: "#0A192F", border: "none", borderRadius: 6, color: "#fff" }}
              />
              <Bar dataKey="valor" fill="#C5A059" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
