import type { LabSnapshot, TimelineEvent } from "@pet-lab/contracts"
import { CheckCircle2Icon, CircleAlertIcon, CircleDashedIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { compareSnapshots, type DiffStatus } from "@/lib/diff"
import { cn } from "@/lib/utils"

const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)

const statusMeta: Record<DiffStatus, { label: string; variant: "success" | "warning" | "destructive"; icon: typeof CheckCircle2Icon }> = {
  synced: { label: "Igual", variant: "success", icon: CheckCircle2Icon },
  pending: { label: "Aguardando", variant: "warning", icon: CircleDashedIcon },
  diverged: { label: "Diferente", variant: "destructive", icon: CircleAlertIcon },
}

export function InspectorPanel({
  server,
  client,
  clientLabel,
  timeline,
}: {
  server?: LabSnapshot
  client?: LabSnapshot
  clientLabel: string
  timeline: TimelineEvent[]
}) {
  const rows = compareSnapshots(server, client)

  return (
    <div className="synko-inspector" data-testid="inspector-panel">
        <section>
          <header><p className="synko-technical-label">comparação</p><h3>Diff campo a campo</h3><p>PostgreSQL/API versus {clientLabel}.</p></header>
          <div className="synko-table-wrap">
            <Table>
              <TableHeader><TableRow><TableHead>Campo</TableHead><TableHead>Servidor</TableHead><TableHead>Cliente</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const meta = statusMeta[row.status]
                  const Icon = meta.icon
                  const monetary = row.field.includes("price") || ["subtotal", "discount", "total"].includes(row.field)
                  return (
                    <TableRow key={row.field} data-testid={`diff-${row.field}`} className={cn(row.status === "diverged" && "status-diverged", row.status === "pending" && "status-warning")}>
                      <TableCell className="font-mono text-xs">{row.field}</TableCell>
                      <TableCell>{monetary ? money(Number(row.server) || 0) : row.server}</TableCell>
                      <TableCell>{monetary ? money(Number(row.client) || 0) : row.client}</TableCell>
                      <TableCell><Badge variant={meta.variant}><Icon data-icon="inline-start" />{meta.label}</Badge></TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </section>

        <section>
          <header><p className="synko-technical-label">ordem de execução</p><h3>Timeline</h3><p>O evento mais recente aparece primeiro.</p></header>
          {timeline.length === 0 ? <p className="text-sm text-muted-foreground">O cenário ainda não registrou eventos.</p> : (
            <ol className="synko-timeline">
              {timeline.slice(0, 8).map((event) => (
                <li key={event.id}>
                  <Badge variant="outline">{event.source}</Badge>
                  <div><p>{event.label}</p><small>{event.detail}</small></div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <details className="synko-raw-snapshots">
          <summary>Snapshots completos</summary>
          <div>
            <RawSnapshot title="PostgreSQL via GraphQL" snapshot={server} />
            <RawSnapshot title={clientLabel} snapshot={client} />
          </div>
        </details>
    </div>
  )
}

function RawSnapshot({ title, snapshot }: { title: string; snapshot?: LabSnapshot }) {
  return (
    <div className="synko-raw-snapshot">
      <p>{title}</p>
      <pre>{snapshot ? JSON.stringify(snapshot, null, 2) : "Aguardando snapshot…"}</pre>
    </div>
  )
}
